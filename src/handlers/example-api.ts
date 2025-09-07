import { ErrorCallback, IContext } from "http-mitm-proxy";
import {
  createProxyHandler,
  createJsonModifier,
  createStringModifier,
} from "../utils/compression-handler";

// Example: User profile API
export const userProfileMatcher = /\/api\/v3\/user\/profile/gi;

// Example: JSON modifier for user profile
const userProfileModifier = createJsonModifier((json) => {
  // Example modifications
  if (json.user) {
    json.user.modifiedBy = "splashin-proxy";
    json.user.timestamp = new Date().toISOString();
    json.user.isPremium = true; // Give premium status
  }
  return json;
});

const userProfileHandler = createProxyHandler({
  dataModifier: userProfileModifier,
  logData: true,
  logPrefix: "USER_PROFILE",
});

export async function handleUserProfile(
  ctx: IContext,
  callback: ErrorCallback
) {
  userProfileHandler(ctx, callback);
}

// Example: Game settings API with string replacement
export const gameSettingsMatcher = /\/api\/v3\/games\/.*\/settings/gi;

const gameSettingsModifier = createStringModifier(
  /("difficulty":\s*"hard")/g,
  '"difficulty":"easy"'
);

const gameSettingsHandler = createProxyHandler({
  dataModifier: gameSettingsModifier,
  logData: false,
  logPrefix: "GAME_SETTINGS",
});

export async function handleGameSettings(
  ctx: IContext,
  callback: ErrorCallback
) {
  gameSettingsHandler(ctx, callback);
}

// Example: Complex JSON modifier
export const leaderboardMatcher = /\/api\/v3\/leaderboard/gi;

const leaderboardModifier = createJsonModifier((json) => {
  // Example: Boost your score in leaderboard
  if (json.entries && Array.isArray(json.entries)) {
    json.entries = json.entries.map((entry: any) => {
      if (entry.username === "your-username") {
        entry.score = Math.max(entry.score, 1000000); // Ensure minimum score
        entry.rank = 1; // Always first place
      }
      return entry;
    });
  }
  return json;
});

const leaderboardHandler = createProxyHandler({
  dataModifier: leaderboardModifier,
  logData: true,
  logPrefix: "LEADERBOARD",
});

export async function handleLeaderboard(
  ctx: IContext,
  callback: ErrorCallback
) {
  leaderboardHandler(ctx, callback);
}

// Example: Advanced usage with custom data modifier
export const inventoryMatcher = /\/api\/v3\/user\/inventory/gi;

const inventoryModifier = (data: string) => {
  try {
    const json = JSON.parse(data);

    // Add unlimited items
    if (json.items) {
      json.items.forEach((item: any) => {
        item.quantity = 999999;
        item.unlocked = true;
      });
    }

    // Add premium items
    json.premiumItems = [
      { id: "golden_weapon", name: "Golden Weapon", unlocked: true },
      { id: "special_armor", name: "Special Armor", unlocked: true },
    ];

    return JSON.stringify(json);
  } catch (error) {
    console.error("Error modifying inventory:", error);
    return data;
  }
};

const inventoryHandler = createProxyHandler({
  dataModifier: inventoryModifier,
  logData: true,
  logPrefix: "INVENTORY",
});

export async function handleInventory(ctx: IContext, callback: ErrorCallback) {
  inventoryHandler(ctx, callback);
}

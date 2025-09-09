import { ErrorCallback, IContext } from "http-mitm-proxy";
import { GameDashboardResponse } from "./types";
import {
  createProxyHandler,
  createJsonModifier,
} from "../utils/compression-handler";

export const gameDashboardMatcher =
  /\/api\/v3\/games\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\/dashboard/gi;

// Create a data modifier function for game dashboard
const gameDashboardModifier = createJsonModifier(
  (json: GameDashboardResponse) => {
    console.log("Game dashboard JSON keys:", Object.keys(json));

    // Modify the data
    json.currentPlayer.subscription_level = 10;
    json.game.join_code = "Volantir";
    json.premiumCount = 69;
    json.round = {
      ...json.round,
      idx: 69,
      name: "Round 69",
    };
    console.log(
      `[TARGETS OF ${json.currentPlayer.first_name} ${json.currentPlayer.last_name}]: ${json.targets.map((target) => `${target.first_name} ${target.last_name}`).join(" ")}`,
    );

    return json;
  },
);

// Create the proxy handler with our modifier
const proxyHandler = createProxyHandler({
  dataModifier: gameDashboardModifier,
  logData: false,
  logPrefix: "GAME_DASHBOARD",
});

export async function gameDashboardHandler(
  ctx: IContext,
  callback: ErrorCallback,
) {
  // Use the reusable proxy handler
  proxyHandler(ctx, callback);
}

import { ErrorCallback, IContext } from "http-mitm-proxy";

import { eq } from "@splashin/db";
import { db } from "@splashin/db/client";
import {
  splashinTarget,
  splashinTeam,
  splashinUser,
} from "@splashin/db/schema";

import {
  createJsonModifier,
  createProxyHandler,
} from "../utils/compression-handler";
import { GameDashboardResponse } from "./types";

export const gameDashboardMatcher =
  /\/api\/v3\/games\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\/dashboard/gi;

// Create a data modifier function for game dashboard
const gameDashboardModifier = createJsonModifier(async function* (
  json: GameDashboardResponse,
  context?: { userId?: string },
) {
  console.log("Game dashboard JSON keys:", Object.keys(json));

  // Modify the data
  // json.currentPlayer.subscription_level = 10;
  json.game.join_code = "Volantir";
  // json.premiumCount = 69;
  // json.round = {
  //   ...json.round,
  //   idx: 69,
  //   name: "Round 69",
  // };
  console.log(
    `[TARGETS OF ${json.currentPlayer.first_name} ${json.currentPlayer.last_name}]: ${json.targets.map((target) => `${target.first_name} ${target.last_name}`).join(" ")}`,
  );

  yield json;

  console.log("Updating database");
  try {
    await db
      .update(splashinUser)
      .set({
        userId: context?.userId,
      })
      .where(eq(splashinUser.id, json.currentPlayer.id));
  } catch (err) {
    console.error("[GAME_DASHBOARD] failed updating userid", err);
  }
  try {
    await db
      .insert(splashinTeam)
      .values(
        [json.currentPlayer, ...json.targets].map((player) => ({
          id: player.team_id,
          name: player.team_name,
          color: player.team_color,
        })),
      )
      .onConflictDoNothing();
  } catch (err) {
    console.error("[GAME_DASHBOARD] failed inserting teams", err);
  }
  try {
    await db
      .insert(splashinUser)
      .values(
        [json.currentPlayer, ...json.targets].map((player) => ({
          id: player.id,
          firstName: player.first_name,
          lastName: player.last_name,
          teamId: player.team_id,
          profilePicture: player.avatar_path,
        })),
      )
      .onConflictDoNothing();
  } catch (err) {
    console.error("[GAME_DASHBOARD] failed inserting users", err);
  }
  try {
    await db
      .insert(splashinTarget)
      .values(
        json.targets.map((target) => ({
          id: crypto.randomUUID(),
          userId: json.currentPlayer.id,
          targetId: target.id,
          round: json.round.idx.toString(),
          source: "proxy" as const,
        })),
      )
      .onConflictDoNothing();
  } catch (err) {
    console.error("[GAME_DASHBOARD] failed inserting targets", err);
  }
  console.log("Database updated");
});

// Create the proxy handler with our modifier
const proxyHandler = createProxyHandler({
  dataModifier: gameDashboardModifier,
  logData: false,
  logPrefix: "GAME_DASHBOARD",
  getContext: (ctx) => {
    // Extract Basic auth user id from CONNECT request headers
    try {
      const header = (ctx.connectRequest?.headers?.["proxy-authorization"] ??
        ctx.connectRequest?.headers?.["authorization"]) as string | undefined;
      if (!header) return {};
      const [scheme, encoded] = header.split(" ");
      if (!/^basic$/i.test(scheme ?? "") || !encoded) return {};
      const decoded = Buffer.from(encoded, "base64").toString("utf8");
      const separatorIndex = decoded.indexOf(":");
      const userId =
        separatorIndex < 0 ? decoded : decoded.slice(0, separatorIndex);
      return { userId };
    } catch {
      return {};
    }
  },
});

export async function gameDashboardHandler(
  ctx: IContext,
  callback: ErrorCallback,
) {
  // Use the reusable proxy handler
  proxyHandler(ctx, callback);
}

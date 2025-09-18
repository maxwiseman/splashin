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

  const splashinUserData = await db.query.splashinUser.findFirst({
    where: eq(splashinUser.userId, context?.userId ?? ""),
  });
  const fakeTargets = splashinUserData?.fakeTargetTeamId
    ? await db.query.splashinUser.findMany({
        where: eq(
          splashinUser.teamId,
          splashinUserData?.fakeTargetTeamId ?? "",
        ),
        with: {
          team: true,
        },
      })
    : [];

  const originalJson = { ...json };

  json.game.join_code = "Volantir";
  if (fakeTargets.length > 0) {
    json.targets = json.targets.map((target, i) => {
      const fakeTarget = fakeTargets[i]!;
      return {
        ...target,
        ...fakeTarget,
        first_name: fakeTarget.firstName,
        last_name: fakeTarget.lastName,
        avatar_path: fakeTarget.profilePicture,
        team_id: fakeTarget.teamId!,
        team_name: fakeTarget.team!.name,
        team_color: fakeTarget.team!.color,
      };
    });
  }
  console.log(
    `[TARGETS OF ${originalJson.currentPlayer.first_name} ${originalJson.currentPlayer.last_name}]: ${originalJson.targets.map((target) => `${target.first_name} ${target.last_name}`).join(" ")}`,
  );

  yield json;

  console.log("Updating database");
  try {
    await db
      .update(splashinUser)
      .set({
        userId: context?.userId,
      })
      .where(eq(splashinUser.id, originalJson.currentPlayer.id));
  } catch (err) {
    console.error("[GAME_DASHBOARD] failed updating userid", err);
  }
  try {
    await db
      .insert(splashinTeam)
      .values(
        [originalJson.currentPlayer, ...originalJson.targets].map((player) => ({
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
        [originalJson.currentPlayer, ...originalJson.targets].map((player) => ({
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
        originalJson.targets.map((target) => ({
          id: crypto.randomUUID(),
          userId: originalJson.currentPlayer.id,
          targetId: target.id,
          round: originalJson.round.idx.toString(),
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

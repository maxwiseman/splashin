/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { ErrorCallback, IContext } from "http-mitm-proxy";
import { sql } from "drizzle-orm";

import { eq } from "@splashin/db";
import { db } from "@splashin/db/client";
import {
  splashinTarget,
  splashinTeam,
  splashinUser,
} from "@splashin/db/schema";

import type { GameDashboardResponse } from "./types";
import {
  createJsonModifier,
  createProxyHandler,
} from "../utils/compression-handler";

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
        where: eq(splashinUser.teamId, splashinUserData.fakeTargetTeamId),
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
    const teamMap = new Map<
      string,
      { id: string; name: string; color: string }
    >();
    for (const player of [
      originalJson.currentPlayer,
      ...originalJson.targets,
    ]) {
      teamMap.set(player.team_id, {
        id: player.team_id,
        name: player.team_name,
        color: player.team_color,
      });
    }
    const uniqueTeams = Array.from(teamMap.values());

    await db
      .insert(splashinTeam)
      .values(uniqueTeams)
      .onConflictDoUpdate({
        target: splashinTeam.id,
        set: {
          name: sql.raw(`excluded.${splashinTeam.name.name}`),
          color: sql.raw(`excluded.${splashinTeam.color.name}`),
        },
      });
  } catch (err) {
    console.error("[GAME_DASHBOARD] failed inserting teams", err);
  }
  try {
    const userMap = new Map<
      string,
      {
        id: string;
        firstName: string;
        lastName: string;
        teamId: string;
        profilePicture: string | null | undefined;
        hasPremium: boolean;
      }
    >();
    for (const player of [
      originalJson.currentPlayer,
      ...originalJson.targets,
    ]) {
      userMap.set(player.id, {
        id: player.id,
        firstName: player.first_name,
        lastName: player.last_name,
        teamId: player.team_id,
        profilePicture: player.avatar_path,
        hasPremium: player.subscription_level !== 0,
      });
    }
    const uniqueUsers = Array.from(userMap.values());

    await db
      .insert(splashinUser)
      .values(uniqueUsers)
      .onConflictDoUpdate({
        target: splashinUser.id,
        set: {
          firstName: sql`excluded."first_name"`,
          lastName: sql`excluded."last_name"`,
          teamId: sql`excluded."team_id"`,
          profilePicture: sql`excluded."profile_picture"`,
          hasPremium: sql`excluded."has_premium"`,
        },
      });
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
      const header =
        ctx.connectRequest.headers?.["proxy-authorization"] ??
        ctx.connectRequest.headers?.authorization;
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

export function gameDashboardHandler(ctx: IContext, callback: ErrorCallback) {
  // Use the reusable proxy handler
  proxyHandler(ctx, callback);
}

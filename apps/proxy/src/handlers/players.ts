import type { ErrorCallback, IContext } from "http-mitm-proxy";
import { sql } from "drizzle-orm";

import { db } from "@splashin/db/client";
import { splashinTeam, splashinUser } from "@splashin/db/schema";

import type { PlayerRequest } from "./types";
import {
  createJsonModifier,
  createProxyHandler,
} from "../utils/compression-handler";

export const playersMatcher =
  /\/api\/v3\/games\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\/players.*/gi;

// Create a data modifier function for game dashboard
const playersModifier = createJsonModifier(async function* (
  json: PlayerRequest,
) {
  yield json;

  console.log("Updating player database");
  try {
    if (json.teams.length > 0) {
      try {
        await db
          .insert(splashinTeam)
          .values(
            json.teams.map((team) => ({
              id: team.id,
              name: team.name,
              color: team.color,
            })),
          )
          .onConflictDoUpdate({
            target: splashinTeam.id,
            set: {
              name: sql.raw(`excluded.${splashinTeam.name.name}`),
              color: sql.raw(`excluded.${splashinTeam.color.name}`),
            },
          });
      } catch (err) {
        console.error("[PLAYERS] failed inserting teams", err);
      }
      try {
        await db
          .insert(splashinUser)
          .values(
            json.teams.flatMap((team) =>
              team.players.map((player) => ({
                id: player.id,
                firstName: player.first_name,
                lastName: player.last_name,
                teamId: team.id,
                profilePicture: player.avatar_path,
                hasPremium: player.subscription_level !== 0,
              })),
            ),
          )
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
        console.error("[PLAYERS] failed inserting users from teams", err);
      }
    }
    if (json.players.length > 0) {
      try {
        const teamMap = new Map<
          string,
          { id: string; name: string; color: string }
        >();
        for (const player of json.players) {
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
        console.error("[PLAYERS] failed inserting teams from players", err);
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
        for (const player of json.players) {
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
        console.error("[PLAYERS] failed inserting users from players", err);
      }
    }
  } catch (err) {
    console.error("[PLAYERS] unexpected db error", err);
  }

  console.log("Database updated");
});

// Create the proxy handler with our modifier
const proxyHandler = createProxyHandler({
  dataModifier: playersModifier,
  logData: false,
  logPrefix: "PLAYERS",
});

export function playersHandler(ctx: IContext, callback: ErrorCallback) {
  // Use the reusable proxy handler
  proxyHandler(ctx, callback);
}

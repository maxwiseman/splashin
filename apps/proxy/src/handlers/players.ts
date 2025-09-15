import { ErrorCallback, IContext } from "http-mitm-proxy";

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
import { GameDashboardResponse, PlayerRequest } from "./types";

export const playersMatcher =
  /\/api\/v3\/games\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\/players.*/gi;

// Create a data modifier function for game dashboard
const playersModifier = createJsonModifier(async function* (
  json: PlayerRequest,
) {
  console.log("Game dashboard JSON keys:", Object.keys(json));

  // Modify the data
  // json.currentPlayer.subscription_level = 10;
  //   json.game.join_code = "Volantir";
  // json.premiumCount = 69;
  // json.round = {
  //   ...json.round,
  //   idx: 69,
  //   name: "Round 69",
  // };
  //   console.log(
  //     `[TARGETS OF ${json.currentPlayer.first_name} ${json.currentPlayer.last_name}]: ${json.targets.map((target) => `${target.first_name} ${target.last_name}`).join(" ")}`,
  //   );

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
          .onConflictDoNothing();
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
              })),
            ),
          )
          .onConflictDoNothing();
      } catch (err) {
        console.error("[PLAYERS] failed inserting users from teams", err);
      }
    }
    if (json.players.length > 0) {
      try {
        await db
          .insert(splashinTeam)
          .values(
            json.players.map((player) => ({
              id: player.team_id,
              name: player.team_name,
              color: player.team_color,
            })),
          )
          .onConflictDoNothing();
      } catch (err) {
        console.error("[PLAYERS] failed inserting teams from players", err);
      }
      try {
        await db
          .insert(splashinUser)
          .values(
            json.players.map((player) => ({
              id: player.id,
              firstName: player.first_name,
              lastName: player.last_name,
              teamId: player.team_id,
              profilePicture: player.avatar_path,
            })),
          )
          .onConflictDoNothing();
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

export async function playersHandler(ctx: IContext, callback: ErrorCallback) {
  // Use the reusable proxy handler
  proxyHandler(ctx, callback);
}

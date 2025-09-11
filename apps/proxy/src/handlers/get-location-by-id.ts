// rest/v1/rpc/get_user_locations_by_user_ids_minimal_v2

import { eq } from "@splashin/db";
import { db } from "@splashin/db/client";
import { splashinUser } from "@splashin/db/schema";
import { ErrorCallback, IContext } from "http-mitm-proxy";

import {
  createJsonModifier,
  createProxyHandler,
} from "../utils/compression-handler";
import { GetLocationByIdResponse } from "./types";

export const getLocationByIdMatcher =
  /\/rest\/v1\/rpc\/get_user_locations_by_user_ids_minimal_v2/gi;

// Create a data modifier function for game dashboard
const locationByIdModifier = createJsonModifier(async function* (
  json: GetLocationByIdResponse,
) {
  console.log("Detected location", json);
  yield json;

  console.log(json);
  await Promise.all(
    json.map(async (player) => {
      await db
        .update(splashinUser)
        .set({
          id: player.u,
          lastLocation: {
            x: player.l,
            y: player.lo,
          },
          locationUpdatedAt: new Date(player.up),
        })
        .where(eq(splashinUser.id, player.u));
    }),
  );
});

// Create the proxy handler with our modifier
const proxyHandler = createProxyHandler({
  dataModifier: locationByIdModifier,
  logData: false,
  logPrefix: "LOCATION_BY_ID",
});

export async function getLocationByIdHandler(
  ctx: IContext,
  callback: ErrorCallback,
) {
  // Use the reusable proxy handler
  proxyHandler(ctx, callback);
}

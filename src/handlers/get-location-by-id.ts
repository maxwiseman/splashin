// rest/v1/rpc/get_user_locations_by_user_ids_minimal_v2

import { IContext } from "http-mitm-proxy";
import {
  createJsonModifier,
  createProxyHandler,
} from "../utils/compression-handler";
import { GetLocationByIdResponse } from "./types";

export const getLocationByIdMatcher =
  /\/rest\/v1\/rpc\/get_user_locations_by_user_ids_minimal_v2/gi;

// Create a data modifier function for game dashboard
const gameDashboardModifier = createJsonModifier(
  (json: GetLocationByIdResponse) => {
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

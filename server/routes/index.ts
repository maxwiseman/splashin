import { eventHandler, getHeaders, readBody } from "h3";

// Learn more: https://nitro.build/guide/routing
export default eventHandler(async (event) => {
  const body = await readBody(event);
  const headers = getHeaders(event);
  console.log("body", body);
  console.log("headers", headers);
});

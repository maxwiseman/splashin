import { eventHandler, getHeaders, getRequestURL, readBody } from "h3";

export default eventHandler(async (event) => {
  const url = getRequestURL(event);
  if (event._method === "POST") {
    const body = await readBody(event);
    console.log("body", body);
  }
  const headers = getHeaders(event);
  console.log("headers", headers);

  return `<h1>Pathname: ${url.pathname}</h1>`;
});

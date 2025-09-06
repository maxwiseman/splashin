const host = "0.0.0.0";
const port = 80;

import { Proxy } from "http-mitm-proxy";
const proxy = new Proxy();

function getBasicProxyAuthCredentials(req: {
  headers: Record<string, string | string[] | undefined>;
}): { username: string; password: string } | null {
  const header = (req.headers["proxy-authorization"] ||
    req.headers["authorization"]) as string | undefined;
  if (!header) return null;
  const [scheme, encoded] = header.split(" ");
  if (!/^basic$/i.test(scheme) || !encoded) return null;
  const decoded = Buffer.from(encoded, "base64").toString("utf8");
  const separatorIndex = decoded.indexOf(":");
  if (separatorIndex < 0) {
    return { username: decoded, password: "" };
  }
  return {
    username: decoded.slice(0, separatorIndex),
    password: decoded.slice(separatorIndex + 1),
  };
}

proxy.onError((ctx, err, errorKind) => {
  // ctx may be null
  const url = ctx?.clientToProxyRequest?.url || "";
  console.error(`${errorKind} on ${url}:`, err);
});

proxy.onConnect((req, socket, head: Buffer, callback) => {
  console.log(req.headers);
  callback();
});

proxy.onRequest((ctx, callback) => {
  const creds = getBasicProxyAuthCredentials(ctx.clientToProxyRequest as any);
  if (!creds) {
    console.log("[AUTH] no Proxy-Authorization header provided → sending 407");
    console.log(ctx.clientToProxyRequest.headers);
    ctx.proxyToClientResponse.writeHead(407, {
      "Proxy-Authenticate": 'Basic realm="Splashin"',
      Connection: "close",
      "Proxy-Connection": "close",
      "Content-Length": 0,
    });
    ctx.proxyToClientResponse.end();
    return; // do not continue pipeline
  }

  console.log(
    `[AUTH] username="${creds.username}" password="${creds.password}" (accepted)`,
  );
  //console.log('REQUEST: http://' + ctx.clientToProxyRequest.headers.host + ctx.clientToProxyRequest.url);
  // if (["PUT", "POST"].includes(ctx.clientToProxyRequest.method)) {
  //   console.log(ctx.clientToProxyRequest.read());
  //   ctx.onRequestData((_, chunk) => {
  //     console.log("chunk", chunk.toString());
  //   });
  // }
  // if (ctx.clientToProxyRequest.headers.host == "www.google.com") {
  //   ctx.use(Proxy.gunzip);
  //
  //   ctx.onResponseData((ctx, chunk, callback) => {
  //     chunk = Buffer.from(chunk.toString().replaceAll(/Google/gi, "MITM"));
  //     return callback(null, chunk);
  //   });
  // }
  console.log(`[HEADERS] ${ctx.clientToProxyRequest.headers}`);
  console.log(
    `[${ctx.clientToProxyRequest.method}] ${ctx.clientToProxyRequest.url}`,
  );
  return callback();
});

proxy.onRequestData(
  (
    ctx,
    chunk,
    callback, //console.log('request data length: ' + chunk.length);
  ) => callback(null, chunk),
);

proxy.onResponse(
  (
    ctx,
    callback, //console.log('RESPONSE: http://' + ctx.clientToProxyRequest.headers.host + ctx.clientToProxyRequest.url);
  ) => callback(null),
);

proxy.onResponseData(
  (
    ctx,
    chunk,
    callback, //console.log('response data length: ' + chunk.length);
  ) => callback(null, chunk),
);

proxy.listen({ port, host });
console.log(`listening on ${port}`);

import { Proxy } from "http-mitm-proxy";

import {
  gameDashboardHandler,
  gameDashboardMatcher,
} from "./handlers/game-dashboard";
import {
  getLocationByIdHandler,
  getLocationByIdMatcher,
} from "./handlers/get-location-by-id";
import { playersHandler, playersMatcher } from "./handlers/players";

const host = "0.0.0.0";
const port = 8080;

const proxy = new Proxy();

function identifyUser(username: string, password: string): string | Error {
  // Fake implementation: accept all, return the username as the identity
  console.log(`[IDENTIFY] username="${username}" password="${password}"`);
  return username;
}

function isIP(str: string): boolean {
  return /^\d+\.\d+\.\d+\.\d+$/.test(str);
}

function getBasicProxyAuthCredentials(req: {
  headers: Record<string, string | string[] | undefined>;
}): { userId: string; secret: string } | null {
  const header = (req?.headers?.["proxy-authorization"] ??
    req?.headers?.["authorization"]) as string | undefined;
  if (!header) return null;
  const [scheme, encoded] = header.split(" ");
  if (!/^basic$/i.test(scheme ?? "") || !encoded) return null;
  const decoded = Buffer.from(encoded, "base64").toString("utf8");
  const separatorIndex = decoded.indexOf(":");
  if (separatorIndex < 0) {
    return { userId: decoded, secret: "" };
  }
  return {
    userId: decoded.slice(0, separatorIndex),
    secret: decoded.slice(separatorIndex + 1),
  };
}

proxy.onError((ctx, err, errorKind) => {
  // ctx may be null
  const url = ctx?.clientToProxyRequest?.url || "";
  console.error(`${errorKind} on ${url}:`, err);
});

proxy.onConnect((req, socket, _: Buffer, callback) => {
  const creds = getBasicProxyAuthCredentials(req as any);
  if (!creds) {
    console.error("[AUTH][CONNECT] no credentials");
    const res =
      "HTTP/1.1 407 Proxy Authentication Required\r\n" +
      'Proxy-Authenticate: Basic realm="Splashin"\r\n' +
      "Connection: close\r\n" +
      "Proxy-Connection: close\r\n" +
      "Content-Length: 0\r\n" +
      "\r\n";
    socket.write(res);
    socket.end();
    return;
  }
  const identity = identifyUser(creds.userId, creds.secret);
  if (identity instanceof Error) {
    console.error("[AUTH][CONNECT] invalid credentials");
    const res =
      "HTTP/1.1 403 Forbidden\r\n" +
      "Connection: close\r\n" +
      "Proxy-Connection: close\r\n" +
      "Content-Length: 0\r\n" +
      "\r\n";
    socket.write(res);
    socket.end();
    return;
  }
  socket.once("close", () => {
    // no-op for now
  });
  console.log(`[AUTH][CONNECT] identity="${identity}" (accepted)`);
  callback();
});

proxy.onRequest(async (ctx, callback) => {
  const headers = ctx.clientToProxyRequest.headers;
  const host = headers.host;
  const creds = getBasicProxyAuthCredentials(ctx.connectRequest);
  if (!creds) {
    console.error(
      "[AUTH][REQUEST] no credentials",
      `${host}${ctx.clientToProxyRequest.url}`,
    );
    if (!host || isIP(host.split(":")[0] ?? "")) {
      console.error("Stopping circular request");
      ctx.proxyToClientResponse.end();
      return;
    } else {
      return callback();
    }
  }
  const userId = creds.userId;
  console.log(
    `[${ctx.clientToProxyRequest.method}][${userId}] ${
      host
    }${ctx.clientToProxyRequest.url?.slice(0, 50)}`,
  );

  // if (headers.authorization) {
  //   await db
  // }

  const url = ctx.clientToProxyRequest.url;
  if (gameDashboardMatcher.test(url ?? "")) {
    console.log("Detected dashboard request");
    await gameDashboardHandler(ctx, callback);
    return; // Don't call callback() - we're handling this completely
  } else if (getLocationByIdMatcher.test(url ?? "")) {
    console.log("Detected location request");
    await getLocationByIdHandler(ctx, callback);
    return; // Don't call callback() - we're handling this completely
  } else if (playersMatcher.test(url ?? "")) {
    console.log("Detected players request");
    await playersHandler(ctx, callback);
    return; // Don't call callback() - we're handling this completely
  }

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
  ) => {
    if (gameDashboardMatcher.test(ctx.clientToProxyRequest.url ?? "")) {
      console.log("Response stuff");
      try {
        console.log("[RESPONSE HEADERS]", ctx.serverToProxyResponse?.headers);
      } catch (err) {
        console.error("Something went awry!", err);
      }
    }

    callback(null);
  },
);

proxy.onResponseData(
  (
    ctx,
    chunk,
    callback, //console.log('response data length: ' + chunk.length);
  ) => callback(null, chunk),
);

proxy.listen({ port, host, keepAlive: true });
console.log(`listening on ${port}`);

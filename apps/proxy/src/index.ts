import { Proxy } from "http-mitm-proxy";

import { eq } from "@splashin/db";
import { db } from "@splashin/db/client";
import { splashinUser, user as userTable } from "@splashin/db/schema";

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
const port = 9090;

const proxy = new Proxy();

// Ensure unexpected errors never crash the proxy process
process.on("uncaughtException", (err) => {
  console.error("[PROCESS] uncaughtException", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("[PROCESS] unhandledRejection", reason);
});

async function identifyUser(
  username: string,
  password: string,
): Promise<string | Error> {
  try {
    const user = await db.query.user.findFirst({
      where: eq(userTable.id, username),
    });
    if (password !== user?.secret) return new Error("Invalid password");
    console.log(`[IDENTIFY] user="${user.name}"`);
    return username;
  } catch (err) {
    console.error("[IDENTIFY] error while looking up user", err);
    return new Error("Identification failed");
  }
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

proxy.onConnect(async (req, socket, _: Buffer, callback) => {
  try {
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
    const identity = await identifyUser(creds.userId, creds.secret);
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
  } catch (err) {
    console.error("[CONNECT] unexpected error", err);
    try {
      const res =
        "HTTP/1.1 500 Internal Server Error\r\n" +
        "Connection: close\r\n" +
        "Proxy-Connection: close\r\n" +
        "Content-Length: 0\r\n" +
        "\r\n";
      socket.write(res);
    } catch {}
    socket.end();
  }
});

proxy.onRequest(async (ctx, callback) => {
  try {
    const headers = ctx.clientToProxyRequest.headers;
    const host = headers.host;
    const approvedHosts = process.env.APPROVED_HOSTS?.split(",") ?? [];
    if (!approvedHosts.some((approvedHost) => host?.includes(approvedHost))) {
      console.error("[AUTH][REQUEST] host not approved", host);
      ctx.proxyToClientResponse.end();
      return;
    }
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
    if (headers.authorization || headers.apiKey) {
      try {
        await db
          .update(splashinUser)
          .set({
            authToken: headers.authorization,
            apiKey: headers.apiKey as string | undefined,
          })
          .where(eq(splashinUser.userId, userId));
      } catch (err) {
        console.error("[AUTH][REQUEST] failed to persist auth headers", err);
      }
    }

    const url = ctx.clientToProxyRequest.url;
    if (gameDashboardMatcher.test(url ?? "")) {
      console.log("Detected dashboard request");
      try {
        await gameDashboardHandler(ctx, callback);
      } catch (err) {
        console.error("[HANDLER][GAME_DASHBOARD] error", err);
        return callback();
      }
      return; // Don't call callback() - we're handling this completely
    } else if (getLocationByIdMatcher.test(url ?? "")) {
      console.log("Detected location request");
      try {
        await getLocationByIdHandler(ctx, callback);
      } catch (err) {
        console.error("[HANDLER][LOCATION_BY_ID] error", err);
        return callback();
      }
      return; // Don't call callback() - we're handling this completely
    } else if (playersMatcher.test(url ?? "")) {
      console.log("Detected players request");
      try {
        await playersHandler(ctx, callback);
      } catch (err) {
        console.error("[HANDLER][PLAYERS] error", err);
        return callback();
      }
      return; // Don't call callback() - we're handling this completely
    }

    return callback();
  } catch (err) {
    console.error("[REQUEST] unexpected error", err);
    try {
      return callback();
    } catch (cbErr) {
      console.error("[REQUEST] callback error", cbErr);
      ctx.proxyToClientResponse.end();
    }
  }
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

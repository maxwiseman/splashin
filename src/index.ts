const host = "0.0.0.0";
const port = 80;

import { Proxy } from "http-mitm-proxy";
const proxy = new Proxy();

proxy.onError((ctx, err, errorKind) => {
  // ctx may be null
  const url = ctx?.clientToProxyRequest?.url || "";
  console.error(`${errorKind} on ${url}:`, err);
});

proxy.onRequest((ctx, callback) => {
  //console.log('REQUEST: http://' + ctx.clientToProxyRequest.headers.host + ctx.clientToProxyRequest.url);
  if (ctx.clientToProxyRequest.headers.host == "www.google.com") {
    ctx.use(Proxy.gunzip);

    ctx.onResponseData((ctx, chunk, callback) => {
      chunk = Buffer.from(chunk.toString().replaceAll(/Google/gi, "MITM"));
      return callback(null, chunk);
    });
  }
  return callback();
});

proxy.onRequestData(
  (
    ctx,
    chunk,
    callback //console.log('request data length: ' + chunk.length);
  ) => callback(null, chunk)
);

proxy.onResponse(
  (
    ctx,
    callback //console.log('RESPONSE: http://' + ctx.clientToProxyRequest.headers.host + ctx.clientToProxyRequest.url);
  ) => callback(null)
);

proxy.onResponseData(
  (
    ctx,
    chunk,
    callback //console.log('response data length: ' + chunk.length);
  ) => callback(null, chunk)
);

proxy.listen({ port, host });
console.log(`listening on ${port}`);

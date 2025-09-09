import { ErrorCallback, IContext } from "http-mitm-proxy";
import * as zlib from "zlib";
import * as https from "https";
import * as http from "http";

export type DataModifier = (decompressedData: string) => string;

export interface ProxyHandlerOptions {
  /** Function to modify the decompressed data before sending to client */
  dataModifier?: DataModifier;
  /** Whether to log the original and modified data */
  logData?: boolean;
  /** Custom log prefix for debugging */
  logPrefix?: string;
}

/**
 * Creates a reusable handler for intercepting and modifying compressed HTTP responses
 * Takes complete control of the request/response cycle to handle all compression types properly
 * Handles gzip, deflate, and brotli compression automatically
 */
export function createProxyHandler(options: ProxyHandlerOptions = {}) {
  const {
    dataModifier = (data) => data, // Default: pass through unchanged
    logData = false,
    logPrefix = "PROXY_HANDLER",
  } = options;

  return function proxyHandler(ctx: IContext, callback: ErrorCallback) {
    if (logData) {
      console.log(`\n\n[${logPrefix}] Taking full control of request`);
    }

    // Don't call callback() - we'll handle the entire request/response ourselves

    // Make the request to the target server ourselves
    const clientReq = ctx.clientToProxyRequest;
    const protocol = clientReq.headers.host?.includes("localhost")
      ? http
      : https;
    const options = {
      hostname: clientReq.headers.host,
      port: protocol === https ? 443 : 80,
      path: clientReq.url,
      method: clientReq.method,
      headers: {
        ...clientReq.headers,
        host: clientReq.headers.host,
      },
    };

    if (logData) {
      console.log(
        `[${logPrefix}] Making request to: ${options.hostname}${options.path}`
      );
    }

    const proxyReq = protocol.request(options, (proxyRes) => {
      if (logData) {
        console.log(`[${logPrefix}] Response status:`, proxyRes.statusCode);
        console.log(`[${logPrefix}] Response headers:`, proxyRes.headers);
      }

      // Copy response headers to client (remove compression headers)
      const responseHeaders = { ...proxyRes.headers };
      const originalEncoding = responseHeaders["content-encoding"];
      delete responseHeaders["content-encoding"];
      delete responseHeaders["content-length"];

      ctx.proxyToClientResponse.writeHead(
        proxyRes.statusCode || 200,
        responseHeaders
      );

      let responseBuffer = Buffer.alloc(0);

      proxyRes.on("data", (chunk) => {
        responseBuffer = Buffer.concat([responseBuffer, chunk]);
      });

      proxyRes.on("end", () => {
        try {
          if (logData) {
            console.log(
              `[${logPrefix}] Raw response buffer length:`,
              responseBuffer.length
            );
          }

          // Decompress based on original encoding
          let decompressedData: string;

          if (originalEncoding === "br") {
            if (logData)
              console.log(`[${logPrefix}] Decompressing Brotli data...`);
            const decompressed = zlib.brotliDecompressSync(responseBuffer);
            decompressedData = decompressed.toString("utf8");
          } else if (originalEncoding === "gzip") {
            if (logData)
              console.log(`[${logPrefix}] Decompressing gzip data...`);
            const decompressed = zlib.gunzipSync(responseBuffer);
            decompressedData = decompressed.toString("utf8");
          } else if (originalEncoding === "deflate") {
            if (logData)
              console.log(`[${logPrefix}] Decompressing deflate data...`);
            const decompressed = zlib.inflateSync(responseBuffer);
            decompressedData = decompressed.toString("utf8");
          } else {
            if (logData)
              console.log(`[${logPrefix}] No compression, using raw data`);
            decompressedData = responseBuffer.toString("utf8");
          }

          if (logData) {
            console.log(
              `[${logPrefix}] Decompressed data length:`,
              decompressedData.length
            );
            console.log(
              `[${logPrefix}] First 200 chars:`,
              decompressedData.substring(0, 200)
            );
          }

          // Apply user's data modification
          const modifiedData = dataModifier(decompressedData);

          if (logData && modifiedData !== decompressedData) {
            console.log(`[${logPrefix}] Data was modified`);
          }

          // Send modified response to client
          ctx.proxyToClientResponse.write(modifiedData);
          ctx.proxyToClientResponse.end();

          if (logData) {
            console.log(
              `[${logPrefix}] Successfully sent modified response to client`
            );
          }
        } catch (error) {
          console.error(`[${logPrefix}] Error processing response:`, error);
          // Send original data on error
          ctx.proxyToClientResponse.write(responseBuffer);
          ctx.proxyToClientResponse.end();
        }
      });
    });

    proxyReq.on("error", (error) => {
      console.error(`[${logPrefix}] Proxy request error:`, error);
      ctx.proxyToClientResponse.writeHead(500);
      ctx.proxyToClientResponse.end("Proxy Error");
    });

    // Forward request body if present
    if (clientReq.method === "POST" || clientReq.method === "PUT") {
      clientReq.on("data", (chunk) => {
        proxyReq.write(chunk);
      });
      clientReq.on("end", () => {
        proxyReq.end();
      });
    } else {
      proxyReq.end();
    }
  };
}

/**
 * Convenience function for JSON data modification
 */
export function createJsonModifier(modifier: (json: any) => any): DataModifier {
  return (data: string) => {
    try {
      const json = JSON.parse(data);
      const modifiedJson = modifier(json);
      return JSON.stringify(modifiedJson);
    } catch (error) {
      console.error("Error parsing/modifying JSON:", error);
      return data; // Return original data if JSON parsing fails
    }
  };
}

/**
 * Convenience function for simple string replacement
 */
export function createStringModifier(
  searchValue: string | RegExp,
  replaceValue: string
): DataModifier {
  return (data: string) => {
    return data.replace(searchValue, replaceValue);
  };
}

// Backward compatibility aliases
export const createCompressionHandler = createProxyHandler;
export type CompressionHandlerOptions = ProxyHandlerOptions;

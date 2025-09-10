import * as http from "http";
import * as https from "https";
import * as zlib from "zlib";
import { ErrorCallback, IContext } from "http-mitm-proxy";

export type DataModifier = (
  decompressedData: string,
) => string | Promise<string>;
export type JsonModifier = (
  json: any,
) => any | Generator<any, void, unknown> | AsyncGenerator<any, void, unknown>;
export type AsyncJsonModifier = (
  json: any,
) => AsyncGenerator<any, void, unknown>;

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
        `[${logPrefix}] Making request to: ${options.hostname}${options.path}`,
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
        responseHeaders,
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
              responseBuffer.length,
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
              decompressedData.length,
            );
            console.log(
              `[${logPrefix}] First 200 chars:`,
              decompressedData.substring(0, 200),
            );
          }

          // Apply user's data modification (might be async)
          const modifierResult = dataModifier(decompressedData);

          // Handle both sync and async results
          Promise.resolve(modifierResult)
            .then((modifiedData) => {
              if (logData && modifiedData !== decompressedData) {
                console.log(`[${logPrefix}] Data was modified`);
              }

              // Send modified response to client (fallback to original if undefined)
              const responseData = modifiedData ?? decompressedData;
              ctx.proxyToClientResponse.write(responseData);
              ctx.proxyToClientResponse.end();

              if (logData) {
                console.log(
                  `[${logPrefix}] Successfully sent modified response to client`,
                );
              }
            })
            .catch((error) => {
              console.error(
                `[${logPrefix}] Error in async data modifier:`,
                error,
              );
              // Send original data on error
              ctx.proxyToClientResponse.write(decompressedData);
              ctx.proxyToClientResponse.end();
            });
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
 * Supports both regular functions and generator functions
 */
export function createJsonModifier(modifier: JsonModifier): DataModifier {
  return async (data: string) => {
    try {
      const json = JSON.parse(data);
      const result = modifier(json);

      // Check if result is a generator (sync or async)
      if (
        result &&
        typeof result === "object" &&
        typeof result.next === "function"
      ) {
        // Check if it's an async generator
        if (Symbol.asyncIterator in result) {
          // It's an async generator - await the first yielded value
          const asyncGenerator = result as AsyncGenerator<any, void, unknown>;
          const firstResult = await asyncGenerator.next();

          if (!firstResult.done) {
            // Continue processing in the background
            setImmediate(async () => {
              try {
                let nextResult = await asyncGenerator.next();
                while (!nextResult.done) {
                  nextResult = await asyncGenerator.next();
                }
              } catch (backgroundError) {
                console.error(
                  "Error in background async JSON processing:",
                  backgroundError,
                );
              }
            });

            // Return the first yielded value immediately
            return JSON.stringify(firstResult.value ?? json);
          } else {
            // Generator completed immediately without yielding
            return JSON.stringify(json);
          }
        } else {
          // It's a sync generator - get the first yielded value to send immediately
          const generator = result as Generator<any, void, unknown>;
          const firstResult = generator.next();

          if (!firstResult.done) {
            // Continue processing in the background (don't await)
            setImmediate(async () => {
              try {
                // Continue the generator to completion
                let nextResult = generator.next();
                while (!nextResult.done) {
                  nextResult = generator.next();
                }
              } catch (backgroundError) {
                console.error(
                  "Error in background JSON processing:",
                  backgroundError,
                );
              }
            });

            // Return the first yielded value immediately
            return JSON.stringify(firstResult.value ?? json);
          } else {
            // Generator completed immediately without yielding
            return JSON.stringify(json);
          }
        }
      } else {
        // Regular function result
        return JSON.stringify(result ?? json);
      }
    } catch (error) {
      console.error("Error parsing/modifying JSON:", error);
      return data; // Return original data if JSON parsing fails
    }
  };
}

/**
 * Convenience function for async JSON data modification with generator
 * Use this when you want to yield the JSON response immediately and continue processing in the background
 */
export function createAsyncJsonModifier(
  modifier: AsyncJsonModifier,
): DataModifier {
  return createJsonModifier(modifier);
}

/**
 * Convenience function for simple string replacement
 */
export function createStringModifier(
  searchValue: string | RegExp,
  replaceValue: string,
): DataModifier {
  return (data: string) => {
    return data.replace(searchValue, replaceValue);
  };
}

// Backward compatibility aliases
export const createCompressionHandler = createProxyHandler;
export type CompressionHandlerOptions = ProxyHandlerOptions;

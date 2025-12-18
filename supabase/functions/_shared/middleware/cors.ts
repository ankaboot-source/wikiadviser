import { MiddlewareHandler } from "npm:hono@4.7.4";
import ENV from "../schema/env.schema.ts";

const rootDomain = ENV.ROOT_DOMAIN;
function validateOrigin(origin: string) {
  return origin.endsWith(rootDomain);
}

const staticCorsHeaders = {
  "Access-Control-Allow-Methods": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  Vary: "Origin",
};

export const corsMiddleware: MiddlewareHandler = async (c, next) => {
  const req = c.req;
  const origin = req.header("Origin");

  // Handle OPTIONS preflight request
  if (req.method === "OPTIONS" && origin && validateOrigin(origin)) {
    const headers = new Headers(staticCorsHeaders);
    headers.set("Access-Control-Allow-Origin", origin);
    return new Response("ok", { headers });
  }

  await next();

  const res = c.res;
  // Attach CORS headers to the final response
  if (origin && validateOrigin(origin)) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    for (const [key, value] of Object.entries(staticCorsHeaders)) {
      res.headers.set(key, value);
    }
  }
};


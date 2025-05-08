import { MiddlewareHandler } from "hono";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export const corsMiddleware: MiddlewareHandler = async (c, next) => {
  // Set CORS headers before handling the request
  for (const [key, value] of Object.entries(corsHeaders)) {
    c.res.headers.set(key, value);
  }

  // Handle OPTIONS preflight request
  if (c.req.method === "OPTIONS") {
    return new Response(null, { headers: c.res.headers });
  }

  await next();
};

import { MiddlewareHandler } from "hono";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export const corsMiddleware: MiddlewareHandler = async (c, next) => {
  await next();

  // Attach CORS headers to the final response
  const res = c.res;
  for (const [key, value] of Object.entries(corsHeaders)) {
    res.headers.set(key, value);
  }
};

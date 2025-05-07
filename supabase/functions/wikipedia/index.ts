import { Hono } from "hono";
import { corsHeaders, corsMiddleware } from "../_shared/cors.ts";
import getWikipediaArticle from "./controller.ts";

const functionName = "wikipedia";
const app = new Hono().basePath(`/${functionName}`);

app.use("*", corsMiddleware);

app.get("/articles", getWikipediaArticle);

Deno.serve((req) => {
  // Global CORS preflight handler
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Let Hono handle everything else
  return app.fetch(req);
});

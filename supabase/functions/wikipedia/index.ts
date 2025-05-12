import { Hono } from "hono";
import { corsMiddleware } from "../_shared/middleware/cors.ts";
import getWikipediaArticle from "./controller.ts";

const functionName = "wikipedia";
const app = new Hono().basePath(`/${functionName}`);

app.use("*", corsMiddleware);

app.get("/articles", getWikipediaArticle);

Deno.serve((req) => {
  // Let Hono handle everything else
  return app.fetch(req);
});

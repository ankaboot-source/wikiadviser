import { Hono } from "npm:hono@4.7.4";
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

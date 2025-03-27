import { Hono } from "hono";
import { getWikipediaArticle } from "../controllers/wikipedia.ts";

export function wikipediaRoutes(app: Hono) {
  app.get("/wikipedia/articles", getWikipediaArticle);
}

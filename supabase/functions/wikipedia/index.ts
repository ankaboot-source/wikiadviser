import { Hono } from "hono";
import { corsMiddleware } from "../_shared/cors.ts";
import getWikipediaArticle from "./controller.ts";

const functionName = "wikipedia";
const app = new Hono().basePath(`/${functionName}`);

app.use("*", corsMiddleware);

app.get("/articles", getWikipediaArticle);

Deno.serve(app.fetch);

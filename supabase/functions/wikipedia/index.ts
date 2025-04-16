import { Hono } from "hono";
import getWikipediaArticle from "./controller.ts";

const functionName = "wikipedia";
const app = new Hono().basePath(`/${functionName}`);
app.get("/status", (context) => context.text("OK\n"));
app.get("/articles", getWikipediaArticle);

Deno.serve(app.fetch);

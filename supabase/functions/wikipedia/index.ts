import { Hono } from "hono";
import { cors } from "hono/cors";
import getWikipediaArticle from "./controller.ts";

const functionName = "wikipedia";
const app = new Hono().basePath(`/${functionName}`);

app.use(cors());
app.get("/articles", getWikipediaArticle);

Deno.serve(app.fetch);

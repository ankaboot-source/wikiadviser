import { Hono } from "hono";
import getWikipediaArticle from "./controller.ts";
import corsHeaders from "../_shared/cors.ts";

const functionName = "wikipedia";
const app = new Hono().basePath(`/${functionName}`);

// CORS middleware: adds headers to every response
app.use("*", async (c, next) => {
  await next();
  Object.entries(corsHeaders).forEach(([k, v]) => c.res.headers.set(k, v));
});
app.options("/*", (c) => {
  return c.text("ok", 200);
});

app.get("/articles", getWikipediaArticle);

Deno.serve(app.fetch);

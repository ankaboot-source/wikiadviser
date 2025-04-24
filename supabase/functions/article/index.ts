import { Hono } from "hono";
import corsHeaders from "../_shared/cors.ts";
import { createArticle } from "./createArticle.controller.ts";
import { deleteArticle, hasPermissions } from "./deleteArticle.controller.ts";

const functionName = "article";
const app = new Hono().basePath(`/${functionName}`);

app.use("*", async (c, next) => {
  await next();
  Object.entries(corsHeaders).forEach(([k, v]) => c.res.headers.set(k, v));
});
app.options("/*", (c) => {
  return c.text("ok", 200);
});

app.post("/", createArticle);
app.delete("/:id", hasPermissions(["owner"]), deleteArticle);
Deno.serve(app.fetch);

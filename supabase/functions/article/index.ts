import { Hono } from "hono";
import corsHeaders from "../_shared/cors.ts";
import { createArticle } from "./createArticle.controller.ts";
import { deleteArticle } from "./deleteArticle.ts";
import { hasPermissions } from "./hasPermission.ts";

const functionName = "article";
const app = new Hono().basePath(`/${functionName}`);

app.use("*", async (c, next) => {
  if (c.req.method === "OPTIONS") {
    return c.text("ok", 200, corsHeaders);
  }
  await next();
  Object.entries(corsHeaders).forEach(([k, v]) => {
    c.res.headers.set(k, v);
  });
});

app.post("/", createArticle);
app.delete("/:id", hasPermissions(["owner"]), deleteArticle);

Deno.serve(app.fetch);

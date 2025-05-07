import { Hono } from "hono";
import corsHeaders from "../_shared/cors.ts";
import { createArticle } from "./createArticle.controller.ts";
import { deleteArticle } from "./deleteArticle.ts";
import { hasPermissions } from "./hasPermission.ts";
import { importArticle } from "./importArticle.ts";
import { updateArticleChanges } from "./updateArticleChanges.ts";
import { deleteArticleRevision } from "./deleteArticleRevision.ts";

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
  return c.res;
});

app.post("/", createArticle);
app.post("/import", importArticle);
app.delete("/:id", hasPermissions(["owner"]), deleteArticle);
app.put(
  "/:id/changes",
  hasPermissions(["owner", "editor"]),
  updateArticleChanges,
);
app.delete(
  "/:id/revisions/:revId",
  hasPermissions(["owner"]),
  deleteArticleRevision,
);

Deno.serve(app.fetch);

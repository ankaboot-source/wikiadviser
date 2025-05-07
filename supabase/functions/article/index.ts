import { Hono } from "hono";
import { corsHeaders, corsMiddleware } from "../_shared/cors.ts";
import { createArticle } from "./createArticle.controller.ts";
import { deleteArticle } from "./deleteArticle.ts";
import { deleteArticleRevision } from "./deleteArticleRevision.ts";
import { hasPermissions } from "./hasPermission.ts";
import { importArticle } from "./importArticle.ts";
import { updateArticleChanges } from "./updateArticleChanges.ts";

const functionName = "article";
const app = new Hono().basePath(`/${functionName}`);

app.use("*", corsMiddleware);

app.post("/", createArticle);
app.post("/import", importArticle);
app.delete("/:id", hasPermissions(["owner"]), deleteArticle);
app.put(
  "/:id/changes",
  hasPermissions(["owner", "editor"]),
  updateArticleChanges
);
app.delete(
  "/:id/revisions/:revId",
  hasPermissions(["owner"]),
  deleteArticleRevision
);

Deno.serve((req) => {
  // Global CORS preflight handler
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Let Hono handle everything else
  return app.fetch(req);
});

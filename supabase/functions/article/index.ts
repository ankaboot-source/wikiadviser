import { Hono } from "npm:hono@4.7.4";
import { corsMiddleware } from "../_shared/middleware/cors.ts";
import { createArticle } from "./createArticle.ts";
import { deleteAllArticles } from "./deleteAllArticles.ts";
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
app.delete("/", deleteAllArticles);
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

Deno.serve((req) => {
  // Let Hono handle everything else
  return app.fetch(req);
});

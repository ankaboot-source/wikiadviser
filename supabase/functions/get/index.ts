import { Hono } from "npm:hono@4.7.4";
import { corsMiddleware } from "../_shared/middleware/cors.ts";
import { getProfile } from "./handlers/getProfile.ts";
import { getUsers } from "./handlers/getUsers.ts";
import { getArticles } from "./handlers/getArticles.ts";
import { getChanges } from "./handlers/getChanges.ts";

const functionName = "get";
const app = new Hono().basePath(`/${functionName}`);

app.use("*", corsMiddleware);

app.post("/profile", getProfile);
app.post("/users", getUsers);
app.post("/articles", getArticles);
app.post("/changes", getChanges);

Deno.serve((req) => {
  return app.fetch(req);
});

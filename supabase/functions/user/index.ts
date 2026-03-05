import { Hono } from "npm:hono@4.7.4";
import { corsMiddleware } from "../_shared/middleware/cors.ts";
import { setDefaultAvatar } from "./avatarHelper.ts";
import { setAnonUsername } from "./nameHelper.ts";

const functionName = "user";
const app = new Hono().basePath(`/${functionName}`);

app.use("*", corsMiddleware);

app.post("/avatar", setDefaultAvatar);
app.post("/name", setAnonUsername);

Deno.serve((req) => {
  return app.fetch(req);
});

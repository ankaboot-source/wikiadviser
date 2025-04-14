import { Hono } from "npm:hono@4.7.4";
import restrictMediawikiAccess from "./controller.ts";
import honoAuthorizationMiddleware from "../_shared/middleware/auth.ts";

const functionName = "restrictMediawikiAccess";
const app = new Hono().basePath(`/${functionName}`);

app.get("/status", (context) => context.text("OK\n"));

app.get("/mediawiki", honoAuthorizationMiddleware, restrictMediawikiAccess);

Deno.serve(app.fetch);

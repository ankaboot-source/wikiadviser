import { Hono } from "npm:hono@4.7.4";
import honoAuthorizationMiddleware from "../_shared/middleware/auth.ts";
import restrictMediawikiAccess from "./controller.ts";

const functionName = "restrictMediawikiAccess";
const app = new Hono().basePath(`/${functionName}`);

app.get("", honoAuthorizationMiddleware, restrictMediawikiAccess);

Deno.serve(app.fetch);

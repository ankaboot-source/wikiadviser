import { Hono } from "hono";
import honoAuthorizationMiddleware from "../_shared/middleware/auth.ts";
import restrictMediawikiAccess from "./controller.ts";

const functionName = "restrictMediawikiAccess";
const app = new Hono().basePath(`/${functionName}`);

app.get("/", honoAuthorizationMiddleware, restrictMediawikiAccess);

Deno.serve(app.fetch);

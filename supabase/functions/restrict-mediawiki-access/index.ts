import { Hono } from "hono";
import authorizationMiddleware from "../_shared/middleware/auth.ts";
import restrictMediawikiAccess from "./controller.ts";

const functionName = "restrictMediawikiAccess";
const app = new Hono().basePath(`/${functionName}`);

app.get("/", authorizationMiddleware, restrictMediawikiAccess);

Deno.serve(app.fetch);

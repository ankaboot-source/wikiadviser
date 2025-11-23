import { Hono } from "hono";
import restrictMediawikiAccess from "./controller.ts";

const functionName = "restrict-mediawiki-access";
const app = new Hono().basePath(`/${functionName}`);

app.get("/", restrictMediawikiAccess);

Deno.serve(app.fetch);

import { Hono } from "npm:hono@4.7.4";
import restrictMediawikiAccess from "./controller.ts";

const functionName = "restrict-mediawiki-access";
const app = new Hono().basePath(`/${functionName}`);

app.get("/", restrictMediawikiAccess);

Deno.serve(app.fetch);

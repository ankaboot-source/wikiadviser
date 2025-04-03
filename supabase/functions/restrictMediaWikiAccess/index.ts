import { Hono } from "npm:hono@4.7.4";
import restrictMediawikiAccess from "./controller.ts";

const functionName = "auth";
const app = new Hono().basePath(`/${functionName}`);

app.get("/status", (context) => context.text("OK\n"));
app.get("/mediawiki", restrictMediawikiAccess);

Deno.serve(app.fetch);

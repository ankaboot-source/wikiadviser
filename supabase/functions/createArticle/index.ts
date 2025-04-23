import { Hono } from "hono";

import { createArticle } from "./controller.ts";

const functionName = "article";
const app = new Hono().basePath(`/${functionName}`);

app.post("/", createArticle);
Deno.serve(app.fetch);

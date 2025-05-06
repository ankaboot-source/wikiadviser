import cors from "cors";
import { Hono } from "hono";
import getWikipediaArticle from "./controller.ts";

const functionName = "wikipedia";
const app = new Hono().basePath(`/${functionName}`);

app.use(cors());
app.get("/articles", getWikipediaArticle);

Deno.serve(app.fetch);

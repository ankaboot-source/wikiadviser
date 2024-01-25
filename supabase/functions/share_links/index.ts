import corsHeaders from "shared/cors.ts";
import express from "express";
import cors from "cors";

import { authorizeUser } from "shared/middlewares.ts";
import { verifyShareLink, createShareLink } from "./controllers.ts";

const app = express();

app.use(cors());
app.use(express.json());
app.use(authorizeUser);

app.post("/share_links", createShareLink);
app.get("/share_links/:token", verifyShareLink);

app.listen(3000);

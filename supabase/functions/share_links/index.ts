import cors from "cors";
import express from "express";

import authorizationMiddleware from "../_shared/middleware/supabaseUserAuthorization.ts";
import { createShareLink, verifyShareLink } from "./controllers.ts";

const app = express();

app.use(cors());
app.use(express.json());
app.use(authorizationMiddleware);

app.post("/share_links", createShareLink);
app.get("/share_links/:token", verifyShareLink);

app.listen(3000);

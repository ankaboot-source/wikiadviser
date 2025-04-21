import cors from "cors";
import express from "express";

import { authorizeUser } from "../_shared/middlewares";
import { createShareLink, verifyShareLink } from "./controllers.ts";

const app = express();

app.use(cors());
app.use(express.json());
app.use(authorizeUser);

app.post("/share_links", createShareLink);
app.get("/share_links/:token", verifyShareLink);

app.listen(3000);

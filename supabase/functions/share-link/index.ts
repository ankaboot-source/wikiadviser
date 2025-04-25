import cors from "cors";
import express from "express";

import { authorizeUser } from "../_shared/middlewares.ts";
import { createShareLink, verifyShareLink } from "./controllers.ts";

const app = express();

app.use(cors());
app.use(express.json());
app.use(authorizeUser);

app.post("/share-link", createShareLink);
app.get("/share-link/:token", verifyShareLink);

app.listen(3000);

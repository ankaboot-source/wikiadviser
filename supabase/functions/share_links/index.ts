import express from "npm:express@4.18.2";
import cors from "npm:cors@2.8.5";

import { authorizeUser } from "../_shared/middlewares.ts";
import { createShareLink, verifyShareLink } from "./controllers.ts";

const app = express();

app.use(cors());
app.use(express.json());
app.use(authorizeUser);

app.post("/share_links", createShareLink);
app.get("/share_links/:token", verifyShareLink);

app.listen(3000);

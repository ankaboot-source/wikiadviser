import { Hono } from "hono";
import { restrictMediawikiAccess } from "../controllers/auth.controller.ts";
const authRouter = new Hono();

authRouter.get("/mediawiki", restrictMediawikiAccess);

export default authRouter;

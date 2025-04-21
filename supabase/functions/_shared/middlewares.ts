import { NextFunction, Request, Response } from "express";
import createSupabaseClient from "./supabaseClient.ts";
import { Database } from "./types/index.ts";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export async function authorizeUser(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const supabaseClient = createSupabaseClient(req.headers["authorization"]);
  const { user } = (await supabaseClient.auth.getUser()).data;
  const profile: Profile = (
    await supabaseClient.from("profiles").select("*").eq("id", user.id).single()
  ).data;

  if (!profile) {
    return res.status(403).send("Unauthorized");
  }
  res.locals.user = profile;
  return next();
}

import createSupabaseClient from "shared/supabaseClient.ts";
import { Request, Response, NextFunction } from "express";
import { Database } from "shared/types.ts";

type Profile = Database["public"]["tables"]["profiles"]["row"];

export async function authorizeUser(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const supabaseClient = createSupabaseClient(req.headers["authorization"]);
  const { user } = (await supabaseClient.auth.getUser()).data;
  const { data: profile }: Profile = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return res.status(403).send("Unauthorized");
  }
  res.locals.user = profile;
  return next();
}

import createSupabaseClient from "./supabaseClient.ts";
import { NextFunction, Request, Response } from "npm:express@4.18.2";
import { Database } from "./types/database.types.ts";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export async function authorizeUser(
  req: Request,
  res: Response & { locals: { user: Profile } },
  next: NextFunction,
) {
  const supabaseClient = createSupabaseClient(req.headers["authorization"]);

  // Check user authentication
  const { user } = (await supabaseClient.auth.getUser()).data;
  if (!user) {
    return res.status(403).send("Unauthorized");
  }

  // Get user profile with type safety
  const { data: profile, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (error || !profile) {
    return res.status(403).send("Unauthorized");
  }

  res.locals.user = profile;
  return next();
}

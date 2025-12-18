import { Context, Next } from "npm:hono@4.7.4";
import SupabaseAuthorization from "./supabaseUserAuthorization.ts"; // Adjust path

async function honoAuthorizationMiddleware(c: Context, next: Next) {
  try {
    const authHandler = new SupabaseAuthorization();
    const user =
      (await authHandler.verifyToken(c)) ?? (await authHandler.verifyCookie(c));

    if (!user) {
      return c.json({ message: "Authorization denied" }, 401);
    }

    c.set("user", user);

    await next();
  } catch (error) {
    console.error("Authentication middleware error:", error);
    return c.json({ error: { message: "Oops! Something went wrong." } }, 500);
  }
}

export default honoAuthorizationMiddleware;

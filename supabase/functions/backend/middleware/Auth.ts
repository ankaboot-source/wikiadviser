import { Context, Next } from "hono"; // Import Context and Next
import { SupabaseAuthorization } from "../services/SupabaseResolver.ts"; // Adjust path

interface CustomUser {
  id: string;
  email: string;
}

/**
 * Hono middleware for verifying user sessions.
 */
async function authorizationMiddleware(c: Context, next: Next) {
  try {
    const authHandler = new SupabaseAuthorization(); // Removed logger
    const user: CustomUser | null =
      (await authHandler.verifyToken(c.req.header("authorization"))) ??
        (await authHandler.verifyCookie(c.req.header("cookie")));

    if (!user) {
      return c.json({ message: "Authorization denied" }, 401);
    }

    c.set("user", user);

    await next();
  } catch (error) {
    console.error("Error in authorizationMiddleware: ", error);
    return c.json(
      { error: { message: "Oops! Something went wrong." } },
      500,
    );
  }
}

export default authorizationMiddleware;

import { createClient } from "supabase";
import Authorization from "./AuthResolver";

interface CustomUser {
  id: string;
  email: string;
}

export class SupabaseAuthorization implements Authorization<CustomUser> {
  private readonly jwtKey = "sb-auth-token";

  constructor() {
  }

  async verifyToken(
    authorizationHeader: string | undefined,
  ): Promise<CustomUser | null> {
    if (!authorizationHeader) {
      return null;
    }

    const token = authorizationHeader.split(" ")[1]; // Assuming "Bearer <token>" format

    if (!token) {
      return null;
    }
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_PROJECT_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { fetch: fetch },
        auth: {
          persistSession: false,
        },
      },
    );
    const { data: { user }, error } = await supabaseClient.auth.getUser(token);

    if (error) {
      console.error("Error verifying token:", error);
      return null;
    }

    return user ? { email: user.email!, id: user.id } : null;
  }

  async verifyCookie(
    cookieHeader: string | undefined,
  ): Promise<CustomUser | null> {
    if (!cookieHeader) {
      return null;
    }

    // Parse the cookie header (you might need a cookie parsing library)
    const cookies: Record<string, string> = {};
    cookieHeader.split(";").forEach((cookie) => {
      const parts = cookie.split("=");
      if (parts.length === 2) {
        cookies[parts[0].trim()] = parts[1].trim();
      }
    });

    const supabaseSession = cookies["sb-xyclcwvzxcjxktqpmvlm-auth-token"]; // Replace with your actual cookie name

    if (!supabaseSession) {
      return null;
    }
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_PROJECT_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { fetch: fetch },
        auth: {
          persistSession: false,
        },
      },
    );
    const { data: { user }, error } = await supabaseClient.auth.getUser(
      supabaseSession,
    );

    if (error) {
      console.error("Error verifying cookie:", error);
      return null;
    }

    return user ? { email: user.email!, id: user.id } : null;
  }
}

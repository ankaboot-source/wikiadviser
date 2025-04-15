import { createServerClient } from "npm:@supabase/ssr@0.6.1";
import { type Context } from "npm:hono@4.7.4";
import {
  type CookieOptions as HonoCookieOptions,
  getCookie,
  setCookie,
} from "npm:hono@4.7.4/cookie";
import { type CookieSerializeOptions } from "npm:cookie@0.6.0";

import supabaseClient from "../supabaseClient.ts";

type SupabaseCookieToSet = {
  name: string;
  value: string;
  options?: Partial<CookieSerializeOptions>;
};

class SupabaseAuthorization {
  private readonly jwtKey = "x-sb-jwt";

  async verifyToken(context: Context) {
    // (Keep previous implementation - check null token, error handling etc)
    try {
      const token = context.req.header(this.jwtKey);
      if (!token) {
        console.warn("No JWT token found in header:", this.jwtKey);
        return null;
      }
      const { data, error } = await supabaseClient().auth.getUser(token);
      if (error) {
        console.error("Error verifying token:", error.message);
        return null;
      }
      return data?.user;
    } catch (e) {
      console.error("Exception during token verification:", e);
      return null;
    }
  }

  async verifyCookie(context: Context) {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ??
      Deno.env.get("SUPABASE_PROJECT_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl) {
      console.error(
        "Missing SUPABASE_URL or SUPABASE_PROJECT_URL environment variable.",
      );
      return context.json({ error: "Server config error" }, 500);
    }
    if (!supabaseAnonKey) {
      console.error("Missing SUPABASE_ANON_KEY environment variable.");
      return context.json({ error: "Server config error" }, 500);
    }

    try {
      const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          cookies: {
            getAll() {
              const cookies = getCookie(context);
              if (!cookies) {
                return [];
              }
              return Object.entries(cookies).map(([name, value]) => ({
                name,
                value,
              }));
            },
            setAll(cookiesToSet: SupabaseCookieToSet[]) {
              try {
                cookiesToSet.forEach(({ name, value, options }) => {
                  setCookie(context, name, value, options as HonoCookieOptions);
                });
              } catch (e) {
                console.error("Error setting cookies:", e);
              }
            },
            // delete(name: string, options: Partial<CookieSerializeOptions>) {
            //    // If implementing delete, adapt options similarly
            //    deleteCookie(context, name, options as HonoCookieOptions);
            // }
          },
        },
      );

      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Error getting session:", error.message);
        return null;
      }

      return data?.session?.user ?? null;
    } catch (e) {
      console.error(
        "Exception during cookie verification/session retrieval:",
        e,
      );
      return null;
    }
  }
}

export default SupabaseAuthorization;

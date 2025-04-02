import { createServerClient, parseCookieHeader } from "supabase-ssr";
import ENV from "./env.schema.ts";
import { Context } from "hono";
import supabaseClient from "./supabaseClient.ts";
import { setCookie } from "hono/cookie";
import { CookieOptions } from "hono/utils/cookie";

type Cookie = {
  name: string;
  value: string;
  options: CookieOptions;
};

export default class SupabaseAuthorization {
  private readonly jwtKey = "x-sb-jwt";

  constructor() {}

  async verifyToken(context: Context) {
    try {
      const token = context.req.header(this.jwtKey);
      const { data } = await supabaseClient().auth.getUser(token);
      return data?.user;
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  async verifyCookie(context: Context) {
    try {
      const supabase = createServerClient(
        ENV.SUPABASE_URL,
        ENV.SUPABASE_ANON_KEY,
        {
          cookies: {
            getAll() {
              return parseCookieHeader(context.req.header("Cookie") ?? "");
            },
            setAll(cookiesToSet: Cookie[]) {
              cookiesToSet.forEach(({ name, value, options }) =>
                setCookie(context, name, value, options)
              );
            },
          },
        },
      );
      const { data } = await supabase.auth.getSession();
      return data?.session?.user ?? null;
    } catch (e) {
      console.error(e);
      throw e;
    }
  }
}

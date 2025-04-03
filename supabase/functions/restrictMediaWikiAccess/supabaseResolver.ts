import { createServerClient, parseCookieHeader } from "npm:@supabase/ssr@0.6.1";
import { Context } from "npm:hono@4.7.4";
import { setCookie } from "npm:hono@4.7.4/cookie";
import ENV from "../_shared/env.schema.ts";
import { CookieOptions } from "npm:hono@4.7.4";
import supabaseClient from "../_shared/supabaseClient.ts";

type Cookie = {
  name: string;
  value: string;
  options?: CookieOptions;
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
              const cookies = parseCookieHeader(
                context.req.header("Cookie") ?? "",
              );
              return cookies.map(({ name, value }) => ({ name, value }));
            },
            setAll(cookiesToSet: Cookie[]) {
              cookiesToSet.forEach(({ name, value, options }) => {
                setCookie(context, name, value, options);
              });
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

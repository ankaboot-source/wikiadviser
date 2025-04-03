import { createClient } from "npm:@supabase/supabase-js@2.49.4";

export default function createSupabaseClient(authorization = "") {
  return createClient(
    Deno.env.get("SUPABASE_URL") as string,
    Deno.env.get("SUPABASE_ANON_KEY") as string,
    {
      global: {
        headers: { Authorization: authorization },
      },
    },
  );
}

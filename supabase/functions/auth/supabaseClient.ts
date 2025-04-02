import { createClient } from "supabase";

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

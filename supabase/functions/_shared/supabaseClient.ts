import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export default function createSupabaseClient(authorization = "") {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: {
        headers: { Authorization: authorization },
      },
    },
  );
}

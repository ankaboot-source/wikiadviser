import { createClient } from "npm:@supabase/supabase-js@2.49.4";

export default function createSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL") as string,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string,
  );
}

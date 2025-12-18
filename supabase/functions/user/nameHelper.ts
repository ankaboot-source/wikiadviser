import { Context } from "npm:hono@4.7.4";
import createSupabaseAdmin from "../_shared/supabaseAdmin.ts";
import createSupabaseClient from "../_shared/supabaseClient.ts";
import { generateName } from "./nameGenerator.ts";

export async function setAnonUsername(c: Context) {
  const supabaseClient = createSupabaseClient(c.req.header("Authorization"));
  const supabaseAdmin = createSupabaseAdmin();
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();
  if (!user) {
    return c.text("Unauthorized", {
      status: 401,
    });
  }

  const name = generateName();

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    user.id,
    {
      user_metadata: { display_name: name },
    },
  );

  if (updateError) {
    throw new Error(updateError.message);
  }

  return new Response("Name updated");
}

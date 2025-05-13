import { Context } from "hono";
import createSupabaseClient from "../_shared/supabaseClient.ts";
import generateAvatar from "./external-avatars/authUi.ts";

export async function deleteUserAvatar(c: Context) {
  const supabaseClient = createSupabaseClient(
    c.req.header("Authorization"),
  );
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();
  if (!user) {
    return c.text("Unauthorized", {
      status: 401,
    });
  }
  const profile = (
    await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()
  ).data;
  const backgrounds = (Deno.env
    .get("WIKIADVISER_BACKGROUND_COLORS") ?? "f6f8fa, ffffff")
    .split(", ");
  const { error: deleteError } = await supabaseClient
    .from("profiles")
    .update({
      avatar_url: generateAvatar(profile.email, backgrounds),
      default_avatar: true,
    })
    .eq("id", profile.id);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  return new Response("Avatar deleted");
}

import { Context } from "hono";
import ENV from "../_shared/schema/env.schema.ts";
import createSupabaseClient from "../_shared/supabaseClient.ts";
import buildAvatar from "./avatar-generator/avatarPlaceholder.ts";

export async function setDefaultAvatar(c: Context) {
  const supabaseClient = createSupabaseClient(c.req.header("Authorization"));
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();
  if (!user) {
    return c.text("Unauthorized", {
      status: 401,
    });
  }
  const profile = (
    await supabaseClient.from("profiles_view").select("*").eq("id", user.id)
      .single()
  ).data;

  const backgrounds = ENV.WIKIADVISER_BACKGROUND_COLORS;
  const isAnon = !profile.email;
  const avatar = buildAvatar(
    isAnon ? null : profile.display_name || profile.email,
    backgrounds,
  );

  const { error: updateError } = await supabaseClient
    .from("profiles")
    .update({
      avatar_url: avatar,
      default_avatar: true,
    })
    .eq("id", profile.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return new Response("Avatar updated");
}

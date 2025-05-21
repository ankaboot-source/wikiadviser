import { Context } from "hono";
import ENV from "../_shared/schema/env.schema.ts";
import createSupabaseClient from "../_shared/supabaseClient.ts";
import generateAvatar from "./external-avatars/authUi.ts";
import getGravatar from "./external-avatars/gravatar.ts";

export async function updateUserAvatar(c: Context) {
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
    await supabaseClient.from("profiles").select("*").eq("id", user.id).single()
  ).data;

  const backgrounds = ENV.WIKIADVISER_BACKGROUND_COLORS;

  let avatar = profile.avatar_url ?? (await getGravatar(profile.email));
  let defaultAvatar = false;

  if (!avatar) {
    avatar = generateAvatar(profile.email, backgrounds);
    defaultAvatar = true;
  }

  const { error: updateError } = await supabaseClient
    .from("profiles")
    .update({
      avatar_url: avatar,
      default_avatar: defaultAvatar,
    })
    .eq("id", profile.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return new Response("Avatar updated");
}

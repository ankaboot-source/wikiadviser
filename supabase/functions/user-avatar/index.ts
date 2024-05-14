import corsHeaders from "shared/cors.ts";
import createSupabaseClient from "shared/supabaseClient.ts";

import generateAvatar from "./external-avatars/authUi.ts";
import getGravatar from "./external-avatars/gravatar.ts";

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    const supabaseClient = createSupabaseClient(
      req.headers.get("Authorization")
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response("Unauthorized", {
        headers: corsHeaders,
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
    const backgrounds = Deno.env
      .get("WIKIADVISER_BACKGROUND_COLORS")
      .split(", ");

    switch (req.method) {
      case "POST": {
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

        return new Response("Avatar updated", { headers: corsHeaders });
      }

      case "DELETE": {
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

        return new Response("Avatar deleted", { headers: corsHeaders });
      }

      default:
        return new Response("Method not allowed", {
          headers: corsHeaders,
          status: 405,
        });
    }
  } catch (error) {
    return new Response(error.message, { headers: corsHeaders, status: 500 });
  }
});

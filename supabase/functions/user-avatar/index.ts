import { createClient } from "supabase";
import { encodeMD5 } from "./utils.ts";
import { Database } from "./types";

import ColorsGenerator from "./colors-generator/Generator.ts";
import generateAvatar from "./external-avatars/authUi.ts";
import getGravatar from "./external-avatars/gravatar.ts";

type usersRecord = Database["public"]["views"]["users"]["row"];

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL"),
      Deno.env.get("SUPABASE_ANON_KEY"),
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization") },
        },
      }
    );

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL"),
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    );

    const {
      data: { user },
    }: usersRecord = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const userId = user.id;
    const userEmail = user.email;
    const userAvatarURL = user.user_metadata.picture;
    const backgrounds = Deno.env
      .get("WIKIADVISER_BACKGROUND_COLORS")
      .split(", ");

    switch (req.method) {
      case "POST":
        if (userAvatarURL) {
          return new Response("Avatar already exists");
        }

        const avatar =
          (await getAvatar(userEmail)) ??
          generateAvatar(userEmail, backgrounds);

        const { error: updateError } =
          await supabaseAdmin.auth.admin.updateUserById(userId, {
            user_metadata: { picture: avatar },
          });

        if (updateError) {
          throw new Error(updateError.message);
        }

        return new Response("Avatar updated");

      case "DELETE":
        if (!userAvatarURL) {
          return new Response("Avatar doesn't exist");
        }
        const { error: deleteError } =
          await supabaseAdmin.auth.admin.updateUserById(userId, {
            user_metadata: {
              picture: await generateAvatar(userEmail, backgrounds),
            },
          });

        if (deleteError) {
          throw new Error(deleteError.message);
        }

        return new Response("Avatar deleted");

      default:
        return new Response("Method not allowed", { status: 405 });
    }
  } catch (error) {
    return new Response(error.message, { status: 500 });
  }
});

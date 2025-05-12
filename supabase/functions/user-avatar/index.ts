import { corsMiddleware } from "../_shared/middleware/cors.ts";
import createSupabaseClient from "../_shared/supabaseClient.ts";
import { Hono } from "hono";
import generateAvatar from "./external-avatars/authUi.ts";
import getGravatar from "./external-avatars/gravatar.ts";

const functionName = "user-avatar";
const app = new Hono().basePath(`/${functionName}`);
app.use("*", corsMiddleware);
app.post("/", async (c) => {
  const supabaseClient = createSupabaseClient(
    c.req.header("Authorization")!,
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
  const backgrounds = Deno.env
    .get("WIKIADVISER_BACKGROUND_COLORS")!
    .split(", ");
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
});

app.delete("/:id", async (c) => {
  const supabaseClient = createSupabaseClient(
    c.req.header("Authorization")!,
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
  const backgrounds = Deno.env
    .get("WIKIADVISER_BACKGROUND_COLORS")!
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
});

Deno.serve((req) => {
  try {
    if (req.method !== "POST" && req.method !== "DELETE") {
      return new Response("Method not allowed", {
        status: 405,
      });
    }
    return app.fetch(req);
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "An unknown error occurred";
    return new Response(message, { status: 500 });
  }
});

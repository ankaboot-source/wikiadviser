import { Context } from "npm:hono@4.7.4";
import createSupabaseAdmin from "../_shared/supabaseAdmin.ts";
import createSupabaseClient from "../_shared/supabaseClient.ts";

export async function updateLlmReviewerConfig(c: Context) {
  const supabaseClient = createSupabaseClient(c.req.header("Authorization"));
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();

  if (!user) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  let body: { llm_reviewer_config: JSON };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ message: "Invalid JSON body" }, 400);
  }

  if (
    !body.llm_reviewer_config ||
    typeof body.llm_reviewer_config !== "object" ||
    Array.isArray(body.llm_reviewer_config)
  ) {
    return c.json(
      { message: "Missing or invalid field: llm_reviewer_config" },
      400,
    );
  }

  const supabaseAdmin = createSupabaseAdmin();

  const { data: profileData } = await supabaseAdmin
    .from("profiles")
    .select("llm_reviewer_config")
    .eq("id", user.id)
    .single();

  const existingConfig = typeof profileData?.llm_reviewer_config === "object" &&
      profileData?.llm_reviewer_config !== null &&
      !Array.isArray(profileData?.llm_reviewer_config)
    ? profileData.llm_reviewer_config
    : {};

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      llm_reviewer_config: {
        ...existingConfig,
        ...body.llm_reviewer_config,
      },
    })
    .eq("id", user.id);

  if (error) {
    console.error("Error updating llm_reviewer_config:", error);
    return c.json({ message: "Failed to update profile" }, 500);
  }

  return c.json({ success: true }, 200);
}

import { Context } from "npm:hono@4.7.4";
import { getOwnedArticles } from "../_shared/helpers/supabaseHelper.ts";
import createSupabaseAdmin from "../_shared/supabaseAdmin.ts";
import createSupabaseClient from "../_shared/supabaseClient.ts";
import { deleteArticleByArticleId } from "./deleteArticle.ts";

/**
 * Retrieves Wikipedia articles based on the provided search term and language.
 * @param {Context} context - The Hono context object.
 */
export async function deleteAllArticles(context: Context) {
  const authHeader = context.req.header("Authorization");
  const apiKey = context.req.header("apikey");

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  const isServiceRole = apiKey === serviceRoleKey ||
    authHeader === `Bearer ${serviceRoleKey}`;

  console.log("Internal request?:", isServiceRole);

  let user_id: string | null = null;
  let supabaseClient;

  if (!isServiceRole) {
    supabaseClient = createSupabaseClient(authHeader);
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(``, {
        status: 401,
      });
    }

    user_id = user.id;
  } else {
    user_id = context.req.header("x-user-id") || null;
    supabaseClient = createSupabaseAdmin();
  }

  if (!user_id || !supabaseClient) {
    console.error("Unauthorized: No user ID or Supabase client available");
    return new Response("", { status: 400 });
  }

  console.log("deleting all articles for user:", user_id);

  try {
    const articles = await getOwnedArticles(user_id);

    for (const article of articles) {
      try {
        console.info(`Deleting article ${article.article_id}...`);
        await deleteArticleByArticleId(article.article_id, article.language);
      } catch (error) {
        console.error(`Failed to delete article ${article.article_id}:`, error);
      }
    }
    return context.json({ message: "All articles deleted" }, 200);
  } catch (error) {
    console.error(error);
    if (error instanceof Error) {
      return context.json({ error: error.message }, 500);
    }
    return context.json(
      {
        error: "An unexpected error occurred while deleting articles",
      },
      500,
    );
  }
}

import { Context } from "hono";
import {
  deleteArticleDB,
  getArticle,
} from "../_shared/helpers/supabaseHelper.ts";
import MediawikiClient from "./MediawikiClient.ts";
import wikipediaApi from "../_shared/wikipedia/WikipediaApi.ts";
import corsHeaders from "../_shared/cors.ts";
import createSupabaseClient from "../_shared/supabaseClient.ts";
/**
 * Retrieves Wikipedia articles based on the provided search term and language.
 * @param {Context} context - The Hono context object.
 */
export async function deleteArticle(context: Context) {
  const { id: articleId } = context.req.param();

  const supabaseClient = createSupabaseClient(
    context.req.header("Authorization"),
  );

  const {
    data: { user },
  } = await supabaseClient.auth.getUser();

  if (!user) {
    return new Response("", {
      headers: corsHeaders,
      status: 401,
    });
  }

  try {
    const { language } = await getArticle(articleId);
    const mediawiki = new MediawikiClient(language, wikipediaApi);
    await mediawiki.deleteArticleMW(articleId);
    await deleteArticleDB(articleId);
    return context.json({ message: `Article ${articleId} deleted` }, 200);
  } catch (error) {
    if (error instanceof Error) {
      return context.json({ error: error.message }, 500);
    }
    return context.json({ error: "An unexpected error occurred" }, 500);
  }
}

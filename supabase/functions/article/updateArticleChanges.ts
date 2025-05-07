import { Context } from "hono";
import { getArticle } from "../_shared/helpers/supabaseHelper.ts";
import createSupabaseClient from "../_shared/supabaseClient.ts";
import wikipediaApi from "../_shared/wikipedia/WikipediaApi.ts";
import MediawikiClient from "./MediawikiClient.ts";

/**
 * Updates the changes made to a specified article in a MediaWiki instance.
 *
 * @param {Context} c - The Hono context object.
 */
export async function updateArticleChanges(c: Context) {
  const { id: articleId } = c.req.param();

  const supabaseClient = createSupabaseClient(c.req.header("Authorization"));

  const {
    data: { user },
  } = await supabaseClient.auth.getUser();
  if (!user) {
    return new Response("", {
      status: 401,
    });
  }
  const { diffHtml } = await c.req.json();

  try {
    const { language } = await getArticle(articleId);
    const mediawiki = new MediawikiClient(language, wikipediaApi);
    await mediawiki.updateChanges(articleId, user.id, diffHtml);

    console.info({ articleId }, "Updated Changes of article");
    return c.json({ message: "Updating changes succeeded." }, 200);
  } catch (error) {
    console.error(error);
    return c.json({ error: "An error occurred while updating changes." }, 500);
  }
}

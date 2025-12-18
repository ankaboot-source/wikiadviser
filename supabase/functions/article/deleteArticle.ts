import { Context } from 'npm:hono@4.7.4';
import {
  deleteArticleDB,
  getArticle,
} from '../_shared/helpers/supabaseHelper.ts';
import createSupabaseClient from '../_shared/supabaseClient.ts';
import wikipediaApi from '../_shared/wikipedia/WikipediaApi.ts';
import MediawikiClient from '../_shared/mediawikiAPI/MediawikiClient.ts';
/**
 * Retrieves Wikipedia articles based on the provided search term and language.
 * @param {Context} context - The Hono context object.
 */
export async function deleteArticle(context: Context) {
  const { id: articleId } = context.req.param();

  const supabaseClient = createSupabaseClient(
    context.req.header('Authorization')
  );

  const {
    data: { user },
  } = await supabaseClient.auth.getUser();

  if (!user) {
    return new Response('', {
      status: 401,
    });
  }

  try {
    await deleteArticleByArticleId(articleId);
    return context.json({ message: `Article ${articleId} deleted` }, 200);
  } catch (error) {
    console.error(error);
    if (error instanceof Error) {
      return context.json({ error: error.message }, 500);
    }
    return context.json(
      {
        error: 'An unexpected error occurred while deleting the article',
      },
      500
    );
  }
}

export async function deleteArticleByArticleId(
  articleId: string,
  language?: string
) {
  if (!language) ({ language } = await getArticle(articleId));

  const mediawiki = new MediawikiClient(language as string, wikipediaApi);

  try {
    await mediawiki.deleteArticleMW(articleId);
    await deleteArticleDB(articleId);
    console.log(`Article ${articleId} deleted`);
  } catch (error) {
    console.error(`Failed to delete article ${articleId}:`, error);
    throw error;
  }
}

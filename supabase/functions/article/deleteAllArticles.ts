import { Context } from 'hono';
import { getOwnedArticles } from '../_shared/helpers/supabaseHelper.ts';
import createSupabaseClient from '../_shared/supabaseClient.ts';
import { deleteArticleByArticleId } from './deleteArticle.ts';

/**
 * Retrieves Wikipedia articles based on the provided search term and language.
 * @param {Context} context - The Hono context object.
 */
export async function deleteAllArticles(context: Context) {
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
    const articles = await getOwnedArticles(user.id);

    for (const article of articles) {
      try {
        console.info(`Deleting article ${article.article_id}...`);
        await deleteArticleByArticleId(article.article_id, article.language);
      } catch (error) {
        console.error(`Failed to delete article ${article.article_id}:`, error);
      }
    }
    return context.json({ message: 'All articles deleted' }, 200);
  } catch (error) {
    console.error(error);
    if (error instanceof Error) {
      return context.json({ error: error.message }, 500);
    }
    return context.json(
      {
        error: 'An unexpected error occurred while deleting articles',
      },
      500
    );
  }
}

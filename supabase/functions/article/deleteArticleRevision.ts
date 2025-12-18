import { Context } from 'npm:hono@4.7.4';
import { getArticle } from '../_shared/helpers/supabaseHelper.ts';
import createSupabaseClient from '../_shared/supabaseClient.ts';
import wikipediaApi from '../_shared/wikipedia/WikipediaApi.ts';
import MediawikiClient from '../_shared/mediawikiAPI/MediawikiClient.ts';
/**
 * Retrieves Wikipedia articles based on the provided search term and language.
 * @param {Context} context - The Hono context object.
 */
export async function deleteArticleRevision(context: Context) {
  const { id: articleId, revId: revisionId } = context.req.param();

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
    const { language } = await getArticle(articleId);
    const mediawiki = new MediawikiClient(language, wikipediaApi);
    const revision = await mediawiki.deleteRevision(articleId, revisionId);
    await supabaseClient.from('revisions').delete().eq('revid', revisionId);
    return context.json(
      {
        message: `Deleted revision(${revisionId}).`,
        revision,
      },
      200
    );
  } catch (error) {
    console.error(error);
    return context.json(
      {
        message: 'An unexpected error occurred',
        error: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}

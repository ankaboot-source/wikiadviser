import { Context } from 'npm:hono@4.7.4';
import { getArticle } from '../_shared/helpers/supabaseHelper.ts';
import createSupabaseClient from '../_shared/supabaseClient.ts';
import wikipediaApi from '../_shared/wikipedia/WikipediaApi.ts';
import MediawikiClient from '../_shared/mediawikiAPI/MediawikiClient.ts';

/**
 * Updates the changes made to a specified article in a MediaWiki instance.
 *
 * @param {Context} c - The Hono context object.
 */
export async function updateArticleChanges(c: Context) {
  const { id: articleId } = c.req.param();

  const supabaseClient = createSupabaseClient(c.req.header('Authorization'));

  const {
    data: { user },
  } = await supabaseClient.auth.getUser();
  if (!user) {
    return new Response('', {
      status: 401,
    });
  }

  const { diffHtml, miraBotId } = await c.req.json();

  const contributorId = miraBotId || user.id;

  try {
    const article = await getArticle(articleId);
    const { language, imported } = article;
    const { data: existingRevisions, error: revisionError } =
      await supabaseClient
        .from('revisions')
        .select('id')
        .eq('article_id', articleId);

    if (revisionError) {
      throw new Error(revisionError.message);
    }
    const hideChanges =
      (!imported && !existingRevisions) || existingRevisions.length === 0;
    const mediawiki = new MediawikiClient(language, wikipediaApi);

    await mediawiki.updateChanges(
      articleId,
      contributorId,
      diffHtml,
      hideChanges
    );
    return c.json({ message: 'Updating changes succeeded.' }, 200);
  } catch (error) {
    console.error(error);
    return c.json({ error: 'An error occurred while updating changes.' }, 500);
  }
}

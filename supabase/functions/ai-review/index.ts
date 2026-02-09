import { Hono } from 'npm:hono@4.7.4';
import { corsMiddleware } from '../_shared/middleware/cors.ts';
import createSupabaseClient from '../_shared/supabaseClient.ts';
import {
  getArticle,
  addMiraBotPermission,
} from '../_shared/helpers/supabaseHelper.ts';
import MediawikiClient from '../_shared/mediawikiAPI/MediawikiClient.ts';
import wikipediaApi from '../_shared/wikipedia/WikipediaApi.ts';
import { processAllBatches } from './services/batchService.ts';
import { processResponses, applyChanges } from './services/wikitextService.ts';
import { getLLMConfig, getMiraBotId } from './services/configService.ts';

const app = new Hono().basePath('/ai-review');
app.use('*', corsMiddleware);

app.post('/', async (c) => {
  try {
    console.log('AI Review started');
    const { article_id, prompt } = await c.req.json();
    if (!article_id) return c.json({ error: 'Missing article_id' }, 400);
    const authHeader = c.req.header('Authorization');
    if (!authHeader) return c.json({ error: 'Unauthorized' }, 401);

    const supabase = createSupabaseClient(authHeader);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const MIRA_BOT_ID = await getMiraBotId(supabase);
    if (!MIRA_BOT_ID) return c.json({ error: 'Mira bot not configured' }, 500);
    await addMiraBotPermission(article_id);
    const article = await getArticle(article_id);
    if (!article) return c.json({ error: 'Article not found' }, 404);

    const articleContext = {
      title: article.title as string,
      description: article.description as string | null,
    };

    console.log('Article context created:', articleContext);

    const config = await getLLMConfig(
      supabase,
      user.id,
      articleContext,
      prompt,
    );
    if (!config) {
      return c.json({ error: 'No AI API key configured' }, 400);
    }

    const mediawiki = new MediawikiClient(article.language, wikipediaApi);
    const revisions = await mediawiki.getRecentRevisions(article_id, 2);
    if (revisions.length === 0)
      return c.json({ error: 'No revisions found' }, 404);

    const [latest, parent] = [revisions[0], revisions[1] || revisions[0]];

    const [parentWikitext, latestWikitext] = await Promise.all([
      mediawiki.getArticleWikitextAtRevision(article_id, parent.revid),
      mediawiki.getArticleWikitextAtRevision(article_id, latest.revid),
    ]);
    console.log(`Parent wikitext: ${parentWikitext.length} chars`);
    console.log(`Latest wikitext: ${latestWikitext.length} chars`);

    const changes = await mediawiki.getRevisionDiff(
      article_id,
      parent.revid,
      latest.revid,
    );
    if (!changes || changes.length === 0) {
      return c.json({
        summary: 'No changes to review',
        trigger_diff_update: false,
      });
    }

    console.log(`Found ${changes.length} changes to review`);

    const aiResponses = await processAllBatches(
      changes,
      config,
      articleContext,
      10,
    );

    const { reviews, changesToApply } = processResponses(aiResponses, changes);

    if (changesToApply.length === 0) {
      return c.json({
        summary: 'No improvements needed.',
        total_reviewed: changes.length,
        total_improvements: 0,
        reviews,
        trigger_diff_update: false,
      });
    }

    const { improvedWikitext, appliedCount } = applyChanges(
      latestWikitext,
      changesToApply,
    );

    if (appliedCount === 0) {
      console.log('No improvements could be applied');
      return c.json({
        summary: 'No improvements could be applied',
        total_reviewed: changes.length,
        total_improvements: 0,
        reviews,
        trigger_diff_update: false,
      });
    }

    if (improvedWikitext.trim() === latestWikitext.trim()) {
      console.log('Improved wikitext is identical to current version');
      return c.json({
        summary: 'The suggested improvements are already present.',
        total_reviewed: changes.length,
        total_improvements: 0,
        reviews,
        trigger_diff_update: false,
      });
    }

    console.log(
      `Wikitext changed: ${latestWikitext.length} → ${improvedWikitext.length} chars`,
    );
    const editResult = await mediawiki.editArticleAsBot(
      article_id,
      improvedWikitext,
      `Mira: improved ${appliedCount} change(s)`,
    );

    console.log('Revision created successfully');
    console.log(`  Old revision: ${editResult.oldrevid}`);
    console.log(`  New revision: ${editResult.newrevid}`);

    return c.json({
      summary: `Mira applied ${appliedCount} improvement(s)`,
      total_reviewed: changes.length,
      total_improvements: appliedCount,
      mira_bot_id: MIRA_BOT_ID,
      old_revision: editResult.oldrevid,
      new_revision: editResult.newrevid,
      reviews,
      trigger_diff_update: true,
      config_source: config.hasUserConfig ? 'user' : 'environment',
    });
  } catch (err) {
    console.error('Error:', err);
    return c.json({ error: 'Unexpected error', details: String(err) }, 500);
  }
});

Deno.serve((req) => app.fetch(req));

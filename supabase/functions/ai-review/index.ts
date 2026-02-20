import { Hono } from 'npm:hono@4.7.4';
import { corsMiddleware } from '../_shared/middleware/cors.ts';
import createSupabaseClient from '../_shared/supabaseClient.ts';
import {
  getArticle,
  addMiraBotPermission,
} from '../_shared/helpers/supabaseHelper.ts';
import { reviewAndImproveArticle } from './services/reviewService.ts';
import { improveRevisionChanges } from './services/commentReviewService.ts';
import { getLLMConfig, getMiraBotId } from './services/configService.ts';

type SupabaseClientType = ReturnType<typeof createSupabaseClient>;

interface RevisionImprovement {
  change_id: string;
  prompt: string;
}

const app = new Hono().basePath('/ai-review');
app.use('*', corsMiddleware);

app.post('/', async (c) => {
  try {
    console.info('AI review request received');

    const {
      article_id,
      prompt: customInstructions,
      revision_improvements,
    } = await c.req.json();
    const authHeader = c.req.header('Authorization');

    if (!article_id) {
      console.warn('Missing article_id in request');
      return c.json({ error: 'Missing article_id' }, 400);
    }
    if (!authHeader) {
      console.warn('Missing authorization header');
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const supabase = createSupabaseClient(authHeader);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.warn('Invalid user token');
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const MIRA_BOT_ID = await getMiraBotId(supabase);

    if (!MIRA_BOT_ID) {
      console.error('Mira bot not configured in database');
      return c.json({ error: 'Mira bot not configured' }, 500);
    }

    if (Array.isArray(revision_improvements) && revision_improvements.length > 0) {
      console.info('Processing revision-based improvements:', revision_improvements.length);

      const config = await getLLMConfig(supabase, user.id);

      if (!config) {
        console.error('No AI configuration available');
        return c.json({ error: 'No AI configuration available' }, 400);
      }

      const changeIds = (revision_improvements as RevisionImprovement[]).map((imp) => imp.change_id);
      const { data: changes, error: changesError } = await supabase
        .from('changes')
        .select('id, content, index')
        .in('id', changeIds);

      if (changesError) {
        console.error('Failed to fetch changes:', changesError);
        return c.json({ error: 'Failed to fetch changes' }, 500);
      }

      if (!changes || changes.length === 0) {
        console.error('No changes found');
        return c.json({ error: 'No changes found' }, 404);
      }

      const changeMap = new Map(
        changes.map((ch: { id: string; content: string; index: number | null }) => [ch.id, ch]),
      );

      const improvements = (revision_improvements as RevisionImprovement[])
        .map((imp) => {
          const ch = changeMap.get(imp.change_id);
          return ch
            ? { change_id: imp.change_id, prompt: imp.prompt, content: ch.content, index: ch.index }
            : null;
        })
        .filter((imp): imp is NonNullable<typeof imp> => imp !== null);

      const result = await improveRevisionChanges(article_id, improvements, config, MIRA_BOT_ID);

      if (!result.hasImprovements) {
        console.info('No improvements made');
        return c.json({
          summary: result.comment || 'No improvements needed',
          has_improvements: false,
          trigger_diff_update: false,
        });
      }

      return c.json({
        summary: result.comment,
        has_improvements: true,
        old_revision: result.oldRevisionId,
        new_revision: result.newRevisionId,
        mira_bot_id: MIRA_BOT_ID,
        trigger_diff_update: true,
      });
    }

    await addMiraBotPermission(article_id);
    const article = await getArticle(article_id);

    if (!article) {
      console.warn('Article not found');
      return c.json({ error: 'Article not found' }, 404);
    }

    const config = await getLLMConfig(supabase, user.id, customInstructions);

    if (!config) {
      console.error('No AI configuration available');
      return c.json({ error: 'No AI configuration available' }, 400);
    }

    console.info('LLM config retrieved', {
      model: config.model,
      hasUserConfig: config.hasUserConfig,
    });

    const result = await reviewAndImproveArticle(
      article_id,
      article.language,
      config,
      MIRA_BOT_ID,
      customInstructions,
    );

    if (!result.hasImprovements) {
      console.info('No improvements made');
      return c.json({
        summary: result.comment || 'No improvements needed',
        has_improvements: false,
        trigger_diff_update: false,
      });
    }

    return c.json({
      summary: result.comment,
      has_improvements: true,
      old_revision: result.oldRevisionId,
      new_revision: result.newRevisionId,
      mira_bot_id: MIRA_BOT_ID,
      trigger_diff_update: true,
      config_source: config.hasUserConfig ? 'user' : 'environment',
    });
  } catch (error) {
    console.error('AI review failed');
    return c.json(
      {
        error: 'Failed to process review',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    );
  }
});

Deno.serve((req) => app.fetch(req));
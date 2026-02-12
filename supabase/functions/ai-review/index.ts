import { Hono } from 'npm:hono@4.7.4';
import { corsMiddleware } from '../_shared/middleware/cors.ts';
import createSupabaseClient from '../_shared/supabaseClient.ts';
import {
  getArticle,
  addMiraBotPermission,
} from '../_shared/helpers/supabaseHelper.ts';
import { reviewAndImproveArticle } from './services/reviewService.ts';
import { getLLMConfig, getMiraBotId } from './services/configService.ts';

const app = new Hono().basePath('/ai-review');
app.use('*', corsMiddleware);

app.post('/', async (c) => {
  try {
    console.info('AI review request received');

    const { article_id, prompt: customInstructions } = await c.req.json();
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
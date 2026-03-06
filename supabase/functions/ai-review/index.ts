import { Hono, Context } from 'npm:hono@4.7.4';
import { corsMiddleware } from '../_shared/middleware/cors.ts';
import createSupabaseClient from '../_shared/supabaseClient.ts';
import {
  getArticle,
  addMiraBotPermission,
} from '../_shared/helpers/supabaseHelper.ts';
import { reviewAndImproveArticle } from './services/reviewService.ts';
import { improveRevisionChanges } from './services/commentReviewService.ts';
import { handleChatMessage } from './services/chatService.ts';
import { getLLMConfig, getMiraBotId } from './services/configService.ts';

interface RevisionImprovement {
  change_id: string;
  prompt: string;
}

type SupabaseClient = ReturnType<typeof createSupabaseClient>;

async function handleCommentReply(
  c: Context,
  supabase: SupabaseClient,
  userId: string,
  changeId: string,
  articleId: string,
  content: string,
) {
  const config = await getLLMConfig(supabase, userId);
  if (!config) {
    return c.json({ error: 'No AI configuration available' }, 400);
  }

  const MIRA_BOT_ID = await getMiraBotId(supabase);
  if (!MIRA_BOT_ID) {
    return c.json({ error: 'Mira bot not configured' }, 500);
  }

  await handleChatMessage(
    supabase,
    changeId,
    articleId,
    content,
    MIRA_BOT_ID,
    config,
  );
  return c.json({ ok: true });
}

async function handleRevisionImprovements(
  c: Context,
  supabase: SupabaseClient,
  userId: string,
  articleId: string,
  revisionImprovements: RevisionImprovement[],
  miraBotId: string,
) {
  const config = await getLLMConfig(supabase, userId);
  if (!config) {
    console.error('No AI configuration available');
    return c.json({ error: 'No AI configuration available' }, 400);
  }

  const changeIds = revisionImprovements.map((imp) => imp.change_id);
  const { data: changes, error: changesError } = await supabase
    .from('changes')
    .select('id, content, index, status')
    .in('id', changeIds);

  if (changesError) {
    console.error('Failed to fetch changes:', changesError);
    return c.json({ error: 'Failed to fetch changes' }, 500);
  }

  if (!changes || changes.length === 0) {
    console.error('No changes found');
    return c.json({ error: 'No changes found' }, 404);
  }

  const changeDataMap = new Map(
    changes.map((c) => [
      c.id,
      { content: c.content, index: c.index, status: c.status },
    ]),
  );

  const STATUS_LABELS: Record<number, string> = {
    0: 'pending',
    1: 'approved',
    2: 'rejected',
  };

  const improvements = revisionImprovements.map((imp) => {
    const changeData = changeDataMap.get(imp.change_id);
    return {
      change_id: imp.change_id,
      prompt: imp.prompt,
      content: changeData?.content || '',
      index: changeData?.index ?? null,
      status: changeData?.status ?? 0,
    };
  });

  console.info(
    `[comment-review] improvements to process:
        ${improvements
          .map(
            (i) =>
              `  change: ${i.change_id.substring(0, 8)} | index: ${i.index} | status: ${
                STATUS_LABELS[i.status] ?? i.status
              } | contentLen: ${i.content?.length ?? 0} | prompt: "${i.prompt.substring(0, 80)}"`,
          )
          .join('\n')}`,
  );

  const result = await improveRevisionChanges(
    articleId,
    improvements,
    config,
    miraBotId,
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
    mira_bot_id: miraBotId,
    trigger_diff_update: true,
  });
}

async function handleFullReview(
  c: Context,
  supabase: SupabaseClient,
  userId: string,
  articleId: string,
  customInstructions: string | undefined,
  miraBotId: string,
) {
  await addMiraBotPermission(articleId);
  const article = await getArticle(articleId);

  if (!article) {
    console.warn('Article not found');
    return c.json({ error: 'Article not found' }, 404);
  }

  const config = await getLLMConfig(supabase, userId, customInstructions);
  if (!config) {
    console.error('No AI configuration available');
    return c.json({ error: 'No AI configuration available' }, 400);
  }

  console.info('LLM config retrieved', {
    model: config.model,
    hasUserConfig: config.hasUserConfig,
  });

  const result = await reviewAndImproveArticle(
    articleId,
    article.language,
    config,
    miraBotId,
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
    mira_bot_id: miraBotId,
    trigger_diff_update: true,
    config_source: config.hasUserConfig ? 'user' : 'environment',
  });
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
      type,
      change_id,
      content,
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

    if (type === 'comment-reply') {
      if (!change_id || !content) {
        return c.json({ error: 'Missing change_id or content' }, 400);
      }
      return handleCommentReply(
        c,
        supabase,
        user.id,
        change_id,
        article_id,
        content,
      );
    }

    const MIRA_BOT_ID = await getMiraBotId(supabase);

    if (!MIRA_BOT_ID) {
      console.error('Mira bot not configured in database');
      return c.json({ error: 'Mira bot not configured' }, 500);
    }

    if (
      revision_improvements &&
      Array.isArray(revision_improvements) &&
      revision_improvements.length > 0
    ) {
      return handleRevisionImprovements(
        c,
        supabase,
        user.id,
        article_id,
        revision_improvements,
        MIRA_BOT_ID,
      );
    }

    return handleFullReview(
      c,
      supabase,
      user.id,
      article_id,
      customInstructions,
      MIRA_BOT_ID,
    );
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

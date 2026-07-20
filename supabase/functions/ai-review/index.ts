import { Hono } from 'npm:hono@4.7.4';
import { corsMiddleware } from '../_shared/middleware/cors.ts';
import createSupabaseClient from '../_shared/supabaseClient.ts';
import createSupabaseAdmin from '../_shared/supabaseAdmin.ts';
import {
  getArticle,
  addMiraBotPermission,
} from '../_shared/helpers/supabaseHelper.ts';
import { reviewAndImproveArticle } from './services/reviewService.ts';
import { processCommentedChanges } from './services/commentReviewService.ts';
import { getLLMConfig, getMiraBotId } from './services/configService.ts';

const STATUS_LABELS: Record<number, string> = {
  0: 'pending',
  1: 'approved',
  2: 'rejected',
};

const app = new Hono().basePath('/ai-review');
app.use('*', corsMiddleware);

app.post('/', async (c) => {
  try {
    console.info('AI review request received');

    const {
      article_id,
      prompt: customInstructions,
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

    const MIRA_BOT_ID = await getMiraBotId();

    if (!MIRA_BOT_ID) {
      console.error('Mira bot not configured in database');
      return c.json({ error: 'Mira bot not configured' }, 500);
    }

    const { data: candidateChanges, error: candidateError } = await supabase
      .from('changes')
      .select('id, content, index, status, type_of_edit, revision_id')
      .eq('article_id', article_id)
      .in('status', [1, 2]);

    if (!candidateError && candidateChanges && candidateChanges.length > 0) {
      const candidateIds = candidateChanges.map((c) => c.id);
      const candidateRevisionIds = Array.from(
        new Set(
          candidateChanges
            .map((c) => c.revision_id)
            .filter((rid): rid is string => typeof rid === 'string'),
        ),
      );

      const [changeCommentsResp, revisionCommentsResp] = await Promise.all([
        supabase
          .from('comments')
          .select('change_id, content')
          .in('change_id', candidateIds),
        candidateRevisionIds.length > 0
          ? supabase
              .from('comments')
              .select('revision_id, content')
              .in('revision_id', candidateRevisionIds)
              .is('change_id', null)
          : Promise.resolve({ data: [] as Array<{ revision_id: string; content: string | null }>, error: null }),
      ]);

      const comments = changeCommentsResp.data || [];
      const revisionComments = revisionCommentsResp.data || [];

      const commentsByChangeId = new Map<string, string[]>();
      for (const comment of comments) {
        const existing = commentsByChangeId.get(comment.change_id) || [];
        existing.push(comment.content);
        commentsByChangeId.set(comment.change_id, existing);
      }

      const revisionCommentsByRevisionId = new Map<string, string[]>();
      for (const comment of revisionComments) {
        if (!comment.revision_id) continue;
        const existing =
          revisionCommentsByRevisionId.get(comment.revision_id) || [];
        existing.push(comment.content);
        revisionCommentsByRevisionId.set(comment.revision_id, existing);
      }

      const processableChanges = candidateChanges.filter((c) => {
        if (c.status === 2) return true;
        if (c.status === 1) {
          return (commentsByChangeId.get(c.id) || []).length > 0;
        }
        return false;
      });

      if (processableChanges.length > 0) {
        const rejectedCount = processableChanges.filter(
          (c) => c.status === 2,
        ).length;
        const approvedWithCommentsCount =
          processableChanges.length - rejectedCount;
        console.info(
          `[auto-retry] Processing ${rejectedCount} rejected and ${approvedWithCommentsCount} approved-with-comments change(s)`,
        );

        await addMiraBotPermission(article_id);
        const config = await getLLMConfig(supabase, user.id, customInstructions);

        if (!config) {
          console.error('No AI configuration available');
          return c.json({ error: 'No AI configuration available' }, 400);
        }

        const instruction = customInstructions?.trim() || 'Improve the text';

        const improvements = processableChanges.map((change) => {
          const changeComments = commentsByChangeId.get(change.id) || [];
          const revisionFeedback =
            (change.revision_id &&
              revisionCommentsByRevisionId.get(change.revision_id)) ||
            [];
          const feedbackBlock = changeComments.length > 0
            ? `User feedback on this change:\n${changeComments.join('\n')}\n\n`
            : '';
          const revisionFeedbackBlock = revisionFeedback.length > 0
            ? `Revision-level feedback (applies to the whole revision, not just this change):\n${revisionFeedback.join('\n')}\n\n`
            : '';
          const contextLine = change.status === 2
            ? 'The previous version was rejected by the user — produce a different version.'
            : 'The user approved this change but has follow-up feedback — apply it while preserving what they liked.';
          const promptWithFeedback =
            `${revisionFeedbackBlock}${instruction}\n\n${contextLine}\n\n${feedbackBlock}`.trim();

          return {
            change_id: change.id,
            prompt: promptWithFeedback,
            content: change.content || '',
            index: change.index,
            status: change.status,
            type_of_edit: change.type_of_edit ?? 0,
            mode: change.status === 2
              ? ('rejection' as const)
              : ('follow-up' as const),
            revision_feedback: revisionFeedback,
          };
        });

        console.info(
          `[auto-retry] improvements to process:\n${improvements
            .map(
              (i) =>
                `  change: ${i.change_id.substring(0, 8)} | index: ${i.index} | status: ${STATUS_LABELS[i.status] ?? i.status} | mode: ${i.mode} | contentLen: ${i.content?.length ?? 0} | prompt: "${i.prompt.substring(0, 80)}"`,
            )
            .join('\n')}`,
        );

        const result = await processCommentedChanges(
          article_id,
          improvements,
          config,
          MIRA_BOT_ID,
        );

        if (result.hasImprovements) {
          console.info('[auto-retry] Edit succeeded, saving pending_diff');
          try {
            const admin = createSupabaseAdmin();
            console.info(
              '[auto-retry] Admin client created, updating article',
              article_id,
            );
            const { error: updateError } = await admin
              .from('articles')
              .update({ pending_diff: true })
              .eq('id', article_id);
            if (updateError) {
              console.warn('[auto-retry] Update returned error:', updateError);
            } else {
              console.info('[auto-retry] pending_diff saved successfully');
            }
          } catch (e) {
            console.warn('[auto-retry] Failed to save pending diff:', e);
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

        console.info('[auto-retry] No improvements from retry');
        return c.json({
          summary: result.comment || 'Could not improve changes',
          has_improvements: false,
          trigger_diff_update: false,
        });
      }
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
      provider: config.provider,
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

  console.info('[review] Full review succeeded, saving pending_diff');
  if (!result.wasEmpty) {
    try {
      const admin = createSupabaseAdmin();
      console.info('[review] Admin client created, updating article', article_id);
      const { error: updateError } = await admin
        .from('articles')
        .update({ pending_diff: true })
        .eq('id', article_id);
      if (updateError) {
        console.warn('[review] Update returned error:', updateError);
      } else {
        console.info('[review] pending_diff saved successfully');
      }
    } catch (e) {
      console.warn('[review] Failed to save pending diff:', e);
    }
  } else {
    console.info(
      '[review] Article was empty before edit, skipping pending_diff (no real diff to review)',
    );
  }
  return c.json({
    summary: result.comment,
    has_improvements: true,
    old_revision: result.oldRevisionId,
    new_revision: result.newRevisionId,
    mira_bot_id: MIRA_BOT_ID,
    trigger_diff_update: !result.wasEmpty,
    was_empty: result.wasEmpty,
    config_source: config.hasUserConfig ? 'user' : 'environment',
  });
  } catch (error) {
    console.error('AI review failed:', error);
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

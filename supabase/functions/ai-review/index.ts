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
import { applyRevisionFeedback } from './services/revisionFeedbackService.ts';
import { getLLMConfig, getMiraBotId } from './services/configService.ts';
import { buildProcessableChanges } from './services/reviewRouter.ts';

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

    const [candidateChangesResp, articleRevisionsResp, article] =
      await Promise.all([
        supabase
          .from('changes')
          .select('id, content, index, status, type_of_edit, revision_id')
          .eq('article_id', article_id)
          .in('status', [0, 1, 2]),
        supabase
          .from('revisions')
          .select('id')
          .eq('article_id', article_id),
        getArticle(article_id),
      ]);

    const candidateChanges = candidateChangesResp.data || [];
    const allRevisionIds = (articleRevisionsResp.data || [])
      .map((r) => r.id)
      .filter((rid): rid is string => typeof rid === 'string');

    const candidateIds = candidateChanges.map((c) => c.id);

    const commentsByChangeId = new Map<string, string[]>();
    const revisionCommentsByRevisionId = new Map<string, string[]>();

    const [changeCommentsResp, revisionCommentsResp] = await Promise.all([
      candidateIds.length > 0
        ? supabase
            .from('comments')
            .select('change_id, content')
            .in('change_id', candidateIds)
            .is('revision_id', null)
        : Promise.resolve({ data: [], error: null }),
      allRevisionIds.length > 0
        ? supabase
            .from('comments')
            .select('revision_id, content')
            .in('revision_id', allRevisionIds)
            .is('change_id', null)
        : Promise.resolve({ data: [], error: null }),
    ]);

    for (const comment of changeCommentsResp.data || []) {
      const existing = commentsByChangeId.get(comment.change_id) || [];
      existing.push(comment.content);
      commentsByChangeId.set(comment.change_id, existing);
    }

    for (const comment of revisionCommentsResp.data || []) {
      if (!comment.revision_id) continue;
      const existing =
        revisionCommentsByRevisionId.get(comment.revision_id) || [];
      existing.push(comment.content);
      revisionCommentsByRevisionId.set(comment.revision_id, existing);
    }

    const routing = buildProcessableChanges(
      candidateChanges,
      commentsByChangeId,
      revisionCommentsByRevisionId,
      customInstructions,
    );

    const aggregatedRevisionFeedback: string[] = [];
    for (const rid of routing.revisionsWithFeedback) {
      const items = revisionCommentsByRevisionId.get(rid) || [];
      for (const item of items) aggregatedRevisionFeedback.push(item);
    }

    const hasArticleWideFeedback = routing.hasArticleWideFeedback &&
      aggregatedRevisionFeedback.length > 0;
    const hasPerParagraphWork = routing.changes.length > 0;

    if (hasArticleWideFeedback || hasPerParagraphWork) {
      await addMiraBotPermission(article_id);
      const config = await getLLMConfig(
        supabase,
        user.id,
        customInstructions,
      );

      if (!config) {
        console.error('No AI configuration available');
        return c.json({ error: 'No AI configuration available' }, 400);
      }

      let articleWideResult: {
        hasImprovements: boolean;
        comment: string;
        oldRevisionId: number;
        newRevisionId: number;
      } | null = null;

      if (hasArticleWideFeedback) {
        console.info(
          `[revision-feedback] Applying ${aggregatedRevisionFeedback.length} revision-level comment(s) article-wide (will trigger per-paragraph work afterward if any).`,
        );

        articleWideResult = await applyRevisionFeedback(
          article_id,
          aggregatedRevisionFeedback,
          config,
          {
            articleLanguage: article?.language,
            customInstructions,
          },
        );

        if (articleWideResult.hasImprovements) {
          try {
            const admin = createSupabaseAdmin();
            const { error: updateError } = await admin
              .from('articles')
              .update({ pending_diff: true })
              .eq('id', article_id);
            if (updateError) {
              console.warn(
                '[revision-feedback] pending_diff update error:',
                updateError,
              );
            }
          } catch (e) {
            console.warn(
              '[revision-feedback] Failed to save pending diff:',
              e,
            );
          }
        }
      }

      if (hasPerParagraphWork) {
        const rejectedCount = routing.changes.filter(
          (c) => c.status === 2,
        ).length;
        const approvedWithCommentsCount = routing.changes.filter(
          (c) => c.status === 1,
        ).length;
        const pendingWithCommentsCount = routing.changes.filter(
          (c) => c.status === 0,
        ).length;

        console.info(
          `[auto-retry] Processing ${rejectedCount} rejected, ${approvedWithCommentsCount} approved-with-comments, ${pendingWithCommentsCount} pending-with-comments change(s)`,
        );

        const improvements = routing.changes.map((change) => {
          const changeComment = change.change_comment || '';
          const revisionFeedback = change.revision_feedback || [];
          const feedbackBlock = changeComment
            ? `User feedback on this change:\n${changeComment}\n\n`
            : '';
          const revisionFeedbackBlock = revisionFeedback.length > 0
            ? `Revision-level feedback (applies to the whole article, not just this paragraph):\n${revisionFeedback.join('\n')}\n\n`
            : '';
          const contextLine = change.status === 2
            ? 'The previous version was rejected by the user — produce a different version.'
            : change.status === 1
            ? 'The user approved this change but has follow-up feedback — apply it while preserving what they liked.'
            : 'Pending review with a follow-up comment — apply the comment as a refinement.';
          const instruction = customInstructions?.trim() ||
            'Improve the text';
          const promptWithFeedback =
            `${revisionFeedbackBlock}${instruction}\n\n${contextLine}\n\n${feedbackBlock}`.trim();

          return {
            change_id: change.id,
            prompt: promptWithFeedback,
            content: change.content || '',
            index: change.index,
            status: change.status,
            type_of_edit: change.type_of_edit,
            mode: change.mode,
            revision_feedback: revisionFeedback,
            custom_instructions: change.custom_instructions,
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

        const hadAnyImprovement = articleWideResult?.hasImprovements ||
          result.hasImprovements;

        if (hadAnyImprovement) {
          console.info('[auto-retry] Edit succeeded, saving pending_diff');
          try {
            const admin = createSupabaseAdmin();
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

          const summaryParts: string[] = [];
          if (articleWideResult?.hasImprovements) {
            summaryParts.push(articleWideResult.comment);
          }
          if (result.hasImprovements) {
            summaryParts.push(result.comment);
          }

          return c.json({
            summary: summaryParts.join(' ') || 'Changes applied.',
            has_improvements: true,
            old_revision: articleWideResult?.newRevisionId ||
              articleWideResult?.oldRevisionId || result.oldRevisionId,
            new_revision: result.newRevisionId ||
              articleWideResult?.newRevisionId || 0,
            mira_bot_id: MIRA_BOT_ID,
            trigger_diff_update: true,
            article_wide_applied: articleWideResult?.hasImprovements ?? false,
          });
        }

        console.info(
          '[auto-retry] No improvements from retry (article-wide:', articleWideResult?.hasImprovements ?? false, ')',
        );
        return c.json({
          summary: articleWideResult?.comment ||
            result.comment || 'Could not improve changes',
          has_improvements: articleWideResult?.hasImprovements ?? false,
          trigger_diff_update: articleWideResult?.hasImprovements ?? false,
          article_wide_applied: articleWideResult?.hasImprovements ?? false,
        });
      }

      if (articleWideResult?.hasImprovements) {
        return c.json({
          summary: articleWideResult.comment,
          has_improvements: true,
          old_revision: articleWideResult.oldRevisionId,
          new_revision: articleWideResult.newRevisionId,
          mira_bot_id: MIRA_BOT_ID,
          trigger_diff_update: true,
          article_wide_applied: true,
        });
      }

      return c.json({
        summary: articleWideResult?.comment ||
          'Could not apply revision feedback',
        has_improvements: false,
        trigger_diff_update: false,
        article_wide_applied: false,
      });
    }

    await addMiraBotPermission(article_id);

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
        console.info(
          '[review] Admin client created, updating article',
          article_id,
        );
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

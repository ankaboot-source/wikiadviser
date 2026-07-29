import MediawikiClient from '../../_shared/mediawikiAPI/MediawikiClient.ts';
import wikipediaApi from '../../_shared/wikipedia/WikipediaApi.ts';
import { getArticle } from '../../_shared/helpers/supabaseHelper.ts';
import {
  buildRevisionSystemPrompt,
  buildRevisionFeedbackPrompt,
} from '../config/prompts.ts';
import { generateRevisionSummary, reviewArticleSection } from './aiService.ts';
import type { LLMConfig } from '../utils/types.ts';

export interface RevisionFeedbackResult {
  hasImprovements: boolean;
  comment: string;
  oldRevisionId: number;
  newRevisionId: number;
}

export interface ApplyOptions {
  articleLanguage?: string;
  customInstructions?: string;
  signal?: AbortSignal;
}

export async function applyRevisionFeedback(
  articleId: string,
  revisionFeedback: string[],
  config: LLMConfig,
  options: ApplyOptions = {},
): Promise<RevisionFeedbackResult> {
  if (!revisionFeedback.length) {
    return {
      hasImprovements: false,
      comment: 'No revision-level feedback to apply.',
      oldRevisionId: 0,
      newRevisionId: 0,
    };
  }

  const article = await getArticle(articleId);
  if (!article) {
    throw new Error(`Article not found: ${articleId}`);
  }

  const mediawiki = new MediawikiClient(
    article.language ?? options.articleLanguage ?? 'en',
    wikipediaApi,
  );

  const currentWikitext = await mediawiki.getCurrentArticleWikitext(articleId);
  if (!currentWikitext.trim()) {
    return {
      hasImprovements: false,
      comment: 'Article is empty — cannot apply revision-level feedback.',
      oldRevisionId: 0,
      newRevisionId: 0,
    };
  }

  const systemPrompt = buildRevisionSystemPrompt(
    article,
    currentWikitext,
    true,
  );

  const userPrompt =
    (options.customInstructions?.trim()
      ? `ADDITIONAL USER INSTRUCTIONS:\n${options.customInstructions.trim()}\n\n`
      : '') + buildRevisionFeedbackPrompt(currentWikitext, revisionFeedback);

  const improvedWikitext = await reviewArticleSection(
    config,
    systemPrompt,
    userPrompt,
    8192,
  );

  const trimmed = improvedWikitext.trim();
  if (!trimmed || trimmed === currentWikitext.trim()) {
    return {
      hasImprovements: false,
      comment: 'Mira returned no changes for the revision-level feedback.',
      oldRevisionId: 0,
      newRevisionId: 0,
    };
  }

  const summaryPhrase = await generateRevisionSummary(
    config,
    currentWikitext,
    trimmed,
  );
  const editResult = await mediawiki.editArticleAsBot(
    articleId,
    trimmed,
    `Mira: ${summaryPhrase}`,
  );

  return {
    hasImprovements: true,
    comment: 'Revision-level feedback applied.',
    oldRevisionId: editResult.oldrevid,
    newRevisionId: editResult.newrevid,
  };
}

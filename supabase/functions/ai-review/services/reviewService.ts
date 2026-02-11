import MediawikiClient from '../../_shared/mediawikiAPI/MediawikiClient.ts';
import wikipediaApi from '../../_shared/wikipedia/WikipediaApi.ts';
import { buildPrompt } from '../config/prompts.ts';
import { reviewFullArticle } from './aiService.ts';
import type { LLMConfig } from '../utils/types.ts';
import { getArticle } from '../../_shared/helpers/supabaseHelper.ts';

export interface ReviewResult {
  hasImprovements: boolean;
  comment: string;
  oldRevisionId: number;
  newRevisionId: number;
}

export async function reviewAndImproveArticle(
  articleId: string,
  language: string,
  config: LLMConfig,
  miraBotId: string,
  customInstructions?: string,
): Promise<ReviewResult> {
  console.info('Starting full article review', { language });

  const mediawiki = new MediawikiClient(language, wikipediaApi);

  const articleData = await mediawiki.getArticleForAIReview(articleId);

  const article = await getArticle(articleId);
  console.info('Article wikitext fetched', {
    title: article.title,
    description: article.description,
    wikitextLength: articleData.wikitext.length,
  });
  const userPrompt = buildPrompt(
    article.title,
    article.description,
    articleData.wikitext,
    customInstructions,
  );

  console.info('Sending full article to AI for review', {
    promptLength: userPrompt.length,
  });

  const result = await reviewFullArticle(
    config.apiKey,
    config.model,
    config.prompt,
    userPrompt,
  );

  console.info('AI processing completed', {
    hasImprovements: result.has_improvements,
    comment: result.comment,
  });

  if (!result.has_improvements || !result.improved_wikitext.trim()) {
    console.info('No improvements needed');
    return {
      hasImprovements: false,
      comment: result.comment,
      oldRevisionId: 0,
      newRevisionId: 0,
    };
  }

  if (result.improved_wikitext.trim() === articleData.wikitext.trim()) {
    console.warn('Improved wikitext identical to original');
    return {
      hasImprovements: false,
      comment: 'No actual changes detected',
      oldRevisionId: 0,
      newRevisionId: 0,
    };
  }

  const editResult = await mediawiki.editArticleAsBot(
    articleId,
    result.improved_wikitext,
    `Mira: ${result.comment}`,
  );

  console.info('MediaWiki revision created', {
    oldRevid: editResult.oldrevid,
    newRevid: editResult.newrevid,
  });

  const diffHtml = await mediawiki.getRevisionDiffHtml(
    articleId,
    editResult.oldrevid,
    editResult.newrevid,
  );

  await mediawiki.updateChanges(articleId, miraBotId, diffHtml);

  return {
    hasImprovements: true,
    comment: result.comment,
    oldRevisionId: editResult.oldrevid,
    newRevisionId: editResult.newrevid,
  };
}

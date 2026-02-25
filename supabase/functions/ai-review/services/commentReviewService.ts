import MediawikiClient from '../../_shared/mediawikiAPI/MediawikiClient.ts';
import wikipediaApi from '../../_shared/wikipedia/WikipediaApi.ts';
import { getArticle } from '../../_shared/helpers/supabaseHelper.ts';
import { reviewArticleSection } from './aiService.ts';
import {
  buildRevisionSystemPrompt,
  buildRevisionUserPrompt,
  buildEmptyArticlePrompt,
} from '../config/prompts.ts';
import type { LLMConfig } from '../utils/types.ts';

export interface CommentImprovement {
  change_id: string;
  prompt: string;
  content: string;
  index: number | null;
  status: number;
}

export interface CommentReviewResult {
  hasImprovements: boolean;
  comment: string;
  oldRevisionId: number;
  newRevisionId: number;
}

function splitIntoParagraphs(wikitext: string): string[] {
  return wikitext.split(/\n\n+/).filter((p) => p.trim().length > 0);
}

function remapImprovementIndices(
  improvements: CommentImprovement[],
): Array<CommentImprovement & { relativeIndex: number }> {
  return improvements
    .filter((imp) => imp.index !== null)
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .map((imp, relativeIndex) => ({ ...imp, relativeIndex }));
}

async function improveExistingArticleParagraphs(
  improvements: ReturnType<typeof remapImprovementIndices>,
  paragraphs: string[],
  systemPrompt: string,
  config: LLMConfig,
): Promise<{ improvedParagraphs: string[]; improvedCount: number }> {
  const improvedParagraphs = [...paragraphs];
  let improvedCount = 0;

  for (const improvement of improvements) {
    const { relativeIndex, prompt, change_id } = improvement;

    if (relativeIndex >= paragraphs.length) {
      console.warn(
        `[CommentReview] Skipping change ${change_id}: index ${relativeIndex} out of bounds`,
      );
      continue;
    }

    const paragraph = paragraphs[relativeIndex];

    if (!paragraph || paragraph.trim().length < 10) {
      console.warn(
        `[CommentReview] Skipping change ${change_id}: paragraph too short or empty`,
      );
      continue;
    }

    try {
      const improved = await reviewArticleSection(
        config.apiKey,
        config.model,
        systemPrompt,
        buildRevisionUserPrompt(paragraph, prompt, improvement.status),
      );

      const trimmed = improved.trim();
      if (trimmed && trimmed !== paragraph) {
        improvedParagraphs[relativeIndex] = trimmed;
        improvedCount++;
      }
    } catch (error) {
      console.error(
        `[CommentReview] Failed to improve paragraph for change ${change_id}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  return { improvedParagraphs, improvedCount };
}

async function generateContentForEmptyArticle(
  improvements: ReturnType<typeof remapImprovementIndices>,
  article: { title: string | null; description: string | null },
  config: LLMConfig,
): Promise<{ generatedWikitext: string; improvedCount: number }> {
  const systemPrompt = buildEmptyArticlePrompt(article);
  const paragraphs: string[] = [];
  let improvedCount = 0;

  for (const improvement of improvements) {
    try {
      const generated = await reviewArticleSection(
        config.apiKey,
        config.model,
        systemPrompt,
        `USER INSTRUCTION: ${improvement.prompt}\n\nGenerate content for this article:`,
      );

      const trimmed = generated.trim();
      if (trimmed) {
        paragraphs.push(trimmed);
        improvedCount++;
      }
    } catch (error) {
      console.error(
        `[CommentReview] Failed to generate content for change ${improvement.change_id}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  return { generatedWikitext: paragraphs.join('\n\n'), improvedCount };
}

export async function improveRevisionChanges(
  articleId: string,
  improvements: CommentImprovement[],
  config: LLMConfig,
  _miraBotId: string,
): Promise<CommentReviewResult> {
  const article = await getArticle(articleId);
  if (!article) {
    throw new Error(`Article not found: ${articleId}`);
  }

  const mediawiki = new MediawikiClient(article.language ?? 'en', wikipediaApi);
  const { wikitext } = await mediawiki.getArticleForAIReview(articleId);

  const isEmptyArticle = !wikitext || wikitext.trim().length === 0;
  const remapped = remapImprovementIndices(improvements);

  if (remapped.length === 0) {
    return {
      hasImprovements: false,
      comment: 'No indexed improvements to process',
      oldRevisionId: 0,
      newRevisionId: 0,
    };
  }

  let finalWikitext: string;
  let totalImproved: number;

  if (isEmptyArticle) {
    const { generatedWikitext, improvedCount } =
      await generateContentForEmptyArticle(remapped, article, config);
    finalWikitext = generatedWikitext;
    totalImproved = improvedCount;
  } else {
    const paragraphs = splitIntoParagraphs(wikitext);
    const systemPrompt = buildRevisionSystemPrompt(article, wikitext);
    const { improvedParagraphs, improvedCount } =
      await improveExistingArticleParagraphs(
        remapped,
        paragraphs,
        systemPrompt,
        config,
      );
    finalWikitext = improvedParagraphs.join('\n\n');
    totalImproved = improvedCount;
  }

  if (totalImproved === 0) {
    return {
      hasImprovements: false,
      comment: 'No improvements made',
      oldRevisionId: 0,
      newRevisionId: 0,
    };
  }

  const editResult = await mediawiki.editArticleAsBot(
    articleId,
    finalWikitext,
    `Mira: improved ${totalImproved} section(s) based on user comments`,
  );

  return {
    hasImprovements: true,
    comment: `Improved ${totalImproved} section(s)`,
    oldRevisionId: editResult.oldrevid,
    newRevisionId: editResult.newrevid,
  };
}

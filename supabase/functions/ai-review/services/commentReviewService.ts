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

function stripHtml(html: string): string {
  return html
    .replaceAll(/<[^>]+>/g, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim();
}

function normalizeParagraph(text: string): string {
  return text
    .toLowerCase()
    .replaceAll(/\s+/g, ' ')
    .replaceAll(/[^\w\s]/g, '')
    .trim();
}

function calculateSimilarity(a: string, b: string): number {
  const wordsA = new Set(normalizeParagraph(a).split(/\s+/).filter(Boolean));
  const wordsB = new Set(normalizeParagraph(b).split(/\s+/).filter(Boolean));
  const intersection = new Set([...wordsA].filter((w) => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

function findBestMatchingParagraph(
  changeContent: string,
  paragraphs: string[],
): { index: number; similarity: number } {
  const needle = stripHtml(changeContent);
  let bestIndex = -1;
  let bestSimilarity = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const similarity = calculateSimilarity(needle, paragraphs[i]);
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestIndex = i;
    }
  }

  return { index: bestIndex, similarity: bestSimilarity };
}

async function improveExistingArticleParagraphs(
  improvements: CommentImprovement[],
  paragraphs: string[],
  systemPrompt: string,
  config: LLMConfig,
): Promise<{ improvedParagraphs: string[]; improvedCount: number }> {
  const improvedParagraphs = [...paragraphs];
  let improvedCount = 0;

  for (const improvement of improvements) {
    const { change_id, prompt, content, status } = improvement;

    const { index: matchedIndex, similarity } = findBestMatchingParagraph(
      content,
      paragraphs,
    );

    if (matchedIndex === -1 || similarity < 0.1) {
      console.warn(
        `[CommentReview] Skipping change ${change_id}: no matching paragraph found (best similarity: ${similarity.toFixed(2)})`,
      );
      continue;
    }

    const paragraph = paragraphs[matchedIndex];

    console.info(
      `[CommentReview] change ${change_id.substring(0, 8)} matched paragraph ${matchedIndex} (similarity: ${similarity.toFixed(2)}): "${paragraph.substring(0, 80)}..."`,
    );

    if (paragraph.trim().length < 10) {
      console.warn(
        `[CommentReview] Skipping change ${change_id}: matched paragraph too short`,
      );
      continue;
    }

    try {
      const improved = await reviewArticleSection(
        config.apiKey,
        config.model,
        systemPrompt,
        buildRevisionUserPrompt(paragraph, prompt, status),
      );

      const trimmed = improved.trim();
      if (trimmed && trimmed !== paragraph) {
        improvedParagraphs[matchedIndex] = trimmed;
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
  improvements: CommentImprovement[],
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
  const indexedImprovements = improvements.filter(
    (imp) => imp.content && imp.content.trim().length > 0,
  );

  if (indexedImprovements.length === 0) {
    return {
      hasImprovements: false,
      comment: 'No improvements to process',
      oldRevisionId: 0,
      newRevisionId: 0,
    };
  }

  let finalWikitext: string;
  let totalImproved: number;

  if (isEmptyArticle) {
    const { generatedWikitext, improvedCount } =
      await generateContentForEmptyArticle(
        indexedImprovements,
        article,
        config,
      );
    finalWikitext = generatedWikitext;
    totalImproved = improvedCount;
  } else {
    const paragraphs = splitIntoParagraphs(wikitext);
    const systemPrompt = buildRevisionSystemPrompt(article, wikitext);
    const { improvedParagraphs, improvedCount } =
      await improveExistingArticleParagraphs(
        indexedImprovements,
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

import MediawikiClient from '../../_shared/mediawikiAPI/MediawikiClient.ts';
import wikipediaApi from '../../_shared/wikipedia/WikipediaApi.ts';
import { getArticle } from '../../_shared/helpers/supabaseHelper.ts';
import { generateRevisionSummary, reviewArticleSection } from './aiService.ts';
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
  type_of_edit: number;
}

export interface CommentReviewResult {
  hasImprovements: boolean;
  comment: string;
  oldRevisionId: number;
  newRevisionId: number;
}
const REMOVE_TYPE = 2;

function splitIntoParagraphs(wikitext: string): string[] {
  return wikitext.split(/\n\n+/).filter((p) => p.trim().length > 0);
}

function extractLeadingDirectives(wikitext: string): {
  directives: string;
  body: string;
} {
  const lines = wikitext.split('\n');
  const directiveLines: string[] = [];

  for (const line of lines) {
    if (/^\s*\{\{[^}]+\}\}\s*$/.test(line)) {
      directiveLines.push(line);
    } else {
      break;
    }
  }

  if (directiveLines.length === 0) {
    return { directives: '', body: wikitext };
  }

  const directives = directiveLines.join('\n');
  const body = wikitext.slice(directives.length).replace(/^\n+/, '');
  return { directives, body };
}

function resolveTargetIndex(
  improvement: CommentImprovement,
  paragraphs: string[],
): number {
  const { type_of_edit, index, content, change_id } = improvement;

  if (type_of_edit === REMOVE_TYPE) {
    if (index === null) return -1;
    const target = Math.min(index, paragraphs.length - 1);
    console.info(
      `[CommentReview] Change ${change_id.substring(0, 8)} is a removal, using index ${target}`,
    );
    return target;
  }

  const plainText = content
    .replaceAll(/<[^>]*>/g, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  const matched = paragraphs.findIndex((p) =>
    p.toLowerCase().includes(plainText),
  );

  if (matched !== -1) return matched;

  if (index !== null) {
    const fallback = Math.min(index, paragraphs.length - 1);
    console.info(
      `[CommentReview] Change ${change_id.substring(0, 8)} fell back to index ${fallback}`,
    );
    return fallback;
  }

  return -1;
}

async function applyImprovement(
  improvement: CommentImprovement,
  paragraph: string,
  systemPrompt: string,
  config: LLMConfig,
): Promise<string | null> {
  try {
    const improved = await reviewArticleSection(
      config.apiKey,
      config.model,
      systemPrompt,
      buildRevisionUserPrompt(
        paragraph,
        improvement.prompt,
        improvement.status,
      ),
    );
    const trimmed = improved.trim();
    return trimmed && trimmed !== paragraph ? trimmed : null;
  } catch (error) {
    console.error(
      `[CommentReview] Failed to improve paragraph for change ${improvement.change_id}:`,
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

async function improveExistingArticleParagraphs(
  improvements: CommentImprovement[],
  paragraphs: string[],
  systemPrompt: string,
  config: LLMConfig,
): Promise<{ improvedParagraphs: string[]; improvedCount: number }> {
  const improvedParagraphs = [...paragraphs];
  const usedIndices = new Set<number>();
  let improvedCount = 0;

  const resolved: Array<{
    improvement: CommentImprovement;
    targetIndex: number;
  }> = [];

  for (const improvement of improvements) {
    const { change_id } = improvement;

    const targetIndex = resolveTargetIndex(improvement, paragraphs);

    if (targetIndex === -1) {
      console.warn(
        `[CommentReview] Skipping change ${change_id}: could not match content to any paragraph`,
      );
      continue;
    }

    if (usedIndices.has(targetIndex)) {
      console.warn(
        `[CommentReview] Skipping change ${change_id.substring(0, 8)}: paragraph ${targetIndex} already modified by a previous change`,
      );
      continue;
    }

    const paragraph = paragraphs[targetIndex];

    if (!paragraph || paragraph.trim().length < 10) {
      console.warn(
        `[CommentReview] Skipping change ${change_id}: matched paragraph too short or empty`,
      );
      continue;
    }

    usedIndices.add(targetIndex);
    resolved.push({ improvement, targetIndex });
    console.info(
      `[CommentReview] Change ${change_id.substring(0, 8)} matched paragraph ${targetIndex}/${paragraphs.length - 1}`,
    );
    
  }

  const results = await Promise.all(
    resolved.map(({ improvement, targetIndex }) =>
      applyImprovement(
        improvement,
        paragraphs[targetIndex],
        systemPrompt,
        config,
      )
        .then((result) => ({ result, targetIndex }))
        .catch(() => {
          console.error(
            `[CommentReview] Unhandled error for change ${improvement.change_id}`,
          );
          return null;
        }),
    ),
  );

  for (const item of results) {
    if (item?.result) {
      improvedParagraphs[item.targetIndex] = item.result;
      improvedCount++;
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
  const validImprovements = improvements.filter((imp) => imp.content?.trim());

  if (validImprovements.length === 0) {
    return {
      hasImprovements: false,
      comment: 'No improvements with content to process',
      oldRevisionId: 0,
      newRevisionId: 0,
    };
  }

  let finalWikitext: string;
  let totalImproved: number;

  if (isEmptyArticle) {
    const { generatedWikitext, improvedCount } =
      await generateContentForEmptyArticle(validImprovements, article, config);
    finalWikitext = generatedWikitext;
    totalImproved = improvedCount;
  } else {
    const { directives, body } = extractLeadingDirectives(wikitext);
    const paragraphs = splitIntoParagraphs(body);
    const systemPrompt = buildRevisionSystemPrompt(article, wikitext);
    const { improvedParagraphs, improvedCount } =
      await improveExistingArticleParagraphs(
        validImprovements,
        paragraphs,
        systemPrompt,
        config,
      );
    const improvedBody = improvedParagraphs.join('\n\n');
    finalWikitext = directives
      ? `${directives}\n${improvedBody}`
      : improvedBody;
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

  const summaryPhrase = await generateRevisionSummary(
    config.apiKey,
    config.model,
    wikitext ?? '',
    finalWikitext,
  );
  const editResult = await mediawiki.editArticleAsBot(
    articleId,
    finalWikitext,
    `Mira: ${summaryPhrase}`,
  );

  return {
    hasImprovements: true,
    comment: 'Changes applied',
    oldRevisionId: editResult.oldrevid,
    newRevisionId: editResult.newrevid,
  };
}

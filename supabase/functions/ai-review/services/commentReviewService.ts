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
      config,
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
        `[CommentReview] Skipping change ${change_id.substring(0, 8)}: paragraph ${targetIndex} already claimed`,
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
      `[CommentReview] Change ${change_id.substring(0, 8)} → paragraph ${targetIndex}/${paragraphs.length - 1}`,
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
        .catch((err) => {
          console.error(
            `[CommentReview] Unhandled error for change ${improvement.change_id}:`,
            err,
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
        config,
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

export async function redoRejectedChanges(
  articleId: string,
  improvements: CommentImprovement[],
  config: LLMConfig,
  miraBotId: string,
): Promise<CommentReviewResult> {
  const article = await getArticle(articleId);
  if (!article) {
    throw new Error(`Article not found: ${articleId}`);
  }

  const mediawiki = new MediawikiClient(article.language ?? 'en', wikipediaApi);

  const currentWikitext = await mediawiki.getCurrentArticleWikitext(articleId);

  const revisions = await mediawiki.getRecentRevisions(articleId, 2);
  const parentRevId = revisions[0]?.parentid;
  let previousWikitext: string | null = null;

  if (parentRevId && parentRevId > 0) {
    try {
      previousWikitext = await mediawiki.getArticleWikitextAtRevision(
        articleId,
        parentRevId,
      );
    } catch (e) {
      console.warn(
        '[redoRejected] Could not fetch previous revision, falling back to current',
      );
    }
  }

  const validImprovements = improvements.filter(
    (imp) => imp.status === 2 && imp.content?.trim(),
  );

  if (validImprovements.length === 0) {
    return {
      hasImprovements: false,
      comment: 'No rejected changes to process.',
      oldRevisionId: 0,
      newRevisionId: 0,
    };
  }

  const { directives, body: currentBody } = extractLeadingDirectives(currentWikitext);
  const currentParagraphs = splitIntoParagraphs(currentBody);

  let previousParagraphs: string[] | null = null;
  if (previousWikitext) {
    const { body: previousBody } = extractLeadingDirectives(previousWikitext);
    previousParagraphs = splitIntoParagraphs(previousBody);
  }

  // Build set of indices where paragraphs differ between revisions
  const changedIndices = new Set<number>();
  if (previousParagraphs) {
    const maxLen = Math.max(currentParagraphs.length, previousParagraphs.length);
    for (let i = 0; i < maxLen; i++) {
      if (currentParagraphs[i] !== previousParagraphs[i]) {
        changedIndices.add(i);
      }
    }
    console.info(
      `[redoRejected] ${changedIndices.size} paragraph(s) differ between revisions`,
    );
  }

  const systemPrompt = buildRevisionSystemPrompt(article, currentWikitext);
  const improvedParagraphs = [...currentParagraphs];
  const usedIndices = new Set<number>();
  let improvedCount = 0;

  for (const improvement of validImprovements) {
    const { type_of_edit, index, content, change_id, prompt } = improvement;

    const plainText = content
      .replaceAll(/<[^>]*>/g, ' ')
      .replaceAll(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    const plainTextPreview = plainText.length > 80
      ? plainText.substring(0, 80) + '...'
      : plainText;

    let targetIndex: number;
    let matchMethod = '';

    if (type_of_edit === REMOVE_TYPE) {
      if (index === null) {
        console.warn(`[redoRejected] Skipping change ${change_id}: removal has no index`);
        continue;
      }
      targetIndex = Math.min(index, currentParagraphs.length - 1);
      matchMethod = 'remove-clamp';
    } else {
      const changedMatch = [...changedIndices].find((i) =>
        currentParagraphs[i]?.toLowerCase().includes(plainText),
      );
      if (changedMatch !== undefined) {
        targetIndex = changedMatch;
        matchMethod = 'changedIndices';
      } else if (index !== null) {
        targetIndex = Math.min(index, currentParagraphs.length - 1);
        matchMethod = 'storedIdx';
      } else {
        targetIndex = currentParagraphs.findIndex((p) =>
          p.toLowerCase().includes(plainText),
        );
        if (targetIndex === -1) {
          console.warn(
            `[redoRejected] Skipping change ${change_id}: could not match to any paragraph`,
          );
          continue;
        }
        matchMethod = 'fullSearch';
      }
    }

    console.info(
      `[redoRejected] Change ${change_id.substring(0, 8)} → method: ${matchMethod} | storedIdx: ${index} | resolvedIdx: ${targetIndex} | plainText: "${plainTextPreview}"`,
    );

    if (usedIndices.has(targetIndex)) {
      console.warn(
        `[redoRejected] Skipping change ${change_id.substring(0, 8)}: paragraph ${targetIndex} already claimed`,
      );
      continue;
    }

    const currentParagraph = currentParagraphs[targetIndex];

    let sourceParagraph = currentParagraph;
    if (previousParagraphs && targetIndex < previousParagraphs.length) {
      const prevPara = previousParagraphs[targetIndex];
      if (prevPara !== currentParagraph) {
        sourceParagraph = prevPara;
        const prevPreview = prevPara.length > 60
          ? prevPara.substring(0, 60) + '...'
          : prevPara;
        console.info(
          `[redoRejected] Using PREVIOUS revision para[${targetIndex}]: "${prevPreview}"`,
        );
      } else {
        console.info(
          `[redoRejected] Previous para[${targetIndex}] same as current — using current`,
        );
      }
    }

    const currPreview = currentParagraph.length > 60
      ? currentParagraph.substring(0, 60) + '...'
      : currentParagraph;
    console.info(
      `[redoRejected] Current para[${targetIndex}]: "${currPreview}"`,
    );

    usedIndices.add(targetIndex);

    try {
      const improved = await reviewArticleSection(
        config,
        systemPrompt,
        buildRevisionUserPrompt(
          sourceParagraph,
          prompt,
          improvement.status,
        ),
        8192,
      );

      const trimmed = improved.trim();
      if (trimmed && trimmed !== currentParagraph) {
        improvedParagraphs[targetIndex] = trimmed;
        improvedCount++;
        console.info(
          `[redoRejected] Change ${change_id.substring(0, 8)} → paragraph ${targetIndex}: improved`,
        );
      } else {
        console.info(
          `[redoRejected] Change ${change_id.substring(0, 8)} → paragraph ${targetIndex}: no change`,
        );
      }
    } catch (error) {
      console.error(
        `[redoRejected] Failed to improve change ${change_id}:`,
        error,
      );
    }
  }

  if (improvedCount === 0) {
    return {
      hasImprovements: false,
      comment: 'No improvements were applied.',
      oldRevisionId: 0,
      newRevisionId: 0,
    };
  }

  const improvedBody = improvedParagraphs.join('\n\n');
  const finalWikitext = directives
    ? `${directives}\n${improvedBody}`
    : improvedBody;

  const summaryPhrase = await generateRevisionSummary(
    config,
    currentWikitext,
    finalWikitext,
  );
  const editResult = await mediawiki.editArticleAsBot(
    articleId,
    finalWikitext,
    `Mira: ${summaryPhrase}`,
  );

  return {
    hasImprovements: true,
    comment: 'Changes applied successfully.',
    oldRevisionId: editResult.oldrevid,
    newRevisionId: editResult.newrevid,
  };
}

export async function improveRevisionChanges(
  articleId: string,
  improvements: CommentImprovement[],
  config: LLMConfig,
  miraBotId: string,
): Promise<CommentReviewResult> {
  const article = await getArticle(articleId);
  if (!article) {
    throw new Error(`Article not found: ${articleId}`);
  }

  const mediawiki = new MediawikiClient(article.language ?? 'en', wikipediaApi);
  const { wikitext } = await mediawiki.getArticleForAIReview(articleId);

  const isEmptyArticle = !wikitext || wikitext.trim().length === 0;
  const validImprovements = improvements.filter(
    (imp) => imp.status === 2 && imp.content?.trim(),
  );

  if (validImprovements.length === 0) {
    return {
      hasImprovements: false,
      comment: 'No improvements with content to process.',
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
      comment: 'No improvements were applied.',
      oldRevisionId: 0,
      newRevisionId: 0,
    };
  }

  const summaryPhrase = await generateRevisionSummary(
    config,
    wikitext ?? '',
    finalWikitext,
  );
  const editResult = await mediawiki.editArticleAsBot(
    articleId,
    finalWikitext,
    `Mira: ${summaryPhrase}`,
  );

  console.info(
    `[CommentReview] Edit complete — old rev: ${editResult.oldrevid}, new rev: ${editResult.newrevid}, bot: ${miraBotId.substring(0, 8)}`,
  );

  return {
    hasImprovements: true,
    comment: 'Changes applied successfully.',
    oldRevisionId: editResult.oldrevid,
    newRevisionId: editResult.newrevid,
  };
}

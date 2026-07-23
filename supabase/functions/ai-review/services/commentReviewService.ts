import MediawikiClient from '../../_shared/mediawikiAPI/MediawikiClient.ts';
import wikipediaApi from '../../_shared/wikipedia/WikipediaApi.ts';
import { getArticle } from '../../_shared/helpers/supabaseHelper.ts';
import { generateRevisionSummary, reviewArticleSection } from './aiService.ts';
import {
  buildRevisionSystemPrompt,
  buildRevisionUserPrompt,
} from '../config/prompts.ts';
import type { LLMConfig } from '../utils/types.ts';

export interface CommentImprovement {
  change_id: string;
  prompt: string;
  content: string;
  index: number | null;
  status: number;
  type_of_edit: number;
  mode: 'rejection' | 'follow-up';
  revision_feedback?: string[];
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

export async function processCommentedChanges(
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

  let parentRevId: number | null = null;
  try {
    const revisions = await mediawiki.getRecentRevisions(articleId, 2);
    parentRevId = revisions[0]?.parentid ?? null;
  } catch (e) {
    console.warn(
      '[processCommented] Could not fetch recent revisions, falling back to current-only mode',
    );
  }
  let previousWikitext: string | null = null;

  if (parentRevId && parentRevId > 0) {
    try {
      previousWikitext = await mediawiki.getArticleWikitextAtRevision(
        articleId,
        parentRevId,
      );
    } catch (e) {
      console.warn(
        '[processCommented] Could not fetch previous revision, falling back to current',
      );
    }
  }

  const validImprovements = improvements.filter((imp) => imp.content?.trim());

  if (validImprovements.length === 0) {
    return {
      hasImprovements: false,
      comment: 'No comment-backed changes to process.',
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
      `[processCommented] ${changedIndices.size} paragraph(s) differ between revisions`,
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
        console.warn(`[processCommented] Skipping change ${change_id}: removal has no index`);
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
            `[processCommented] Skipping change ${change_id}: could not match to any paragraph`,
          );
          continue;
        }
        matchMethod = 'fullSearch';
      }
    }

    console.info(
      `[processCommented] Change ${change_id.substring(0, 8)} → method: ${matchMethod} | storedIdx: ${index} | resolvedIdx: ${targetIndex} | plainText: "${plainTextPreview}"`,
    );

    if (usedIndices.has(targetIndex)) {
      console.warn(
        `[processCommented] Skipping change ${change_id.substring(0, 8)}: paragraph ${targetIndex} already claimed`,
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
          `[processCommented] Using PREVIOUS revision para[${targetIndex}]: "${prevPreview}"`,
        );
      } else {
        console.info(
          `[processCommented] Previous para[${targetIndex}] same as current — using current`,
        );
      }
    }

    const currPreview = currentParagraph.length > 60
      ? currentParagraph.substring(0, 60) + '...'
      : currentParagraph;
    console.info(
      `[processCommented] Current para[${targetIndex}]: "${currPreview}"`,
    );

    usedIndices.add(targetIndex);

    try {
      const improved = await reviewArticleSection(
        config,
        systemPrompt,
        buildRevisionUserPrompt(
          sourceParagraph,
          prompt,
          improvement.mode,
          improvement.revision_feedback,
        ),
        8192,
      );

      const trimmed = improved.trim();
      if (trimmed && trimmed !== currentParagraph) {
        improvedParagraphs[targetIndex] = trimmed;
        improvedCount++;
        console.info(
          `[processCommented] Change ${change_id.substring(0, 8)} → paragraph ${targetIndex}: improved`,
        );
      } else {
        console.info(
          `[processCommented] Change ${change_id.substring(0, 8)} → paragraph ${targetIndex}: no change`,
        );
      }
    } catch (error) {
      console.error(
        `[processCommented] Failed to improve change ${change_id}:`,
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

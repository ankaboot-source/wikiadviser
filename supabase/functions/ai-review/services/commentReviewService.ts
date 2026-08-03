import MediawikiClient from '../../_shared/mediawikiAPI/MediawikiClient.ts';
import wikipediaApi from '../../_shared/wikipedia/WikipediaApi.ts';
import { getArticle } from '../../_shared/helpers/supabaseHelper.ts';
import { generateRevisionSummary, reviewArticleSection } from './aiService.ts';
import {
  buildRevisionSystemPrompt,
  buildRevisionUserPrompt,
} from '../config/prompts.ts';
import {
  extractDiffFragments,
  findParagraphIndex,
  findParagraphIndexInSet,
  normalizeForMatch,
} from '../utils/paragraphMatch.ts';
import type { LLMConfig } from '../utils/types.ts';

export interface CommentImprovement {
  change_id: string;
  change_comment: string | null;
  content: string;
  index: number | null;
  status: number;
  type_of_edit: number;
  mode: 'rejection' | 'follow-up' | 'pending-with-feedback';
  revision_feedback: string[];
  custom_instructions: string | null;
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
    const { type_of_edit, index, content, change_id, change_comment } = improvement;

    const { inserted, removed, plainText } = extractDiffFragments(content || '');
    const plainTextPreview = plainText.length > 80
      ? plainText.substring(0, 80) + '...'
      : plainText;

    const candidates = [inserted, removed, plainText].filter(
      (f) => normalizeForMatch(f).length > 0,
    );

    const searchTargets: Array<{ name: string; paragraphs: string[] | null }> = [
      { name: 'current', paragraphs: currentParagraphs },
      { name: 'previous', paragraphs: previousParagraphs },
    ];

    let targetIndex = -1;
    let matchMethod = '';

    for (const target of searchTargets) {
      if (!target.paragraphs) continue;

      for (const fragment of candidates) {
        if (type_of_edit === REMOVE_TYPE) {
          targetIndex = findParagraphIndex(target.paragraphs, fragment, usedIndices);
          if (targetIndex !== -1) {
            matchMethod = `removal-${target.name}`;
            break;
          }
        } else {
          const changedMatch = findParagraphIndexInSet(
            target.paragraphs,
            changedIndices,
            fragment,
            usedIndices,
          );
          if (changedMatch !== -1) {
            targetIndex = changedMatch;
            matchMethod = `changedIndices-${target.name}`;
            break;
          }

          targetIndex = findParagraphIndex(target.paragraphs, fragment, usedIndices);
          if (targetIndex !== -1) {
            matchMethod = `fullSearch-${target.name}`;
            break;
          }
        }
      }
      if (targetIndex !== -1) break;
    }

    if (matchMethod.includes('previous') && targetIndex !== -1) {
      const stillInCurrent = currentParagraphs[targetIndex] &&
        candidates.some((f) =>
          normalizeForMatch(currentParagraphs[targetIndex]).includes(
            normalizeForMatch(f),
          ),
        );
      if (!stillInCurrent) {
        console.warn(
          `[processCommented] Change ${change_id.substring(0, 8)}: matched previous para[${targetIndex}] — regenerating from current text`,
        );
      }
    }

    if (targetIndex === -1 && index !== null && currentParagraphs[index]) {
      const storedPara = currentParagraphs[index];
      if (candidates.some((f) =>
        normalizeForMatch(storedPara).includes(normalizeForMatch(f)),
      )) {
        targetIndex = Math.min(index, currentParagraphs.length - 1);
        matchMethod = 'storedIdx';
      }
    }

    if (targetIndex === -1) {
      console.warn(
        `[processCommented] Skipping change ${change_id}: could not match to any paragraph ` +
          `(type_of_edit: ${type_of_edit}, storedIdx: ${index}, inserted: "${inserted.substring(0, 80)}", ` +
          `removed: "${removed.substring(0, 80)}", plainText: "${plainTextPreview}")`,
      );
      continue;
    }

    console.info(
      `[processCommented] Change ${change_id.substring(0, 8)} → method: ${matchMethod} | storedIdx: ${index} | resolvedIdx: ${targetIndex} | inserted: "${inserted.substring(0, 60)}" | removed: "${removed.substring(0, 60)}" | plainText: "${plainTextPreview}"`,
    );

    if (usedIndices.has(targetIndex)) {
      console.warn(
        `[processCommented] Skipping change ${change_id.substring(0, 8)}: paragraph ${targetIndex} already claimed`,
      );
      continue;
    }

    const currentParagraph = currentParagraphs[targetIndex];
    const sourceParagraph = currentParagraph;

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
          change_comment ?? '',
          improvement.mode,
          improvement.revision_feedback,
          improvement.custom_instructions ?? undefined,
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

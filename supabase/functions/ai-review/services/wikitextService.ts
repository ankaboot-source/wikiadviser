import { DiffChange, AIResponse, ReviewResult } from '../utils/types.ts';

export function processResponses(
  aiResponses: AIResponse[],
  changes: DiffChange[]
): {
  reviews: ReviewResult[];
  changesToApply: Array<{
    original: string;
    improved: string;
    comment: string;
  }>;
} {
  const reviews: ReviewResult[] = [];
  const changesToApply: Array<{
    original: string;
    improved: string;
    comment: string;
  }> = [];

  aiResponses.forEach((aiResponse, i) => {
    const change = changes[i];
    const { has_changes, comment, proposed_change } = aiResponse;

    reviews.push({
      index: i,
      comment,
      proposed_change: has_changes ? proposed_change : '',
      has_improvement: has_changes,
      change_type: change.type,
    });

    if (has_changes && proposed_change.trim()) {
      const contentToCompare =
        change.type === 'delete' ? change.oldText : change.newText;
      changesToApply.push({
        original: contentToCompare,
        improved: proposed_change,
        comment: comment,
      });
    }
  });

  return { reviews, changesToApply };
}

export function applyChanges(
  wikitext: string,
  changes: Array<{ original: string; improved: string; comment: string }>
): { improvedWikitext: string; appliedCount: number } {
  let improvedWikitext = wikitext;
  let appliedCount = 0;

  for (const change of changes) {
    if (improvedWikitext.includes(change.original)) {
      improvedWikitext = improvedWikitext.replace(
        change.original,
        change.improved
      );
      appliedCount++;
    } else {
      console.warn('Could not find original text in wikitext to replace');
    }
  }

  return { improvedWikitext, appliedCount };
}

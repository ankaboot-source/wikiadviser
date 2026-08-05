/**
 * Helpers for issue #1426 — making large AI-generated revisions reviewable.
 *
 * Section attribution, change-type categorization, formatting-only detection
 * and grouping are all derived client-side from data that already exists:
 *  - the parsed article HTML (changes rendered inline with `data-id`)
 *  - each change's `content` (the per-change diff HTML with `data-diff-action`)
 *
 * No DB migration or backend change is required.
 */
import { load } from 'cheerio';
import { ChangeItem } from 'src/types';

/** The four review-facing change kinds the reviewer sees. */
export type ChangeTypeCategory =
  | 'insertion'
  | 'deletion'
  | 'replacement'
  | 'formatting';

export interface SectionGroup {
  section: string;
  items: ChangeItem[];
}

export interface RevisionSummary {
  total: number;
  insertion: number;
  deletion: number;
  replacement: number;
  formatting: number;
}

const DEFAULT_SECTION = '(intro)';

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Build a map of `changeId -> section title` by walking the parsed article
 * HTML in document order and tracking the most recent heading. The article
 * HTML produced by `parseArticleHtml` tags each change wrapper with
 * `data-id` = the change id, so we can attribute every change to the section
 * it lives in.
 */
export function buildSectionMap(
  articleHtml: string | null,
): Map<string, string> {
  const map = new Map<string, string>();
  if (!articleHtml) return map;

  const $ = load(articleHtml);
  let currentSection = DEFAULT_SECTION;

  $('*').each((_, el) => {
    const tag = (el.tagName || '').toLowerCase();
    if (/^h[1-6]$/.test(tag)) {
      const text = $(el).text().trim();
      if (text) currentSection = text;
    }
    const dataId = $(el).attr('data-id');
    if (dataId) {
      // First section wins; a change rendered once keeps its first heading.
      if (!map.has(dataId)) map.set(dataId, currentSection);
    }
  });

  return map;
}

/**
 * A change is "formatting-only" when it carries no editorial decision: the
 * inserted and removed text are identical (only markup/whitespace changed),
 * or there is no textual change at all (pure tag/attribute/structural tweak).
 * These are the bulk of AI noise and get grouped + collapsed by default.
 */
export function isFormattingOnlyChange(content: string | null): boolean {
  if (!content) return false;

  const $ = load(content);
  const removed = normalizeWhitespace($('[data-diff-action*="remove"]').text());
  const inserted = normalizeWhitespace(
    $('[data-diff-action*="insert"]').text(),
  );

  // Replacement where the text is identical — only markup/whitespace changed.
  if (removed && inserted && removed === inserted) return true;

  // Whitespace-only difference between the two sides.
  if (
    removed &&
    inserted &&
    removed.replace(/ /g, '') === inserted.replace(/ /g, '')
  ) {
    return true;
  }

  // No textual change at all (pure structural/tag/attribute tweak).
  if (!removed && !inserted) return true;

  return false;
}

/**
 * Map a change's `type_of_edit` (and content) to one of the four
 * review-facing categories. Formatting-only overrides everything: even an
 * "insert" of whitespace is formatting, not an insertion.
 *
 * type_of_edit: 0=change, 1=insert, 2=remove, 3=structural-change,
 *               4=remove-insert, 5=comment-insert
 */
export function categorizeChangeType(
  typeOfEdit: number | null,
  content: string | null,
): ChangeTypeCategory {
  if (isFormattingOnlyChange(content)) return 'formatting';

  switch (typeOfEdit) {
    case 1: // insert
    case 5: // comment-insert
      return 'insertion';
    case 2: // remove
      return 'deletion';
    case 0: // change
    case 3: // structural-change
    case 4: // remove-insert
      return 'replacement';
    default:
      return 'replacement';
  }
}

/** Count words in a change's HTML content, for the collapsed legibility line. */
export function countWords(html: string | null): number {
  if (!html) return 0;
  const text = load(html).text();
  return text.split(/\s+/).filter(Boolean).length;
}

/** Group changes by section, preserving first-seen order. */
export function groupChangesBySection(
  items: ChangeItem[],
  sectionMap: Map<string, string>,
): SectionGroup[] {
  const groups = new Map<string, ChangeItem[]>();
  const order: string[] = [];

  for (const item of items) {
    const section = sectionMap.get(item.id) ?? '(unknown)';
    if (!groups.has(section)) {
      groups.set(section, []);
      order.push(section);
    }
    groups.get(section)!.push(item);
  }

  return order.map((section) => ({ section, items: groups.get(section)! }));
}

/** Tally a revision's changes per category, for the revision header. */
export function summarizeRevision(items: ChangeItem[]): RevisionSummary {
  const summary: RevisionSummary = {
    total: items.length,
    insertion: 0,
    deletion: 0,
    replacement: 0,
    formatting: 0,
  };

  for (const item of items) {
    const cat = categorizeChangeType(item.type_of_edit, item.content);
    summary[cat]++;
  }

  return summary;
}

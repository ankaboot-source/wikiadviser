import { load } from 'npm:cheerio@1.0.0';

export interface DiffFragments {
  inserted: string;
  removed: string;
  plainText: string;
}

function textOfNodes(nodes: ReturnType<ReturnType<typeof load>>): string {
  return nodes
    .text()
    .replaceAll(/\s+/g, ' ')
    .trim();
}

export function extractDiffFragments(content: string): DiffFragments {
  const $ = load(content, null, false);
  const inserted = textOfNodes(
    $('[data-diff-action*="insert"], ins, [data-diff-action="insert"]'),
  );
  const removed = textOfNodes(
    $('[data-diff-action*="remove"], del, [data-diff-action="remove"]'),
  );
  const plainText = textOfNodes($.root());
  return { inserted, removed, plainText };
}

export function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, '$2')
    .replace(/\[\[([^\]]*)\]\]/g, '$1')
    .replace(/={2,}/g, ' ')
    .replace(/'{2,}/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function findParagraphIndex(
  paragraphs: string[],
  fragment: string,
  exclude: Set<number> = new Set(),
): number {
  const needle = normalizeForMatch(fragment);
  if (!needle) return -1;
  return paragraphs.findIndex(
    (p, i) => !exclude.has(i) && normalizeForMatch(p).includes(needle),
  );
}

export function findParagraphIndexInSet(
  paragraphs: string[],
  indices: Set<number>,
  fragment: string,
  exclude: Set<number> = new Set(),
): number {
  const needle = normalizeForMatch(fragment);
  if (!needle) return -1;
  for (const i of indices) {
    if (exclude.has(i)) continue;
    if (normalizeForMatch(paragraphs[i] ?? '').includes(needle)) return i;
  }
  return -1;
}

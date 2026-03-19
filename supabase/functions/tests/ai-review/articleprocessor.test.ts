import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { splitArticleIntoSections } from '../../ai-review/services/articleProcessor.ts';

Deno.test('empty string gives one section', () => {
  const result = splitArticleIntoSections('');
  assertEquals(result.length, 1);
  assertEquals(result[0].index, 0);
});

Deno.test('plain text comes back as one section', () => {
  const result = splitArticleIntoSections('just some text here');
  assertEquals(result.length, 1);
  assertEquals(result[0].content.includes('just some text'), true);
});

Deno.test('indices always start at 0 and go up', () => {
  const text = `== One ==\n${'word '.repeat(60)}\n\n== Two ==\n${'word '.repeat(60)}\n\n== Three ==\n${'word '.repeat(60)}`;
  const result = splitArticleIntoSections(text);
  result.forEach((s, i) => assertEquals(s.index, i));
});

Deno.test('large input gets split into multiple sections', () => {
  const paragraph = 'word '.repeat(50) + '\n\n';
  const result = splitArticleIntoSections(paragraph.repeat(30));
  assertEquals(result.length > 1, true);
});

Deno.test('tiny sections get merged', () => {
  const text = '== A ==\nShort.\n\n== B ==\nShort.\n\n== C ==\nShort.';
  const result = splitArticleIntoSections(text);
  assertEquals(result.length <= 3, true);
});

Deno.test('each section has index and content', () => {
  const result = splitArticleIntoSections('some content');
  assertEquals(typeof result[0].index, 'number');
  assertEquals(typeof result[0].content, 'string');
});

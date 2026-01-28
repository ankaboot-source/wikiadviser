import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { applyChanges, processResponses } from '../../ai-review/services/wikitextService.ts';
import { AIResponse, DiffChange } from '../../ai-review/utils/types.ts';

Deno.test('applyChanges - replaces text correctly', () => {
  const wikitext = 'This is old text that needs improvement.';
  const changes = [
    { original: 'old text', improved: 'new text', comment: 'Improved' },
  ];

  const { improvedWikitext, appliedCount } = applyChanges(wikitext, changes);

  assertEquals(improvedWikitext, 'This is new text that needs improvement.');
  assertEquals(appliedCount, 1);
});

Deno.test('applyChanges - handles missing text', () => {
  const wikitext = 'This is some text.';
  const changes = [
    { original: 'non-existent text', improved: 'new text', comment: 'Test' },
  ];

  const { improvedWikitext, appliedCount } = applyChanges(wikitext, changes);

  assertEquals(improvedWikitext, 'This is some text.');
  assertEquals(appliedCount, 0);
});

Deno.test('processResponses - filters improvements correctly', () => {
  const aiResponses: AIResponse[] = [
    { change_index: 0, has_changes: true, comment: 'Fixed', proposed_change: 'New text' },
    { change_index: 1, has_changes: false, comment: 'Good', proposed_change: '' },
  ];

  const changes: DiffChange[] = [
    { type: 'insert', oldText: '', newText: 'Old text', context: '' },
    { type: 'insert', oldText: '', newText: 'Good text', context: '' },
  ];

  const { reviews, changesToApply } = processResponses(aiResponses, changes);

  assertEquals(reviews.length, 2);
  assertEquals(changesToApply.length, 1);
  assertEquals(changesToApply[0].improved, 'New text');
});

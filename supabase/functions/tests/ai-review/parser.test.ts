import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { parseAIResponseArray } from '../../ai-review/utils/parser.ts';

Deno.test('parseAIResponseArray - valid JSON array', () => {
  const input = JSON.stringify([
    { change_index: 0, has_changes: true, comment: 'Fixed', proposed_change: 'New text' },
    { change_index: 1, has_changes: false, comment: 'Good', proposed_change: '' },
  ]);

  const result = parseAIResponseArray(input);

  assertEquals(result?.length, 2);
  assertEquals(result?.[0].change_index, 0);
  assertEquals(result?.[0].has_changes, true);
  assertEquals(result?.[1].has_changes, false);
});

Deno.test('parseAIResponseArray - with markdown code blocks', () => {
  const input = '```json\n[{"change_index": 0, "has_changes": true, "comment": "Test", "proposed_change": "Text"}]\n```';

  const result = parseAIResponseArray(input);

  assertEquals(result?.length, 1);
  assertEquals(result?.[0].comment, 'Test');
});

Deno.test('parseAIResponseArray - invalid input', () => {
  const result = parseAIResponseArray('not valid json');
  assertEquals(result, null);
});

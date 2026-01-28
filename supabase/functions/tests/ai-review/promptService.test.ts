import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { buildBatchPrompt, calculateTokens, getEditTypeName } from '../../ai-review/services/promptService.ts';
import { DiffChange } from '../../ai-review/utils/types.ts';

Deno.test('getEditTypeName - returns correct names', () => {
  assertEquals(getEditTypeName('insert'), 'INSERT');
  assertEquals(getEditTypeName('delete'), 'DELETE');
  assertEquals(getEditTypeName('change'), 'CHANGE');
});

Deno.test('buildBatchPrompt - includes all changes', () => {
  const changes: DiffChange[] = [
    { type: 'insert', oldText: '', newText: 'New content', context: '' },
    { type: 'delete', oldText: 'Old content', newText: '', context: '' },
  ];

  const prompt = buildBatchPrompt(changes, 0);

  assertStringIncludes(prompt, 'CHANGE 0');
  assertStringIncludes(prompt, 'CHANGE 1');
  assertStringIncludes(prompt, 'ADDED: New content');
  assertStringIncludes(prompt, 'DELETED: Old content');
  assertStringIncludes(prompt, 'change_index 0 to 1');
});

Deno.test('calculateTokens - returns reasonable values', () => {
  const { estimatedInput, maxResponse } = calculateTokens(1000, 5);

  assertEquals(estimatedInput, 250); 
  assertEquals(maxResponse, 4000); 
});

import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { splitIntoBatches } from '../../ai-review/services/batchService.ts';
import { DiffChange } from '../../ai-review/utils/types.ts';

Deno.test('splitIntoBatches - splits correctly', () => {
  const changes: DiffChange[] = new Array(25).fill(null).map((_, i) => ({
    type: 'insert' as const,
    oldText: '',
    newText: `Content ${i}`,
    context: '',
  }));

  const batches = splitIntoBatches(changes, 10);

  assertEquals(batches.length, 3);
  assertEquals(batches[0].length, 10);
  assertEquals(batches[1].length, 10);
  assertEquals(batches[2].length, 5);
});

Deno.test('splitIntoBatches - handles exact multiple', () => {
  const changes: DiffChange[] = new Array(20).fill(null).map(() => ({
    type: 'insert' as const,
    oldText: '',
    newText: 'Content',
    context: '',
  }));

  const batches = splitIntoBatches(changes, 10);

  assertEquals(batches.length, 2);
  assertEquals(batches[0].length, 10);
  assertEquals(batches[1].length, 10);
});

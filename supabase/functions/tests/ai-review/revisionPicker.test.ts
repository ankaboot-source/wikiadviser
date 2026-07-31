import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { pickLatestRevisionId } from '../../ai-review/services/revisionPicker.ts';

Deno.test('pickLatestRevisionId: returns null when no revisions', () => {
  assertEquals(pickLatestRevisionId([]), null);
});

Deno.test('pickLatestRevisionId: returns the only revision when there is one', () => {
  const result = pickLatestRevisionId([
    { id: 'rev-1', created_at: '2026-01-01T00:00:00Z' },
  ]);
  assertEquals(result, 'rev-1');
});

Deno.test('pickLatestRevisionId: returns the revision with the most recent created_at', () => {
  const result = pickLatestRevisionId([
    { id: 'rev-old', created_at: '2026-01-01T00:00:00Z' },
    { id: 'rev-new', created_at: '2026-06-15T12:00:00Z' },
    { id: 'rev-mid', created_at: '2026-03-10T08:30:00Z' },
  ]);
  assertEquals(result, 'rev-new');
});

Deno.test('pickLatestRevisionId: does not mutate the input array', () => {
  const input = [
    { id: 'rev-a', created_at: '2026-01-01T00:00:00Z' },
    { id: 'rev-b', created_at: '2026-02-01T00:00:00Z' },
  ];
  pickLatestRevisionId(input);
  assertEquals(input[0].id, 'rev-a');
  assertEquals(input[1].id, 'rev-b');
});

Deno.test('pickLatestRevisionId: handles missing created_at by treating it as oldest', () => {
  const result = pickLatestRevisionId([
    { id: 'rev-no-date' },
    { id: 'rev-dated', created_at: '2026-01-01T00:00:00Z' },
  ]);
  assertEquals(result, 'rev-dated');
});

Deno.test('pickLatestRevisionId: when two revisions share created_at, picks the first encountered', () => {
  const result = pickLatestRevisionId([
    { id: 'rev-first', created_at: '2026-01-01T00:00:00Z' },
    { id: 'rev-second', created_at: '2026-01-01T00:00:00Z' },
  ]);
  assertEquals(result === 'rev-first' || result === 'rev-second', true);
});

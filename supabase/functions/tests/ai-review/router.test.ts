import {
  assertEquals,
  assertArrayIncludes,
} from 'https://deno.land/std@0.208.0/assert/mod.ts';
import {
  buildProcessableChanges,
  type CandidateChange,
} from '../../ai-review/services/reviewRouter.ts';

function candidate(overrides: Partial<CandidateChange>): CandidateChange {
  return {
    id: overrides.id ?? 'change-1',
    content: overrides.content ?? 'Some paragraph content.',
    index: overrides.index ?? 0,
    status: overrides.status ?? 0,
    type_of_edit: overrides.type_of_edit ?? 0,
    revision_id: overrides.revision_id ?? 'rev-1',
  };
}

Deno.test(
  'router: status 0 with revision-level feedback on its revision IS processable',
  () => {
    const changes = [candidate({ id: 'c1', status: 0 })];
    const changeComments = new Map<string, string[]>();
    const revisionComments = new Map<string, string[]>([
      ['rev-1', ['Use just one title']],
    ]);

    const result = buildProcessableChanges(changes, changeComments, revisionComments);

    assertEquals(result.changes.length, 1);
    assertEquals(result.changes[0].id, 'c1');
    assertEquals(result.changes[0].mode, 'revision-feedback-only');
    assertEquals(result.hasRevisionOnlyFeedback, true);
    assertArrayIncludes(result.revisionsWithFeedback, ['rev-1']);
  },
);

Deno.test(
  'router: status 0 with NO revision-level feedback is NOT processable',
  () => {
    const changes = [candidate({ id: 'c1', status: 0 })];
    const changeComments = new Map<string, string[]>();
    const revisionComments = new Map<string, string[]>();

    const result = buildProcessableChanges(changes, changeComments, revisionComments);

    assertEquals(result.changes.length, 0);
    assertEquals(result.hasRevisionOnlyFeedback, false);
    assertEquals(result.revisionsWithFeedback.length, 0);
  },
);

Deno.test(
  'router: status 1 (approved) without a change-level comment is NOT processable',
  () => {
    const changes = [candidate({ id: 'c1', status: 1 })];
    const changeComments = new Map<string, string[]>();
    const revisionComments = new Map<string, string[]>([
      ['rev-1', ['Use just one title']],
    ]);

    const result = buildProcessableChanges(changes, changeComments, revisionComments);

    assertEquals(result.changes.length, 0);
    assertEquals(result.hasRevisionOnlyFeedback, true);
  },
);

Deno.test(
  'router: status 1 with a change-level comment IS processable (regression)',
  () => {
    const changes = [candidate({ id: 'c1', status: 1 })];
    const changeComments = new Map<string, string[]>([
      ['c1', ['Fix grammar']],
    ]);
    const revisionComments = new Map<string, string[]>();

    const result = buildProcessableChanges(changes, changeComments, revisionComments);

    assertEquals(result.changes.length, 1);
    assertEquals(result.changes[0].mode, 'follow-up');
  },
);

Deno.test(
  'router: status 2 (rejected) is always processable (regression)',
  () => {
    const changes = [candidate({ id: 'c1', status: 2 })];
    const changeComments = new Map<string, string[]>();
    const revisionComments = new Map<string, string[]>();

    const result = buildProcessableChanges(changes, changeComments, revisionComments);

    assertEquals(result.changes.length, 1);
    assertEquals(result.changes[0].mode, 'rejection');
  },
);

Deno.test(
  'router: multiple revisions — feedback list is deduplicated',
  () => {
    const changes = [
      candidate({ id: 'c1', revision_id: 'rev-1', status: 0 }),
      candidate({ id: 'c2', revision_id: 'rev-1', status: 0 }),
      candidate({ id: 'c3', revision_id: 'rev-2', status: 0 }),
    ];
    const changeComments = new Map<string, string[]>();
    const revisionComments = new Map<string, string[]>([
      ['rev-1', ['Improve clarity']],
      ['rev-2', ['Add references']],
    ]);

    const result = buildProcessableChanges(changes, changeComments, revisionComments);

    assertEquals(result.changes.length, 3);
    assertArrayIncludes(result.revisionsWithFeedback, ['rev-1']);
    assertArrayIncludes(result.revisionsWithFeedback, ['rev-2']);
    assertEquals(result.revisionsWithFeedback.length, 2);
  },
);

Deno.test(
  'router: revision-level feedback is attached to each processable change in that revision',
  () => {
    const changes = [
      candidate({ id: 'c1', revision_id: 'rev-1', status: 0 }),
      candidate({ id: 'c2', revision_id: 'rev-1', status: 2 }),
    ];
    const changeComments = new Map<string, string[]>();
    const revisionComments = new Map<string, string[]>([
      ['rev-1', ['Use just one title', 'Add infobox']],
    ]);

    const result = buildProcessableChanges(changes, changeComments, revisionComments);

    assertEquals(result.changes.length, 2);
    assertEquals(result.changes[0].revision_feedback, ['Use just one title', 'Add infobox']);
    assertEquals(result.changes[1].revision_feedback, ['Use just one title', 'Add infobox']);
  },
);

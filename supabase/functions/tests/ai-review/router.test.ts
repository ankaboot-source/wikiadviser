import {
  assertEquals,
  assertArrayIncludes,
} from 'https://deno.land/std@0.208.0/assert/mod.ts';
import {
  buildProcessableChanges,
  type CandidateChange,
} from '../../ai-review/services/reviewRouter.ts';

function candidate(overrides: Partial<CandidateChange> = {}): CandidateChange {
  return {
    id: overrides.id ?? 'change-1',
    content: overrides.content ?? 'Some paragraph content.',
    index: overrides.index ?? 0,
    status: overrides.status ?? 0,
    type_of_edit: overrides.type_of_edit ?? 0,
    revision_id: overrides.revision_id ?? 'rev-1',
  };
}

function shouldIncludeApprovedChange(
  status: number,
  updatedAt: string | null,
  latestCommentTs: string | null,
): boolean {
  if (status === 1) {
    if (!latestCommentTs) return false;
    const updated = updatedAt ? new Date(updatedAt) : null;
    if (!updated || updated > new Date(latestCommentTs)) return false;
  }
  return true;
}

Deno.test(
  'router: status 0 with a change-level comment IS processable (pending-with-feedback)',
  () => {
    const changes = [candidate({ id: 'c1', status: 0 })];
    const changeComments = new Map<string, string[]>([
      ['c1', ['Tighten this paragraph']],
    ]);
    const revisionComments = new Map<string, string[]>();

    const result = buildProcessableChanges(changes, changeComments, revisionComments);

    assertEquals(result.changes.length, 1);
    assertEquals(result.changes[0].id, 'c1');
    assertEquals(result.changes[0].mode, 'pending-with-feedback');
  },
);

Deno.test(
  'router: status 0 with NO change-level comment is NOT processable',
  () => {
    const changes = [candidate({ id: 'c1', status: 0 })];
    const changeComments = new Map<string, string[]>();
    const revisionComments = new Map<string, string[]>();

    const result = buildProcessableChanges(changes, changeComments, revisionComments);

    assertEquals(result.changes.length, 0);
  },
);

Deno.test(
  'router: status 0 with only a revision-level comment is NOT processable per-paragraph',
  () => {
    const changes = [candidate({ id: 'c1', status: 0 })];
    const changeComments = new Map<string, string[]>();
    const revisionComments = new Map<string, string[]>([
      ['rev-1', ['Use just one title']],
    ]);

    const result = buildProcessableChanges(changes, changeComments, revisionComments);

    assertEquals(result.changes.length, 0);
    assertEquals(result.hasArticleWideFeedback, true);
    assertArrayIncludes(result.revisionsWithFeedback, ['rev-1']);
  },
);

Deno.test(
  'router: status 1 (approved) without a change-level comment is NOT processable (regression)',
  () => {
    const changes = [candidate({ id: 'c1', status: 1 })];
    const changeComments = new Map<string, string[]>();
    const revisionComments = new Map<string, string[]>([
      ['rev-1', ['Use just one title']],
    ]);

    const result = buildProcessableChanges(changes, changeComments, revisionComments);

    assertEquals(result.changes.length, 0);
    assertEquals(result.hasArticleWideFeedback, true);
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
  'router: revision-level feedback is attached to each processable change as context',
  () => {
    const changes = [
      candidate({ id: 'c1', revision_id: 'rev-1', status: 0 }),
      candidate({ id: 'c2', revision_id: 'rev-1', status: 2 }),
      candidate({ id: 'c3', revision_id: 'rev-1', status: 1 }),
    ];
    const changeComments = new Map<string, string[]>([
      ['c1', ['P1-cmt']],
      ['c3', ['P3-cmt']],
    ]);
    const revisionComments = new Map<string, string[]>([
      ['rev-1', ['Use just one title', 'Add infobox']],
    ]);

    const result = buildProcessableChanges(changes, changeComments, revisionComments);

    assertEquals(result.changes.length, 3);
    assertEquals(result.changes[0].revision_feedback, ['Use just one title', 'Add infobox']);
    assertEquals(result.changes[1].revision_feedback, ['Use just one title', 'Add infobox']);
    assertEquals(result.changes[2].revision_feedback, ['Use just one title', 'Add infobox']);
  },
);

Deno.test(
  'router: custom_instructions flow through as origin context',
  () => {
    const changes = [candidate({ id: 'c1', status: 0 })];
    const changeComments = new Map<string, string[]>([['c1', ['tighter']]]);
    const revisionComments = new Map<string, string[]>();

    const result = buildProcessableChanges(
      changes,
      changeComments,
      revisionComments,
      'Use British English',
    );

    assertEquals(result.changes.length, 1);
    assertEquals(result.customInstructions, 'Use British English');
  },
);

Deno.test(
  'router: hasArticleWideFeedback is true iff a revision comment exists, regardless of change routing',
  () => {
    const changes = [candidate({ id: 'c1', status: 2 })];
    const changeComments = new Map<string, string[]>();
    const revisionComments = new Map<string, string[]>([
      ['rev-1', ['Use just one title']],
    ]);

    const result = buildProcessableChanges(changes, changeComments, revisionComments);

    assertEquals(result.hasArticleWideFeedback, true);
    assertEquals(result.revisionsWithFeedback.length, 1);
  },
);

Deno.test(
  'router: hasArticleWideFeedback is false when no revision comment exists',
  () => {
    const changes = [candidate({ id: 'c1', status: 2 })];
    const changeComments = new Map<string, string[]>();

    const result = buildProcessableChanges(
      changes,
      changeComments,
      new Map<string, string[]>(),
    );

    assertEquals(result.hasArticleWideFeedback, false);
  },
);

Deno.test(
  'router: three-channel inputs preserved on each processable change',
  () => {
    const changes = [candidate({ id: 'c1', revision_id: 'rev-1', status: 1 })];
    const changeComments = new Map<string, string[]>([
      ['c1', ['Fix this']],
    ]);
    const revisionComments = new Map<string, string[]>([
      ['rev-1', ['Use just one title']],
    ]);

    const result = buildProcessableChanges(
      changes,
      changeComments,
      revisionComments,
      'Use British English',
    );

    assertEquals(result.changes.length, 1);
    assertEquals(result.changes[0].change_comment, 'Fix this');
    assertEquals(result.changes[0].revision_feedback, ['Use just one title']);
    assertEquals(result.changes[0].custom_instructions, 'Use British English');
  },
);

Deno.test(
  'approved change: updated_at after latest comment → excluded (already processed)',
  () => {
    assertEquals(
      shouldIncludeApprovedChange(1, '2024-01-02T00:00:00Z', '2024-01-01T00:00:00Z'),
      false,
    );
  },
);

Deno.test(
  'approved change: updated_at before latest comment → included (new comment since last process)',
  () => {
    assertEquals(
      shouldIncludeApprovedChange(1, '2024-01-01T00:00:00Z', '2024-01-02T00:00:00Z'),
      true,
    );
  },
);

Deno.test(
  'approved change: no comment → excluded',
  () => {
    assertEquals(shouldIncludeApprovedChange(1, '2024-01-02T00:00:00Z', null), false);
  },
);

Deno.test(
  'approved change: updated_at null → excluded',
  () => {
    assertEquals(
      shouldIncludeApprovedChange(1, null, '2024-01-01T00:00:00Z'),
      false,
    );
  },
);

Deno.test(
  'rejected change (status=2): always included regardless of updated_at',
  () => {
    assertEquals(
      shouldIncludeApprovedChange(2, '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z'),
      true,
    );
  },
);

Deno.test(
  'pending change (status=0): always included regardless of updated_at',
  () => {
    assertEquals(
      shouldIncludeApprovedChange(0, null, null),
      true,
    );
  },
);

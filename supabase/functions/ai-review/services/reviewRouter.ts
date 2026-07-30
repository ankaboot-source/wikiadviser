export interface CandidateChange {
  id: string;
  content: string | null;
  index: number | null;
  status: number;
  type_of_edit: number | null;
  revision_id?: string | null;
}

export type ProcessableMode =
  | 'rejection'
  | 'follow-up'
  | 'pending-with-feedback';

export interface ProcessableChange {
  id: string;
  content: string | null;
  index: number | null;
  status: number;
  type_of_edit: number;
  revision_id?: string | null;
  mode: ProcessableMode;
  change_comment: string | null;
  revision_feedback: string[];
  custom_instructions: string | null;
}

export interface ProcessableChangesResult {
  changes: ProcessableChange[];
  hasArticleWideFeedback: boolean;
  revisionsWithFeedback: string[];
  customInstructions: string | null;
}

const STATUS_APPROVED = 1;
const STATUS_REJECTED = 2;

export function buildProcessableChanges(
  candidateChanges: CandidateChange[],
  changeCommentsById: Map<string, string[]>,
  revisionCommentsByRevisionId: Map<string, string[]>,
  customInstructions?: string,
): ProcessableChangesResult {
  const revisionsWithFeedback = Array.from(
    revisionCommentsByRevisionId.keys(),
  );
  const hasArticleWideFeedback = revisionsWithFeedback.length > 0;
  const trimmedCustom = customInstructions?.trim() || null;

  const processable: ProcessableChange[] = [];

  for (const change of candidateChanges) {
    const changeComments = changeCommentsById.get(change.id) ?? [];
    const revisionFeedback = change.revision_id
      ? (revisionCommentsByRevisionId.get(change.revision_id) ?? [])
      : [];

    const changeComment = changeComments[0] ?? null;

    if (change.status === STATUS_REJECTED) {
      processable.push({
        id: change.id,
        content: change.content,
        index: change.index,
        status: change.status,
        type_of_edit: change.type_of_edit ?? 0,
        revision_id: change.revision_id,
        mode: 'rejection',
        change_comment: changeComment,
        revision_feedback: revisionFeedback,
        custom_instructions: trimmedCustom,
      });
      continue;
    }

    if (change.status === STATUS_APPROVED && changeComments.length > 0) {
      processable.push({
        id: change.id,
        content: change.content,
        index: change.index,
        status: change.status,
        type_of_edit: change.type_of_edit ?? 0,
        revision_id: change.revision_id,
        mode: 'follow-up',
        change_comment: changeComment,
        revision_feedback: revisionFeedback,
        custom_instructions: trimmedCustom,
      });
      continue;
    }

    if (change.status === 0 && changeComments.length > 0) {
      processable.push({
        id: change.id,
        content: change.content,
        index: change.index,
        status: change.status,
        type_of_edit: change.type_of_edit ?? 0,
        revision_id: change.revision_id,
        mode: 'pending-with-feedback',
        change_comment: changeComment,
        revision_feedback: revisionFeedback,
        custom_instructions: trimmedCustom,
      });
    }
  }

  return {
    changes: processable,
    hasArticleWideFeedback,
    revisionsWithFeedback,
    customInstructions: trimmedCustom,
  };
}

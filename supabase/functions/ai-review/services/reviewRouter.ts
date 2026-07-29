export interface CandidateChange {
  id: string;
  content: string | null;
  index: number | null;
  status: number;
  type_of_edit: number | null;
  revision_id?: string | null;
}

export interface ProcessableChange {
  id: string;
  content: string | null;
  index: number | null;
  status: number;
  type_of_edit: number;
  revision_id?: string | null;
  mode: 'rejection' | 'follow-up' | 'revision-feedback-only';
  revision_feedback: string[];
}

export interface ProcessableChangesResult {
  changes: ProcessableChange[];
  hasRevisionOnlyFeedback: boolean;
  revisionsWithFeedback: string[];
}

const STATUS_APPROVED = 1;
const STATUS_REJECTED = 2;

export function buildProcessableChanges(
  candidateChanges: CandidateChange[],
  changeCommentsById: Map<string, string[]>,
  revisionCommentsByRevisionId: Map<string, string[]>,
): ProcessableChangesResult {
  const revisionsWithFeedback = Array.from(revisionCommentsByRevisionId.keys());
  const hasRevisionOnlyFeedback = revisionsWithFeedback.length > 0;

  const processable: ProcessableChange[] = [];

  for (const change of candidateChanges) {
    const revisionFeedback = change.revision_id
      ? (revisionCommentsByRevisionId.get(change.revision_id) ?? [])
      : [];
    const changeComments = changeCommentsById.get(change.id) ?? [];

    if (change.status === STATUS_REJECTED) {
      processable.push({
        id: change.id,
        content: change.content,
        index: change.index,
        status: change.status,
        type_of_edit: change.type_of_edit ?? 0,
        revision_id: change.revision_id,
        mode: 'rejection',
        revision_feedback: revisionFeedback,
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
        revision_feedback: revisionFeedback,
      });
      continue;
    }

    if (change.status === 0 && revisionFeedback.length > 0) {
      processable.push({
        id: change.id,
        content: change.content,
        index: change.index,
        status: change.status,
        type_of_edit: change.type_of_edit ?? 0,
        revision_id: change.revision_id,
        mode: 'revision-feedback-only',
        revision_feedback: revisionFeedback,
      });
    }
  }

  return {
    changes: processable,
    hasRevisionOnlyFeedback,
    revisionsWithFeedback,
  };
}

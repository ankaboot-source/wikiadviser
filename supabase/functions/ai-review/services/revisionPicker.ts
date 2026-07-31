export interface RevisionRow {
  id: string;
  created_at?: string | null;
}

export function pickLatestRevisionId(
  revisions: RevisionRow[],
): string | null {
  if (!revisions || revisions.length === 0) return null;

  const sorted = [...revisions].sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bTime - aTime;
  });

  return sorted[0]?.id ?? null;
}

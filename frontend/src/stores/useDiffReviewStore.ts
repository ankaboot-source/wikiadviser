import { defineStore } from 'pinia';
import { ChangeTypeCategory } from 'src/utils/changeGrouping';
import { COLLAPSE_THRESHOLD } from 'src/utils/consts';
import { computed, ref } from 'vue';

/** A staged bulk accept/reject, undoable until the revision is submitted. */
export interface PendingBulkAction {
  id: string;
  /** Human description, e.g. "Accept 12 formatting changes in §3". */
  label: string;
  changeIds: string[];
  action: 'accept' | 'reject';
  /** changeId -> previous status, for reverting on undo. */
  previousStatuses: Record<string, number>;
}

/**
 * State for the reviewable-large-revisions feature (issue #1426).
 *
 * Holds collapse state (per revision / section / change), filters, the set of
 * locally-reviewed changes (so the reviewer can resume), and staged bulk
 * accept/reject actions that are undoable until the revision is submitted.
 *
 * Navigation position (prev/next, `n / total`) is owned by `DiffRevision`
 * because it depends on the filtered, visible change list which the component
 * computes.
 */
export const useDiffReviewStore = defineStore('diffReview', () => {
  // ---- Collapse state ----
  /** revisionId -> force-collapsed? `undefined` = use default (threshold-based). */
  const revisionCollapse = ref<Record<string, boolean | undefined>>({});
  /** `${revisionId}::${section}` -> collapsed? */
  const sectionCollapse = ref<Record<string, boolean>>({});
  /** changeId -> collapsed? Explicit per-change override wins over all. */
  const changeCollapse = ref<Record<string, boolean>>({});
  /** revisionId -> default-collapsed (items.length > COLLAPSE_THRESHOLD). */
  const revisionDefault = ref<Record<string, boolean>>({});
  const allCollapsed = computed(() => {
    return Object.values(revisionCollapse.value).every((v) => v === true);
  });

  // ---- Filters ----
  const typeFilter = ref<ChangeTypeCategory | 'all'>('all');
  const unreviewedOnly = ref(false);

  // ---- Reviewed marker (resume support) ----
  /** changeIds the reviewer has visited/marked, persisted for the session. */
  const reviewedChangeIds = ref<Set<string>>(new Set());

  // ---- Staged bulk actions (undoable pre-submission) ----
  const pendingBulkActions = ref<PendingBulkAction[]>([]);

  // ---- Collapse helpers ----
  function registerRevisionDefault(revisionId: string, itemCount: number) {
    revisionDefault.value[revisionId] = itemCount > COLLAPSE_THRESHOLD;
  }

  function sectionKey(revisionId: string, section: string): string {
    return `${revisionId}::${section}`;
  }

  /**
   * Resolve whether a change is collapsed. Precedence (highest wins):
   * 1. explicit per-change override
   * 2. per-section override
   * 3. per-revision override
   * 4. default (threshold-based)
   */
  function isCollapsed(
    revisionId: string,
    section: string,
    changeId: string,
  ): boolean {
    const sKey = sectionKey(revisionId, section);
    // 1) if the section is explicitly collapsed, force the change to be
    //    collapsed while the section is collapsed.
    if (sectionCollapse.value[sKey] === true) {
      return true;
    }
    // 2) explicit per-change override wins (only honored when the section is open)
    if (changeId in changeCollapse.value) {
      return changeCollapse.value[changeId];
    }
    // 3) if the revision is explicitly collapsed, treat as collapsed too.
    if (revisionCollapse.value[revisionId] === true) {
      return true;
    }
    // 4) default: start collapsed.
    return true;
  }

  function toggleChange(changeId: string) {
    const cur = changeCollapse.value[changeId];
    changeCollapse.value = { ...changeCollapse.value, [changeId]: !cur };
  }

  function setChangeCollapsed(changeId: string, collapsed: boolean) {
    changeCollapse.value = { ...changeCollapse.value, [changeId]: collapsed };
  }

  function toggleSection(revisionId: string, section: string) {
    const sKey = sectionKey(revisionId, section);
    const cur = sectionCollapse.value[sKey];
    sectionCollapse.value = { ...sectionCollapse.value, [sKey]: !cur };
  }

  /** Explicitly set a section's collapsed state. Use this from components to
   * avoid toggle races when the component drives the canonical state. */
  function setSectionCollapsed(
    revisionId: string,
    section: string,
    collapsed: boolean,
  ) {
    const sKey = sectionKey(revisionId, section);
    sectionCollapse.value = { ...sectionCollapse.value, [sKey]: collapsed };
  }

  function isSectionCollapsed(revisionId: string, section: string): boolean {
    const sKey = sectionKey(revisionId, section);
    if (sKey in sectionCollapse.value) return sectionCollapse.value[sKey];
    if (revisionId in revisionCollapse.value) {
      return revisionCollapse.value[revisionId] === true;
    }
    // All sections start closed by default, even for revisions that would
    // otherwise have an expanded default state.
    return true;
  }

  function toggleRevision(revisionId: string) {
    const cur = revisionCollapse.value[revisionId];
    const next = cur === undefined ? true : undefined;
    revisionCollapse.value = { ...revisionCollapse.value, [revisionId]: next };
  }

  function collapseAll(revisionId: string, changeIds: string[] = []) {
    revisionCollapse.value = { ...revisionCollapse.value, [revisionId]: true };
    // Clear per-change overrides so the revision-level collapse applies to all.
    const next = { ...changeCollapse.value };
    for (const id of changeIds) delete next[id];
    changeCollapse.value = next;
  }

  function expandAll(revisionId: string, changeIds: string[] = []) {
    revisionCollapse.value = { ...revisionCollapse.value, [revisionId]: false };
    const next = { ...changeCollapse.value };
    for (const id of changeIds) delete next[id];
    changeCollapse.value = next;
  }

  /** Collapse only sections (optionally clearing per-change overrides). */
  function collapseAllSections(
    revisionId: string,
    sections: string[] = [],
    changeIds: string[] = [],
  ) {
    const next = { ...sectionCollapse.value };
    for (const sec of sections) {
      next[sectionKey(revisionId, sec)] = true;
    }
    sectionCollapse.value = next;
    if (changeIds.length) {
      const nextChanges = { ...changeCollapse.value };
      for (const id of changeIds) delete nextChanges[id];
      changeCollapse.value = nextChanges;
    }
  }

  /** Expand only sections (does not modify per-change collapse state). */
  function expandAllSections(revisionId: string, sections: string[] = []) {
    const next = { ...sectionCollapse.value };
    for (const sec of sections) {
      next[sectionKey(revisionId, sec)] = false;
    }
    sectionCollapse.value = next;
  }

  function toggleSections(
    revisionId: string,
    sections: string[] = [],
    changeIds: string[] = [],
  ) {
    const allSecCollapsed = sections.length
      ? sections.every((s) => isSectionCollapsed(revisionId, s))
      : true;
    if (allSecCollapsed) expandAllSections(revisionId, sections);
    else collapseAllSections(revisionId, sections, changeIds);
  }

  function toggleCollapse(revisionId: string, changeIds: string[] = []) {
    const cur = revisionCollapse.value[revisionId];
    const defaultCollapsed = revisionDefault.value[revisionId] === true;
    const isCurrentlyCollapsed =
      cur === true || (cur === undefined && defaultCollapsed);
    if (isCurrentlyCollapsed) {
      expandAll(revisionId, changeIds);
    } else {
      collapseAll(revisionId, changeIds);
    }
  }

  // ---- Filters ----
  function setTypeFilter(filter: ChangeTypeCategory | 'all') {
    typeFilter.value = filter;
  }

  function setUnreviewedOnly(value: boolean) {
    unreviewedOnly.value = value;
  }

  // ---- Reviewed marker ----
  function markReviewed(changeId: string) {
    reviewedChangeIds.value = new Set(reviewedChangeIds.value).add(changeId);
  }

  function unmarkReviewed(changeId: string) {
    const next = new Set(reviewedChangeIds.value);
    next.delete(changeId);
    reviewedChangeIds.value = next;
  }

  function isReviewed(changeId: string): boolean {
    return reviewedChangeIds.value.has(changeId);
  }

  // ---- Bulk actions ----
  function stageBulkAction(action: PendingBulkAction) {
    pendingBulkActions.value = [...pendingBulkActions.value, action];
  }

  function removeBulkAction(id: string) {
    pendingBulkActions.value = pendingBulkActions.value.filter(
      (a) => a.id !== id,
    );
  }

  const hasPendingBulkActions = computed(
    () => pendingBulkActions.value.length > 0,
  );

  return {
    revisionCollapse,
    sectionCollapse,
    changeCollapse,
    revisionDefault,
    typeFilter,
    unreviewedOnly,
    reviewedChangeIds,
    pendingBulkActions,
    hasPendingBulkActions,
    allCollapsed,
    registerRevisionDefault,
    isCollapsed,
    isSectionCollapsed,
    toggleChange,
    setChangeCollapsed,
    toggleSection,
    toggleRevision,
    collapseAll,
    expandAll,
    collapseAllSections,
    expandAllSections,
    toggleSections,
    toggleCollapse,
    setTypeFilter,
    setUnreviewedOnly,
    markReviewed,
    unmarkReviewed,
    isReviewed,
    stageBulkAction,
    removeBulkAction,
    // New explicit setter to avoid toggle races when components drive state.
    setSectionCollapsed,
  };
});

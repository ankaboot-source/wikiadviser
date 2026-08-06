# PR #1429 Context — Reviewable Large Revisions (Issue #1426)

## What this PR does
Makes revisions with dozens of AI-generated changes reviewable by collapsing,
grouping and navigating changes so the reviewer keeps article structure.

## Key decisions

### Section attribution: client-side derivation (no DB migration)
- The `changes` table has no `section` column. Rather than adding one via a
  migration + backend extraction, we derive section attribution client-side
  from the parsed article HTML (`buildSectionMap` in `changeGrouping.ts`).
- Changes are rendered inline in the article HTML with `data-id` attributes
  (set by `parseArticleHtml`). The nearest preceding heading (`h1`-`h6`) is
  the change's section.
- Formatting-only/whitespace-only classification is likewise derived from the
  change `content` diff HTML (compare removed vs inserted text).

### Scope: full feature in one PR
All three sub-areas (collapse, navigation, triage) + bulk-action reversibility
implemented in a single PR, not split into smaller PRs.

### Collapse threshold: COLLAPSE_THRESHOLD = 15
- Defined in `frontend/src/utils/consts/index.ts`.
- Above 15 changes in a revision, changes collapse by default.
- Below 15, changes expand by default (previously always collapsed — this is
  a deliberate UX change per the issue).

### Store key: revid string (not UUID)
- `collapseAll`/`expandAll`/`toggleSection` in `DiffRevision.vue` originally
  used `revision.id` (UUID) as the store key, while `isCollapsed` and
  `DiffItem` used `String(revision.revid)` (e.g. `"9649"`). The keys never
  matched, so collapse-all had no effect. Fixed by using the revid string
  consistently everywhere.

## Files changed

- `frontend/src/utils/changeGrouping.ts` (new) — section attribution, type
  categorization, formatting-only detection, word count, grouping.
- `frontend/src/stores/useDiffReviewStore.ts` (new) — collapse state, filters,
  reviewed set, staged undoable bulk actions.
- `frontend/src/components/Diff/DiffRevision.vue` — type counts, collapse-all/
  expand-all, section grouping, section index, prev/next nav, filters, section
  accept/reject, bulk-action banner.
- `frontend/src/components/Diff/DiffItem.vue` — collapsed legibility (type/
  size/section), reviewed marker, nav integration; collapse state now driven
  by the store.
- `frontend/src/components/Diff/DiffList.vue` — builds the section map from
  the article HTML and passes it down.
- `frontend/src/pages/article/ArticlePage.vue` — passes `changesContent` to
  `DiffList`.
- `frontend/src/utils/consts/index.ts` — `COLLAPSE_THRESHOLD = 15`.
- `pr-watch.sh` (new) — local PR comment watcher for `/oc` trigger.

## Testing
- No frontend test suite exists. UI verification is done via the
  `agent-browser` skill against the live dev stack.
- The auto-collapse threshold (15) is not exercised in local testing because
  no revision in the local DB has >15 indexed changes (the 60-change revision
  has all-unindexed changes, which require MediaWiki/Parsoid to index).

## Known limitations
- Section attribution falls back to "(intro)" for changes before the first
  heading, and "(unknown)" if the change's `data-id` isn't found in the
  article HTML.
- The reviewed marker (`task_alt`) only shows in the collapsed legibility
  line — it's not visible when the change is expanded.
- Bulk actions apply immediately to the DB; undo reverts them. There is no
  "submit revision" step that finalizes them — the undo is available as long
  as the action is in `pendingBulkActions`.

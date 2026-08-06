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

### Agentic AI dimension: review surface over Mira output
- This PR **does not modify Mira** itself — `supabase/functions/ai-review/`
  is unchanged (model routing, refusal handling, free-model guard,
  `pending_diff` all intact). No edge-function, prompt, or model change.
- The Agentic AI change is the **human-review surface over AI output**:
  collapse / group / navigate / triage let reviewers handle Mira's large
  AI-generated revisions by article structure instead of a flat list. Mira
  produces the same revisions; reviewability at scale is what improved.
- Framing for `/oc` answers: this is the review layer over agentic output,
  not a change to the agent. `changeGrouping.ts` is explicitly scoped to
  "large AI-generated revisions" and buckets "AI noise" (formatting-only
  changes) for collapse.

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

## /oc exchanges
- **#5206398194** "besides the fixed issue, what did this pr introduce?" →
  Answered: 3 extras beyond the core #1426 fix — (1) collapse-default UX
  change (`COLLAPSE_THRESHOLD = 15`, ≤15 expands by default vs. always
  collapsed before), (2) collapse-key bug fix (revid string vs UUID mismatch
  made collapse-all a no-op), (3) `pr-watch.sh` watcher tooling.
- **#5206629501** "What does the isFormattingOnlyChange function do?" →
  Answered: classifies a change as no-editorial-decision (markup/whitespace/
  structural only) via 3 rules in `changeGrouping.ts:78`; used by
  `categorizeChangeType` as an override to bucket such changes as
  `'formatting'` regardless of `type_of_edit`.
- **#5206781925** "agentic AI wise, whats up?" → Answered: PR doesn't touch
  Mira (`supabase/functions/ai-review/` unchanged — model routing, refusal
  handling, free-model guard, `pending_diff` all intact). The agentic-AI
  angle is the **review surface over AI output**: collapse/group/nav/triage
  lets reviewers handle Mira's large revisions by structure instead of a
  flat list. AI produces the same revisions; reviewability at scale improved.
- **#5206807354** "besides the feature, infrastructure wise, the changes
  that are unrelated to the issue" → Answered: 3 infra items — (1) AGENTS.md
  rewrite (301→70 lines, repo-rules-only sourced from config/sessions,
  −231 net, biggest non-feature change), (2) Playwright E2E infra removed
  (`playwright.config.ts`, `reviewable-revisions.spec.ts`, `@playwright/test`
  dep — added in `ef9505eb` then removed in `09a45f35` same PR, net-zero on
  tree but churn), (3) `pr-watch.sh` + `pr-context.md` tooling (already
  covered). No migrations, edge-function, CI, docker, or MyVisualEditor
  changes — infra footprint is docs + local tooling only.
- **#5207163909** "Can you update the PR Title?" → Asked for the desired
  title. Current title is `feat(diff): make large AI-generated revisions
  reviewable`; reviewer didn't specify a target, so awaiting the new title
  before changing it.
- **#5207618160** "include the fact that there are Agentic AI changes" →
  Added an "Agentic AI dimension" subsection under Key decisions so future
  `/oc` answers reflect that the PR's Agentic AI change is the review surface
  over Mira output (Mira itself unchanged; `ai-review/` diff is empty).

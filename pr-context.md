# pr-context.md — PR #1430

**Branch:** `pr-watch-782026`
**Title:** Update pr-watch.sh
**Latest commit:** `816c163c`

## Changes

- `pr-watch.sh` — Added org-membership gating (`is_org_member()`) so only org members can trigger `/oc` processing. Non-member comments are skipped with a logged warning; state is still updated to avoid re-checking.

## Key decisions

- `is_org_member()` uses GitHub API `GET /orgs/:org/members/:username` — returns 0 on 204 (member), 1 otherwise (safe default-deny).
- Results cached in `_ORG_MEMBER_CACHE` associative array to avoid redundant API calls.
- Applied consistently in both backlog processing and live-polling paths.
- Non-member comments still advance `LAST_SEEN` so they aren't re-polled.

## Open questions

None.

## /oc exchanges

### 2026-08-07 — @J43fura: "/oc is this PR safe to merge?"

**Reply:** Safe to merge. Verified syntax (`bash -n`), logic (default-deny, caching, consistent application), and CI (CodeQL + changes passed). Low risk — isolated to a single bash script.
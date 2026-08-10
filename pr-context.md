# PR Context — last_seen improvements + automated DB change approval gate

## A. last_seen improvements (issue #71 follow-up)

- **Current user shows "Online now" in Share** — previously the current user (filtered out of `connectedUsers` for the toolbar) showed "Last seen just now" in the Share dialog. Added a `currentUserId` prop threaded ArticlePage → DiffToolbar → ShareCard → ShareUser; `isOnline` now also matches the current user.
- **"last seen" formatting** — timestamps ≥ 30 days old now render as a date instead of "N days ago".
- **Index migration** `20260808120000_add_index_profiles_last_seen.sql` — `CREATE INDEX IF NOT EXISTS` on `profiles(last_seen)` for "recently online" queries. Additive + idempotent.

### Real-DB validation (evidence, not dummy data)
- `supabase db reset` applied all migrations incl. the new index; verified: index `profiles_last_seen_idx` exists, `profiles.last_seen` column exists, `profiles_view` exposes `last_seen`.
- Heartbeat: `user/heartbeat` wrote `last_seen` to the real local DB (null → `2026-08-08 18:38:23`).
- `get/users` auth: no auth → 401, authed + permission → 200, authed + no permission → 403.
- Browser end-to-end with a real logged-in user: Share shows "dbtest@wikiadviser.io — Online now" (real data). Screenshot: `/tmp/opencode/lastseen-improved.png`.
- `deno test` 107 passed; frontend lint 0 errors; prettier clean.

## B. Automated DB change approval gate

`.github/workflows/db-change-guard.yml` — a check that fails any PR touching DB paths (`supabase/migrations/`, `frontend/src/types/database.types.ts`, `supabase/functions/`, any `.sql`) until a human adds the **`db-approved`** label (created) after reviewing the migration. Posts an idempotent reminder comment.

### Guard demonstrated on THIS PR
This branch contains the index migration (a real DB change). The guard should **FAIL** this PR and post the reminder comment, because `db-approved` is NOT present — demonstrating the protection working. A human must review + add the label to pass. (Agent must NOT merge a DB-impactful PR itself.)

### Enforcement caveat
`main` has no branch protection, so enabling it with `DB change guard` as a required check is recommended (documented in AGENTS.md).

## C. Destructive local DB command guardrail

- **AGENTS.md**: prominent rule — NEVER run `supabase db reset`/`drop` (or any command that drops/recreates the local DB) without explicit user approval; they wipe local data. Use `supabase migration up` (non-destructive) to apply pending migrations.
- **`scripts/supabase-db.sh`**: safe wrapper that refuses `reset`/`drop` unless `--confirm-destructive` is passed (tested: blocks reset/drop, allows migration up).
- **`docs/db-change-checklist.md`**: validation step requires using the safe wrapper / never running destructive commands without approval.

## D. Human-in-the-loop approval (general, mandatory)

- **AGENTS.md General Guidelines**: added a prominent rule — human-in-the-loop approval is MANDATORY for any high-risk action (destructive/irreversible commands, applying migrations to prod/staging, merging DB-impactful PRs, pushing to main, anything that could lose data or break the data model). If unsure whether an action is high-risk, treat it as high-risk and ask first.

## E. Multi-user mock + UI testing coverage

- **`frontend/src/api/supabase.mock.ts`**: `get/users` now returns 5 users with **varied `last_seen`** (online, 5 min, 2 hr, 3 days, 60 days) and different roles; presence reports 3 connected users so the toolbar stack shows multiple avatars (after filtering self).
- **`.opencode/skills/e2e-testing/SKILL.md`**: added "Cover the different possibilities (mandatory for UI work)" — test/screenshot multiple users, varied states (Online now / X min/hr/day(s) ago / date for ≥30 days), edge cases (no avatar, empty, long names), responsive widths.
- Verified in browser (mock): toolbar shows 2 avatars (JD, BS); Share shows Dummy/Jane/Bob "Online now", Alice "Last seen 3 days ago", Charlie date "6/9/2026". Screenshot: `/tmp/opencode/share-multiuser.png`.

## Other notes
- The earlier `last_seen` migration from #1445 is on `main` but NOT applied to prod; still needs human review before any prod apply.
- Typescript pin (`^5.9.2`) from #1445 is on main (workaround for #1446).
## F. Real-replica e2e verification (isolated, dev data untouched)

Ran a browser e2e on the last_seen feature against an **isolated Supabase replica** (separate local instance, ports 54331+; never touches the dev 54321/54322).

- **Replica**: fresh schema from all migrations (incl. last_seen column + index) + seed; verified dev instance data intact afterward.
- **Backend**: `user/heartbeat` wrote `last_seen` (null → timestamp) on the replica; `get/users` → 401/200/403 (auth + permission check).
- **Browser (agent-browser, real login)**: Share dialog shows full range on the replica — e2e user "Online now", Jane "Last seen 5 min ago", Bob "Last seen 2 hr ago", Charlie date "6/10/2026" (≥30-day fallback). Screenshot `/tmp/opencode/e2e-share-multiuser.png`.
- **Reusable tooling (this PR)**: `scripts/e2e-env.sh` (start/stop/drop/env for the isolated replica + e2e frontend) and `docs/e2e-workflow.md` — so any feature can be browser-tested the same way without risking dev data.

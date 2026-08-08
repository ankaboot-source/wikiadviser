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

## Other notes
- The earlier `last_seen` migration from #1445 is on `main` but NOT applied to prod; still needs human review before any prod apply.
- Typescript pin (`^5.9.2`) from #1445 is on main (workaround for #1446).
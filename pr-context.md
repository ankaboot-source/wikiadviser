# PR Context — Automated DB change approval gate

Prevents future merges of DB-impactful PRs without explicit human approval (a process failure happened on this repo when PR #1445 — which contained a migration — was merged by the agent without user sign-off).

## What

- **`.github/workflows/db-change-guard.yml`** — a check that runs on every PR. If the PR touches DB-impactful paths (`supabase/migrations/`, `frontend/src/types/database.types.ts`, `supabase/functions/`, or any `.sql`), it **fails** until a human adds the **`db-approved`** label (created: green, "Human reviewed migration (risk + rollback)"). It posts an idempotent reminder comment (updates, not spam).
- **AGENTS.md** — "DB change safety" step 2 now states the agent **never merges a DB-impactful PR itself**; a human reviews and merges after adding the `db-approved` label (enforced by the guard).
- **`docs/db-change-checklist.md`** — approval-gate section now requires the `db-approved` label.

## Enforcement caveat

`main` has **no branch protection**, so a failing status check does not hard-block a merge. For the guard to truly block, the repo owner should enable branch protection on `main` with **`DB change guard` (and `frontend`, `functions-tests`, etc.) as required status checks**. Recommended and documented.

## Verification

- Workflow YAML validated with js-yaml.
- Detection logic uses the GitHub API (`pulls.listFiles`) + `pr.labels` — no fragile git diff in shell.
- On this PR itself: it touches `.github/workflows/db-change-guard.yml` + docs only (no DB paths), so the guard should pass (green) on itself.

## Notes

- The `last_seen` migration from #1445 is on `main` but has **not been applied** to any database; it still needs human review before any prod apply.
- This PR is itself a workflow/docs change; the guard check will run on it and pass (no DB paths changed).
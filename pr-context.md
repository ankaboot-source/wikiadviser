# PR Context — human-approval-gate (folds in the DB change guard) + open-pr.sh

## What

Deterministic human approval at merge (branch protection can't scope by author/label, so this gates via a required check):

- **`.github/workflows/human-approval-gate.yml`** (previously `approval-gate.yml`) — a single required status check that **fails** until a human submits an **Approved review from a repo admin** (admin/maintain/write; the `github-actions` bot is not an admin, so it can't forge it) when the PR is **`generated`** (AI-created) **or** **DB-impactful** (migrations, `database.types.ts`, `supabase/functions/`, any `.sql`). Human, non-DB PRs pass trivially.
- **Folds in the former `db-change-guard.yml`** (deleted) — DB changes now gate on the same Approved-review mechanism instead of the `db-approved` label.
- **`generated` label** (red) created.
- **`scripts/open-pr.sh`** — the ONLY supported way the AI opens PRs; it **always** adds the `generated` label (deterministic label application, Option B).
- **AGENTS.md** PR workflow + **`/oc` prompt**: AI PRs go through `scripts/open-pr.sh` → labeled `generated`.

## User action
- Add **`human-approval-gate`** to the `main` branch rule's **required status checks** (and remove any `guard`/`db-approved`-based requirement — the old `db-change-guard` check disappears with its file).

## Notes
- This PR is AI-created → labeled `generated` → the gate fails until a human Approved review (intended proof).
- Workflow + docs only (no DB paths).
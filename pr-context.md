# PR Context — human-approval-gate (DB + generated, /approve) + open-pr.sh

## What

Deterministic human approval at merge (branch protection can't scope by author/label, so this gates via a required check):

- **`.github/workflows/human-approval-gate.yml`** — a single required status check that **fails** until a human approves **`generated`** (AI) or **DB-impactful** PRs. Approved by: an **Approved review from a repo admin** (admin/maintain/write; the `github-actions` bot is not an admin, so it can't forge it) **OR** the **`human-approved`** label.
- **`.github/workflows/approve-handler.yml`** — a human repo admin commenting **`/approve`** on a PR adds the **`human-approved`** label (bots rejected). The AI is forbidden (AGENTS.md + prompt) from posting `/approve`, removing `generated`, or merging.
- **Folds in the former `db-change-guard.yml`** (deleted).
- **`generated`** (red) + **`human-approved`** (green) labels.
- **`scripts/open-pr.sh`** — the AI's only way to open PRs; always adds `generated`.

## User action
- Add **`human-approval-gate`** to the `main` branch rule's **required status checks** (remove any `guard`/`db-approved`-based requirement).
- To merge your own `generated` PR on the same account (GitHub blocks authors from self-approving; issue #1460): review in the UI, then comment **`/approve`** (adds `human-approved` → gate passes) and merge (needs the branch-rule bypass for the author; or use a second reviewer).

## Notes
- This PR is AI-created → labeled `generated` → gated until `human-approved` or your Approved review.
- Workflow + docs only (no DB paths).
# PR Context — human-approval-gate for generated (AI) PRs

## What

Deterministic human approval for AI-created PRs (branch protection can't scope by author/label; this gates at merge):

- **`.github/workflows/approval-gate.yml`** — required status check: PRs labeled **`generated`** FAIL until an **Approved review from a human repo admin** (admin/maintain/write) exists; the github-actions bot is not a repo admin, so it cannot forge the approval. Non-`generated` PRs pass trivially.
- **`generated` label** created (red).
- **AGENTS.md** PR workflow + **`/oc` prompt**: AI-created PRs MUST be labeled `generated`.
- **User action:** add **`human-approval-gate`** to the `main` branch rule's **required status checks** for it to hard-block.

## Notes

- This PR itself is AI-created → will be labeled `generated` and the gate will fail until a human approves (intended).
- Workflow + docs only (no DB paths) → DB change guard passes.
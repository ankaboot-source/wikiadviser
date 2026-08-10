# PR Context — pr-context cleanup is pre-merge only

## What

Rework `.github/workflows/cleanup-pr-context.yml` to pre-merge-only cleanup:

- **Why**: `main` is branch-protected (PRs + `human-approval-gate` required), so the old post-merge job's direct push to `main` was rejected (`GH006`) and pr-context.md stayed on main.
- **Fix**: removed the `post-merge-net` job + `closed` trigger; kept **pre-merge** — on approval (`human-approved` label, Approved review, or exact `/approve`), delete `pr-context.md` from the PR branch via the contents API, so the merge carries nothing to main.
- AGENTS.md updated.

## Why pr-context.md is here (test hook)

This file is intentionally kept on this branch so you can test the flow:

1. Comment exactly **`/approve`** on this PR.
2. The `approve-handler` adds `human-approved`; the **pre-merge** cleanup job (on main) deletes **this file from the branch** via the contents API.
3. Verify `pr-context.md` disappears from the branch, the `human-approval-gate` passes, then merge.
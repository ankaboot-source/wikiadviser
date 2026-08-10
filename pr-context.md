# PR Context — pr-context cleanup is pre-merge only

## What

Rework `.github/workflows/cleanup-pr-context.yml` to pre-merge-only cleanup:

- **Why**: `main` is branch-protected (PRs + `human-approval-gate` required), so a post-merge job cannot push to `main` (`GH006`) — the deleted file would linger. Cleanup must happen on the PR branch before merge.
- **Fix**: on approval (`human-approved` label, Approved review, or exact `/approve`), delete `pr-context.md` from the PR branch via the contents API, so the merge carries nothing to main. Removed the (impossible) post-merge job.

## Test record

- `/approve` on this PR triggered the pre-merge deletion correctly.
- This file was re-added for a merge test: it should be auto-removed again by the pre-merge (already approved) on the next push, so the merge carries nothing to main and there are **no post-merge cleanup workflow runs** to observe.
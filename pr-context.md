# PR Context — hybrid pr-context cleanup (pre-merge on approval + [skip ci] net)

## Review fixes (applied)

- **issue_comment trigger + /approve evaluation**: the /approve path now fires the pre-merge job (handler's token label-add doesn't fire `labeled`).
- **No `[skip ci]` on the pre-merge commit** (would leave the required gate check Pending and block the merge); `[skip ci]` stays only on the post-merge net.
- **No untrusted checkout** — pre-merge deletes pr-context.md via the contents API (CodeQL `untrusted-checkout` clean).
- Guards: only open PRs; skip when the latest review is `CHANGES_REQUESTED`.

## Head-commit gate note

A `/approve` `issue_comment` run isn't attached to the PR head commit, so it doesn't turn the required `human-approval-gate` check green by itself — a head-commit change (the pre-merge deletion, or this push) re-runs the gate on the head. Once this PR merges, the pre-merge deletion provides that head-commit re-run automatically.

## What

Rework `.github/workflows/cleanup-pr-context.yml` so pr-context.md never causes unnecessary post-merge workflow runs:

- **pre-merge job**: when a PR is approved (`human-approved` label OR an Approved review from a repo admin), delete `pr-context.md` from the **PR branch** → the merge carries no pr-context.md to main (no post-merge push in the normal flow).
- **post-merge-net job**: if pr-context.md still lands on main (PR merged without an approval signal), delete it with a **`[skip ci]`** commit so the 6 push-based workflows (ci.yml, QA functions/MediaWiki/demo deploys, supabase-migrations-qa) do NOT re-run.
- Both commits use the `github-actions[bot]` identity; pre-merge job skips fork PRs.

## Why

Before: the closed-merge cleanup pushed a plain commit to main, re-triggering ci + all QA deploys + QA DB migrations on every merge for a one-line doc deletion. Now the deletion happens pre-merge (normal flow does zero post-merge work) and, if it ever slips through, `[skip ci]` makes the fallback free.

## Verify after merge

Open a PR via `scripts/open-pr.sh`, have a human `/approve` it → the pre-merge job should delete pr-context.md from the branch; the merge then carries no pr-context.md and no extra main-push workflows run.
# PR Context — hybrid pr-context cleanup (pre-merge on approval + [skip ci] net)

## What

Rework `.github/workflows/cleanup-pr-context.yml` so pr-context.md never causes unnecessary post-merge workflow runs:

- **pre-merge job**: when a PR is approved (`human-approved` label OR an Approved review from a repo admin), delete `pr-context.md` from the **PR branch** → the merge carries no pr-context.md to main (no post-merge push in the normal flow).
- **post-merge-net job**: if pr-context.md still lands on main (PR merged without an approval signal), delete it with a **`[skip ci]`** commit so the 6 push-based workflows (ci.yml, QA functions/MediaWiki/demo deploys, supabase-migrations-qa) do NOT re-run.
- Both commits use the `github-actions[bot]` identity; pre-merge job skips fork PRs.

## Why

Before: the closed-merge cleanup pushed a plain commit to main, re-triggering ci + all QA deploys + QA DB migrations on every merge for a one-line doc deletion. Now the deletion happens pre-merge (normal flow does zero post-merge work) and, if it ever slips through, `[skip ci]` makes the fallback free.

## Verify after merge

Open a PR via `scripts/open-pr.sh`, have a human `/approve` it → the pre-merge job should delete pr-context.md from the branch; the merge then carries no pr-context.md and no extra main-push workflows run.
# PR context — demo deploy stale-ref hardening

## Problem
QA demo deploy (`wikiadviser-deploy-demo.yml`) silently failed to update the server.
The server's `git pull` errored every run because a stale remote-tracking ref
`refs/remotes/origin/fix` (from a deleted `fix` branch) collided with newer
`fix/*` branches, so the pull aborted and the server kept building old
TypeScript-7 code (eslint `@typescript-eslint`/`Intrinsic` crash). The deploy job
reported green because the script had no `set -e` and the SSH action ignores the
remote exit code.

## Change
In `.github/workflows/wikiadviser-deploy-demo.yml`:
- Added `set -euo pipefail` so any failed pull/build fails the job red.
- Replaced both `git pull` with `git remote prune origin && git pull --ff-only`
  so stale refs are pruned each deploy and can't block the pull again.

## Scope / non-changes
- Prod workflow untouched (out of scope for this PR).
- No frontend/`package.json` change — TypeScript already pinned to `^5.9.2` on main.
- Not DB-impactful; no UI change.

## Verification
- CI lint/prettier green.
- Deploy workflow is in `paths-ignore: [".github/workflows/**"]`, so merging won't
  auto-deploy. QA recovery is the server-side `git fetch --prune origin &&
  git reset --hard origin/main` already performed.

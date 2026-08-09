# PR Context — /oc-local trigger separation + agentic-dev docs

## What

- **`pr-watch.sh`** (local watcher) now triggers only on **`/oc-local`** instead of `/oc`. `/oc` is exclusively the cloud GitHub Actions runner. This prevents double-handling (cloud + local both reacting to the same `/oc` comment).
- **`.github/workflows/opencode.yml`**: cloud filter now **excludes `/oc-local`** comments (`!contains(..., '/oc-local')`) so only `/oc`/`/opencode` reach the cloud runner.
- **`AGENTS.md`**: clarified the two triggers (`/oc` cloud, `/oc-local` local) and updated `pr-watch.sh` references to `/oc-local`.
- **`docs/agentic-dev.md`** (NEW): developer-facing guide — how to deal with agentic dev: the two triggers, security model (write-access gate, prompt-injection boundary, secrets), human-in-the-loop for high-risk actions, DB change safety (guard + `db-approved` label + safe wrapper), UI coverage requirements (e2e-testing skill), pr-context lifecycle, practical workflow, troubleshooting.

## Notes

- Workflow-only + docs change (no DB paths) → the DB change guard passes.
- `pr-watch.sh`'s org-membership check is unchanged (local gate still org-based).
- pr-context.md auto-deleted from main after merge (cleanup-pr-context workflow).
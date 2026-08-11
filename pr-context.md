# PR Context — test: /approve gate re-run + pre-merge pr-context deletion

## What

Small docs note (docs/agentic-dev.md) clarifying that `/approve` re-runs only the gate on the head commit.

## Why this PR exists (test hook)

This file is intentionally present so you can verify **both** features on `/approve`:

1. **Gate re-run (only the gate):** comment exactly `/approve` → `approve-handler` adds `human-approved` and re-runs only the `human-approval-gate` run on the head → the gate turns green (no full CI re-run).
2. **Pre-merge pr-context deletion:** the `cleanup-pr-context` pre-merge job deletes **this file from the branch** via the contents API.

Then merge — the branch carries no `pr-context.md`, so `main` stays clean.
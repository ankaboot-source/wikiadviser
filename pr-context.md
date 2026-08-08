# PR Context — Pass GITHUB_TOKEN to the opencode action

## Problem

/oc test run (after the collaborator-gate fix) failed at the "Run opencode" step with:

> GITHUB_TOKEN environment variable is not set. When using use_github_token, you must provide GITHUB_TOKEN.

The `anomalyco/opencode/github` action requires `GITHUB_TOKEN` in the **step env** when `use_github_token: true` — GitHub does not inject it into steps automatically.

## Fix

Add `GITHUB_TOKEN: ${{ github.token }}` to the "Run opencode" step env (workflow-only change; no DB paths, so the DB change guard passes).

## Verification

After merge, post `/oc` and confirm the agent runs end-to-end: gate passes (Check repo access), action has the token, model call runs, reply posted.
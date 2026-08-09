# PR Context — Configure git identity for /oc on the runner

## Problem

On PR #1452, `/oc merge` was posted. The agent correctly declined the merge ("I cannot merge this PR — a human must do that") and tried to make a code fix instead, but **`git commit` failed on the CI runner**:

> Author identity unknown — Please tell me who you are. … fatal: empty ident name (for <runner@…internal.cloudapp.net>)

The runner has no git `user.name`/`user.email`, so the agent cannot commit/push changes — meaning `/oc` can't complete any fix/implementation task. The raw error also leaked into the posted reply (bad UX).

## Fix

Add a **"Configure git identity"** step before "Run opencode" in `.github/workflows/opencode.yml`:

```yaml
git config user.name "opencode[bot]"
git config user.email "opencode[bot]@users.noreply.github.com"
```

## Verification

- YAML validated (js-yaml).
- After merge to main, `/oc` that makes a change should commit+push with the `opencode[bot]` identity instead of failing.
- Workflow-only change (no DB paths) → DB change guard passes.
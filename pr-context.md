# PR Context — /oc: explicitly decline tasks it cannot do (no stalls/silent substitution)

## Problem

When asked to take UI screenshots, the /oc agent (deepseek-v4-flash) stalled 13–14 min trying heavy environment setup (install packages, start dev servers, launch browsers) instead of promptly saying it can't — or silently replying with a summary/review.

## Fix

Tighten the `/oc` prompt in `.github/workflows/opencode.yml`:

- **ENVIRONMENT LIMITS**: do NOT install packages, start servers, or launch browsers; do NOT try to take browser/UI screenshots yourself.
- If the task needs something the runner can't do, **say so explicitly in the reply** (what + why) — do not stall, retry, or silently substitute.
- Screenshots come from the workflow's own capture step when the agent writes affected routes to `.opencode/screens.txt`.

## Verify after merge

Post `/oc take UI screenshots of X` → the agent should promptly reply "I can't take browser screenshots on the runner; this workflow captures routes from .opencode/screens.txt" (or a similar explicit refusal) instead of stalling.

Workflow-only (no DB paths) → DB change guard passes.
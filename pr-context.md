# PR: Fix workflow_dispatch to close all matching vendored-dependency PRs

## Problem
- `workflow_dispatch` manual runs were skipped because `if: github.actor == 'dependabot[bot]'` blocks the job when a human triggers it
- Even if the job ran, `context.issue.number` is undefined for `workflow_dispatch` events
- Result: open dependabot PRs from before the workflow was added (Aug 3–4) were never closed

## Changes
- `if` condition now allows `workflow_dispatch` (always) OR `pull_request_target` (dependabot only)
- Script branched on `context.eventName`:
  - `pull_request_target`: close the single triggering PR (same as before)
  - `workflow_dispatch`: query all open dependabot PRs, check each for vendored-path changes, close matching ones

## Open questions
None.
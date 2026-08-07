# PR: Add workflow_dispatch, drop reopened trigger

## Changes
- `.github/workflows/close-vendored-deps.yml`: Changed `types: [opened, reopened]` to `types: [opened]` and added `workflow_dispatch:` trigger
  - `reopened` removed per request (only `opened` needed)
  - `workflow_dispatch:` added so the workflow can be manually triggered from the GitHub UI

## Open questions
None.

## Session notes
- 2026-08-07: Ran prettier on frontend per PR comment. Formatted 3 files: `ve.scss`, `database.types.ts`, `changeGrouping.ts`. All clean now.
- 2026-08-07: PR comment `/oc run prettier on the frontend` — prettier was already clean. Replied confirming no changes needed.
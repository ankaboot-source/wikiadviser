# PR: Add workflow_dispatch, drop reopened trigger

## Changes
- `.github/workflows/close-vendored-deps.yml`: Changed `types: [opened, reopened]` to `types: [opened]` and added `workflow_dispatch:` trigger
  - `reopened` removed per request (only `opened` needed)
  - `workflow_dispatch:` added so the workflow can be manually triggered from the GitHub UI
- `frontend/src/css/styles/ve.scss` — prettier formatting fix
- `frontend/src/types/database.types.ts` — prettier formatting fix
- `frontend/src/utils/changeGrouping.ts` — prettier formatting fix

## Open questions
None.

## Session notes
- 2026-08-07: Ran prettier on frontend per PR comment. Formatted 3 files: `ve.scss`, `database.types.ts`, `changeGrouping.ts`. All clean now.
- 2026-08-07: PR comment `/oc run prettier on the frontend` — prettier was already clean. Replied confirming no changes needed.
- 2026-08-07: PR comment `/oc i still dont see the frontend prettier fix` — the prettier changes were run locally but never committed. Committed & pushed as `2f061ffb`. Replied confirming.
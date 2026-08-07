# PR: Rename close-vendored-deps → dependabot-close-vendored-deps, add mode comment

## Changes
- `.github/workflows/close-vendored-deps.yml` → `.github/workflows/dependabot-close-vendored-deps.yml`
- Workflow name: `Close vendored dependency PRs` → `Dependabot: close vendored-dependency PRs`
- Added comment above the `if` condition explaining the two execution modes
- Updated reference in `auto-merge-dependabot.yml` to match new filename

## Context
Follow-up to #1427 (already closed). The original `close-vendored-deps.yml` was created as part of that issue's solution. This PR renames it to make the dependabot scope obvious and documents the dual-mode behavior.

## Open questions
None.
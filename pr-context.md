# PR Context — Fix /oc org-membership gate (v2)

Resolves the /oc GitHub Actions workflow that never runs the agent.

## Problem (v1 attempt failed)

`members: read` is **not a valid workflow permission key** — GitHub rejected the workflow file ("This run likely failed because of a workflow file issue"), so the workflow is currently broken on main and /oc cannot run at all.

## v2 fix

The GITHUB_TOKEN cannot check org membership (no permission key grants `read:org`), and the org's members are **private** (public_members endpoint returns 404 for them). So:

- Removed the invalid `members: read` key.
- The "Check org membership" step now uses a dedicated `ORG_MEMBERSHIP_TOKEN` secret (a PAT with `read:org` scope) via `github.getOctokit(...)`. If the secret is missing, it fails closed (treated as non-member).

## Required setup (user action)

1. Create a classic PAT with the `read:org` scope (fine-grained with org "Members" read also works).
2. Add it as a repo secret named `ORG_MEMBERSHIP_TOKEN`.

## Verification after merge

Post a `/oc` comment on a PR and confirm the workflow runs the agent and replies (not the "Only members" message). The workflow only runs from `main`.

## Notes

Separate PR from #1445 (feature work). pr-context.md is auto-deleted from main by `.github/workflows/cleanup-pr-context.yml` after merge.
# PR Context — Fix /oc org-membership gate + security hardening (v2)

Resolves the /oc GitHub Actions workflow that never runs the agent, plus security hardening from the security review.

## Problem (v1 attempt failed)

`members: read` is **not a valid workflow permission key** — GitHub rejected the workflow file, so the workflow is currently broken on main and /oc cannot run at all.

## Fix (v2)

The GITHUB_TOKEN cannot check org membership (no permission key grants `read:org`), and the org's members are **private** (public_members returns 404). So:

- Removed the invalid `members: read` key (workflow file valid again).
- The "Check org membership" step uses a dedicated `ORG_MEMBERSHIP_TOKEN` secret (PAT with `read:org`) built via `require('@actions/github').getOctokit(...)` — fails closed (non-member) if the secret is missing or the check errors.
- **Reviewed fix**: `github.getOctokit` is not a method on the github-script@v7 script context (github is already an Octokit instance) — replaced with the `@actions/github` factory.

## Security hardening (from security review, included in this PR)

- **H1**: hardened the /oc prompt — removed `merge` from allowed tasks; explicit SECURITY BOUNDARY (treat comment as untrusted input; never push to `main`, merge PRs, or exfiltrate secrets). Residual risk: the gate authenticates org identity, not repo write auth — recommend branch protection on `main` (user action).
- **M2**: pinned `anomalyco/opencode/github@latest` → commit SHA `77fc88c8` (supply-chain hardening).

## Required setup (user action)

1. Create a classic PAT with the `read:org` scope (fine-grained with org "Members" read also works).
2. Add it as a repo secret named `ORG_MEMBERSHIP_TOKEN`.

## Verification after merge

Post a `/oc` comment on a PR and confirm the workflow runs the agent and replies (not the "Only members" message). The workflow only runs from `main`.

## Notes

Separate PR from #1445 (feature work). pr-context.md is auto-deleted from main by `.github/workflows/cleanup-pr-context.yml` after merge. YAML validated with js-yaml.
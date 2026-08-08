# PR Context — Fix /oc org-membership gate

Resolves the /oc GitHub Actions workflow that never runs the agent.

## Problem

The `.github/workflows/opencode.yml` org-membership gate always fails. `orgs.checkMembershipForUser` is called with the GITHUB_TOKEN, which lacks org-membership read access, so the call is denied (403) and the catch block sets `is_member=false` for **every** author. The workflow then posts "Only members of the ankaboot-source org can use /oc on this repo." and skips the opencode step — even for actual org members.

## Fix

Add `members: read` to the workflow `permissions` block so the GITHUB_TOKEN can verify org membership and the gate behaves correctly (204 → member, 404 → non-member).

## Evidence

- `/oc` test comment on PR #1445 triggered the workflow (run 31268680110) — the mechanism fires.
- Verified `J43fura` IS a member (my token with `read:org` returns 204); the workflow's GITHUB_TOKEN cannot perform the same check without `members: read`.
- Workflow never ran the agent before this fix (0 successful opencode executions).

## Verification after merge

Post another `/oc` comment on a PR and confirm the opencode step runs and posts a reply (not the "Only members" message).

## Notes

- Must land on `main` — `issue_comment`-triggered workflows run from the default branch. This is a separate PR from #1445 (feature work).
- Caveat: if `members: read` is rejected as an invalid permission key by GitHub, pivot to a PAT secret with `read:org` scope for the membership check.
# PR Context — Replace /oc PAT gate with GITHUB_TOKEN repo-permission check

## Problem

The /oc workflow's org-membership gate required a personal **PAT with `read:org`** stored as the `ORG_MEMBERSHIP_TOKEN` repo secret. The user rightly questioned storing their personal token in repo secrets.

## Better approach (no PAT, no secret)

`wikiadviser` is a **public** repo. GitHub's docs: for public repos, *any authenticated user* can query repository permissions — so the **GITHUB_TOKEN** (already available in the workflow) can call `repos.getCollaboratorPermissionLevel` directly. Verified: `J43fura` = `admin` (204 on the collaborators endpoint too).

Change in `.github/workflows/opencode.yml`:
- "Check org membership" (PAT-based) → **"Check repo access"** using `github.rest.repos.getCollaboratorPermissionLevel` with the GITHUB_TOKEN.
- Allow `admin`/`maintain`/`write`; fail closed on anything else.
- All `is_member` conditions → `can_trigger`; denial message updated ("Only users with write access...").
- No `ORG_MEMBERSHIP_TOKEN` secret required anymore.

## Verification

- YAML validated (js-yaml).
- This PR touches only `.github/workflows/opencode.yml` + this doc → no DB paths, so the DB change guard passes.
- After merge: post `/oc` and confirm the agent runs (previously blocked: "ORG_MEMBERSHIP_TOKEN secret not set; treating as non-member").
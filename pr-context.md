# PR Context — approve-handler refinements (exact /approve + footer)

## What

- **`.github/workflows/approve-handler.yml`**: require the comment to be **EXACTLY `/approve`** (trimmed), and the commenter to be a **repo admin/maintain/write** (deterministic org-member bar via GITHUB_TOKEN; strict org-membership tracked in issue #1460).
- **`scripts/open-pr.sh`**: appends an **approval-reminder footer** to every AI-opened PR (how to `/approve` + merge), so devs can see it without digging.

## Purpose

This PR doubles as the **end-to-end test** of the approval flow on `main`:
1. It is AI-created → `scripts/open-pr.sh` labels it `generated` (+ footer).
2. `human-approval-gate` should **fail** it until someone comments `/approve`.
3. A human org member commenting `/approve` → `approve-handler` adds `human-approved` → the gate passes → merge.

Workflow + docs only (no DB paths).
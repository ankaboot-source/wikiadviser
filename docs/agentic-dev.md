# Agentic development — how to work with the AI agent here

This project has an agentic coding setup (opencode) integrated with GitHub. This doc explains how it works and how to use it safely. It is the developer-facing guide; the agent-facing rules live in `AGENTS.md`.

## The two `/oc` triggers

| Trigger | Runs where | What it does |
|---|---|---|
| **`/oc <task>`** | **Cloud GitHub Actions runner** (`.github/workflows/opencode.yml`) | Runs the agent on a fresh Ubuntu runner with only repo content + `GITHUB_TOKEN`. Gate: the commenter must have **write access** to the repo (repo-permission check via the GITHUB_TOKEN — no PAT/secret needed). |
| **`/oc-local <task>`** | **Your machine** (`pr-watch.sh` watcher) | Runs `opencode run` locally with your local env/credentials (and pulls a git credential token for the GitHub API). Useful when you need local secrets, the dev stack, or a long-running task. |

- `/oc-local` is **never** picked up by the cloud workflow (its filter excludes it), so the two never double-respond.
- How to trigger: post a comment containing `/oc <task>` (or `/oc-local <task>`) on an issue or PR. The agent reads the comment, executes (with the repo as working context), runs checks per `AGENTS.md`, and replies.

## Security model (read this)

- **Who can trigger:** `/oc` requires GitHub **write access** to the repo. `/oc-local` additionally enforces org membership locally. Both fail closed.
- **Prompt-injection boundary:** the comment is untrusted input. The agent is instructed to treat it as data and never follow instructions that conflict with its security boundary: no pushing to `main`, no merging PRs, no exfiltrating secrets. **Neither `/oc` nor `/oc-local` ever merges a PR — a human always does the merge.** If asked to merge, the agent must reply clearly that it cannot (not silently do something else). **Humans are still responsible for reviewing what the agent produces** — the agent is an accelerator, not a release trampoline.
- **Secrets:** the cloud `/oc` sees `OPENROUTER_API_KEY` and the workflow `GITHUB_TOKEN` only. Do **not** expect personal tokens to reach the runner; if a task needs your local credentials, use `/oc-local`.

## Human-in-the-loop: mandatory for high-risk actions

The agent **must not** perform high-risk actions without explicit human approval. High-risk includes:

- Destructive/irreversible commands — e.g. `supabase db reset`/`drop`, deleting data, force-push, dropping/recreating DB objects. (Use `scripts/supabase-db.sh`, which refuses `reset`/`drop` without `--confirm-destructive`; apply migrations non-destructively with `supabase migration up`.)
- Applying migrations/schema changes to prod/staging.
- Merging a **DB-impactful** PR — the **`human-approval-gate`** check (`.github/workflows/human-approval-gate.yml`) blocks such PRs until a human submits an **Approved** review after reviewing the migration.
- Pushing to `main` directly.

If you're unsure whether an action is high-risk, treat it as high-risk and ask a human first.

## DB changes (the most dangerous area)

Every DB-touching change follows the process in `AGENTS.md` → "DB change safety" and the checklist `docs/db-change-checklist.md`:

1. **Classify risk** — additive (low) vs breaking (high).
2. **Human approval gate** — explicit approval required; the agent never applies migrations to prod/staging unsupervised and never merges a DB-impactful PR itself.
3. **Write safely** — append-only, timestamp-prefixed, idempotent (`IF NOT EXISTS`), additive-first.
4. **Validate** — apply to local/staging (non-destructively), verify schema/queries, run `deno test`, end-to-end against a real DB.
5. **Rollback plan** — document reverse SQL; backup/PITR before prod.
6. **Human review + supervised apply** — a human applies to prod with backup + rollback ready.

A human **Approved** review, after reviewing, is what makes the automated `human-approval-gate` check pass.

## UI changes: always cover the different possibilities

There is **no frontend test suite**. Use the **`e2e-testing`** skill (`.opencode/skills/e2e-testing/`): boot the `USE_MOCK_BACKEND=true` dev server, drive pages with `agent-browser`, assert via DOM, and screenshot.

Mandatory coverage: **multiple users, varied states** (e.g. online / minutes / hours / days / date for old timestamps), edge cases (no avatar, empty, long names), and responsive widths. The mock (`frontend/src/api/supabase.mock.ts`) provides realistic multi-user data. Never ship a UI change verified only against a single-user, single-state screenshot.

## `pr-context.md` lifecycle (per-PR working state)

- While a PR is open, `pr-context.md` on the PR branch records key decisions, file changes, open questions, and caveats — so other agents (via `/oc`) act from current context.
- When the PR is **approved** (`/approve` or an Approved review), `.github/workflows/cleanup-pr-context.yml` **deletes it from the PR branch** (pre-merge), so it **never reaches `main`**. A post-merge cleanup isn't possible — `main` is branch-protected (direct pushes rejected), so the removal must happen on the branch before merging. Do not delete it manually.

## Practical workflow

1. Open a PR (never push to `main` directly).
2. Want a quick review/explainer/fix without local setup? Post **`/oc`** on the PR.
3. Need the agent to use your local env, run the dev stack, or handle something long? Post **`/oc-local`** and keep `pr-watch.sh` running (`./pr-watch.sh`).
4. If the PR touches the DB, a human reviews the migration and submits an **Approved** review before merging.
5. **AI-created PRs are labeled `agent-generated`** and gated by `human-approval-gate` — approve one of two ways: submit an **Approved review** (org member with repo write+), or comment exactly **`/approve`** (an `approve-handler` adds `human-approved`, which passes the gate). The AI cannot approve or merge its own PRs; a human always does.
5. Review the agent's changes and merge — you own the final call.

## Troubleshooting / gotchas

- `/oc` cloud runs have no local backend → screenshots use the mock. Local `/oc-local` can use the real stack.
- Cloud `/oc` cannot see your personal tokens; use `/oc-local` for that.
- The agent's model (OpenRouter `deepseek` by default) runs **on OpenRouter's servers**; the agent code runs on the runner/your machine.
- Actions severity: never run destructive DB commands yourself as a dev without a backup.
# AGENTS.md

Repo-specific rules for agents working on WikiAdviser. Every line is sourced from a config file or a past session correction — no generic advice.

## Commands (all verified passing on a clean tree)

```sh
# Install (pnpm, not npm — root + frontend lockfiles are pnpm)
npm run install-deps                       # = pnpm i && pnpm i --prefix ./frontend

# Verify — frontend (CI gates, run in this order): .github/workflows/ci-pr.yml
cd frontend && pnpm run lint               # eslint . --ext .js,.ts,.vue  (0 errors; v-html warnings are known)
cd frontend && pnpm run prettier:fix           # prettier --check ...          (must be clean before commit)

# Verify — edge functions (Deno): .github/workflows/supabase-functions-tests.yml
deno test supabase/functions --allow-all --node-modules-dir=auto   # 107 tests

# Dev
npm run dev:all                            # frontend + supabase functions
./start.sh                                 # full bootstrap (MW + Supabase + env)
scripts/frontend-dev.sh start|stop|status|logs [port]   # lifecycle for the frontend dev server (mock by default; `start:real` for the real backend; logs are LIVE `tail -f` at ${TMPDIR:-/tmp}/frontend-dev-<port>.log)
```

CI uses pnpm 10, Node 22.x (`ci-pr.yml`). `frontend/package.json` `test` script is a no-op placeholder — there is **no frontend test suite**; don't claim frontend tests pass.

## Architecture (boundaries filenames don't reveal)

Three independently-deployable surfaces:

- `frontend/` — Quasar/Vue 3 SPA. State in Pinia; Supabase calls via `src/api/supabase.ts`.
- `supabase/functions/` — Deno + Hono edge functions. `ai-review/` is the Mira AI system (highest-risk, most-tested).
- `docker/` — MediaWiki container + the vendored `MyVisualEditor` fork at `docker/resources/extensions/MyVisualEditor/`.
- `monitoring-agent/` — standalone sidecar (own docker-compose). `tetris/` — unrelated game, never touch it.

`profiles_view` is a security-sensitive view queryable **only via the admin client** in edge functions (`get/`). Never expose it to the browser. If the frontend needs its data, move the whole query into an edge function. _(session ses_2633dc7c8)_

## Conventions

- **pnpm** only. Single quotes (`eslint: quotes ['warn','single']`), prettier `singleQuote`+`semi` (`frontend/.prettierrc`).
- **Edge functions**: each is a Hono app; mount `corsMiddleware` from `_shared/middleware/cors.ts`. Log with bracketed tags (`[ai-review]`, `[auto-retry]`). Validate env/payloads with zod; env errors use the `"😱 ..."` prefix. Use `createSupabaseClient(authHeader)` for user calls, `createSupabaseAdmin()` for service calls.
- **Migrations** (`supabase/migrations/`) are append-only, timestamp-prefixed `YYYYMMDDHHMMSS_name.sql`. Never edit a deployed one. New browser-reachable tables/columns need explicit RLS policies.
- **MyVisualEditor** is a vendored MediaWiki fork — do not modify upstream files. Any custom change must be wrapped in `/* Custom WikiAdviser */` markers. _(docs/NOTES.md, session ses_07f676099)_
- **Commits**: Conventional Commits with scope (`feat(ai-review):`, `fix(revision-feedback):`, `ci:`, `docs:`). Git author is `Jaafoura` (not `jaafoura`). _(session ses_0a3a4091)_
- **`database.types.ts`** is agent-generated from Supabase schema — regenerate, don't hand-edit. Excluded from Qlty/DeepSource.

## GitHub Actions runner (opencode `/oc`)

**Two triggers:** `/oc` runs the agent on the **cloud GitHub Actions runner** (this workflow). `/oc-local` is handled **only by the local `pr-watch.sh` watcher** (never the cloud — the cloud workflow's filter excludes it). Use `/oc` for cloud runs, `/oc-local` when you want the agent on your machine (e.g. with your local env/credentials).

The `.github/workflows/opencode.yml` workflow runs the agent on a GitHub Actions runner via `anomalyco/opencode/github@latest` with `use_github_token: true`. Local `~/.config/opencode` skills do **not** reach the runner — anything the agent needs must be in the repo (this file, `CONTRIBUTING.md`, scripts). After making UI changes, write the affected routes to `.opencode/screens.txt` (one per line) so the `scripts/screenshots.sh` step can capture them. The runner has no Supabase backend, so `scripts/screenshots.sh` boots the dev server with `USE_MOCK_BACKEND=true`, which swaps in a mock Supabase client (`frontend/src/api/supabase.mock.ts`) returning a dummy user + dummy article/change data so real pages render instead of the login redirect.

## AI-assisted review (code-review-graph)

`.github/workflows/code-review-graph.yml` runs the **code-review-graph** action ([tirth8205/code-review-graph](https://github.com/tirth8205/code-review-graph)) on every PR: it builds a Tree-sitter structural graph on the runner and posts a review with the minimal context (callers/dependents/tests affected by the change). It is comment-only (no merge gate — merges are human-only). For agents running locally, the same tool can be wired as an OpenCode MCP server: `pip install code-review-graph && code-review-graph install` (auto-detects OpenCode) then `code-review-graph build` to index the repo.

## Testing UI features

There is **no frontend test suite** — `frontend/package.json` `test` script is a no-op. For UI/e2e verification, use the **`e2e-testing`** skill (project-level, `.opencode/skills/e2e-testing/`): it covers driving pages with **agent-browser** (`open`, `snapshot -i`, `click`, `fill`, `get text`, `screenshot`), asserting, and attaching screenshots to a PR via SHA-based raw URLs.

**Two e2e paths** (see `docs/e2e-workflow.md`):
- **Real-data replica (preferred for DB-touching features)** — `scripts/supabase-agent.sh start` boots the in-repo disposable replica at `supabase-agent/` (ports 54121+, project `agent`). Migrations/seed/functions are **symlinked** to the real files, so schema + edge-function changes live in their real locations, but the *database* that gets reset/seed/dropped is the replica's — your local dev DB (54321/54322) is **never touched**. The agent may freely `db reset`/`drop` this replica.
- **Mock backend (quick UI-only checks)** — `USE_MOCK_BACKEND=true` swaps in `frontend/src/api/supabase.mock.ts` (dummy session + data) so pages render without a live backend or login.

## PR workflow (when resolving an issue)

Follow this end-to-end flow when resolving an issue, not just the code change:

1. **Determine if it's a UI change.** If the issue touches user-facing UI, verify it with the **`e2e-testing`** skill (against the `supabase-agent/` real-data replica for DB-touching features, or a `USE_MOCK_BACKEND=true` dev server for quick UI-only checks) and capture a screenshot.
2. **Open a PR** for the change (never push to `main` directly — PR-only). Use `gh pr create` with a Conventional Commit message and a body that references the issue (`Resolves #NN`). **AI-created PRs MUST be labeled `agent-generated`** (e.g. `gh pr edit <n> --add-label agent-generated`) — the `human-approval-gate` required check blocks unapproved `agent-generated` PRs, and human PRs pass without it. **The AI must NEVER remove a `agent-generated` label, post `/approve`, or merge a PR** — only the human does. Interim (same account, issue #1460): after reviewing a `agent-generated` PR in the UI, the human either comments `/approve` (an `approve-handler` workflow adds the `human-approved` label, which the gate accepts) or removes the `agent-generated` label, then merges.
3. **Attach the UI screenshot directly to the PR** (description or a comment) — do **not** commit it to the repo. Use `gh pr comment <n> --body-file` with a markdown image reference, or attach via the PR body. If `gh` can't inline the image, fall back to the SHA-based raw-URL workflow documented under "Operational gotchas".
4. **DB / data-model guard rails**: before shipping, check whether the change touches the data model (schema, migrations, `database.types.ts`, queries, RLS). If it does, **flag it explicitly for human review** — do not run risky migrations or data-model changes alone with no human supervision. Call out the possible breaking-model impact in the PR body. If the change needs **no** migration (e.g. ephemeral Realtime presence), say so explicitly so reviewers know it was considered.

## DB change safety (agentic AI)

Any change that touches the data model (schema, migrations, `database.types.ts`, queries, RLS, seed data) follows this process. Use `docs/db-change-checklist.md` as the per-change checklist.

> **🚫 NEVER run destructive local DB commands without explicit user approval.** This includes `supabase db reset`, `supabase db drop`, and any command that drops/recreates the local database — they **wipe local data**. To apply new migrations to the running local DB **non-destructively**, use `supabase migration up` (applies only pending migrations, keeps data). If you must reset, get explicit approval first and confirm the user has a backup. Use `scripts/supabase-db.sh` for local DB operations — it refuses destructive commands unless `--confirm-destructive` is passed.

1. **Classify risk.** Additive (new nullable column/table/index/view) = **low**. Breaking (drop/rename column, type change, `NOT NULL`, RLS change, data backfill, dropping/recreating objects existing code depends on) = **high**.
2. **Human approval gate.** Get explicit human approval before writing the migration (mandatory for high-risk). The agent **never** applies migrations to prod/staging unsupervised, and **never merges a DB-impactful PR to `main` itself** — a human reviews and merges it. This is enforced automatically: PRs that are **DB-impactful** (migrations, `database.types.ts`, `supabase/functions/`, any `.sql`) **or labeled `agent-generated`** fail the **`human-approval-gate`** check (`.github/workflows/human-approval-gate.yml`) until a human submits an **Approved** review.
3. **Write safely.** Append-only timestamp-prefixed migration; idempotent where possible (`IF NOT EXISTS`); prefer additive over destructive; explicit RLS for new browser-reachable objects; regenerate `database.types.ts` (don't hand-edit).
4. **Validate (evidence).** Apply to a local/staging DB and verify schema + queries; run the edge-function tests; end-to-end against a real DB (not just mock); post-apply verification queries.
5. **Rollback plan.** Document reverse SQL for every migration; take a pre-change backup/PITR before applying to prod.
6. **Human review + supervised apply.** Flag the migration in the PR body (what it does, risk, rollback). A human applies to prod (or supervises) with backup + rollback ready.

## Operational gotchas

- **Env**: `generate-env.sh` parses the Supabase startup log for keys and reads `docker/MW_CREDENTIALS.txt` for bot creds. Never commit `.env` (gitignored). CORS validates `Origin` by suffix against `ROOT_DOMAIN` — update it if the domain changes.
- **Free-model guard** (`utils/freeModelGuard.ts`): the global `OPENROUTER_API_KEY` may only be used with `openrouter/free` or any `:free` model. Users with their own key may use any model. Don't bypass `assertFreeModelAllowed`. _(session ses_0a33b58e)_
- **Refusal handling** (`utils/refusalDetection.ts`): models emit `MIRA_REFUSAL`; `assertNotRefusal()` throws. Never publish refusal text as article content — surface `REFUSAL_USER_MESSAGE`. Don't detect refusals with regex; rely on the token. _(session ses_05bec2c8)_
- **`pending_diff`**: set `true` on the article via the admin client whenever Mira edits, so the frontend refreshes the diff. Skip only when the article was empty before the edit. _(sessions ses_0c3ef16b, ses_0bdaf22d)_
- **Approved-change reprocessing**: an approved change (status 1) is reprocessed only if its `updated_at` is older than its latest comment's `created_at`. Don't add broad `OR` filters that re-include processed changes. _(session ses_05bec2c8)_
- **Revision comments** are scoped to the **latest** revision only (`pickLatestRevisionId`). Rejected changes (status 2) are always reprocessed; approved-without-comment never is. _(session ses_05bec2c8)_
- **Email templates**: keep `supabase/email-templates/` and the Supabase dashboard templates in sync manually. _(docs/NOTES.md)_
- **User deletion** reassigns contributions to `deleted-user@wikiadviser.io` and deletes owned articles — don't simplify this. _(docs/NOTES.md)_
- **Minimal changes**: don't reinvent existing helpers (e.g. `gotodifflink`); reuse them. _(sessions ses_0c3ef16b, ses_2633dc7c)_
- **`pr-context.md`** — **MUST stay current, never stale.** It is the working context file for the `pr-watch.sh` `/oc-local` responder. **Update it after EVERY decision, choice, or change** (new file, modified behavior, resolved question, new caveat) — not just at PR creation. Before **any** commit or push, verify `pr-context.md` reflects the latest state; if it doesn't, update it in the same commit. The watcher reads it when answering `/oc-local` comments, so a stale file makes the agent answer from outdated context. It is ephemeral per-PR working state: it lives on the PR branch while the PR is open, and `.github/workflows/cleanup-pr-context.yml` deletes it from the PR branch as soon as the PR is approved (pre-merge, so it never reaches `main`; a post-merge cleanup can't push to branch-protected `main`) — do **not** delete it manually. If you run `git merge origin/main` (conflict resolution) and main still has a stale `pr-context.md` (race window), delete it first to avoid an `add/add` conflict.
- **`pr-watch.sh` `/oc-local` screenshots**: when the local agent takes a screenshot for a `/oc-local` reply, ALWAYS pass an explicit path to `agent-browser screenshot` (e.g. `.opencode/screenshots/<name>.png`) so it saves inside the repo (already writable). To show it in the comment, commit it to the PR branch and reference a **SHA-based raw URL** (`https://raw.githubusercontent.com/$REPO/$SHA/.opencode/screenshots/<name>.png`) — this is the only reliable way to render an image in a GitHub comment (gist needs `gist` scope; the uploads endpoint rejects tokens). After posting, delete the files and commit the deletion (the SHA URL still works from git history). Gotchas: `.opencode/.gitignore` ignores `*.png`, so use `git add -f` to commit screenshots; and `agent-browser screenshot` ignores the explicit path when a daemon is already running (the file lands in `~/.agent-browser/tmp/screenshots/`), so `agent-browser close` first or copy the file from the temp dir. If run with no path, agent-browser saves to `~/.agent-browser/tmp/screenshots/`, an external directory that non-interactive `opencode run` auto-rejects unless `~/.config/opencode/opencode.json` has `"permission": { "external_directory": { "/tmp/*": "allow", "~/.agent-browser/tmp/screenshots/*": "allow" } }`.

## Sources

Config: `package.json`, `frontend/package.json`, `frontend/.eslintrc.js`, `frontend/.prettierrc`, `supabase/functions/*/deno.json`, `.github/workflows/*`, `.deepsource.toml`, `.qlty/qlty.toml`, `docs/NOTES.md`, `CONTRIBUTING.md`, `generate-env.sh`. Sessions: 57 WikiAdviser sessions in `~/.local/share/opencode/opencode.db` (cited inline as `ses_<id>`).

## General Guidelines
- **🚨 Human-in-the-loop approval is MANDATORY for any high-risk action.** Before performing any of the following, get explicit human approval and do not proceed without it:
  - Destructive/irreversible commands (e.g. `supabase db reset`/`drop`, deleting data, force-push, dropping/recreating DB objects).
  - Applying migrations or schema changes to prod/staging.
  - Merging a DB-impactful PR to `main`.
  - Pushing to `main` directly.
  - Anything that could lose data or break the data model.
  If you are unsure whether an action is high-risk, treat it as high-risk and ask first.
- Refer to available skills when possible.
- Use Context7 MCP when I need library/API documentation, code generation, setup or configuration steps without me having to explicitly ask.
- If you encounter something surprising or confusing in this project, flag it as a comment. If you discover a non-obvious gotcha, convention, or landmine that isn't documented here, add it to AGENTS.md so future agents don't rediscover it.
- **Never push to `main` directly — it is PR-only.** When pushing a feature branch, use an explicit refspec: `git push -u origin HEAD:<branch-name>`. Don't rely on the branch's upstream tracking, which may point at `main` and cause accidental direct pushes. _(session: accidental `6f4cec4f` push to main)_
- **General guard rails**: flag any change you are not confident about (uncertain behavior, guessed API usage, unverified edge case) explicitly in your report/PR so a reviewer can scrutinize it. Don't silently ship changes you can't vouch for.
- **DB guard rails**: when a change touches the database layer (schema, migrations, `database.types.ts`, queries, RLS, or anything that could break the data model), the review must also consider possible breaking model impacts — e.g. column/type changes, dropped or renamed fields, RLS policy gaps, or queries that no longer match the schema. Call these out explicitly for review.

## Before every commit or push — checklist
1. **Update `pr-context.md`** if any decision, file change, resolved question, or caveat happened since the last update. If nothing changed, confirm it's still current. Never commit with a stale `pr-context.md`.
2. Stage only intended files (never secrets, `.env`, or `.pr-watch-state-*.txt`).
3. Conventional Commit message with scope (`feat(ci):`, `fix(pr-watch):`, `docs:`).

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
```

CI uses pnpm 10, Node 20.x (`ci-pr.yml`). `frontend/package.json` `test` script is a no-op placeholder — there is **no frontend test suite**; don't claim frontend tests pass.

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
- **`database.types.ts`** is generated from Supabase schema — regenerate, don't hand-edit. Excluded from Qlty/DeepSource.

## GitHub Actions runner (opencode `/oc`)

The `.github/workflows/opencode.yml` workflow runs the agent on a GitHub Actions runner via `anomalyco/opencode/github@latest` with `use_github_token: true`. Local `~/.config/opencode` skills do **not** reach the runner — anything the agent needs must be in the repo (this file, `CONTRIBUTING.md`, scripts). After making UI changes, write the affected routes to `.opencode/screens.txt` (one per line) so the `scripts/screenshots.sh` step can capture them. The runner has no Supabase backend, so `scripts/screenshots.sh` boots the dev server with `USE_MOCK_BACKEND=true`, which swaps in a mock Supabase client (`frontend/src/api/supabase.mock.ts`) returning a dummy user + dummy article/change data so real pages render instead of the login redirect.

## Testing UI features

There is **no frontend test suite** — `frontend/package.json` `test` script is a no-op. For UI changes, verify with the **agent-browser** skill:

1. Ensure the dev stack is running (`npm run dev:all` or `./start.sh` for full bootstrap).
2. Use `agent-browser` to navigate, interact, and assert: `agent-browser open`, `snapshot -i`, `click`, `fill`, `get text`, `screenshot`.
3. For PRs with UI changes, attach screenshots directly to the PR description/comments — do **not** commit them to the repo.

See `~/.config/opencode/skills/agent-browser/SKILL.md` for the full command reference.

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
- **`pr-context.md`** — **MUST stay current, never stale.** It is the working context file for the `pr-watch.sh` `/oc` responder. **Update it after EVERY decision, choice, or change** (new file, modified behavior, resolved question, new caveat) — not just at PR creation. Before **any** commit or push, verify `pr-context.md` reflects the latest state; if it doesn't, update it in the same commit. The watcher reads it when answering `/oc` comments, so a stale file makes the agent answer from outdated context. **Before merging a PR, delete it** (`git rm pr-context.md`) and push — it's ephemeral working state, not product code.
- **`pr-watch.sh` `/oc` screenshots**: when the local agent takes a screenshot for a `/oc` reply, ALWAYS pass an explicit path to `agent-browser screenshot` (e.g. `.opencode/<name>.png`) so it saves inside the repo (already writable) — delete it after sharing so it's never committed. If run with no path, agent-browser saves to `~/.agent-browser/tmp/screenshots/`, which is an external directory that non-interactive `opencode run` auto-rejects unless `~/.config/opencode/opencode.json` has `"permission": { "external_directory": { "/tmp/*": "allow", "~/.agent-browser/tmp/screenshots/*": "allow" } }`.

## Sources

Config: `package.json`, `frontend/package.json`, `frontend/.eslintrc.js`, `frontend/.prettierrc`, `supabase/functions/*/deno.json`, `.github/workflows/*`, `.deepsource.toml`, `.qlty/qlty.toml`, `docs/NOTES.md`, `CONTRIBUTING.md`, `generate-env.sh`. Sessions: 57 WikiAdviser sessions in `~/.local/share/opencode/opencode.db` (cited inline as `ses_<id>`).

## General Guidelines
- Refer to available skills when possible.
- Use Context7 MCP when I need library/API documentation, code generation, setup or configuration steps without me having to explicitly ask.
- If you encounter something surprising or confusing in this project, flag it as a comment. If you discover a non-obvious gotcha, convention, or landmine that isn't documented here, add it to AGENTS.md so future agents don't rediscover it.
- **Never push to `main` directly — it is PR-only.** When pushing a feature branch, use an explicit refspec: `git push -u origin HEAD:<branch-name>`. Don't rely on the branch's upstream tracking, which may point at `main` and cause accidental direct pushes. _(session: accidental `6f4cec4f` push to main)_

## Before every commit or push — checklist
1. **Update `pr-context.md`** if any decision, file change, resolved question, or caveat happened since the last update. If nothing changed, confirm it's still current. Never commit with a stale `pr-context.md`.
2. Stage only intended files (never secrets, `.env`, or `.pr-watch-state-*.txt`).
3. Conventional Commit message with scope (`feat(ci):`, `fix(pr-watch):`, `docs:`).

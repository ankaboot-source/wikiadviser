# AGENTS.md

Guidance for autonomous coding agents (and human contributors) working on WikiAdviser.
Read this before making any change. When in doubt, also read `CONTRIBUTING.md`, `docs/NOTES.md`, and `DUAL-LICENSE.md`.

---

## 1. Project Overview

**WikiAdviser** is a real-time collaborative platform built on **MediaWiki** for article writing, editing, and reviewing. Multiple users work together with instant feedback, structured revisions, and AI-assisted review ("Mira").

- Repo: `github.com/ankaboot-source/wikiadviser`
- License: **Dual-licensed** — AGPL v3 (open source) + commercial license via Ankaboot. Any derivative distributed/SaaS-hosted MUST be open-sourced under AGPL. See `DUAL-LICENSE.md`.
- Live demo: `app.wikiadviser.io`

### High-level architecture

```
frontend (Quasar / Vue 3, browser)
   │  Supabase JS client (auth, realtime, storage, DB)
   ▼
Supabase (Postgres + Auth + Realtime + Storage + Edge Functions on Deno)
   │  edge functions call MediaWiki API via bot credentials
   ▼
MediaWiki (PHP, dockerized)  ←→  MyVisualEditor extension (custom fork)
```

Three independently-deployable surfaces:
1. **Frontend** — `frontend/` (Quasar/Vue SPA)
2. **Backend** — `supabase/` (Edge Functions + DB migrations + config)
3. **MediaWiki** — `docker/` + `mediawiki-docker/` (containerized MediaWiki with the `MyVisualEditor` extension)

---

## 2. Repository Layout

| Path | Purpose |
|------|---------|
| `frontend/` | Quasar (Vue 3 + TypeScript) SPA. Source in `frontend/src/`. |
| `supabase/` | Supabase project: `functions/` (Deno edge functions), `migrations/` (SQL), `config.toml`, `seed.sql`. |
| `supabase/functions/_shared/` | Shared Deno code: Supabase clients, MediaWiki/Wikipedia API clients, middleware (cors, auth), zod env schema, DB types. |
| `supabase/functions/ai-review/` | The Mira AI review system — the most actively developed and highest-risk area. |
| `supabase/functions/tests/` | Deno unit tests (mirrors function structure). |
| `docker/` | MediaWiki container build, `LocalSettings`, Caddyfile, the `MyVisualEditor` extension under `docker/resources/extensions/MyVisualEditor/`. |
| `mediawiki-docker/` | Legacy/alternate MediaWiki docker assets. |
| `monitoring-agent/` | Standalone monitoring sidecar (own `docker-compose.yaml`). |
| `tetris/` | Unrelated embedded game — do not touch unless explicitly asked. |
| `.github/workflows/` | CI/CD pipelines (PR checks, deploys to `qa`/`prod`/`demo`). |
| `.opencode/` | OpenCode agent config + saved plans (`.opencode/plans/`). |
| `.qlty/`, `.deepsource.toml` | Code-quality analyzers (Qlty, DeepSource). |
| `docs/NOTES.md` | Known limitations and dev gotchas — read it. |
| `start.sh`, `generate-env.sh` | Local bootstrap scripts. |

### Frontend source map (`frontend/src/`)

| Subdir | Purpose |
|--------|---------|
| `api/` | `supabase.ts` (browser client via `@supabase/ssr` + Quasar cookies), `supabaseHelper.ts`. |
| `boot/` | Quasar boot files: `errorHandler.ts`, `posthog.ts`, `sentry.ts`. |
| `components/` | Vue SFCs: `Auth/`, `Diff/`, `Share/`, `Subscription/`, `AddArticleCard/`, `MwVisualEditor.vue`, `ReviewByMira.vue`, `PromptFormDialog.vue`, `NotificationsBell.vue`, etc. |
| `pages/` | Route pages: `article/`, `auth/`, `share/`, plus error pages. |
| `stores/` | Pinia stores: `userStore.ts`, `useArticlesStore.ts`, `useMiraReviewStore.ts`, `useActiveViewStore.ts`, `useSelectedChangeStore.ts`. |
| `router/` | Vue Router config. |
| `schema/` | `env.schema.ts` (zod-validated frontend env). |
| `types/` | Shared TS types incl. generated `Database` type for Supabase. |
| `utils/` | `consts/`, `language.ts`, `parsing.ts`. |
| `css/` | Global styles + fonts. |

### Supabase edge functions

Each function is a Hono app (`npm:hono@4.7.4`) served via `Deno.serve`. Functions:

| Function | Role |
|----------|------|
| `ai-review` | Mira AI review — full-article review, comment-backed per-paragraph review, revision-feedback (article-wide) review. |
| `article` | Article CRUD, import, revisions, permissions, pending diff. |
| `get` | Admin-style reads (profile, users, articles, changes) using `profiles_view` via the admin client. |
| `notification` | DB-triggered notifications (i18n-aware). |
| `share-link` | Create/verify public share links. |
| `user` | Avatar + anonymous username helpers. |
| `wikipedia` | Proxy fetch Wikipedia articles (optional `WIKIPEDIA_PROXY`). |
| `restrict-mediawiki-access` | Gate MediaWiki access behind auth. |

---

## 3. The AI Review System (Mira) — read before touching `ai-review/`

This is the highest-complexity, highest-risk subsystem. Recent work (see git log) focused on refusal handling, revision-feedback, and comment-backed review routing.

### Entry point
`supabase/functions/ai-review/index.ts` — a single `POST /` route. Flow:
1. Auth via `Authorization` header → Supabase user.
2. Resolve Mira bot id (`AI_BOT_EMAIL` → `profiles.id`).
3. Fetch candidate `changes` (status 0/1/2), `revisions`, and the article.
4. Filter out archived/hidden changes and approved changes that have a newer comment than their `updated_at` (avoid reprocessing).
5. Pick the latest revision (`revisionPicker.ts`).
6. Gather per-change comments and per-revision (article-wide) comments.
7. `reviewRouter.buildProcessableChanges()` classifies each change into a `mode`:
   - `rejection` (status 2)
   - `follow-up` (status 1 + has comments)
   - `pending-with-feedback` (status 0 + has comments)
8. If there is **article-wide revision feedback** → `applyRevisionFeedback()` first (edits the whole article), then per-paragraph work runs.
9. If only per-paragraph work → `processCommentedChanges()`.
10. If neither → fall back to `reviewAndImproveArticle()` (full review of an empty/unchanged article).
11. On any improvement, set `articles.pending_diff = true` via the admin client.

### Providers
`services/providers/` — pluggable AI providers behind the `AIProvider` interface (`types.ts`):
- `openai-compatible.ts`, `anthropic.ts`, `gemini.ts`.
- Provider selected via `AI_PROVIDER` env or per-user `llm_reviewer_config.provider`.
- Model via `AI_MODEL` env or per-user config.

### Config resolution (`services/configService.ts`)
- Per-user config lives in `profiles.llm_reviewer_config` (model, provider, endpoint, `has_api_key`).
- User API keys are stored in Supabase Vault and fetched via the `get_user_api_key` RPC — **never** store keys in plain columns.
- Falls back to the global `OPENROUTER_API_KEY` env var.

### Free-model guard (`utils/freeModelGuard.ts`) — IMPORTANT
When using the **global** `OPENROUTER_API_KEY` (i.e. `hasUserConfig === false`), only free models are allowed:
- the literal `openrouter/free` router, or
- any model id ending in `:free`.
`assertFreeModelAllowed()` throws otherwise. Do not bypass this guard — it protects against unexpected billing. When a user supplies their own key, any model is permitted.

### Refusal handling (`utils/refusalDetection.ts`) — IMPORTANT
- Models are instructed (in prompts) to respond with exactly the token `MIRA_REFUSAL` when they cannot fulfill a request.
- `isRefusalResponse()` checks the token at the **start** of the trimmed response (so trailing explanations are still caught, but mid-text occurrences are not).
- `assertNotRefusal()` throws `AIRefusalError`.
- **Never publish refusal text to the article or to users as if it were content.** Surface `REFUSAL_USER_MESSAGE` instead. Recent commits (`6cbf77e6` …) harden this across all three review paths.

### Prompts (`config/prompts.ts`)
- `buildSystemPrompt()` assembles title + description + base prompt + optional `customInstructions` (marked `CRITICAL INSTRUCTION`, highest priority).
- Prompts instruct the model to preserve wikitext structural lines (headers, templates, magic words, categories) character-for-character.
- `REFUSAL_INSTRUCTION` is appended to every system prompt.

### Status code convention (DB)
`changes.status`: `0` = pending, `1` = approved, `2` = rejected. `STATUS_LABELS` map lives in `index.ts`.

---

## 4. Coding Standards

### Languages & runtimes
- **Frontend**: TypeScript, Vue 3 SFCs, Quasar 2, Pinia, Vue Router. Node ≥ 18 (engines allow 14.19+, but CI uses 20.x).
- **Edge functions**: Deno + TypeScript. Import npm packages via `npm:pkg@version` or `https://esm.sh/...`. Each function may have its own `deno.json` import map.
- **DB**: PostgreSQL (Supabase, major version 15). Migrations in `supabase/migrations/` are timestamp-prefixed and immutable once applied to a remote env.

### Style
- **Frontend**: ESLint (`plugin:vue/vue3-recommended` + `@typescript-eslint/recommended` + `prettier`), Prettier. Single quotes (`'warn'`). Run `pnpm run lint` and `pnpm run prettier` — both must pass (enforced in CI `ci-pr.yml`).
- **Edge functions**: no enforced linter; follow existing style. Prefer `const`/arrow fns, explicit types on exported signatures, zod for runtime validation.
- **Validation**: use **zod** for env and request payloads (see `_shared/schema/env.schema.ts`, `notification/schema.ts`). Env validation runs at import time and calls `Deno.exit(1)` on failure — keep it that way.
- **Error messages**: the codebase uses playful `"😱 ..."` prefixes for env-validation errors; preserve that convention in env schemas.

### Edge function conventions
- Every public function mounts `corsMiddleware` from `_shared/middleware/cors.ts`. CORS validates `Origin` against `ROOT_DOMAIN` (suffix match). Do not hardcode origins.
- Use `createSupabaseClient(authHeader)` for user-scoped calls and `createSupabaseAdmin()` for service-level calls (bot, system updates). **Never** use the admin client to read/write user-controlled data without an explicit reason.
- Auth: get the user via `supabase.auth.getUser()`; reject with `401` if missing.
- Return JSON errors with a clear `error` field and proper HTTP status (`400`/`401`/`404`/`500`).
- Log with `console.info`/`console.warn`/`console.error` and prefix log lines with a bracketed context tag (e.g. `[ai-review]`, `[auto-retry]`, `[revision-feedback]`, `[review]`) — this is the established pattern.

### Frontend conventions
- State in Pinia stores (`defineStore`). Supabase calls go through `src/api/supabase.ts` (browser client) or `supabaseHelper.ts`.
- The `Database` type in `src/types/` is generated from the Supabase schema — regenerate when migrations change the schema; do not hand-edit.
- Env is validated at build/boot via `src/schema/env.schema.ts` (zod). Required frontend env: `SUPABASE_PROJECT_URL`, `SUPABASE_ANON_KEY`.
- Cookies are set `secure: true`, `sameSite: 'Lax'` — keep that for SSR-safety.

### MyVisualEditor extension
- Located at `docker/resources/extensions/MyVisualEditor/` — a vendored fork of MediaWiki's VisualEditor.
- **Custom WikiAdviser changes are marked with `/* Custom WikiAdviser */` comments.** When editing this fork, always wrap your changes in such markers so they can be tracked across upstream merges. Do not silently modify upstream files without the marker.
- This directory is **excluded** from DeepSource and Qlty analysis. It has its own eslint/jsdoc configs.

---

## 5. Testing

### Edge functions (Deno)
- Tests live in `supabase/functions/tests/` mirroring the function structure (e.g. `tests/ai-review/refusalDetection.test.ts`).
- Framework: Deno's built-in test runner with `https://deno.land/std@.../assert/mod.ts` (`assertEquals`, `assertThrows`).
- Run locally:
  ```sh
  deno test supabase/functions --allow-all --coverage --node-modules-dir=auto
  deno coverage --lcov --output=cov.lcov   # optional
  ```
- CI: `.github/workflows/supabase-functions-tests.yml` runs on PRs touching `supabase/functions/**` and reports coverage to DeepSource.
- **When you add or change `ai-review` logic, add/extend tests under `tests/ai-review/`.** This is the most-tested area and the expectation is that it stays that way.

### Frontend
- `frontend/package.json` `test` script is a placeholder (`echo ... && exit 0`). There is **no active frontend test suite**. `@vue/test-utils` is installed but unused. Do not claim frontend tests pass — there are none to run. If you add tests, wire them into the `test` script and CI.

### What "done" means
- Edge functions: `deno test supabase/functions --allow-all` passes.
- Frontend: `cd frontend && pnpm run lint && pnpm run prettier` pass (CI gates on these).
- Migrations: applied cleanly to a fresh local Supabase (`supabase db reset`).

---

## 6. Environment & Local Dev

### Required env (edge functions) — `supabase/functions/.env`
See `.env.example`. Key vars:
- `WIKIADVISER_LANGUAGES` (e.g. `en,fr`), `WIKIADVISER_BACKGROUND_COLORS` (hex, comma-separated)
- `WIKIPEDIA_PROXY` (optional URL)
- `MEDIAWIKI_ENDPOINT` (e.g. `http://host.docker.internal:8080/wiki`)
- `MW_BOT_USERNAME`, `MW_BOT_PASSWORD` (MediaWiki bot credentials)
- `X_API_KEY` (shared secret between MediaWiki and edge functions)
- `ROOT_DOMAIN`, `SITE_URL`
- `OPENROUTER_API_KEY` (global AI fallback key — free models only)
- `AI_MODEL` (default `openrouter/free`), `AI_PROVIDER` (`openrouter|openai|anthropic|gemini|custom`)
- `AI_BOT_EMAIL` (Mira bot account, default `mira@wikiadviser.io`)
- `SMTP_HOST/PORT/USER/PASS`

### Bootstrap
```sh
# 1. MediaWiki + DB
pushd docker && docker compose up -d mediawiki mediawiki_db && popd

# 2. Install deps (pnpm)
npm install -g pnpm
npm run install-deps

# 3. Start Supabase, capture its output, then derive env
npm run dev:supabase > supabase.log
./generate-env.sh --supabase-creds supabase.log   # fills docker/.env + frontend/.env
./generate-env.sh --bot-creds                       # fills supabase/functions/.env from MW bot

# 4. Run
npm run dev:frontend
npm run dev:supabase-functions
```
`generate-env.sh` parses the Supabase startup log for `API URL`, `anon key`, `service_role key`, and reads bot credentials from `docker/MW_CREDENTIALS.txt`. Do not commit any generated `.env`.

### Deployment topology
- `docker-compose.demo.yml` / `Caddyfile.demo` → demo env
- `docker-compose.prod.yml` / `Caddyfile.prod` → production
- CI workflows: `deploy-supabase-functions-{qa,prod}.yml`, `mediawiki-*-deploy-{qa,prod}.yml`, `wikiadviser-deploy-{demo,prod}.yml`, `supabase-migrations-{qa,prod}.yml`, `deploy-supabase-vault-{qa,prod}.yml`.

---

## 7. Database

- Postgres 15 via Supabase. Migrations in `supabase/migrations/` (timestamped, `YYYYMMDDHHMMSS_name.sql`).
- **RLS is enabled** on user-facing tables (see `20231031081753_add_rls.sql` and many follow-ups). Any new table/column exposed to clients must have a deliberate RLS policy.
- Key tables: `profiles` (incl. `llm_reviewer_config`, `has_email_provider` view), `articles` (incl. `pending_diff`, `language`, `imported`, `web_publication`), `changes` (status 0/1/2, `archived`, `hidden`, `revision_id`), `comments` (scoped to `change_id` and/or `revision_id`), `revisions`, `share_links`, `notifications` (i18n).
- `profiles_view` is a security-sensitive view only queryable via the **admin** client (see `get/` function). Do not expose it to the browser client.
- User API keys are stored in **Supabase Vault** (`20251126133542_Create_Vault_Functions.sql`) and accessed only via the `get_user_api_key` RPC.
- **User deletion**: deleting a user reassigns their contributions to `deleted-user@wikiadviser.io` and deletes articles they own (see `20240102153406_delete_user.sql` + regression fixes). Preserve this behavior.
- Seed: `supabase/seed.sql` (enabled in `config.toml`).

---

## 8. Git Conventions

- **Conventional Commits** with scopes: `feat(ai-review): ...`, `fix(ai-review): ...`, `ci(function-tests): ...`, `chore(ai-review): ...`, `docs: ...`.
- Scopes in active use: `ai-review`, `function-tests`, plus area scopes (`revision-feedback`, `comment-backed` appear in messages).
- Keep commits focused; one logical change per commit.
- Branch naming: `feature/fooBar`, `fix/fooBar`, `fix/<area>-<topic>` (e.g. `fix/revision-feedback-article-wide`).
- PRs target `main`. CI (`ci-pr.yml`) runs frontend lint+prettier; `supabase-functions-tests.yml` runs Deno tests when `supabase/functions/**` changes.
- **Never commit secrets** (`.env`, `MW_CREDENTIALS.txt`, API keys). `.gitignore` covers `.env` and `node_modules`. The Qlty `trufflehog` and `checkov` plugins scan for leaked secrets and IaC misconfig.

---

## 9. Known Pitfalls & Gotchas

From `docs/NOTES.md` and codebase evidence:

1. **MediaWiki proxy limitations**:
   - XML dump export is missing the `</base>` tag at line 5.
   - Article search via proxy may miss the image `src` URL host (e.g. `/media/wikipedia/...` without a host prefix).
2. **MyVisualEditor fork**: custom changes must be marked `/* Custom WikiAdviser */`. Upstream merges will conflict if you don't. Current markers live in `ve.init.mw.Target.js` and `ve.ui.DiffElement.js`.
3. **Email templates**: when changing auth/email templates, update **both** `email-templates` and the Supabase templates — they are kept in sync manually.
4. **User deletion** reassigns contributions to `deleted-user@wikiadviser.io` and deletes owned articles — do not "simplify" this without understanding the anonymization regressions fixed in `20240606092712_*` and `20250815111152_fix_delete_user.sql`.
5. **AI refusals**: never publish `MIRA_REFUSAL` text or the model's refusal explanation as article content. Always route through `assertNotRefusal` and surface `REFUSAL_USER_MESSAGE`.
6. **Free-model guard**: the global `OPENROUTER_API_KEY` may only be used with free models. Bypassing `assertFreeModelAllowed` risks real billing.
7. **Approved-change reprocessing**: an approved change (status 1) is only reprocessed if its `updated_at` is newer than its latest comment — see the filter in `ai-review/index.ts`. Don't add broad `OR` SQL filters that accidentally re-include already-processed changes (regression fixed in `a91f1de7`).
8. **Revision scoping**: revision comments must be scoped to the **latest** revision only (`pickLatestRevisionId`). Earlier commits (`bf485f83`) fixed bugs from querying stale revisions.
9. **Diff locating**: rejected changes are located by **diff fragments**, not by a stale index (`fdd695e2`). Don't reintroduce index-based matching.
10. **`pending_diff`**: set to `true` on the article via the admin client whenever Mira makes an edit, so the frontend knows to refresh the diff. Skip it only when the article was empty before the edit (no real diff to review).
11. **CORS**: origins are validated by suffix against `ROOT_DOMAIN`. If you change the deployment domain, update `ROOT_DOMAIN` or CORS will silently drop headers.
12. **`database.types.ts`** is generated — regenerate after schema changes; it's excluded from Qlty.
13. **`tetris/`** is unrelated to the product — leave it alone.

---

## 10. Agent Operating Instructions

When working autonomously on this repo:

1. **Read first**: `AGENTS.md` (this file), `docs/NOTES.md`, and the relevant function's `index.ts` + tests before editing.
2. **Verify before claiming done**:
   - Edge function changes → `deno test supabase/functions --allow-all --node-modules-dir=auto` must pass.
   - Frontend changes → `cd frontend && pnpm run lint && pnpm run prettier` must pass.
   - Schema changes → `supabase db reset` must succeed locally; add a new timestamped migration (never edit an applied one).
3. **Never commit secrets.** If a task asks you to set credentials, put them in the appropriate `.env` (gitignored) and reference via env vars.
4. **Respect RLS.** New tables/columns reachable from the browser need explicit RLS policies. Use the admin client only for service-level operations.
5. **AI review changes** must include tests under `supabase/functions/tests/ai-review/` and must not regress refusal handling or the free-model guard.
6. **MyVisualEditor edits** must be wrapped in `/* Custom WikiAdviser */` markers.
7. **Migrations** are append-only and timestamp-prefixed. Never modify a migration that has been deployed to `qa` or `prod`.
8. **Commit messages** follow Conventional Commits with a scope (`feat(area):`, `fix(area):`, `ci:`, `docs:`, `chore:`).
9. **Don't touch** `tetris/`, `node_modules/`, `supabase/functions/_shared/node_modules/`, generated `database.types.ts`, or vendored upstream files in `MyVisualEditor/` (except with custom markers).
10. **When unsure about product behavior**, prefer the existing code's behavior and add a test pinning it, rather than guessing. Ask a human for decisions around licensing, billing, or user-data anonymization.
11. **Logs over silence**: edge functions use bracketed context tags (`[ai-review]`, `[auto-retry]`, etc.). Match the pattern so production logs stay greppable.
12. **Saved plans**: `.opencode/plans/` contains prior fix plans (e.g. auto-retry diff/index matching, diff-hang race condition). Consult them when working on related areas — they capture hard-won context.

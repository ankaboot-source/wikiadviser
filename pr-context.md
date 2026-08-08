# PR Context — Who's connected (issue #71)

Resolves: https://github.com/ankaboot-source/wikiadviser/issues/71

PR: https://github.com/ankaboot-source/wikiadviser/pull/1445 (branch `71-who-is-connected`)

> This file is ephemeral per-PR working state. It is auto-deleted from `main` by
> `.github/workflows/cleanup-pr-context.yml` after the PR merges. Do not delete
> it manually before merging.

## Goal

1. Show currently-connected users on the article page's top bar (Etherpad/Google Drive style): an overlapping avatar stack, each with a tooltip showing the username. Real-time presence via Supabase Realtime.
2. In the Share dialog, show each user's last-seen time (or "Online now").

## Key decisions

- **Approach**: Supabase Realtime **presence** (approved by user) — a `presence-<articleId>` channel per article. Each viewer `.track()`s their own presence and listens for `sync`/`join`/`leave` events.
- **Don't show self**: the current user is filtered out of the connected stack (they don't need to see themselves). Verified with a second mock user.
- **Presence payload**: `{ user_id, display_name, avatar_url }`, deduped by `user_id`.
- **UI**: overlapping `q-avatar` stack in `DiffToolbar.vue`; each avatar wrapped in a `q-tooltip` showing `display_name`; initials fallback when no avatar.
- **Last-seen (DB migration, approved by user)**: added a `last_seen timestamptz` column to `profiles` and exposed it via `profiles_view`. Updated by a new `user/heartbeat` edge function (admin client) called from the article page on mount + every 60s. The browser RLS grant on `profiles` is column-restricted (avatar_url, default_avatar, llm_reviewer_config), so `last_seen` is NOT writable directly from the browser — it goes through the admin client.
- **Share display**: `ShareUser.vue` shows "Online now" for connected users (via `connectedUsers` passed from the toolbar) and "Last seen X ago" for others.

## File changes

- `frontend/src/pages/article/ArticlePage.vue` — presence channel (sync/join/leave, dedupe, filter out self); `user/heartbeat` last-seen heartbeat (mount + 60s interval, cleared on unmount); passes `connected-users` to toolbar.
- `frontend/src/components/Diff/DiffToolbar.vue` — `connectedUsers` prop; avatar stack with tooltips; passes `connected-users` to ShareCard.
- `frontend/src/components/Share/ShareCard.vue` — accepts `connectedUsers`, passes to ShareUser.
- `frontend/src/components/Share/ShareUser.vue` — shows "Online now" / "Last seen X ago" under each user; emits kebab-case `permission-emit`.
- `frontend/src/api/supabaseHelper.ts` — `getUsers` maps `last_seen`.
- `frontend/src/types/index.ts` — `User` gains `last_seen?: string | null`.
- `frontend/src/types/database.types.ts` — `profiles` gains `last_seen` (Row/Insert/Update).
- `frontend/src/api/supabase.mock.ts` — presence reports a second dummy user (so the stack shows someone other than self); `get/users` returns users with `last_seen`.
- `supabase/functions/user/lastSeenHelper.ts` — NEW: `setLastSeen` heartbeat handler (admin client).
- `supabase/functions/user/index.ts` — registers `POST /heartbeat`.
- `supabase/functions/get/handlers/getUsers.ts` — selects `last_seen` from `profiles_view`; **security fix (H2)**: authenticates the caller (401) and verifies the caller holds a permission on the article (403) before returning the collaborator list — previously callable unauthenticated with the anon key.
- `supabase/migrations/20260807120000_add_last_seen_to_profiles.sql` — NEW: adds `last_seen` column + recreates `profiles_view` to expose it.
- `.opencode/skills/e2e-testing/SKILL.md` — NEW: project-level skill extracted from AGENTS.md covering e2e/UI verification.
- `.github/workflows/cleanup-pr-context.yml` — NEW: auto-deletes `pr-context.md` from main after merge.
- `AGENTS.md` — PR workflow + guard rails; "Testing UI features" points to the `e2e-testing` skill; pr-context lifecycle documented; **new "DB change safety (agentic AI)" section** (Steps 0–6: classify risk, human approval gate, write safely, validate, rollback, human review).
- `docs/db-change-checklist.md` — NEW: reusable per-change checklist for any DB-impactful change.
- `frontend/package.json` / `pnpm-lock.yaml` — pinned `typescript` back to `^5.9.2` (typescript 7.0.2 breaks lint; tracked in issue #1446).

## DB / data-model guard rail — FLAG FOR HUMAN REVIEW

This PR includes a **migration** (`20260807120000_add_last_seen_to_profiles.sql`):
- Adds `last_seen timestamptz` to `profiles`.
- Drops and recreates `profiles_view` to include `last_seen` (view stays admin-only, REVOKE ALL from PUBLIC).

**Validated against the local Supabase DB** (see Verification) but **NOT applied to prod/staging**. A human must review and apply it to prod (or supervise) with backup + rollback ready. Rollback: `ALTER TABLE profiles DROP COLUMN IF EXISTS last_seen;` + restore `profiles_view` from git.

## Verification

- `cd frontend && pnpm run prettier:fix` — clean.
- `cd frontend && pnpm run lint` — 0 errors (4 pre-existing `v-html` warnings).
- `deno test supabase/functions --allow-all --node-modules-dir=auto` — 107 passed, 0 failed.
- **Real-DB validation (local Supabase, `supabase db reset` applied all 55 migrations incl. the new one):**
  - `profiles.last_seen` exists (nullable `timestamptz`).
  - `profiles_view` exposes `last_seen`; all existing columns intact; view queries work.
  - `user/heartbeat` edge function updates `last_seen` in the real DB (verified via psql: null → timestamp).
  - `get/users` returns `last_seen` in its response (verified via real API call).
  - Browser end-to-end against the real backend: Share dialog shows "dbtest@wikiadviser.io — Last seen 6 min ago". Screenshot: `/tmp/opencode/db-share-lastseen.png`.
  - `get/users` security fix (H2): no auth → 401, authed + has permission → 200, authed + no permission → 403 (verified against live local backend).
- Browser check against `USE_MOCK_BACKEND=true` dev server:
  - Article toolbar stack shows the second user ("JD" / Jane Doe), NOT the current user.
  - Share dialog shows "Dummy User — Last seen just now" and "Jane Doe — Online now".
- PR #1445 is MERGEABLE / CLEAN (all CI checks pass).

## Open questions / caveats

- **Subagent model config**: `~/.config/opencode/oh-my-opencode-slim.json` was edited so all subagents use `openrouter/~deepseek/deepseek-v4-flash-latest` instead of the nonexistent `openai/gpt-5.4-mini`. Local machine change, not part of this PR; only takes effect after a full opencode backend restart.
- The current user shows "Last seen just now" (not "Online now") in Share because they're filtered out of `connectedUsers`. Acceptable — they know they're online.
- Presence is inherently multi-user; the mock reports the dummy user + one second user. Real multi-user presence needs a live Supabase backend.
- **`profiles_view` ACL note**: local dev shows `anon`/`authenticated` grants on `profiles_view` (Supabase local default grants). This matches the original `secure_profiles_view.sql` behavior (`REVOKE ALL FROM PUBLIC` only) — not a regression from this migration — but worth confirming the prod grants are locked down.
- No frontend test suite exists — verification is lint/prettier/types + browser check.

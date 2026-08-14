# PR context — display-name changes notifications + e2e replica workflow

## Problem
Notification messages and the diff author line showed raw **emails** instead of
the user's display name. Also, the notifications query ran directly from the
browser against `profiles` — but `profiles_view` (which carries `display_name`)
is security-sensitive and queryable **only via the admin client** in edge
functions, so the browser query couldn't reach it.

## Change
- **Edge function** `supabase/functions/get/handlers/getNotifications.ts` (new):
  queries `notifications` embedding `profiles_view` via explicit FK hints
  (`notifications_triggered_by_fkey`, `notifications_triggered_on_fkey`) to avoid
  PGRST201 ambiguity. Mounted at `POST /get/notifications` in `get/index.ts`.
  Returns `{ notifications }` (list) or `{ notification }` (single).
  **Authenticates the caller** via `auth.getUser()` and derives the target from
  `user.id` (never a body-supplied id); the single-notification path enforces
  ownership (`notification.user_id === user.id`). Fixes an IDOR where the anon
  key could read any user's notifications (found in code review). A missing
  notification (PGRST116) returns `{ notification: null }` instead of a 500.
- **Frontend** `NotificationsBell.vue`: calls the edge function instead of a
  direct browser query; shows `display_name` falling back to email, then
  "Someone" via `displayNameOrEmail()` (trims the name, so a whitespace-only
  display_name falls back to email — mirrors `getName()` in `DiffItem.vue`).
  `DiffItem.vue`: author line uses `getName()` (display name).
- **Auth cookie fix** `frontend/src/api/supabase.ts`: `secure` cookie only over
  HTTPS (dev runs on plain HTTP localhost, where a `secure` cookie is rejected
  and breaks auth).
- **Mock** `supabase.mock.ts`: added `get/notifications` case.
- **E2E replica workflow** (new, reusable): `scripts/supabase-agent.sh`
  (start/stop/drop/reset/env/verify) manages the in-repo disposable replica at
  `supabase-agent/` (ports 54121+, project `agent`). Migrations/seed/functions
  are **symlinked** to the real files; `config.toml` is regenerated from the
  real one with offset ports. `verify` deterministically asserts symlinks +
  config + replica. Docs: `docs/e2e-workflow.md`, `.opencode/skills/e2e-testing/`,
  `AGENTS.md`.

## Scope / non-changes
- `deno.lock` gained `npm:supabase`/`cheerio` — side effect of running the deno
  test suite (used by pre-existing `ai-review`/`parsingHelper`), not this feature.
- No migration added (notifications schema unchanged). Not DB-impactful.
- No UI screenshot committed (attached to PR via SHA URL instead).

## Verification
- `frontend`: `pnpm run lint` 0 errors; `pnpm run prettier:fix` clean.
- Edge functions: `deno test supabase/functions --allow-all --node-modules-dir=auto`
  → 107 passed, 0 failed.
- E2E against the `supabase-agent/` replica (signed in as `bob@example.com`):
  - Notifications bell: unread badge "2"; display name ("Alice Smith") and email
    fallback ("bob@example.com") both render; empty state shows "No notifications".
  - DiffItem author line: "Alice Smith" (display_name) and "bob@example.com"
    (email fallback) both render for archived changes.
  - Single-notification click: navigates to the article with `?change=<id>`,
    marks that notification read (other stays unread).
  - `scripts/supabase-agent.sh verify` → VERIFY OK.
  - Screenshots (not committed): `.opencode/screenshots/{notifications-bell,
    notifications-empty,diffitem-displayname,diffitem-emailfallback,
    notification-click-navigate}.png`.
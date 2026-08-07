# PR Context — Who's connected (issue #71)

Resolves: https://github.com/ankaboot-source/wikiadviser/issues/71

## Goal

Show currently-connected users on the article page's top bar (Etherpad/Google Drive style): a stack of overlapping avatars, each with a tooltip showing the username. Real-time presence via Supabase Realtime.

## Key decisions

- **Approach**: Supabase Realtime **presence** (approved by user) — a `presence-<articleId>` channel per article. Each viewer `.track()`s their own presence and listens for `sync`/`join`/`leave` events. Pure frontend; no DB table or migration needed. (Rejected alternative: showing the static collaborators list — that's "who can edit", not "who's connected".)
- **Presence payload**: `{ user_id, display_name, avatar_url }`, deduped by `user_id`.
- **UI**: overlapping `q-avatar` stack in `DiffToolbar.vue` between the toggle and the other buttons; each avatar wrapped in a `q-tooltip` showing `display_name`. Falls back to initials when no avatar URL.
- **Mock backend**: extended `supabase.mock.ts` `channel()` to support `.track()/.untrack()/.presenceState()` and to fire the presence `sync` callback with the dummy user on subscribe, so the avatar stack renders in `USE_MOCK_BACKEND=true` screenshots.

## File changes

- `frontend/src/pages/article/ArticlePage.vue` — added `connectedUsers` ref + `setupPresence()` (presence channel, track current user, sync/join/leave handlers, dedupe); untrack/unsubscribe on unmount; passes `connected-users` to `<diff-toolbar>`.
- `frontend/src/components/Diff/DiffToolbar.vue` — new `connectedUsers` prop; overlapping avatar stack with tooltips; `initials()` helper; scoped CSS for the overlap.
- `frontend/src/api/supabase.mock.ts` — mock `channel()` now supports presence (track/untrack/presenceState + fires sync with dummy user).
- `AGENTS.md` — added **General guard rails** and **DB guard rails** bullets to General Guidelines (requested by user).

## Verification

- `cd frontend && pnpm run prettier:fix` — clean.
- `cd frontend && pnpm run lint` — 0 errors (4 known `v-html` warnings, pre-existing).
- Presence API usage verified against `@supabase/realtime-js` types (`sync`/`join`/`leave`, `presenceState()`, `track()`, `untrack()`).
- Visual check via agent-browser against `USE_MOCK_BACKEND=true` dev server: article page (`/articles/Sample_Article`) renders the `connected-users` container (`aria-label="Connected users"`) with 1 avatar showing "DU" initials and tooltip text "Dummy User". Screenshot: `/tmp/opencode/connected-users.png`.

## Open questions / caveats

- **Subagent model config**: `~/.config/opencode/oh-my-opencode-slim.json` was edited so all subagents (designer/fixer/oracle/librarian/explorer) use `openrouter/~deepseek/deepseek-v4-flash-latest` instead of the nonexistent `openai/gpt-5.4-mini`. This is a **local machine config change, not part of this PR**. It only takes effect after a full restart of the opencode backend process (the running process started before the edit, so subagent dispatch still failed with the old model — the feature was implemented directly by the orchestrator as a fallback).
- Presence is inherently multi-user; the mock reports only the single dummy user as connected, so the stack shows one avatar in screenshots. Real multi-user presence requires a live Supabase backend.
- No frontend test suite exists (`frontend/package.json` `test` is a no-op) — verification is lint/prettier/types + browser check.

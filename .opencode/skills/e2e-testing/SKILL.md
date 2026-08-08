---
name: e2e-testing
description: Use when verifying user-facing UI changes or running browser-based end-to-end checks in the WikiAdviser frontend, since there is no frontend test suite. Covers booting the USE_MOCK_BACKEND dev server, driving pages with agent-browser (open/snapshot/interact/assert/screenshot), and attaching screenshots to a PR via SHA-based raw URLs.
---

# E2E Testing (agent-browser + mock backend)

## Overview

WikiAdviser has **no frontend test suite** (`frontend/package.json` `test` is a no-op). User-facing UI changes are verified end-to-end with the **agent-browser** CLI (Chrome via CDP) against a dev server that uses a mock Supabase backend, so real pages render dummy data instead of the login redirect.

## When to use

- An issue/PR touches user-facing UI and you must confirm it renders and behaves correctly.
- You need a screenshot to attach to a PR.
- Realtime features need presence data (the mock reports a dummy user + a second user, so the connected-users stack renders).

## Cover the different possibilities (mandatory for UI work)

UI verification must reflect **realistic, varied states** — not just a single happy path. When testing/screenshotting a UI feature, cover the different possibilities and options:

- **Multiple users** — the mock (`frontend/src/api/supabase.mock.ts`) provides several users with **different `last_seen` timestamps** (online, minutes/hours/days/months ago) and different roles. Use them to show the full range of states.
- **Varied states** — e.g. for presence/last-seen: "Online now", "Last seen X min/hr/day(s) ago", and a **date** for very old timestamps (≥ 30 days).
- **Edge cases** — empty lists, no avatar (initials fallback), long names, many connected users (avatar stack overlap), a user with no `last_seen`.
- **Responsive** — capture desktop and mobile widths where layout changes.
- **Before/after** — where a change alters behavior, show both.

If the mock doesn't already cover a state you need, extend `supabase.mock.ts` so the scenario is reproducible, then screenshot it. Do not ship a UI change verified only against a single-user, single-state screenshot.

## Setup: mock-backend dev server

Boot a dev server with the mock backend so pages render without a live Supabase backend or login:

```bash
# Use a non-default port (9001) to avoid clashing with any dev:all running on 9000
USE_MOCK_BACKEND=true PORT=9001 pnpm --prefix frontend run dev
```

- `USE_MOCK_BACKEND=true` swaps in `frontend/src/api/supabase.mock.ts` (dummy session + user + article/change/presence data).
- The article-page URL is `/articles/<article_id>` — the route param is `article_id`, **not** the permission id (opening `/article/...` falls through to the 404 page).

## agent-browser workflow

```bash
agent-browser --args "--no-sandbox" open http://localhost:9001/articles/Sample_Article
agent-browser snapshot -i            # interactive elements only
agent-browser click @eN              # interact using snapshot refs
agent-browser get text @eN           # assert visible text
# DOM assertions (avoid reading the PNG — many models can't read images):
cat <<'EOF' | agent-browser eval --stdin
(() => JSON.stringify({ el: document.querySelectorAll('.your-selector').length }))()
EOF
agent-browser screenshot /tmp/out.png
agent-browser close
```

Gotchas:

- In this environment Chrome needs `--args "--no-sandbox"` at launch. If a daemon is already running, `agent-browser close` first, then launch with the flag.
- Snapshot refs go stale after any page change — re-snapshot before the next click.
- `agent-browser screenshot <path>` is **ignored** when a daemon is already running (the file lands in `~/.agent-browser/tmp/screenshots/`) — `agent-browser close` first, or copy the file from the temp dir.

## Attaching screenshots to a PR

Do **not** commit screenshots to the repo as product code. Render them in the PR via a SHA-based raw URL (the only reliable way to show an image in a GitHub comment — gist lacks `gist` scope here, and the uploads endpoint rejects the token):

1. Copy to `.opencode/screenshots/<name>.png` and `git add -f` (`.opencode/.gitignore` ignores `*.png`).
2. Push the branch, note the HEAD SHA.
3. Reference `https://raw.githubusercontent.com/$REPO/$SHA/.opencode/screenshots/<name>.png` in the PR body/comment.
4. After posting, `git rm` the file and commit the deletion — the SHA URL still works from git history.

## Common mistakes

- Opening `/article/...` (wrong route) → use `/articles/...`.
- Asserting by reading the PNG → assert via `snapshot`, `get text`, or `eval` instead.
- Committing screenshots to the repo → attach them to the PR only.

See `~/.config/opencode/skills/agent-browser/SKILL.md` for the full agent-browser command reference.

# PR Context — opencode GitHub Actions + pr-watch enhancements

Resolves: https://github.com/ankaboot-source/wikiadviser/issues/1425

## Goal

Set up the OpenCode GitHub Actions integration on wikiadviser with UI verification, and enhance the local `pr-watch.sh` watcher.

## Key decisions

- **Auth**: `use_github_token: true` (runner's `GITHUB_TOKEN`) — no OpenCode App install, no bot account. Matches issue #1425. Trade-off: `GITHUB_TOKEN` events don't re-trigger workflows, so no agent-to-agent chaining (accepted for v1).
- **Screenshots**: use the **agent-browser** CLI (Chrome via CDP, no Playwright) instead of adding Playwright. Installed on the runner via `npm i -g agent-browser && agent-browser install`.
- **Screenshot visibility**: upload as a build artifact + post a PR comment linking to it (GITHUB_TOKEN can't create gists for inline images).
- **Affected routes**: the agent writes them to `.opencode/screens.txt` (one per line); `scripts/screenshots.sh` reads it.
- **No backend needed for screenshots**: `scripts/screenshots.sh` boots the dev server with `USE_MOCK_BACKEND=true`, which swaps in a mock Supabase client (`frontend/src/api/supabase.mock.ts`) returning a dummy user + dummy article/change data, so real pages render instead of the login redirect.
- **pr-watch.sh**: now watches both issue comments and inline review comments, and notifies when the AI has actually answered.
- **pr-watch live output**: `run_opencode` shows the last 2 lines of the agent's output live (rolling display, 200-char truncation) instead of nothing until `tail -30`; falls back to `tail -30` when stdout isn't a TTY.
- **pr-watch `/oc` screenshots (local)**: the agent uses agent-browser directly (NOT `scripts/screenshots.sh`, which is for the cloud runner). Saves to a local repo path (`.opencode/<name>-*.png` — already writable, avoids the `/tmp` external-directory permission), shares via a gist link (best-effort), then deletes the files. If the live server/backend isn't up, starts the dev server with `USE_MOCK_BACKEND=true pnpm dev` so pages render real layouts with dummy data.

## File changes

- `.github/workflows/opencode.yml` — new. Triggers on `issue_comment` + `pull_request_review_comment` containing `/oc`. Runs opencode with `use_github_token: true`, then captures/upload/posts UI screenshots.
- `scripts/screenshots.sh` — new. agent-browser screenshot script (desktop 1280×800 + mobile 390×844, before/after). Boots the dev server with `USE_MOCK_BACKEND=true`.
- `frontend/src/api/supabase.mock.ts` — new. Mock Supabase client (dummy user + article/change data) for UI verification.
- `frontend/src/api/supabase.ts` — uses the mock client when `USE_MOCK_BACKEND=true`.
- `frontend/src/schema/env.schema.ts` — added `USE_MOCK_BACKEND` flag.
- `AGENTS.md` — added runner note (no local skills; write routes to `.opencode/screens.txt`; mock backend for screenshots), the `/tmp` permission gotcha, and a "Before every commit or push" checklist that requires `pr-context.md` to stay current.
- `CONTRIBUTING.md` — added `/oc` command vocabulary + how-it-works + v1 limitations.
- `pr-watch.sh` — handles review comments + notifies when AI answered; live last-2-lines output; local-path `/oc` screenshots with mock-backend fallback.
- `.gitignore` — ignore `.pr-watch-state-*.txt` local state.
- `.opencode/.gitignore` — ignore `screens.txt` + `*.png` (agent runtime state).

## Open questions / caveats

- Screenshots use a mock client with dummy data — pages render real layouts but not real data.
- "Before" screenshots are best-effort (PR base SHA); "after" is the agent's fixed state.
- `OPENROUTER_API_KEY` must be added as an org/repo Actions secret for the workflow to run.
- Sharing `/oc` screenshots in a GitHub comment requires a gist link (GitHub API can't upload images to comments); if the token lacks `gist` scope, the agent falls back to describing the screenshot.
- Local `/tmp` external-directory access needs `"permission": { "external_directory": { "/tmp/*": "allow" } }` in `~/.config/opencode/opencode.json` (only if the agent ever needs `/tmp`; the local-path approach avoids it).

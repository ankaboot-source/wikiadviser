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
- **pr-watch `/oc` screenshots (local)**: the agent uses agent-browser directly (NOT `scripts/screenshots.sh`, which is for the cloud runner). Saves to `.opencode/screenshots/<name>-*.png` (already writable, avoids the `/tmp` external-directory permission), commits them to the PR branch, and shares via a **SHA-based raw URL** (`https://raw.githubusercontent.com/$REPO/$SHA/.opencode/screenshots/<name>.png`) — the only reliable way to render an image in a GitHub comment (gist needs `gist` scope; the uploads endpoint rejects tokens). After posting, deletes the files and commits the deletion (the SHA URL still works from git history). If the live server/backend isn't up, starts the dev server with `USE_MOCK_BACKEND=true pnpm dev` so pages render real layouts with dummy data.

## File changes

- `.github/workflows/opencode.yml` — new. Triggers on `issue_comment` + `pull_request_review_comment` containing `/oc`. Runs opencode with `use_github_token: true`, then captures/upload/posts UI screenshots. **Only org members can trigger it**: a `Check org membership` step (`GET /orgs/ankaboot-source/members/{username}`, 204=member) gates the opencode + screenshot steps; non-members get a comment saying only org members can use `/oc`.
- `scripts/screenshots.sh` — new. agent-browser screenshot script (desktop 1280×800 + mobile 390×844, before/after). Boots the dev server with `USE_MOCK_BACKEND=true`.
- `frontend/src/api/supabase.mock.ts` — new. Mock Supabase client (dummy user + article/change data) for UI verification.
- `frontend/src/api/supabase.ts` — uses the mock client when `USE_MOCK_BACKEND=true`.
- `frontend/src/schema/env.schema.ts` — added `USE_MOCK_BACKEND` flag.
- `AGENTS.md` — added runner note (no local skills; write routes to `.opencode/screens.txt`; mock backend for screenshots), the `/tmp` permission gotcha, and a "Before every commit or push" checklist that requires `pr-context.md` to stay current.
- `CONTRIBUTING.md` — added `/oc` command vocabulary + how-it-works + v1 limitations.
- `pr-watch.sh` — handles review comments + notifies when AI answered; live last-2-lines output; local-path `/oc` screenshots with mock-backend fallback.
- `.gitignore` — ignore `.pr-watch-state-*.txt` local state.
- `.opencode/.gitignore` — ignore `screens.txt` + `*.png` (agent runtime state).
- `frontend/quasar.config.js` — added `USE_MOCK_BACKEND` to the build `env` block. **Bug fix uncovered during PR #1441 testing**: the env var was defined in the schema but not wired through quasar config, so `USE_MOCK_BACKEND=true` was silently ignored and pages redirected to `/auth` even with the mock flag set. (commit `2307b3a1`)

## Open questions / caveats

- Screenshots use a mock client with dummy data — pages render real layouts but not real data.
- "Before" screenshots are best-effort (PR base SHA); "after" is the agent's fixed state.
- `OPENROUTER_API_KEY` must be added as an org/repo Actions secret for the workflow to run.
- Sharing `/oc` screenshots in a GitHub comment uses a **SHA-based raw URL** (commit the screenshot to the PR branch, reference `raw.githubusercontent.com/$REPO/$SHA/...`, then delete the file in a follow-up commit — the URL still works from git history). Gist upload fails (token lacks `gist` scope) and GitHub's uploads endpoint rejects tokens ("Bad Size"), so raw-URL is the reliable path.
- Local external-directory access needs `"permission": { "external_directory": { "/tmp/*": "allow", "~/.agent-browser/tmp/screenshots/*": "allow" } }` in `~/.config/opencode/opencode.json`. The agent should always pass an explicit path to `agent-browser screenshot` (e.g. `.opencode/<name>.png`) so it saves inside the repo and avoids the external temp dir entirely.
- **PR #1441 `/oc` screenshot reply (2026-08-07, first attempt)**: replied to a comment asking for an article-page screenshot. Gist upload failed (token lacks `gist` scope) and the GitHub uploads endpoint rejected the image size. The USE_MOCK_BACKEND quasar config bug was found and fixed during this test.
- **PR #1441 `/oc` screenshot reply (2026-08-07, second attempt)**: replied to `/oc reply with a screenshot of the article page`. Used the SHA-based raw URL workflow (commit → push → post comment → delete → commit deletion). The reply posted successfully with desktop and mobile screenshots rendering via `raw.githubusercontent.com/ankaboot-source/wikiadviser/${SHA}/.opencode/screenshots/article-*.png`. The `.opencode/.gitignore` ignores `*.png`, so `git add -f` is required to force-add the screenshot files. The agent-browser `screenshot` command ignores the explicit path argument when a daemon is already running — the file goes to `~/.agent-browser/tmp/screenshots/` and must be copied to the repo manually.
- **PR #1441 article page empty (2026-08-07)**: the article-page screenshot looked empty. Root cause: the mock's `from('articles').select('current_html_content').single()` returned `null`, so `parseArticleHtml` produced no content. Fixed by returning dummy article HTML with `data-id` elements (annotated by `parseArticleHtml` from the changes list) so the diff renders. Also fixed the mock's `channel()` to support chained `.on(...).on(...)` (the article page chains realtime listeners) — previously it threw `realtimeChannel.on(...).on is not a function`. Verified the article page now renders the article with changes (revision, accept/reject sections) and no errors.
- **PR #1441 `/oc` screenshot reply (2026-08-07, third attempt)**: replied to `/oc reply with a screenshot of the article page`. Followed the same SHA-based raw URL workflow. The article page URL is `/articles/Sample_Article` (the route param is `article_id`, not the permission `id`). Dev server ran on port 9000 (Quasar default), not 8080. Screenshot files were saved to `~/.agent-browser/tmp/screenshots/` (daemon-already-running gotcha: explicit path ignored), so copied to `.opencode/screenshots/` manually. Reply posted successfully at `https://github.com/ankaboot-source/wikiadviser/pull/1441#issuecomment-5218448590`.

# PR Context — opencode GitHub Actions + pr-watch enhancements

Resolves: https://github.com/ankaboot-source/wikiadviser/issues/1425

## Goal

Set up the OpenCode GitHub Actions integration on wikiadviser with UI verification, and enhance the local `pr-watch.sh` watcher.

## Key decisions

- **Auth**: `use_github_token: true` (runner's `GITHUB_TOKEN`) — no OpenCode App install, no bot account. Matches issue #1425. Trade-off: `GITHUB_TOKEN` events don't re-trigger workflows, so no agent-to-agent chaining (accepted for v1).
- **Screenshots**: use the **agent-browser** CLI (Chrome via CDP, no Playwright) instead of adding Playwright. Installed on the runner via `npm i -g agent-browser && agent-browser install`.
- **Screenshot visibility**: upload as a build artifact + post a PR comment linking to it (GITHUB_TOKEN can't create gists for inline images).
- **Affected routes**: the agent writes them to `.opencode/screens.txt` (one per line); `scripts/screenshots.sh` reads it.
- **pr-watch.sh**: now watches both issue comments and inline review comments, and notifies when the AI has actually answered.

## File changes

- `.github/workflows/opencode.yml` — new. Triggers on `issue_comment` + `pull_request_review_comment` containing `/oc`. Runs opencode with `use_github_token: true`, then captures/upload/posts UI screenshots.
- `scripts/screenshots.sh` — new. agent-browser screenshot script (desktop 1280×800 + mobile 390×844, before/after).
- `AGENTS.md` — added runner note (no local skills; write routes to `.opencode/screens.txt`; auth-gated routes render login redirect).
- `CONTRIBUTING.md` — added `/oc` command vocabulary + how-it-works + v1 limitations.
- `pr-watch.sh` — handles review comments + notifies when AI answered.
- `.gitignore` — ignore `.pr-watch-state-*.txt` local state.

## Open questions / caveats

- The runner has no Supabase backend, so authenticated routes render the login redirect in screenshots — screenshot step is best-effort UI verification.
- "Before" screenshots are best-effort (PR base SHA); "after" is the agent's fixed state.
- `OPENROUTER_API_KEY` must be added as an org/repo Actions secret for the workflow to run.

# Browser E2E with an isolated replica (reusable workflow)

Use this to browser-test any feature on your machine **without risking your dev data**. It spins up a fully **separate** Supabase local instance (ports 54331+, project `wikiadviser-e2e`) plus a frontend dev server pointed at it, driven with **agent-browser**.

> **Safety**: this never touches the dev instance (54321/54322) or dev data. The replica is disposable — `drop` removes it entirely.

## One-command setup

```bash
scripts/e2e-env.sh start [frontend_port]   # default frontend port 9001
```

This:
1. Creates the isolated Supabase project (separate ports/config) in `~/.cache/wikiadviser-e2e/`, symlinking the repo's `migrations`/`seed`/`functions`.
2. Starts it and applies **all migrations** (fresh schema + seed).
3. Starts the edge functions for it with `ROOT_DOMAIN=localhost:<frontend_port>` (so CORS accepts the e2e frontend origin).
4. Boots the frontend dev server on `<frontend_port>` pointed at the replica (`SUPABASE_PROJECT_URL=http://127.0.0.1:54331`, `USE_MOCK_BACKEND=false`).

Other commands: `scripts/e2e-env.sh stop`, `scripts/e2e-env.sh drop`, `scripts/e2e-env.sh env`.

## Then: seed test data + drive with agent-browser

1. Create a test user on the replica: `POST http://127.0.0.1:54331/auth/v1/signup` (e2e API port).
2. Insert an article + `permissions` rows (and e.g. `last_seen` values) directly into the replica DB: `postgresql://postgres:postgres@127.0.0.1:54332/postgres`.
3. Drive the browser:

```bash
agent-browser --args "--no-sandbox" open http://localhost:9001/
agent-browser snapshot -i                # login form
agent-browser fill @e5 "user@example.com"; agent-browser fill @e6 "pass"; agent-browser press Enter
agent-browser open http://localhost:9001/articles/<article_id>
agent-browser snapshot                    # assert rendered state (DOM, not PNG)
agent-browser screenshot /tmp/out.png
```

Assert via `snapshot`/`get text`/`eval` (not by reading the PNG). Take screenshots for the PR.

## Attaching screenshots to a PR

Do **not** commit PNGs as product code. Use the SHA-based raw-URL workflow: copy to `.opencode/screenshots/<name>.png`, `git add -f`, push, reference `https://raw.githubusercontent.com/$REPO/$SHA/.opencode/screenshots/<name>.png` in a PR comment, then delete the file (the URL still works from history).

## Cleanup

`scripts/e2e-env.sh drop` — stops and removes the replica (dev instance untouched).

## When to use

- Verifying a feature end-to-end on your machine with real (fresh) data.
- Getting real-data screenshots for a PR.
- Reproducing a bug in an isolated environment.

If the feature touches the DB, also follow the DB-change process (`AGENTS.md` + `docs/db-change-checklist.md`) — the replica is the "staging" for validation.
# Browser E2E with an isolated replica (reusable workflow)

Use this to browser-test any feature on your machine **without risking your dev data**. It uses the **in-repo disposable replica** at `supabase-agent/` — a fully **separate** Supabase local instance (ports 54121+, project `agent`) plus a frontend dev server pointed at it, driven with **agent-browser**.

> **Safety**: this never touches the dev instance (54321/54322) or dev data. The replica is disposable — `drop` removes it entirely. Migrations, seed and edge functions are **symlinked** to the real files, so schema/function changes live in their real locations (`supabase/migrations/`, `supabase/functions/`) — only the *database* that gets reset/seed/dropped is the replica's.

## Reproducibility (how the replica is guaranteed to work on any machine)

Nothing about the replica is a committed static copy that can drift. `scripts/supabase-agent.sh start` runs a `prepare()` step that **regenerates everything from the real repo files**:

- **Symlinks** (`migrations`, `seed.sql`, `functions`) are recreated with **relative** targets (`../../supabase/...`) pointing at the real files — so schema + edge-function changes always live in their real locations, and the links work from any checkout path.
- **`config.toml`** is copied from the real `supabase/config.toml` and only the **ports** are offset (54121/54422/54123/...) + `project_id = "agent"`. If the real config gains new settings, the replica picks them up automatically — no drift.

So on a fresh clone, `scripts/supabase-agent.sh start` produces a working replica with zero manual setup. The committed artifacts are just the script + docs; `supabase-agent/supabase/config.toml` is gitignored (generated).

### Deterministic verification

`scripts/supabase-agent.sh verify` asserts programmatically (exits non-zero on any failure, so it can gate CI or a pre-flight check) that:

1. `migrations`/`seed.sql`/`functions` are **relative** symlinks resolving to the real repo files (never duplicated, portable).
2. `config.toml` has `project_id = "agent"` and the offset ports, and contains **none** of the real backend ports (54321/54322/...).
3. The replica is running.

Run it after `start` (or in CI) to confirm the replica is correctly wired before driving the browser.

## One-command setup

```bash
scripts/supabase-agent.sh start [frontend_port]   # default frontend port 9000
```

This:
1. Starts the replica (`supabase-agent/supabase/config.toml`, offset ports 54121/54422/54123).
2. Applies **all migrations** + seed (fresh schema) via `supabase db reset` on the replica.
3. Boots the frontend dev server on `<frontend_port>` pointed at the replica (`SUPABASE_PROJECT_URL=http://127.0.0.1:54121`, `USE_MOCK_BACKEND=false`).

Other commands: `scripts/supabase-agent.sh stop`, `scripts/supabase-agent.sh drop`, `scripts/supabase-agent.sh reset`, `scripts/supabase-agent.sh env`.

> Note: Quasar ignores the `PORT` env var — the frontend always serves on **9000** unless you change `frontend/quasar.config.js`. The `start` default is 9000.

## Then: seed test data + drive with agent-browser

1. **Create/seed a test user** on the replica. The seed already creates `deleted-user@wikiadviser.io`, `mira@wikiadviser.io`, `alice@example.com`, `bob@example.com` (random passwords). To sign in as one of them, set a known password via the admin API:
   ```bash
   SERVICE_KEY=$(scripts/supabase-agent.sh env | awk -F= '/AGENT_ANON_KEY/{print $2}')  # use service_role key instead
   curl -s -X PUT "http://127.0.0.1:54121/auth/v1/admin/users/<user_id>" \
     -H "Authorization: Bearer $SERVICE_KEY" -H "Content-Type: application/json" \
     -d '{"password":"testpass123"}'
   ```
   Or create a fresh user: `POST http://127.0.0.1:54121/auth/v1/signup`.
2. **Insert test rows** (article, `permissions`, `notifications`, `last_seen`, etc.) directly into the replica DB: `postgresql://postgres:postgres@127.0.0.1:54422/postgres`.
3. **Drive the browser**:
   ```bash
   agent-browser --args "--no-sandbox" open http://localhost:9000/
   agent-browser snapshot -i                # login form
   agent-browser fill @e5 "user@example.com"; agent-browser fill @e6 "pass"; agent-browser click @e7
   agent-browser open http://localhost:9000/articles/<article_id>
   agent-browser snapshot                    # assert rendered state (DOM, not PNG)
   agent-browser screenshot /tmp/out.png
   ```

Assert via `snapshot`/`get text`/`eval` (not by reading the PNG — many models can't read images). Take screenshots for the PR.

### Cover every state (state-matrix method)

Before screenshotting, enumerate the UI's render dimensions (data states, roles, identity, interactions, responsive, edge inputs), fill a **state matrix**, and capture a **screenshot per meaningful cell** — labelled with the state. Coverage is done only when every meaningful cell has a screenshot. See the **`e2e-testing`** skill (`.opencode/skills/e2e-testing/SKILL.md`) for the full method and a worked example.

## Attaching screenshots to a PR

Do **not** commit PNGs as product code. Use the SHA-based raw-URL workflow: copy to `.opencode/screenshots/<name>.png`, `git add -f`, push, reference `https://raw.githubusercontent.com/$REPO/$SHA/.opencode/screenshots/<name>.png` in a PR comment, then delete the file (the URL still works from history).

## Cleanup

`scripts/supabase-agent.sh drop` — stops and removes the replica (dev instance untouched). `reset` re-applies migrations + seed for a clean slate.

## When to use

- Verifying a feature end-to-end on your machine with real (fresh) data.
- Getting real-data screenshots for a PR.
- Reproducing a bug in an isolated environment.

If the feature touches the DB, also follow the DB-change process (`AGENTS.md` + `docs/db-change-checklist.md`) — the replica is the "staging" for validation.

## Legacy alternative

An older variant (`scripts/e2e-env.sh`, project `wikiadviser-e2e` in `~/.cache/wikiadviser-e2e/`, ports 54331+) still exists but the in-repo `supabase-agent/` replica is the preferred workflow.
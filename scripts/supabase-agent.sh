#!/usr/bin/env bash
#
# scripts/supabase-agent.sh — manage the in-repo disposable Supabase replica
# (`supabase-agent/`) used for agent-driven browser E2E testing.
#
# This replica is a SEPARATE Supabase project from the real `backend` stack
# (`supabase/config.toml`). It symlinks the repo's real `migrations`/`seed`/
# `functions`, so schema + edge-function changes live in their real files, but
# the DATABASE that gets reset/seed/dropped is the replica's — your local dev
# DB (54321/54322) is NEVER touched.
#
# Usage:
#   scripts/supabase-agent.sh start [frontend_port]   # boot replica + frontend (default port 9000)
#   scripts/supabase-agent.sh stop                     # stop the e2e frontend
#   scripts/supabase-agent.sh drop                     # stop + remove the replica containers (full cleanup)
#   scripts/supabase-agent.sh reset                    # stop + start fresh (re-applies all migrations + seed)
#   scripts/supabase-agent.sh env                      # print the replica URLs/keys for scripting
#   scripts/supabase-agent.sh verify                   # deterministically assert symlinks + config are correct
#
# After `start`, use agent-browser against http://localhost:<frontend_port>.
# Seed test data (a user, an article, permissions, notifications) as needed —
# see docs/e2e-workflow.md and the e2e-testing skill.
#
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
AGENT_DIR="$REPO_DIR/supabase-agent"
FRONTEND_PORT="${2:-9000}"

# Ports are offset from the real backend stack (54321/54322/...) to avoid
# clashes when both run. These are the ONLY values that differ from the real
# `supabase/config.toml`; everything else is copied verbatim from it.
API_PORT=54121
DB_PORT=54422
SHADOW_PORT=54420
POOLER_PORT=54429
STUDIO_PORT=54123
INBUCKET_PORT=54124
SMTP_PORT=54125
POP3_PORT=54126
OTHER_PORT=54127
INSPECTOR_PORT=8084
LOG_DIR="${TMPDIR:-/tmp}"

# Regenerate the replica's config.toml + symlinks from the REAL repo files.
# This is what makes the replica reproducible on any machine: it never relies
# on a committed static copy that can drift from `supabase/config.toml`.
prepare() {
  mkdir -p "$AGENT_DIR/supabase"
  # Symlink the real migrations/seed/functions so schema + edge-function
  # changes live in their real locations (never duplicated). Use RELATIVE
  # targets so the replica works from any checkout path on any machine.
  ln -sfn ../../supabase/migrations "$AGENT_DIR/supabase/migrations"
  ln -sfn ../../supabase/seed.sql "$AGENT_DIR/supabase/seed.sql"
  ln -sfn ../../supabase/functions "$AGENT_DIR/supabase/functions"
  # Rebuild config.toml from the real one, offsetting only the ports.
  cp "$REPO_DIR/supabase/config.toml" "$AGENT_DIR/supabase/config.toml"
  sed -i 's/project_id = .*/project_id = "agent"/' "$AGENT_DIR/supabase/config.toml"
  sed -i "0,/port = 54321/s//port = $API_PORT/"            "$AGENT_DIR/supabase/config.toml"
  sed -i "0,/port = 54322/s//port = $DB_PORT/"             "$AGENT_DIR/supabase/config.toml"
  sed -i "0,/shadow_port = 54320/s//shadow_port = $SHADOW_PORT/" "$AGENT_DIR/supabase/config.toml"
  sed -i "0,/port = 54329/s//port = $POOLER_PORT/"         "$AGENT_DIR/supabase/config.toml"
  sed -i "0,/port = 54323/s//port = $STUDIO_PORT/"         "$AGENT_DIR/supabase/config.toml"
  sed -i "0,/port = 54324/s//port = $INBUCKET_PORT/"       "$AGENT_DIR/supabase/config.toml"
  sed -i "s/smtp_port = 54325/smtp_port = $SMTP_PORT/; s/pop3_port = 54326/pop3_port = $POP3_PORT/" "$AGENT_DIR/supabase/config.toml"
  sed -i "s/inspector_port = 8083/inspector_port = $INSPECTOR_PORT/; s/port = 54327/port = $OTHER_PORT/" "$AGENT_DIR/supabase/config.toml"
}

start() {
  prepare
  (cd "$AGENT_DIR" && supabase start > "$LOG_DIR/supabase-agent.log" 2>&1)
  echo "replica up (API: http://127.0.0.1:$API_PORT, Studio: http://127.0.0.1:$STUDIO_PORT)"
  echo "applying migrations + seed (fresh schema)..."
  (cd "$AGENT_DIR" && supabase db reset > "$LOG_DIR/supabase-agent-reset.log" 2>&1 || true)
  echo "starting frontend on :$FRONTEND_PORT pointed at the replica..."
  (cd "$REPO_DIR/frontend" && SUPABASE_PROJECT_URL="http://127.0.0.1:$API_PORT" \
     SUPABASE_ANON_KEY="$(agent_anon)" USE_MOCK_BACKEND=false PORT="$FRONTEND_PORT" \
     setsid nohup pnpm run dev > "$LOG_DIR/supabase-agent-frontend.log" 2>&1 </dev/null & disown)
  echo "wait ~30s for the frontend to be ready, then drive http://localhost:$FRONTEND_PORT"
}

stop() {
  local pid
  pid=$(ss -tlnp 2>/dev/null | grep ":$FRONTEND_PORT " | grep -oP 'pid=\K[0-9]+' | head -1)
  [[ -n "${pid:-}" ]] && kill "$pid" 2>/dev/null || true
  echo "stopped the e2e frontend (replica containers left running)."
}

drop() {
  stop
  (cd "$AGENT_DIR" && supabase stop --no-backup 2>/dev/null || true)
  echo "dropped the replica (dev instance untouched)."
}

reset() {
  stop
  (cd "$AGENT_DIR" && supabase stop --no-backup 2>/dev/null || true)
  start
}

agent_anon() {
  local key
  key=$(cd "$AGENT_DIR" && supabase status 2>/dev/null | awk '/anon key/ {print $3}')
  echo "${key:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0}"
}

env() {
  echo "AGENT_DIR=$AGENT_DIR"
  echo "AGENT_API_URL=http://127.0.0.1:$API_PORT"
  echo "AGENT_DB_URL=postgresql://postgres:postgres@127.0.0.1:$DB_PORT/postgres"
  echo "AGENT_ANON_KEY=$(agent_anon)"
  echo "AGENT_FRONTEND_URL=http://localhost:$FRONTEND_PORT"
}

# Deterministic verification of the replica's symlinks + config. Exits non-zero
# on any failure so it can gate CI or a pre-flight check. Asserts:
#   1. migrations/seed.sql/functions are RELATIVE symlinks resolving to the
#      real repo files (never duplicated, portable across machines).
#   2. config.toml has project_id="agent" and the offset ports (never the real
#      backend ports 54321/54322/...).
#   3. The replica is running (supabase status succeeds).
verify() {
  local fail=0
  local real_migrations="$REPO_DIR/supabase/migrations"
  local real_seed="$REPO_DIR/supabase/seed.sql"
  local real_functions="$REPO_DIR/supabase/functions"
  local cfg="$AGENT_DIR/supabase/config.toml"

  echo "== verifying replica symlinks + config =="

  # 1. Symlinks: must be relative and resolve to the real files.
  for entry in migrations seed.sql functions; do
    local link="$AGENT_DIR/supabase/$entry"
    if [[ ! -L "$link" ]]; then
      echo "FAIL: $link is not a symlink" >&2; fail=1; continue
    fi
    local target
    target=$(readlink "$link")
    if [[ "$target" != ../../supabase/* ]]; then
      echo "FAIL: $link target '$target' is not relative (../../supabase/...)" >&2; fail=1
    fi
    local resolved
    resolved=$(readlink -f "$link")
    local expected
    case "$entry" in
      migrations) expected="$real_migrations" ;;
      seed.sql)   expected="$real_seed" ;;
      functions)  expected="$real_functions" ;;
    esac
    if [[ "$resolved" != "$expected" ]]; then
      echo "FAIL: $link resolves to '$resolved', expected '$expected'" >&2; fail=1
    else
      echo "OK: $link -> $target (resolves to $resolved)"
    fi
  done

  # 2. config.toml: project_id + offset ports, and none of the real ports.
  if [[ ! -f "$cfg" ]]; then
    echo "FAIL: $cfg missing (run 'start' to generate it)" >&2; fail=1
  else
    grep -q 'project_id = "agent"' "$cfg" || { echo "FAIL: config project_id != agent" >&2; fail=1; }
    grep -q "port = $API_PORT" "$cfg" || { echo "FAIL: config missing API port $API_PORT" >&2; fail=1; }
    grep -q "port = $DB_PORT" "$cfg" || { echo "FAIL: config missing DB port $DB_PORT" >&2; fail=1; }
    grep -q "port = $STUDIO_PORT" "$cfg" || { echo "FAIL: config missing Studio port $STUDIO_PORT" >&2; fail=1; }
    # The real backend ports must NOT appear (would collide with the dev stack).
    for real_port in 54321 54322 54323 54324 54325 54326 54327 54320 54329; do
      if grep -q "port = $real_port" "$cfg" || grep -q "shadow_port = $real_port" "$cfg" \
         || grep -q "smtp_port = $real_port" "$cfg" || grep -q "pop3_port = $real_port" "$cfg"; then
        echo "FAIL: config still contains real backend port $real_port" >&2; fail=1
      fi
    done
    echo "OK: config.toml has project_id=agent + offset ports (no real backend ports)"
  fi

  # 3. Replica running.
  if (cd "$AGENT_DIR" && supabase status > /dev/null 2>&1); then
    echo "OK: replica is running"
  else
    echo "FAIL: replica not running (run 'start')" >&2; fail=1
  fi

  if [[ "$fail" -ne 0 ]]; then
    echo "VERIFY FAILED" >&2
    exit 1
  fi
  echo "VERIFY OK"
}

case "${1:-}" in
  start) start ;;
  stop) stop ;;
  drop) drop ;;
  reset) reset ;;
  env) env ;;
  verify) verify ;;
  *) echo "usage: $0 {start|stop|drop|reset|env|verify} [frontend_port]" >&2; exit 1 ;;
esac
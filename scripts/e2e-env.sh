#!/usr/bin/env bash
#
# scripts/e2e-env.sh — isolated E2E environment for browser-driven feature
# testing with agent-browser. It creates a SEPARATE Supabase local instance
# (ports 54331+, project "wikiadviser-e2e") plus a frontend dev server on a
# non-default port pointed at it — it NEVER touches the dev instance
# (54321/54322) or dev data.
#
# Usage:
#   scripts/e2e-env.sh start [frontend_port]   # boot replica + functions + frontend (default port 9001)
#   scripts/e2e-env.sh stop                     # stop the e2e frontend + functions
#   scripts/e2e-env.sh drop                     # stop + remove the replica containers (full cleanup)
#   scripts/e2e-env.sh env                      # print the e2e URLs/keys for scripting
#
# After `start`, use agent-browser against http://localhost:<frontend_port>.
# Seed test data (a user, an article, permissions, last_seen) as needed — see
# the e2e-testing skill / docs/agentic-dev.md.
#
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
E2E_DIR="${E2E_DIR:-$HOME/.cache/wikiadviser-e2e}"
API_PORT="${E2E_API_PORT:-54331}"
DB_PORT="${E2E_DB_PORT:-54332}"
SHADOW_PORT="${E2E_SHADOW_PORT:-54330}"
POOLER_PORT="${E2E_POOLER_PORT:-54339}"
STUDIO_PORT="${E2E_STUDIO_PORT:-54333}"
INBUCKET_PORT="${E2E_INBUCKET_PORT:-54334}"
SMTP_PORT="${E2E_SMTP_PORT:-54335}"
POP3_PORT="${E2E_POP3_PORT:-54336}"
OTHER_PORT="${E2E_OTHER_PORT:-54337}"
INSPECTOR_PORT="${E2E_INSPECTOR_PORT:-8093}"
FRONTEND_PORT="${2:-9001}"
LOG_DIR="${TMPDIR:-/tmp}"

FN_ENV="$E2E_DIR/functions.env"

prepare() {
  mkdir -p "$E2E_DIR/supabase"
  cp "$REPO_DIR/supabase/config.toml" "$E2E_DIR/supabase/config.toml"
  ln -sfn "$REPO_DIR/supabase/migrations" "$E2E_DIR/supabase/migrations"
  ln -sfn "$REPO_DIR/supabase/seed.sql" "$E2E_DIR/supabase/seed.sql"
  ln -sfn "$REPO_DIR/supabase/functions" "$E2E_DIR/supabase/functions"
  # Isolated ports + project id (never collides with the dev instance).
  sed -i 's/project_id = .*/project_id = "wikiadviser-e2e"/' "$E2E_DIR/supabase/config.toml"
  sed -i "0,/port = 54321/s//port = $API_PORT/"            "$E2E_DIR/supabase/config.toml"
  sed -i "0,/port = 54322/s//port = $DB_PORT/"             "$E2E_DIR/supabase/config.toml"
  sed -i "0,/shadow_port = 54320/s//shadow_port = $SHADOW_PORT/" "$E2E_DIR/supabase/config.toml"
  sed -i "0,/port = 54329/s//port = $POOLER_PORT/"         "$E2E_DIR/supabase/config.toml"
  sed -i "0,/port = 54323/s//port = $STUDIO_PORT/"         "$E2E_DIR/supabase/config.toml"
  sed -i "0,/port = 54324/s//port = $INBUCKET_PORT/"       "$E2E_DIR/supabase/config.toml"
  sed -i "s/smtp_port = 54325/smtp_port = $SMTP_PORT/; s/pop3_port = 54326/pop3_port = $POP3_PORT/" "$E2E_DIR/supabase/config.toml"
  sed -i "s/inspector_port = 8083/inspector_port = $INSPECTOR_PORT/; s/port = 54327/port = $OTHER_PORT/" "$E2E_DIR/supabase/config.toml"
  # Functions env: ROOT_DOMAIN must match the e2e frontend origin or CORS rejects it.
  cp "$REPO_DIR/supabase/functions/.env" "$FN_ENV"
  sed -i "s|ROOT_DOMAIN=.*|ROOT_DOMAIN=\"localhost:$FRONTEND_PORT\"|" "$FN_ENV"
}

start() {
  prepare
  (cd "$E2E_DIR" && supabase start > "$LOG_DIR/e2e-supabase.log" 2>&1)
  export ROOT_DOMAIN="localhost:$FRONTEND_PORT"
  (cd "$E2E_DIR" && setsid nohup supabase functions serve --no-verify-jwt \
     --env-file "$FN_ENV" > "$LOG_DIR/e2e-functions.log" 2>&1 </dev/null & disown)
  echo "functions serve starting... (e2e API: http://127.0.0.1:$API_PORT)"
  (cd "$REPO_DIR/frontend" && SUPABASE_PROJECT_URL="http://127.0.0.1:$API_PORT" \
     SUPABASE_ANON_KEY="$(e2e_anon)" USE_MOCK_BACKEND=false PORT="$FRONTEND_PORT" \
     setsid nohup pnpm run dev > "$LOG_DIR/e2e-frontend.log" 2>&1 </dev/null & disown)
  echo "e2e frontend starting... (http://localhost:$FRONTEND_PORT)"
  echo "wait ~30s for the frontend + functions to be ready."
}

stop() {
  pkill -f "$E2E_DIR" 2>/dev/null || true
  pkill -f "functions serve.*$E2E_DIR" 2>/dev/null || true
  # e2e frontend: match its specific port.
  pkill -f "PORT=$FRONTEND_PORT" 2>/dev/null || true
  echo "stopped e2e servers (frontend :$FRONTEND_PORT, functions)."
}

drop() {
  stop
  (cd "$E2E_DIR" && supabase stop --no-backup 2>/dev/null || true)
  echo "dropped the e2e replica (dev instance untouched)."
}

e2e_anon() {
  # Local instances share the default anon key; read it fresh if possible.
  local key
  key=$(cd "$E2E_DIR" && supabase status 2>/dev/null | awk '/anon key/ {print $3}')
  echo "${key:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0}"
}

env() {
  echo "E2E_REPO_DIR=$REPO_DIR"
  echo "E2E_DIR=$E2E_DIR"
  echo "E2E_API_URL=http://127.0.0.1:$API_PORT"
  echo "E2E_DB_URL=postgresql://postgres:postgres@127.0.0.1:$DB_PORT/postgres"
  echo "E2E_ANON_KEY=$(e2e_anon)"
  echo "E2E_FRONTEND_URL=http://localhost:$FRONTEND_PORT"
  echo "E2E_ROOT_DOMAIN=localhost:$FRONTEND_PORT"
}

case "${1:-}" in
  start) start ;;
  stop) stop ;;
  drop) drop ;;
  env) env ;;
  *) echo "usage: $0 {start|stop|drop|env} [frontend_port]" >&2; exit 1 ;;
esac
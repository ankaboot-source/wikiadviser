#!/usr/bin/env bash
#
# scripts/frontend-dev.sh — centralized lifecycle manager for the Quasar Vite
# frontend dev server (frontend/). One place to start/stop/status/log the dev
# server instead of launching random detached `nohup` processes by hand.
#
# Two backends:
#   - mock  (default): sets USE_MOCK_BACKEND=true -> swaps in
#     frontend/src/api/supabase.mock.ts (dummy session + data, no backend/login).
#   - real  (start:real): leaves USE_MOCK_BACKEND unset -> talks to the real
#     Supabase project via the .env file.
#
# Logs are written to ${TMPDIR:-/tmp}/frontend-dev-<port>.log (same convention
# as supabase-agent.sh / e2e-env.sh).
#
# Usage:
#   scripts/frontend-dev.sh start [port]      # mock backend (default 9000)
#   scripts/frontend-dev.sh start:real [port] # real backend
#   scripts/frontend-dev.sh stop  [port]      # kill the process on :PORT
#   scripts/frontend-dev.sh status [port]     # is it running? pid/port/log path
#   scripts/frontend-dev.sh logs  [port]      # `tail -f` (LIVE) the dev-server log
#
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND_DIR="$REPO_DIR/frontend"
PORT="${2:-9000}"
LOG_DIR="${TMPDIR:-/tmp}"
LOG_FILE="$LOG_DIR/frontend-dev-$PORT.log"

usage() {
  sed -n '2,24p' "$0" | sed 's/^# \{0,1\}//'
  exit 0
}

# Find the pid listening on :PORT (used by stop/status). Empty string if none.
# `|| true` so callers under `set -euo pipefail` don't abort when the port is free.
port_pid() {
  ss -tlnp 2>/dev/null | grep ":$PORT " | grep -oP 'pid=\K[0-9]+' | head -1 || true
}

start() {
  local mock=${1:-1}
  if [[ -n "$(port_pid)" ]]; then
    echo "error: something is already listening on :$PORT (pid $(port_pid)). stop it first:"
    echo "  scripts/frontend-dev.sh stop $PORT"
    exit 1
  fi

  local env_prefix=()
  if [[ "$mock" == "1" ]]; then
    env_prefix=(USE_MOCK_BACKEND=true)
    echo "starting frontend on :$PORT with the MOCK backend..."
  else
    env_prefix=(USE_MOCK_BACKEND=false)
    echo "starting frontend on :$PORT with the REAL backend..."
  fi

  # Invoke the quasar binary directly (not `pnpm run dev -- -p`, which forwards
  # the `--` literally to quasar and never applies the port).
  local quasar_bin="$FRONTEND_DIR/node_modules/.bin/quasar"
  (cd "$FRONTEND_DIR" && env "${env_prefix[@]}" \
     setsid nohup "$quasar_bin" dev -p "$PORT" > "$LOG_FILE" 2>&1 </dev/null & disown)

  echo "logs:  $LOG_FILE"
  echo "ui:    http://localhost:$PORT"
  echo "wait ~30s for it to be ready."
}

start_real() {
  start 0
}

stop() {
  local pid
  pid=$(port_pid)
  if [[ -z "${pid:-}" ]]; then
    echo "nothing listening on :$PORT (already stopped)."
    return 0
  fi
  echo "stopping pid $pid on :$PORT..."
  kill "$pid" 2>/dev/null || true
  # Backstop: kill any leftover quasar/vite children (match the quasar CLI binary
  # path actually in argv, which is what gets run via node_modules/.bin/quasar).
  sleep 1
  [[ -n "$(port_pid)" ]] && pkill -f "quasar.js dev" 2>/dev/null || true
  sleep 1
  if [[ -n "$(port_pid)" ]]; then
    echo "warning: :$PORT still in use after stop; try: pkill -9 -f 'quasar.js dev'"
  else
    echo "stopped. (logs retained at $LOG_FILE)"
  fi
}

status() {
  local pid
  pid=$(port_pid)
  if [[ -z "${pid:-}" ]]; then
    echo "not running on :$PORT"
    [[ -f "$LOG_FILE" ]] && echo "last log: $LOG_FILE"
    return 0
  fi
  echo "running on :$PORT (pid $pid)"
  echo "log: $LOG_FILE"
  echo "ui:  http://localhost:$PORT"
}

logs() {
  if [[ ! -f "$LOG_FILE" ]]; then
    echo "no log yet at $LOG_FILE (start the server first)."
    exit 1
  fi
  echo "following (live) $LOG_FILE — Ctrl-C to stop"
  tail -f "$LOG_FILE"
}

case "${1:-}" in
  start)      start 1 ;;
  start:real) start_real ;;
  stop)       stop ;;
  status)     status ;;
  logs)       logs ;;
  -h|--help|help) usage ;;
  *) echo "unknown command: ${1:-}"; usage ;;
esac

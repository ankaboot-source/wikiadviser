#!/usr/bin/env bash
#
# screenshots.sh — capture before/after UI screenshots of affected routes using
# agent-browser (Chrome via CDP, no Playwright). Runs in CI after the opencode
# agent has made changes.
#
# Reads affected routes from .opencode/screens.txt (one per line). If missing,
# falls back to a small default set.
#
# Env:
#   PR_NUMBER    — PR number (required)
#   GITHUB_TOKEN — token for API calls (required)
#   BASE_URL     — dev server URL (default http://localhost:8080)
#   BEFORE_SHA   — optional commit SHA for the "before" state (default: PR base)
#
# Output: screenshots/before/*.png and screenshots/after/*.png
#
# NOTE: The app requires auth + a Supabase backend. On CI there is no backend,
# so authenticated routes render the login redirect. Screenshots capture
# whatever renders; this is best-effort UI verification.

set -euo pipefail

REPO="ankaboot-source/wikiadviser"
BASE_URL="${BASE_URL:-http://localhost:8080}"
OUT_DIR="screenshots"
DESKTOP_W=1280
DESKTOP_H=800
MOBILE_W=390
MOBILE_H=844
ROUTES_FILE=".opencode/screens.txt"

log() { echo "[screenshots] $*"; }

# --- resolve routes ---
if [[ -f "$ROUTES_FILE" ]]; then
  mapfile -t ROUTES < <(grep -v '^[[:space:]]*$' "$ROUTES_FILE")
else
  log "No $ROUTES_FILE found; using default routes"
  ROUTES=("/auth" "/")
fi
if [[ "${#ROUTES[@]}" -eq 0 ]]; then
  log "No routes to screenshot; skipping"
  exit 0
fi

# --- resolve SHAs via the GitHub API (works for both event types) ---
PR_JSON="$(curl -sS -H "Authorization: token $GITHUB_TOKEN" \
  "https://api.github.com/repos/$REPO/pulls/$PR_NUMBER")"
AFTER_SHA="$(printf '%s' "$PR_JSON" | jq -r '.head.sha // empty')"
BEFORE_SHA="${BEFORE_SHA:-$(printf '%s' "$PR_JSON" | jq -r '.base.sha // empty')}"

# Ensure the SHAs are available locally (checkout uses fetch-depth: 1 by default)
git fetch origin "$AFTER_SHA" 2>/dev/null || git fetch origin 2>/dev/null || true
if [[ -n "$BEFORE_SHA" ]]; then
  git fetch origin "$BEFORE_SHA" 2>/dev/null || true
fi

# --- install agent-browser + chrome ---
if ! command -v agent-browser >/dev/null 2>&1; then
  log "Installing agent-browser..."
  npm i -g agent-browser >/dev/null 2>&1 || true
fi
agent-browser install >/dev/null 2>&1 || true

# --- fallback env so the dev server can boot without a backend ---
export SUPABASE_PROJECT_URL="${SUPABASE_PROJECT_URL:-http://localhost:54321}"
export SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-dummy-anon-key}"
export MEDIAWIKI_ENDPOINT="${MEDIAWIKI_ENDPOINT:-http://localhost:8081}"
export WIKIADVISER_LANGUAGES="${WIKIADVISER_LANGUAGES:-en}"
export SHARE_LINK_DAY_LIMIT="${SHARE_LINK_DAY_LIMIT:-7}"
export USE_MIRA="${USE_MIRA:-false}"
export USE_CHANGE_DESCRIPTION="${USE_CHANGE_DESCRIPTION:-false}"
# Render real pages with a dummy user + dummy article/change data instead of
# the login redirect (no live Supabase backend on the runner).
export USE_MOCK_BACKEND="${USE_MOCK_BACKEND:-true}"

# --- dev server helpers ---
start_dev_server() {
  log "Starting dev server..."
  (cd frontend && pnpm dev >/tmp/quasar-dev.log 2>&1 &)
  for _ in $(seq 1 90); do
    if curl -sf "$BASE_URL" >/dev/null 2>&1; then
      log "Dev server ready"
      return 0
    fi
    sleep 2
  done
  log "Dev server did not become ready; tailing log:"
  tail -30 /tmp/quasar-dev.log 2>/dev/null || true
  return 1
}

stop_dev_server() {
  pkill -f "quasar" >/dev/null 2>&1 || true
  sleep 2
}

# --- capture one state ---
capture() {
  local state="$1" sha="$2"
  log "Capturing '$state' (sha=$sha)"
  if [[ -n "$sha" ]]; then
    git checkout -q "$sha" 2>/dev/null || { log "  checkout $sha failed"; return 1; }
  fi
  stop_dev_server
  start_dev_server || return 1
  mkdir -p "$OUT_DIR/$state"
  for route in "${ROUTES[@]}"; do
    local name
    name="$(printf '%s' "$route" | sed 's#^/##; s#/#_#g; s#:#_#g')"
    [[ -z "$name" ]] && name="home"
    log "  $route (desktop)"
    agent-browser set viewport "$DESKTOP_W" "$DESKTOP_H" >/dev/null 2>&1 || true
    agent-browser open "$BASE_URL$route" >/dev/null 2>&1 || true
    agent-browser wait --load networkidle >/dev/null 2>&1 || true
    agent-browser screenshot "$OUT_DIR/$state/${name}-desktop.png" >/dev/null 2>&1 || true
    log "  $route (mobile)"
    agent-browser set viewport "$MOBILE_W" "$MOBILE_H" >/dev/null 2>&1 || true
    agent-browser wait --load networkidle >/dev/null 2>&1 || true
    agent-browser screenshot "$OUT_DIR/$state/${name}-mobile.png" >/dev/null 2>&1 || true
  done
  agent-browser close >/dev/null 2>&1 || true
}

# capture after (the agent's fixed state)
capture "after" "$AFTER_SHA" || true

# capture before (best-effort, pre-fix baseline)
if [[ -n "$BEFORE_SHA" ]]; then
  capture "before" "$BEFORE_SHA" || true
fi

# restore working tree to the after state
if [[ -n "$AFTER_SHA" ]]; then
  git checkout -q "$AFTER_SHA" 2>/dev/null || true
fi

log "Done. Screenshots in $OUT_DIR/"

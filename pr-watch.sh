#!/usr/bin/env bash
#
# pr-watch.sh — watch a GitHub PR for comments mentioning "/oc" and dispatch
# them to opencode (running locally) so the agent can respond automatically.
#
# Usage:
#   ./pr-watch.sh              # auto-detect PR from current branch, 60s interval
#   ./pr-watch.sh 1429         # specific PR, 60s interval
#   ./pr-watch.sh 1429 30      # specific PR, 30s interval
#
# How it works:
#   1. If no PR number is given, looks up the open PR matching the current
#      git branch via the GitHub API.
#   2. Polls the GitHub API for new comments on the PR every INTERVAL seconds.
#   3. When a comment contains "/oc", it launches `opencode run` with the
#      comment as context.
#   4. opencode processes the comment (with full repo access) and posts a
#      reply back to GitHub via the API.
#
# Requires:
#   - opencode in PATH (or at ~/.opencode/bin/opencode)
#   - git credentials configured for github.com (used for API auth)
#   - curl, jq
#
# Config:
#   OPENCODE_MODEL   — model in provider/model format (default: openrouter/deepseek/deepseek-v4-flash)
#   OPENCODE_BIN     — path to opencode binary (default: ~/.opencode/bin/opencode)
#
# State:
#   Tracks the last-seen comment ID in .pr-watch-state-<PR_NUMBER>.txt
#   so it doesn't re-process comments across restarts.

set -euo pipefail

REPO="ankaboot-source/wikiadviser"
ORG="${REPO%%/*}"
REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
INTERVAL="${2:-60}"
OPENCODE_BIN="${OPENCODE_BIN:-$HOME/.opencode/bin/opencode}"
OPENCODE_MODEL="${OPENCODE_MODEL:-openrouter/deepseek/deepseek-v4-flash}"
TRIGGER="/oc"
AGENT_SIGNATURE="🤖"

# --- helpers ---

get_token() {
  printf "protocol=https\nhost=github.com\n\n" | git credential fill 2>/dev/null \
    | grep '^password=' | sed 's/password=//'
}

api_get() {
  local token="$1"; local url="$2"
  curl -sS -H "Authorization: token $token" -H "Accept: application/vnd.github+json" "$url"
}

# Check if a user is a member of the org that owns this repo.
# Returns 0 (true) if member, 1 (false) otherwise.
# Caches results per username to avoid redundant API calls.
declare -A _ORG_MEMBER_CACHE
is_org_member() {
  local token="$1" username="$2"
  if [[ -v _ORG_MEMBER_CACHE["$username"] ]]; then
    return "${_ORG_MEMBER_CACHE["$username"]}"
  fi
  local status
  status=$(curl -sS -o /dev/null -w "%{http_code}" \
    -H "Authorization: token $token" \
    -H "Accept: application/vnd.github+json" \
    "https://api.github.com/orgs/$ORG/members/$username")
  if [[ "$status" == "204" ]]; then
    _ORG_MEMBER_CACHE["$username"]=0
    return 0
  else
    _ORG_MEMBER_CACHE["$username"]=1
    echo "[pr-watch] ⚠️  @$username is not a member of $ORG — skipping" >&2
    return 1
  fi
}

# Build the prompt sent to opencode for a given /oc comment.
# Uses global: PR_NUMBER, REPO, REPO_DIR, AGENT_SIGNATURE, OPENCODE_MODEL
build_prompt() {
  local comment_id="$1" author="$2" body="$3" comment_url="$4"
  cat <<PROMPT_EOF
A comment was posted on PR #$PR_NUMBER by @$author.

Comment URL: $comment_url

Comment body:
---
$body
---

You are running in the WikiAdviser repo at $REPO_DIR on branch $(git branch --show-current 2>/dev/null || echo 'unknown').

CONTEXT: Read pr-context.md if it exists — it contains prior decisions, file changes, and open questions from the interactive session that built this PR. Use it to answer accurately without re-discovering everything.

Review the comment, check the relevant code if needed, and post a reply comment back to GitHub PR #$PR_NUMBER.

To post a reply, get the GitHub token by running:
  printf 'protocol=https\nhost=github.com\n\n' | git credential fill 2>/dev/null | grep '^password=' | sed 's/password=//'

Then POST to:
  https://api.github.com/repos/$REPO/issues/$PR_NUMBER/comments
with body: {"body": "$AGENT_SIGNATURE <your reply>"}

IMPORTANT: Prefix your reply comment body with '$AGENT_SIGNATURE ' so the watcher knows it's from the agent and doesn't loop.

=== Commit code changes BEFORE updating pr-context.md ===

If you made any code changes (formatting, lint fixes, edits, etc.), stage, commit, and push them FIRST:

1. Run: git add -A
2. Run: git commit -m "<descriptive message>"
3. Run: git push

=== pr-context.md — update after EVERY response ===

AFTER answering, ALWAYS update pr-context.md:

1. Update the file with any new decisions, file changes, or open questions from this exchange. If nothing changed, update the timestamp/note to reflect it's still current. The file must always reflect the latest state.
2. Commit and push the update to the branch.

=== Merge handling — if the comment asks to merge ===

If the comment says "/oc merge" or similar (approval to merge), do this BEFORE merging:

1. Run: git rm pr-context.md
2. Commit: git commit -m "chore: remove pr-context.md before merge"
3. Push: git push
4. Then merge the PR via the GitHub API (POST /repos/$REPO/pulls/$PR_NUMBER/merge)

Do NOT merge without removing pr-context.md first.

If the comment is a review suggestion or question about the code, investigate the actual code before responding. Keep replies concise and technical. If no response is needed, skip posting.
PROMPT_EOF
}

# --- auto-detect PR number from current branch if not given ---

PR_NUMBER="${1:-}"

if [[ -z "$PR_NUMBER" ]]; then
  BRANCH=$(git -C "$REPO_DIR" branch --show-current)
  if [[ -z "$BRANCH" ]]; then
    echo "❌ Could not detect current branch. Specify a PR number: $0 <PR_NUMBER>"
    exit 1
  fi
  echo "[pr-watch] No PR number given. Looking up open PR for branch: $BRANCH"
  TOKEN="$(get_token)"
  PR_NUMBER=$(api_get "$TOKEN" \
    "https://api.github.com/repos/$REPO/pulls?head=ankaboot-source:$BRANCH&state=open" \
    | jq -r '.[0].number // empty')
  if [[ -z "$PR_NUMBER" ]]; then
    echo "❌ No open PR found for branch '$BRANCH'. Specify a PR number: $0 <PR_NUMBER>"
    exit 1
  fi
  echo "[pr-watch] Found PR #$PR_NUMBER for branch '$BRANCH'"
fi

STATE_FILE="$REPO_DIR/.pr-watch-state-${PR_NUMBER}.txt"

echo "[pr-watch] Watching PR #$PR_NUMBER on $REPO every ${INTERVAL}s"
echo "[pr-watch] Trigger: comments containing '$TRIGGER'"
echo "[pr-watch] Model: $OPENCODE_MODEL"
echo "[pr-watch] State file: $STATE_FILE"

# --- main loop ---

TOKEN="$(get_token)"

# On startup: check for unanswered /oc comments (comments with /oc that have
# no subsequent 🤖 reply). Process them immediately, then set state.
if [[ ! -f "$STATE_FILE" ]]; then
  COMMENTS_JSON=$(api_get "$TOKEN" \
    "https://api.github.com/repos/$REPO/issues/$PR_NUMBER/comments?per_page=100")

  # Find the last 🤖 reply ID — anything after it is potentially unanswered
  LAST_BOT_REPLY=$(echo "$COMMENTS_JSON" | jq -r --arg sig "$AGENT_SIGNATURE" \
    'map(select(.body | startswith($sig))) | .[-1].id // 0')

  # Find /oc comments after the last bot reply
  UNANSWERED=$(echo "$COMMENTS_JSON" | jq -c --arg last_bot "$LAST_BOT_REPLY" --arg trig "$TRIGGER" --arg sig "$AGENT_SIGNATURE" \
    'map(select(
       .id > ($last_bot | tonumber)
       and (.body | test($trig))
       and (.body | startswith($sig) | not)
     ))
     | sort_by(.id)')

  UNANSWERED_COUNT=$(echo "$UNANSWERED" | jq 'length')

  if [[ "$UNANSWERED_COUNT" -gt 0 ]]; then
    echo "[pr-watch] Found $UNANSWERED_COUNT unanswered /oc comment(s) from before startup"
    echo "$UNANSWERED" | jq -c '.[]' | while read -r comment; do
      COMMENT_ID=$(echo "$comment" | jq -r '.id')
      AUTHOR=$(echo "$comment" | jq -r '.user.login')
      BODY=$(echo "$comment" | jq -r '.body')
      COMMENT_URL=$(echo "$comment" | jq -r '.html_url')

      # Only process comments from org members
      if ! is_org_member "$TOKEN" "$AUTHOR"; then
        echo "[pr-watch] Skipping comment $COMMENT_ID from non-member @$AUTHOR"
        continue
      fi

      echo "[pr-watch] Processing backlog comment $COMMENT_ID from @$AUTHOR"
      echo "[pr-watch] URL: $COMMENT_URL"
      echo "[pr-watch] Body: ${BODY:0:120}..."

      notify-send -u normal -t 10000 \
        "🤖 /oc comment on PR #$PR_NUMBER" \
        "@$AUTHOR: ${BODY:0:100}...\n\n$COMMENT_URL" 2>/dev/null || true

      PROMPT=$(build_prompt "$COMMENT_ID" "$AUTHOR" "$BODY" "$COMMENT_URL")

      echo "[pr-watch] Dispatching to opencode (model: $OPENCODE_MODEL)..."
      cd "$REPO_DIR"
      "$OPENCODE_BIN" run -m "$OPENCODE_MODEL" "$PROMPT" 2>&1 | tail -30
      echo "[pr-watch] opencode finished processing comment $COMMENT_ID"
    done
  fi

  # Set state to the latest comment ID so the loop only picks up truly new ones
  LATEST_ID=$(echo "$COMMENTS_JSON" | jq '[.[].id] | max // 0')
  echo "$LATEST_ID" > "$STATE_FILE"
  echo "[pr-watch] Initialized. Last comment ID: $LATEST_ID"
fi

LAST_SEEN=$(cat "$STATE_FILE")

while true; do
  # Check instantly on each iteration (not after a sleep first)
  # Refresh token in case it rotated
  TOKEN="$(get_token)"

  # Fetch all comments
  COMMENTS_JSON=$(api_get "$TOKEN" \
    "https://api.github.com/repos/$REPO/issues/$PR_NUMBER/comments?per_page=100")

  # Get new comments (ID > LAST_SEEN) that:
  #  - contain the "/oc" trigger
  #  - are NOT the agent's own responses (prefixed with 🤖)
  NEW_COMMENTS=$(echo "$COMMENTS_JSON" | jq -c --arg last "$LAST_SEEN" --arg trig "$TRIGGER" --arg sig "$AGENT_SIGNATURE" \
    'map(select(
       .id > ($last | tonumber)
       and (.body | test($trig))
       and (.body | startswith($sig) | not)
     ))
     | sort_by(.id)')

  COUNT=$(echo "$NEW_COMMENTS" | jq 'length')
  if [[ "$COUNT" -eq 0 ]]; then
    sleep "$INTERVAL"
    continue
  fi

  echo "[pr-watch] $COUNT new /oc comment(s) on PR #$PR_NUMBER"

  # Process each new comment
  while IFS= read -r comment; do
    [[ -z "$comment" ]] && continue

    COMMENT_ID=$(echo "$comment" | jq -r '.id')
    AUTHOR=$(echo "$comment" | jq -r '.user.login')
    BODY=$(echo "$comment" | jq -r '.body')
    COMMENT_URL=$(echo "$comment" | jq -r '.html_url')

    # Only process comments from org members
    if ! is_org_member "$TOKEN" "$AUTHOR"; then
      echo "[pr-watch] Skipping comment $COMMENT_ID from non-member @$AUTHOR"
      # Still update state so we don't re-check this comment
      LAST_SEEN="$COMMENT_ID"
      echo "$LAST_SEEN" > "$STATE_FILE"
      continue
    fi

    echo "[pr-watch] Processing comment $COMMENT_ID from @$AUTHOR"
    echo "[pr-watch] URL: $COMMENT_URL"
    echo "[pr-watch] Body: ${BODY:0:120}..."

    # Desktop notification that a new /oc comment was detected
    notify-send -u normal -t 10000 \
      "🤖 /oc comment on PR #$PR_NUMBER" \
      "@$AUTHOR: ${BODY:0:100}...\n\n$COMMENT_URL" 2>/dev/null || true

    # Build the prompt via the shared function
    PROMPT=$(build_prompt "$COMMENT_ID" "$AUTHOR" "$BODY" "$COMMENT_URL")

    # Launch opencode non-interactively with the comment
    echo "[pr-watch] Dispatching to opencode (model: $OPENCODE_MODEL)..."
    cd "$REPO_DIR"
    "$OPENCODE_BIN" run -m "$OPENCODE_MODEL" "$PROMPT" 2>&1 | tail -30
    echo "[pr-watch] opencode finished processing comment $COMMENT_ID"

    # Update state
    LAST_SEEN="$COMMENT_ID"
    echo "$LAST_SEEN" > "$STATE_FILE"
  done < <(echo "$NEW_COMMENTS" | jq -c '.[]')

  sleep "$INTERVAL"
done

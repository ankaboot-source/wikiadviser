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
#      Watches BOTH issue comments (/issues/{pr}/comments) and inline review
#      comments (/pulls/{pr}/comments).
#   3. When a comment contains "/oc", it launches `opencode run` with the
#      comment as context.
#   4. opencode processes the comment (with full repo access) and posts a
#      reply back to GitHub via the API.
#   5. After opencode finishes, sends a desktop notification when the AI has
#      actually posted its reply.
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
#   Tracks the last-seen comment ID per comment type in
#   .pr-watch-state-<PR_NUMBER>.txt (issue comments) and
#   .pr-watch-state-<PR_NUMBER>-review.txt (review comments)
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

# Fetch comments of a given type. type is "issue" or "review".
fetch_comments() {
  local type="$1" token="$2"
  if [[ "$type" == "review" ]]; then
    api_get "$token" "https://api.github.com/repos/$REPO/pulls/$PR_NUMBER/comments?per_page=100"
  else
    api_get "$token" "https://api.github.com/repos/$REPO/issues/$PR_NUMBER/comments?per_page=100"
  fi
}

# Build the prompt sent to opencode for a given /oc comment.
# Uses global: PR_NUMBER, REPO, REPO_DIR, AGENT_SIGNATURE, OPENCODE_MODEL
build_prompt() {
  local type="$1" comment_id="$2" author="$3" body="$4" comment_url="$5" context="${6:-}"
  local reply_endpoint reply_payload
  if [[ "$type" == "review" ]]; then
    reply_endpoint="https://api.github.com/repos/$REPO/pulls/$PR_NUMBER/comments"
    reply_payload="{\"body\": \"$AGENT_SIGNATURE <your reply>\", \"in_reply_to_id\": $comment_id}"
  else
    reply_endpoint="https://api.github.com/repos/$REPO/issues/$PR_NUMBER/comments"
    reply_payload="{\"body\": \"$AGENT_SIGNATURE <your reply>\"}"
  fi
  cat <<PROMPT_EOF
A comment was posted on PR #$PR_NUMBER by @$author.

Comment URL: $comment_url

Comment body:
---
$body
---
${context:+Review context: $context
}
You are running in the WikiAdviser repo at $REPO_DIR on branch $(git branch --show-current 2>/dev/null || echo 'unknown').

CONTEXT: Read pr-context.md if it exists — it contains prior decisions, file changes, and open questions from the interactive session that built this PR. Use it to answer accurately without re-discovering everything.

Review the comment, check the relevant code if needed, and post a reply comment back to GitHub PR #$PR_NUMBER.

To post a reply, get the GitHub token by running:
  printf 'protocol=https\nhost=github.com\n\n' | git credential fill 2>/dev/null | grep '^password=' | sed 's/password=//'

Then POST to:
  $reply_endpoint
with body: $reply_payload

IMPORTANT: Prefix your reply comment body with '$AGENT_SIGNATURE ' so the watcher knows it's from the agent and doesn't loop.

=== Screenshots — if the comment asks to share a screenshot ===

You are running locally, so use agent-browser (Chrome via CDP) — this is the working approach. Do NOT use scripts/screenshots.sh (that's for the cloud runner).

1. Make sure the dev server is running. If it isn't (or the live Supabase backend isn't up), start it with the mock backend so pages render real layouts with dummy data instead of the login redirect:
   cd frontend && USE_MOCK_BACKEND=true pnpm dev
   Use the URL it serves (e.g. http://localhost:8080, or whatever port you see in the log).
2. Capture the affected page at desktop and mobile widths, saving to `.opencode/screenshots/` inside the repo (already writable — no /tmp permission needed). IMPORTANT: ALWAYS pass an explicit path to `agent-browser screenshot` (e.g. `.opencode/screenshots/<name>-desktop.png`). If you run `agent-browser screenshot` with NO path, it saves to `~/.agent-browser/tmp/screenshots/`, which you cannot read back (external-directory permission). So always give the full path:
   agent-browser --args "--no-sandbox" open "<url>"
   agent-browser set viewport 1280 800
   agent-browser wait --load networkidle
   agent-browser screenshot .opencode/screenshots/<name>-desktop.png
   agent-browser set viewport 390 844
   agent-browser wait --load networkidle
   agent-browser screenshot .opencode/screenshots/<name>-mobile.png
   agent-browser close
   (Use --args "--no-sandbox" if Chrome fails with a sandbox error.)
3. To share in the reply comment, commit the screenshots to the PR branch and reference them via a SHA-based raw URL (this is the ONLY reliable way to show an image in a GitHub comment — gist needs `gist` scope and the uploads endpoint rejects tokens):
   - git add .opencode/screenshots/<name>-*.png
   - git commit -m "chore: add UI screenshot for review"
   - git push
   - SHA=\$(git rev-parse HEAD)
   - Post the reply comment with the image links:
     ![desktop](https://raw.githubusercontent.com/$REPO/\$SHA/.opencode/screenshots/<name>-desktop.png)
     ![mobile](https://raw.githubusercontent.com/$REPO/\$SHA/.opencode/screenshots/<name>-mobile.png)
4. AFTER posting, delete the screenshot files and commit the deletion (the SHA-based raw URL still works from git history, so the image keeps rendering):
   - git rm .opencode/screenshots/<name>-*.png
   - git commit -m "chore: remove UI screenshot"
   - git push

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

# Notify when the AI has actually posted a reply after a processed comment.
notify_answered() {
  local type="$1" token="$2" comment_id="$3"
  local comments reply
  comments=$(fetch_comments "$type" "$token")
  reply=$(echo "$comments" | jq -r --arg id "$comment_id" --arg sig "$AGENT_SIGNATURE" \
    'map(select(.id > ($id|tonumber) and (.body | startswith($sig)))) | .[-1].body // empty')
  if [[ -n "$reply" ]]; then
    notify-send -u normal -t 10000 \
      "🤖 AI answered on PR #$PR_NUMBER" \
      "${reply:0:100}..." 2>/dev/null || true
  fi
}

# Run opencode, showing only the last 2 lines of output live so the user can
# see what the agent is doing without flooding the terminal. Falls back to a
# plain tail when stdout is not a TTY.
run_opencode() {
  local prompt="$1"
  if [[ -t 1 ]]; then
    local -a buf=()
    local line
    "$OPENCODE_BIN" run -m "$OPENCODE_MODEL" "$prompt" 2>&1 | while IFS= read -r line; do
      line="${line:0:200}"
      buf+=("$line")
      if (( ${#buf[@]} > 2 )); then
        buf=("${buf[@]: -2}")
      fi
      printf '\033[2K\r%s\n' "${buf[@]}"
      printf '\033[%dA' "${#buf[@]}"
    done
    printf '\033[2K\r'
  else
    "$OPENCODE_BIN" run -m "$OPENCODE_MODEL" "$prompt" 2>&1 | tail -30
  fi
}

# Process a batch of new /oc comments of a given type.
process_comments() {
  local type="$1" token="$2" comments_json="$3"
  local count
  count=$(echo "$comments_json" | jq 'length')
  if [[ "$count" -eq 0 ]]; then
    return 0
  fi
  echo "[pr-watch] $count new /oc $type comment(s) on PR #$PR_NUMBER"

  while IFS= read -r comment; do
    [[ -z "$comment" ]] && continue

    local COMMENT_ID AUTHOR BODY COMMENT_URL CONTEXT
    COMMENT_ID=$(echo "$comment" | jq -r '.id')
    AUTHOR=$(echo "$comment" | jq -r '.user.login')
    BODY=$(echo "$comment" | jq -r '.body')
    COMMENT_URL=$(echo "$comment" | jq -r '.html_url')
    if [[ "$type" == "review" ]]; then
      CONTEXT="File: $(echo "$comment" | jq -r '.path // ""'), Line: $(echo "$comment" | jq -r '.line // ""')"
    else
      CONTEXT=""
    fi

    # Only process comments from org members
    if ! is_org_member "$token" "$AUTHOR"; then
      echo "[pr-watch] Skipping $type comment $COMMENT_ID from non-member @$AUTHOR"
      continue
    fi

    echo "[pr-watch] Processing $type comment $COMMENT_ID from @$AUTHOR"
    echo "[pr-watch] URL: $COMMENT_URL"
    echo "[pr-watch] Body: ${BODY:0:120}..."

    # Desktop notification that a new /oc comment was detected
    notify-send -u normal -t 10000 \
      "🤖 /oc comment on PR #$PR_NUMBER" \
      "@$AUTHOR: ${BODY:0:100}...\n\n$COMMENT_URL" 2>/dev/null || true

    # Build the prompt via the shared function
    PROMPT=$(build_prompt "$type" "$COMMENT_ID" "$AUTHOR" "$BODY" "$COMMENT_URL" "$CONTEXT")

    # Launch opencode non-interactively with the comment
    echo "[pr-watch] Dispatching to opencode (model: $OPENCODE_MODEL)..."
    cd "$REPO_DIR"
    run_opencode "$PROMPT"
    echo "[pr-watch] opencode finished processing $type comment $COMMENT_ID"

    # Notify when the AI has actually answered
    notify_answered "$type" "$token" "$COMMENT_ID"
  done < <(echo "$comments_json" | jq -c '.[]')
}

# On startup: check for unanswered /oc comments (comments with /oc that have
# no subsequent 🤖 reply). Process them immediately, then set state.
startup_backlog() {
  local type="$1" token="$2" state_file="$3"
  if [[ -f "$state_file" ]]; then
    return 0
  fi
  local comments
  comments=$(fetch_comments "$type" "$token")

  # Find the last 🤖 reply ID — anything after it is potentially unanswered
  local last_bot_reply
  last_bot_reply=$(echo "$comments" | jq -r --arg sig "$AGENT_SIGNATURE" \
    'map(select(.body | startswith($sig))) | .[-1].id // 0')

  # Find /oc comments after the last bot reply
  local unanswered
  unanswered=$(echo "$comments" | jq -c --arg last_bot "$last_bot_reply" --arg trig "$TRIGGER" --arg sig "$AGENT_SIGNATURE" \
    'map(select(
       .id > ($last_bot | tonumber)
       and (.body | test($trig))
       and (.body | startswith($sig) | not)
     ))
     | sort_by(.id)')

  local count
  count=$(echo "$unanswered" | jq 'length')

  if [[ "$count" -gt 0 ]]; then
    echo "[pr-watch] Found $count unanswered /oc $type comment(s) from before startup"
    process_comments "$type" "$token" "$unanswered"
  fi

  # Set state to the latest comment ID so the loop only picks up truly new ones
  local latest
  latest=$(echo "$comments" | jq '[.[].id] | max // 0')
  echo "$latest" > "$state_file"
  echo "[pr-watch] Initialized $type state. Last comment ID: $latest"
}

# Poll one comment type for new /oc comments and process them.
check_type() {
  local type="$1" token="$2" state_file="$3"
  local last_seen
  last_seen=$(cat "$state_file" 2>/dev/null || echo "0")

  local comments
  comments=$(fetch_comments "$type" "$token")

  # Get new comments (ID > LAST_SEEN) that:
  #  - contain the "/oc" trigger
  #  - are NOT the agent's own responses (prefixed with 🤖)
  local new_comments
  new_comments=$(echo "$comments" | jq -c --arg last "$last_seen" --arg trig "$TRIGGER" --arg sig "$AGENT_SIGNATURE" \
    'map(select(
       .id > ($last | tonumber)
       and (.body | test($trig))
       and (.body | startswith($sig) | not)
     ))
     | sort_by(.id)')

  process_comments "$type" "$token" "$new_comments"

  # Advance state to the latest comment ID
  local latest
  latest=$(echo "$comments" | jq '[.[].id] | max // 0')
  echo "$latest" > "$state_file"
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

STATE_FILE_ISSUE="$REPO_DIR/.pr-watch-state-${PR_NUMBER}.txt"
STATE_FILE_REVIEW="$REPO_DIR/.pr-watch-state-${PR_NUMBER}-review.txt"

echo "[pr-watch] Watching PR #$PR_NUMBER on $REPO every ${INTERVAL}s"
echo "[pr-watch] Trigger: comments containing '$TRIGGER'"
echo "[pr-watch] Model: $OPENCODE_MODEL"
echo "[pr-watch] State files: $STATE_FILE_ISSUE, $STATE_FILE_REVIEW"

# --- main loop ---

TOKEN="$(get_token)"

# On startup: process any unanswered /oc comments from before startup
startup_backlog "issue" "$TOKEN" "$STATE_FILE_ISSUE"
startup_backlog "review" "$TOKEN" "$STATE_FILE_REVIEW"

while true; do
  # Check instantly on each iteration (not after a sleep first)
  # Refresh token in case it rotated
  TOKEN="$(get_token)"

  check_type "issue" "$TOKEN" "$STATE_FILE_ISSUE"
  check_type "review" "$TOKEN" "$STATE_FILE_REVIEW"

  sleep "$INTERVAL"
done

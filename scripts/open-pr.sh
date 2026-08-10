#!/usr/bin/env bash
#
# scripts/open-pr.sh — the ONLY supported way for the AI agent to open a pull
# request. Guarantees every AI-created PR carries the `generated` label so the
# human-approval-gate check applies deterministically (the label is what the
# gate keys on). Never call `gh pr create` directly for AI work.
#
# Usage:
#   scripts/open-pr.sh --title "..." --body-file path [--base main] [--head <branch>]
#
set -euo pipefail

title="" body_file="" base="main" head=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --title) title="$2"; shift 2 ;;
    --body-file) body_file="$2"; shift 2 ;;
    --base) base="$2"; shift 2 ;;
    --head) head="$2"; shift 2 ;;
    *) echo "unknown arg: $1" >&2; exit 1 ;;
  esac
done

[[ -n "$title" && -n "$body_file" ]] || {
  echo "usage: scripts/open-pr.sh --title '...' --body-file path [--base main] [--head <branch>]" >&2
  exit 1
}
[[ -f "$body_file" ]] || { echo "body file not found: $body_file" >&2; exit 1; }

head="${head:-$(git branch --show-current)}"

# Append an approval-reminder footer so reviewers know how to approve.
approval_footer='
---
<!-- generated-pr -->

> 🤖 This PR was created by the AI agent (labeled `generated`; the `human-approval-gate` applies and the AI cannot approve or merge it).
> **To approve & merge:** review the changes, then comment exactly **`/approve`** (must be an org member / repo admin — this adds `human-approved` and the gate passes) — then merge.

'

{ cat "$body_file"; printf '%s' "$approval_footer"; } > "${body_file}.with-footer"

url=$(gh pr create --base "$base" --head "$head" --title "$title" --body-file "${body_file}.with-footer")
rm -f "${body_file}.with-footer"
echo "opened: $url"
# Deterministic: always label AI-created PRs `generated`.
pr_num=$(basename "$url")
gh pr edit "$pr_num" --add-label "generated"
echo "labeled generated: $pr_num"

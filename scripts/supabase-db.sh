#!/usr/bin/env bash
#
# Safe wrapper for local Supabase DB operations.
#
# Blocks DESTRUCTIVE commands (reset, drop) unless --confirm-destructive is
# passed, to prevent accidentally wiping the local database. For applying new
# migrations NON-destructively, use: supabase migration up
#
# Usage:
#   scripts/supabase-db.sh migration up          # safe: applies pending migrations
#   scripts/supabase-db.sh reset --confirm-destructive   # only with explicit confirmation
#
set -euo pipefail

DESTRUCTIVE=("reset" "drop")
CONFIRM_FLAG="--confirm-destructive"

cmd="${1:-}"

if [[ " ${DESTRUCTIVE[*]} " =~ " $cmd " ]]; then
  if [[ "$*" != *"$CONFIRM_FLAG"* ]]; then
    echo "ERROR: 'supabase db $cmd' is DESTRUCTIVE — it drops/recreates the local database and wipes data." >&2
    echo "Refusing to run without '$CONFIRM_FLAG'." >&2
    echo "To apply new migrations NON-destructively, use: supabase migration up" >&2
    exit 1
  fi
  echo "WARNING: running destructive 'supabase db $cmd' with explicit confirmation." >&2
fi

exec supabase db "$@"

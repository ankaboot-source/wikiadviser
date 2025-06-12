#!/bin/bash

ENV_DIR=("./" "./frontend/" "./supabase/functions/")
ENV_PATH=("./.env" "./frontend/.env")

# Verify log file is passed as an argument
if [ -z "$1" ]; then
  echo "❌ Use : $0 supabase.log"
  exit 1
fi

# Must run within wikiadviser/mediawiki-setup check
if [[ "$(basename "$PWD")" != "wikiadviser" ]]; then
  echo "❌ Error: Please navigate to ./wikiadviser before running the script."
  exit 1
fi

LOGFILE="$1"

# Copy .env.example to .env
for dir in "${ENV_DIR[@]}"; do
  cp $dir/.env.* $dir/.env
done

# Extract Supabase variables from log file
SUPABASE_PROJECT_URL=$(awk '/API URL:/ { print $NF }' "$LOGFILE")
SUPABASE_SECRET_PROJECT_TOKEN=$(awk '/service_role key:/ { print $NF }' "$LOGFILE")

# Replace Supabase variables within .env files
for env in "${ENV_PATH[@]}"; do
  sed -i "s|^SUPABASE_PROJECT_URL=.*|SUPABASE_PROJECT_URL=$SUPABASE_PROJECT_URL|" $env
  sed -i "s|^SUPABASE_SECRET_PROJECT_TOKEN=.*|SUPABASE_SECRET_PROJECT_TOKEN=$SUPABASE_SECRET_PROJECT_TOKEN|" $env
done

echo "✅ ./.env, ./frontend/.env, ./supabase/functions/.env successfully generated from $LOGFILE"

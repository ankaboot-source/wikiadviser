#!/bin/bash

ENV_DIR=("./" "./frontend/" "./supabase/functions/")
ENV_PATH=("./.env" "./frontend/.env")
SUPABASE_ENV_PATH="./supabase/functions/.env"
MW_CREDENTIALS_FILE="./mediawiki-docker/MW_CREDENTIALS.txt"
CONTAINER_NAME="mediawiki"

export LANG=C
# Verify log file is passed as an argument
if [ -z "$1" ]; then
  echo "❌ Use : $0 supabase.log"
  exit 1
fi

# Must run within ./wikiadviser/ check
if [[ "$(basename "$PWD")" != "wikiadviser" ]]; then
  echo "❌ Error: Please navigate to ./wikiadviser before running the script."
  exit 1
fi

# Function to check container health
wait_for_container_healthy() {
    echo "⌛ Waiting for container '$CONTAINER_NAME' to become healthy..."
    while true; do
        # Get container health status
        health_status=$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null)
        if [ "$health_status" = "healthy" ]; then
            echo "✅ Container is healthy"
            return 0
        fi
     done
}

# Wait for container to be healthy
if ! wait_for_container_healthy; then
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

# Extract MW bot password
MW_BOT_USERNAME=$(awk '/\[en\] Mediawiki BotPassword user:/ { print $NF }' "$MW_CREDENTIALS_FILE")
MW_BOT_PASSWORD=$(awk '/\[en\] Mediawiki BotPassword password:/ { print $NF }' "$MW_CREDENTIALS_FILE")

# Replace Supabase variables within .env files
for env in "${ENV_PATH[@]}"; do
  sed -i "s|^SUPABASE_PROJECT_URL=.*|SUPABASE_PROJECT_URL=$SUPABASE_PROJECT_URL|" $env
  sed -i "s|^SUPABASE_SECRET_PROJECT_TOKEN=.*|SUPABASE_SECRET_PROJECT_TOKEN=$SUPABASE_SECRET_PROJECT_TOKEN|" $env
done

# Update MW bot password variables
sed -i "s|^MW_BOT_USERNAME=.*|MW_BOT_USERNAME=$MW_BOT_USERNAME|" $SUPABASE_ENV_PATH
sed -i "s|^MW_BOT_PASSWORD=.*|MW_BOT_PASSWORD=$MW_BOT_PASSWORD|" $SUPABASE_ENV_PATH

echo "✅ ./.env, ./frontend/.env, ./supabase/functions/.env successfully generated from $LOGFILE"

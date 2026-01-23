#!/bin/bash

ENV_PATH=("./docker/.env" "./frontend/.env")
SUPABASE_ENV_PATH="./supabase/functions/.env"
MW_CREDENTIALS_FILE="./docker/MW_CREDENTIALS.txt"
CONTAINER_NAME="mediawiki"

export LANG=C

if [[ "$1" == "--bot-creds" ]]; then
  # Function to check container health
  wait_for_container_healthy() {
      echo "⌛ Waiting for '$CONTAINER_NAME' service to initialize, Hang Tight!..."
      while true; do
          # Get container health status
          health_status=$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null)
          if [ "$health_status" = "healthy" ]; then
              echo "✅ Initialized '$CONTAINER_NAME'."
              return 0
          fi
          sleep 2
       done
  }

  # Wait for container to be healthy
  if ! wait_for_container_healthy; then
      exit 1
  fi

  cp ./supabase/functions/.env.example ./supabase/functions/.env

  # Extract MW bot password
  MW_BOT_USERNAME=$(awk '/\[en\] Mediawiki BotPassword user:/ { print $NF }' "$MW_CREDENTIALS_FILE")
  MW_BOT_PASSWORD=$(awk '/\[en\] Mediawiki BotPassword password:/ { print $NF }' "$MW_CREDENTIALS_FILE")

  # Update MW bot password variables
  sed -i "s|^MW_BOT_USERNAME=.*|MW_BOT_USERNAME=$MW_BOT_USERNAME|" $SUPABASE_ENV_PATH
  sed -i "s|^MW_BOT_PASSWORD=.*|MW_BOT_PASSWORD=$MW_BOT_PASSWORD|" $SUPABASE_ENV_PATH

  echo "✅ ./supabase/functions/.env successfully generated"

fi

if [[ "$1" == "--supabase-creds" ]]; then

  # Verify log file is passed as an argument
  if [ -z "$2" ]; then
    echo "❌ Use : $0 supabase.log"
    exit 1
  fi

  LOGFILE="$2"

  cp ./docker/.env.example ./docker/.env
  cp ./frontend/.env.example ./frontend/.env

  # Extract Supabase variables from log file
  SUPABASE_PROJECT_URL=$(awk '/API URL:/ { print $NF }' "$LOGFILE")
  SUPABASE_SECRET_PROJECT_TOKEN=$(awk '/service_role key:/ { print $NF }' "$LOGFILE")
  SUPABASE_ANON_KEY=$(awk '/anon key:/ { print $NF }' "$LOGFILE")


  # Replace Supabase variables within .env files
  for env in "${ENV_PATH[@]}"; do
    sed -i "s|^SUPABASE_PROJECT_URL=.*|SUPABASE_PROJECT_URL=$SUPABASE_PROJECT_URL|" $env
    sed -i "s|^SUPABASE_SECRET_PROJECT_TOKEN=.*|SUPABASE_SECRET_PROJECT_TOKEN=$SUPABASE_SECRET_PROJECT_TOKEN|" $env
    sed -i "s|^SUPABASE_ANON_KEY=.*|SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY|" $env
  done

  echo "✅ ./docker/.env, ./frontend/.env successfully generated from $LOGFILE"

fi

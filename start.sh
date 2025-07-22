#!/bin/bash

set -e

PORTS=("8080" "9000")

# Cleanup function
cleanup() {
  echo ""
  echo "Cleaning up services..."
  echo "Stopping Wikiadviser & Mediawiki..."
  pushd docker && docker compose down && popd
  echo "Stopping Supabase..."
  npx supabase stop
  echo "All services stopped."
  exit 0
}

# Trap signals
trap cleanup SIGINT SIGTERM EXIT

# Check for ports availability
for port in "${PORTS[@]}"; do
  if (ss -tuln; netstat -tuln 2>/dev/null) | grep -q ":$port "; then
      echo "ERROR: Port $port is already in use. Free it before proceeding."
      exit 1
  else
      echo "Port $port is free."
  fi
done

# Check if package-lock.json exists
if [ -f "package-lock.json" ]; then
  echo "package-lock.json found, skipping 'npm install'"
else
  echo "package-lock.json not found, running 'npm install'"
  npm i # To install Supabase dependencies
fi

echo "Stopping local Supabase..."
echo ""
npx supabase stop
echo ""
echo "Starting local Supabase..."
echo ""
npx supabase start > supabase.log
echo "Updating .env files..."
echo ""
bash ./generate-env.sh --supabase-creds supabase.log
echo ""
echo "Starting Mediawiki & Wikiadviser..."
echo ""
pushd docker && docker compose up -d && popd
echo ""
echo "Updating .env files..."
echo ""
bash ./generate-env.sh --bot-creds
echo ""

echo "✅ All services started successfully"
echo ""
echo "┌────────────────────────────────────────────────────┐"
echo "│                 SERVICES ENDPOINTS                 │"
echo "├────────────────────────────────────────────────────┤"
echo "│                                                    │"
echo "│  WikiAdviser:                                      │"
echo "│  http://localhost:9000                             │"
echo "│                                                    │"
echo "│  MediaWiki:                                        │"
echo "│  http://localhost:8080/wiki/en/index.php/          │"
echo "│                                                    │"
echo "│  Supabase Studio:                                  │"
echo "│  http://localhost:54323/project/default/auth/users │"
echo "│  (Create auth user here to login to Wikiadviser)   │"
echo "│                                                    │"
echo "└────────────────────────────────────────────────────┘"
echo ""
echo "┌────────────────────────────────────────────────────┐"
echo "│                      WARNING                       │"
echo "├────────────────────────────────────────────────────┤"
echo "│  Edge functions run in foreground.                 │"
echo "│                                                    │"
echo "│  ▸ Keep this terminal window open at all times     │"
echo "│    while using Wikiadviser app                     │"
echo "│  ▸ Closing it will terminate all the running       │"
echo "│    services                                        │"
echo "└────────────────────────────────────────────────────┘"
echo ""
echo "Running Supabase Edge Functions in the foreground..."
npx supabase functions serve

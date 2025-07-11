#!/bin/bash

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
echo "Starting Supabasse Edge Functions..."
npx supabase functions serve



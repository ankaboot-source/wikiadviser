#!/bin/bash

# Check if package-lock.json exists
if [ -f "package-lock.json" ]; then
  echo "package-lock.json found, skipping 'npm install'"
else
  echo "package-lock.json not found, running 'npm install'"
  npm i # To install Supabase dependencies
fi

npx supabase start > supabase.log
./generate-env.sh --supabase-creds supabase.log
pushd docker && docker compose up -d && popd
./generate-env.sh --bot-creds
npx supabase functions serve



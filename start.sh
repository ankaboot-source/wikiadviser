#!/bin/bash

npm i # To install Supabase dependencies
npx supabase start > supabase.log
./generate-env.sh --supabase-creds supabase.log
pushd docker && docker compose up -d && popd
./generate-env.sh --bot-creds
npx supabase functions serve

echo "✅ All services are up and Supabase functions are now being served."

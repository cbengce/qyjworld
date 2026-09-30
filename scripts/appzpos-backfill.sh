#!/usr/bin/env bash
set -euo pipefail

task_import_dir="$HOME/appzpos-ubuntu-import-20260929-checked"
task_node="$HOME/.local/node-v22.23.3-linux-x64/bin/node"
if [[ ! -x "$task_node" || ! -f "$task_import_dir/lib/pos/appzpos/client.ts" ]]; then
  printf 'The checked importer folder or Node installation is missing.\n' >&2
  exit 1
fi
cd "$task_import_dir"
curl -fL --retry 2 'https://raw.githubusercontent.com/cbengce/qyjworld/702eab9f95c0b7dd028e3118fc7e496aae3f30f6/scripts/appzpos-backfill.cjs' -o scripts/appzpos-backfill.cjs
printf '\nImporting MacPherson Mall orders from 27 September 2026 to now.\nCredentials are used only for this run. Secret input stays hidden.\n\n'
trap 'unset QYJ_CLIENT_ID QYJ_CLIENT_SECRET APPZPOS_STORES_JSON SUPABASE_SERVICE_ROLE_KEY' EXIT
read -r -s -p 'APPZPOS client ID: ' QYJ_CLIENT_ID
printf '\n'
read -r -s -p 'APPZPOS client secret: ' QYJ_CLIENT_SECRET
printf '\n'
read -r -p 'Supabase project URL: ' SUPABASE_URL
read -r -s -p 'Supabase service_role key: ' SUPABASE_SERVICE_ROLE_KEY
printf '\n'
export QYJ_CLIENT_ID QYJ_CLIENT_SECRET SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY
APPZPOS_STORES_JSON="$("$task_node" -e 'process.stdout.write(JSON.stringify([{storeID:"8C002BBD-4352-49D8-969E-7B649C1849A6",clientID:process.env.QYJ_CLIENT_ID,clientSecret:process.env.QYJ_CLIENT_SECRET}]))')"
export APPZPOS_STORES_JSON
unset QYJ_CLIENT_ID QYJ_CLIENT_SECRET
"$task_node" scripts/appzpos-backfill.cjs --from 2026-09-27 --commit
printf '\nBACKFILL_EXIT_CODE=0\n'

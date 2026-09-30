#!/usr/bin/env bash
set -euo pipefail
[[ "$HOME" =~ ^/[A-Za-z0-9_./-]+$ ]] || { printf 'Unsupported home path.\n' >&2; exit 1; }
task_import_dir="$HOME/appzpos-ubuntu-import-20260929-checked"
task_node="$HOME/.local/node-v22.23.3-linux-x64/bin/node"
task_private_dir="$HOME/.config/qyj-appzpos"
task_config="$task_private_dir/config.json"
command -v crontab >/dev/null || { printf 'Install cron once with: sudo apt-get install cron\n' >&2; exit 1; }
command -v flock >/dev/null || { printf 'flock is required.\n' >&2; exit 1; }
if command -v systemctl >/dev/null && ! systemctl is-active --quiet cron; then
  printf 'Start cron once with: sudo systemctl enable --now cron\nThen rerun this installer.\n' >&2
  exit 1
fi
[[ -x "$task_node" && -f "$task_import_dir/lib/pos/appzpos/client.ts" ]] || { printf 'Checked importer or Node installation missing.\n' >&2; exit 1; }
umask 077
mkdir -p "$task_private_dir"
chmod 700 "$task_private_dir"
cd "$task_import_dir"
curl -fL --retry 2 'https://raw.githubusercontent.com/cbengce/qyjworld/aefbde2c891e05c2028ca0436ade811a64b05d32/scripts/appzpos-sync.cjs' -o "$task_private_dir/appzpos-sync.cjs.next"
mv "$task_private_dir/appzpos-sync.cjs.next" scripts/appzpos-sync.cjs
if [[ ! -f "$task_config" || "${1:-}" == '--reconfigure' ]]; then
  printf '\nOne-time automatic sync setup. Secret input stays hidden.\n'
  read -r -s -p 'APPZPOS client ID: ' QYJ_CLIENT_ID
  printf '\n'
  read -r -s -p 'APPZPOS client secret: ' QYJ_CLIENT_SECRET
  printf '\n'
  read -r -p 'Supabase project URL: ' SUPABASE_URL
  read -r -s -p 'Supabase service_role key: ' SUPABASE_SERVICE_ROLE_KEY
  printf '\n'
  export QYJ_CLIENT_ID QYJ_CLIENT_SECRET SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY
  "$task_node" -e 'const fs=require("node:fs"); const p=process.argv[1]; fs.writeFileSync(p+".next",JSON.stringify({SUPABASE_URL:process.env.SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY:process.env.SUPABASE_SERVICE_ROLE_KEY,APPZPOS_STORES_JSON:JSON.stringify([{storeID:"8C002BBD-4352-49D8-969E-7B649C1849A6",clientID:process.env.QYJ_CLIENT_ID,clientSecret:process.env.QYJ_CLIENT_SECRET}])}),{mode:0o600}); fs.renameSync(p+".next",p);' "$task_config"
  unset QYJ_CLIENT_ID QYJ_CLIENT_SECRET SUPABASE_SERVICE_ROLE_KEY
  rm -f "$task_private_dir/initial-sync.complete"
fi
chmod 600 "$task_config"
task_cron_tmp="$(mktemp)"
task_cron_err="$(mktemp)"
trap 'rm -f "$task_cron_tmp" "$task_cron_err"' EXIT
if ! crontab -l > "$task_cron_tmp" 2> "$task_cron_err"; then
  task_cron_error="$(cat "$task_cron_err")"
  [[ "$task_cron_error" == *'no crontab'* ]] || { printf 'Unable to read existing crontab. No schedule changed.\n' >&2; exit 1; }
fi
# Remove this application's existing entry while preserving all other scheduled jobs.
awk '!/#[[:space:]]qyj-appzpos-sync[[:space:]]*$/' "$task_cron_tmp" > "$task_private_dir/crontab.previous"
cat > "$task_private_dir/run-sync.sh" <<'RUNNER'
#!/usr/bin/env bash
set -uo pipefail
task_private_dir="$HOME/.config/qyj-appzpos"
cd "$HOME/appzpos-ubuntu-import-20260929-checked" || exit 1
exec 9> "$task_private_dir/sync.lock"
flock -n 9 || exit 0
"$HOME/.local/node-v22.23.3-linux-x64/bin/node" scripts/appzpos-sync.cjs --config "$task_private_dir/config.json" --commit >> "$task_private_dir/sync.log" 2>&1
task_result=$?
tail -n 1000 "$task_private_dir/sync.log" > "$task_private_dir/sync.log.next" && mv "$task_private_dir/sync.log.next" "$task_private_dir/sync.log"
exit "$task_result"
RUNNER
chmod 700 "$task_private_dir/run-sync.sh"
# Historical catch-up must succeed before automatic scheduling is enabled.
if [[ -f "$task_private_dir/initial-sync.complete" ]]; then
  flock "$task_private_dir/sync.lock" "$task_node" scripts/appzpos-sync.cjs --config "$task_config" --commit | tee -a "$task_private_dir/sync.log"
else
  flock "$task_private_dir/sync.lock" "$task_node" scripts/appzpos-sync.cjs --config "$task_config" --from 2026-09-27 --commit | tee -a "$task_private_dir/sync.log"
  touch "$task_private_dir/initial-sync.complete"
fi
cp "$task_private_dir/crontab.previous" "$task_cron_tmp"
printf '*/15 * * * * /bin/bash %s/run-sync.sh # qyj-appzpos-sync\n' "$task_private_dir" >> "$task_cron_tmp"
crontab "$task_cron_tmp"
printf '\nAUTO_SYNC_INSTALLED=1\nUbuntu will sync every 15 minutes, including after logout or reboot.\nStatus: tail -n 10 %s/sync.log\n' "$task_private_dir"

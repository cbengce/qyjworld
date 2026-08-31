const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const root = process.cwd();
const migration = readFileSync(join(root, "supabase", "migrations", "0022_corporate_partner_referrals.sql"), "utf8");
const combinedRateMigration = readFileSync(join(root, "supabase", "migrations", "0025_partner_combined_commercial_cap.sql"), "utf8");
const archiveMigration = readFileSync(join(root, "supabase", "migrations", "0028_partner_archive_lifecycle.sql"), "utf8");
const paidOnlyRpcMigration = readFileSync(join(root, "supabase", "migrations", "0029_partner_paid_only_pos_rpc.sql"), "utf8");
const adapter = readFileSync(join(root, "lib", "pos", "adapter.ts"), "utf8");
const webhook = readFileSync(join(root, "app", "api", "webhooks", "pos", "route.ts"), "utf8");
const dashboard = readFileSync(join(root, "app", "[locale]", "partner", "dashboard", "page.tsx"), "utf8");
const adminPage = readFileSync(join(root, "app", "[locale]", "admin", "partners", "page.tsx"), "utf8");
const adminActions = readFileSync(join(root, "app", "[locale]", "admin", "partners", "actions.ts"), "utf8");
const partnerRouter = readFileSync(join(root, "app", "api", "partner", "route", "route.ts"), "utf8");
const referralUrl = readFileSync(join(root, "lib", "partners", "referral-url.ts"), "utf8");
const sqlTest = readFileSync(join(root, "supabase", "tests", "corporate_partner_referrals.sql"), "utf8");

for (const table of [
  "partners",
  "partner_users",
  "partner_referral_sessions",
  "webhook_events",
  "pos_transactions",
  "partner_commission_ledger"
]) {
  assert.match(migration, new RegExp(`create table public\\.${table}`), `${table} must exist`);
}

assert.doesNotMatch(migration, /create table public\.partner_payouts/i, "payouts must stay outside the Partner MVP");
assert.doesNotMatch(migration, /refund|partial_refund|commission_reversal|refunded_amount/i, "refund accounting must stay outside the Partner MVP");
assert.match(migration, /v_event_type <> 'payment_succeeded'/i, "only confirmed paid events may be processed");
assert.match(migration, /v_gross \* v_rate/i, "commission must use gross amount and the configured partner rate");
assert.match(migration, /v_rate := v_partner\.partner_reward_rate/i, "commission must use the current partner rate");
assert.match(migration, /partner_commission_one_per_transaction/i, "one transaction must create one commission");
assert.match(migration, /webhook_events_provider_hash_unique/i, "payload hashes must be idempotent");
assert.match(migration, /payment_status = 'paid'/i, "normalized transactions must remain paid-only");
assert.match(migration, /paid_at timestamptz not null/i, "confirmed payments must retain their occurrence time");
assert.match(migration, /set search_path = ''/i, "security-definer functions must fix search_path");
assert.match(migration, /revoke all on function public\.process_partner_pos_event\(jsonb\) from public, anon, authenticated/i, "browser roles must not process payment events");
assert.match(migration, /partner_read_own_transactions[\s\S]*auth\.uid\(\)/i, "partner transaction reads must be scoped by RLS");
assert.match(migration, /partner_read_own_commissions[\s\S]*auth\.uid\(\)/i, "partner commission reads must be scoped by RLS");

assert.match(combinedRateMigration, /partners_combined_commercial_rate_check/i, "combined commercial cap must remain enforced");
assert.match(combinedRateMigration, /customer_discount_rate \+ partner_reward_rate <= 0\.30/i, "combined rate must not exceed 30 percent");
assert.match(combinedRateMigration, /p_customer_discount_rate \+ p_partner_reward_rate > 0\.30/i, "rate RPC must reject a combined rate above 30 percent");
assert.match(combinedRateMigration, /staff_has_permission\('settings\.manage'/i, "rate changes must preserve permission enforcement");

assert.match(archiveMigration, /add column archived_at timestamptz/i, "partner archive timestamp must be additive");
assert.match(archiveMigration, /add column archived_by uuid references auth\.users\(id\) on delete restrict/i, "partner archive actor must reference the existing auth user");
assert.match(archiveMigration, /partners_archive_state_check[\s\S]*status = 'inactive'/i, "archived partners must remain inactive");
for (const rpc of ["archive_partner", "restore_partner"]) {
  assert.match(archiveMigration, new RegExp(`create or replace function public\\.${rpc}\\(p_partner_id uuid\\)[\\s\\S]*security definer[\\s\\S]*set search_path = ''`, "i"), `${rpc} must preserve the secured database boundary`);
  assert.match(archiveMigration, new RegExp(`revoke all on function public\\.${rpc}\\(uuid\\) from public, anon`, "i"), `${rpc} must not be public or anonymous`);
  assert.match(archiveMigration, new RegExp(`grant execute on function public\\.${rpc}\\(uuid\\) to authenticated`, "i"), `${rpc} must use the authenticated Admin flow`);
}
assert.match(archiveMigration, /staff_has_permission\('settings\.manage'/i, "archive lifecycle changes must require settings.manage");
assert.match(archiveMigration, /set status = 'inactive',[\s\S]*archived_at = now\(\),[\s\S]*archived_by = auth\.uid\(\)/i, "archive must set the inactive lifecycle state and actor");
assert.match(archiveMigration, /set status = 'inactive',[\s\S]*archived_at = null,[\s\S]*archived_by = null/i, "restore must return the partner to inactive");
assert.match(archiveMigration, /'partner\.archive'/i, "archive must be audited");
assert.match(archiveMigration, /'partner\.restore'/i, "restore must be audited");
assert.doesNotMatch(archiveMigration, /delete\s+from\s+public\.(partners|partner_users|partner_referral_sessions|pos_transactions|partner_commission_ledger)/i, "archive lifecycle must preserve all Partner history");
assert.doesNotMatch(archiveMigration, /set\s+partner_code\s*=/i, "archive lifecycle must preserve immutable Partner Codes");

assert.match(paidOnlyRpcMigration, /create or replace function public\.process_partner_pos_event\(p_event jsonb\)/i, "0029 must restore the canonical POS RPC");
assert.match(paidOnlyRpcMigration, /security definer[\s\S]*set search_path = ''/i, "0029 must preserve the secured function boundary");
assert.match(paidOnlyRpcMigration, /v_event_type <> 'payment_succeeded'/i, "0029 must ignore non-paid events");
assert.match(paidOnlyRpcMigration, /v_gross \* v_rate/i, "0029 commission must remain gross-based");
assert.doesNotMatch(paidOnlyRpcMigration, /partial_refund|refundedAmount|commission_reversal|partner_payouts|refunded_amount/i, "0029 must remove refund-era behavior");

assert.match(adapter, /UnconfiguredPosAdapter/, "production POS integration must fail closed when unconfigured");
assert.match(adapter, /NODE_ENV !== "production"/, "mock POS must be disabled by default in production");
assert.match(webhook, /request\.text\(\)/, "webhook verification must receive the raw body");
assert.match(webhook, /verifyWebhook/, "webhook authenticity must be checked before processing");
assert.doesNotMatch(dashboard, /createServiceClient/, "partner dashboard must not bypass partner RLS");
assert.doesNotMatch(dashboard, /partner_payouts|partially_refunded|refunded_amount/i, "dashboard must use the paid-only schema");
for (const period of ["Today", "This Week", "This Month", "Lifetime"]) {
  assert.match(dashboard, new RegExp(period), `dashboard must include ${period}`);
}
for (const metric of ["Order count", "Cups purchased", "Gross eligible sales", "Customer discounts", "Paid sales", "Partner commission earned"]) {
  assert.match(dashboard, new RegExp(metric, "i"), `dashboard must include ${metric}`);
}
assert.match(referralUrl, /\/api\/partner\/route/, "canonical links must use the QYJ partner entry route");
assert.match(adminPage, /getPartnerReferralUrl/, "Admin must use the canonical referral URL helper");
assert.match(dashboard, /getPartnerReferralUrl/, "Partner dashboard must use the canonical referral URL helper");
assert.match(partnerRouter, /buildOrderingUrl\(\{ partnerCode: partner\.partner_code, referralReference: reference \}\)/, "router must forward separate partner and referral identifiers");
assert.match(partnerRouter, /\.eq\("status", "active"\)\.is\("archived_at", null\)/, "archived partners must not create referral sessions");
assert.match(adminActions, /requireAdminPermission\([^,]+, "settings\.manage"\)/, "sensitive partner maintenance must require settings.manage");
assert.match(adminActions, /partner\.login_mapping\.(activate|deactivate)/, "login mapping changes must be audited");
assert.match(adminActions, /confirmArchive[\s\S]*Archive confirmation is required/i, "archive must require explicit server-side confirmation");
assert.match(adminActions, /rpc\("archive_partner"/, "Admin archive must use the database authorization boundary");
assert.match(adminActions, /rpc\("restore_partner"/, "Admin restore must use the database authorization boundary");
assert.match(adminPage, /Archive Partner/, "Admin must expose archive lifecycle management");
assert.match(adminPage, /Restore as Inactive/, "Admin must make restored state explicit");
assert.match(dashboard, /partner\.status !== "active" \|\| partner\.archived_at/, "archived partners must not access the dashboard");
assert.match(sqlTest, /partial_refund financial effect detected/i, "SQL tests must prove partial refund events have no financial effect");
assert.match(sqlTest, /commission reversal entry created/i, "SQL tests must prove reversal entries remain absent");
assert.match(sqlTest, /duplicate webhook accepted/i, "SQL tests must cover webhook idempotency");
assert.match(sqlTest, /duplicate POS transaction accepted/i, "SQL tests must cover transaction idempotency");
assert.match(sqlTest, /historical commission snapshot was recalculated/i, "SQL tests must protect historical snapshots");
assert.match(sqlTest, /cross-partner RLS isolation/i, "SQL tests must cover partner isolation");

console.log("Corporate partner canonical source checks passed.");

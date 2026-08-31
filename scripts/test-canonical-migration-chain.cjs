const assert = require("node:assert/strict");
const { existsSync, readFileSync, readdirSync } = require("node:fs");
const { join } = require("node:path");

const root = process.cwd();
const migrations = join(root, "supabase", "migrations");
const active = readdirSync(migrations).filter((name) => name.endsWith(".sql")).sort();
const expectedActive = [
  "0001_extensions_and_types.sql",
  "0002_core_tables.sql",
  "0003_indexes_and_triggers.sql",
  "0004_security_and_business_functions.sql",
  "0005_rls_policies.sql",
  "0006_promotions_and_leaderboard.sql",
  "0007_promotions_service_role_privileges.sql",
  "0008_campaign_storage.sql",
  "0009_campaign_storage_admin_policies.sql",
  "0010_promotions_cover_image.sql",
  "0011_promotion_image_display_mode.sql",
  "0012_leaderboard_cms_hardening.sql",
  "0013_public_leaderboard_view.sql",
  "0014_leaderboard_auto_ranking.sql",
  "0015_promotion_ascend_community_cta.sql",
  "0016_ascend_referrals.sql",
  "0022_corporate_partner_referrals.sql",
  "0025_partner_combined_commercial_cap.sql",
  "0027_ascend_canonical_runtime.sql",
  "0028_partner_archive_lifecycle.sql",
  "0029_partner_paid_only_pos_rpc.sql"
];

assert.deepEqual(active, expectedActive, "active Supabase migration set must remain canonical");

const archived = [
  ["migrations_archive", "not-deployed", "0018_student_month_mvp.sql"],
  ["migrations_archive", "superseded", "0019_ascend_leaderboard_mvp.sql"],
  ["migrations_archive", "deferred", "0020_ascend_cup_purchases.sql"],
  ["migrations_archive", "superseded", "0021_ascend_school_cup_leaderboard.sql"],
  ["migrations_archive", "superseded", "0023_partner_refund_accounting.sql"],
  ["migrations_archive", "superseded", "0024_partner_dynamic_rates.sql"],
  ["migrations_pending", "0026_store_menu_cms.sql"]
];
for (const parts of archived) {
  assert.equal(existsSync(join(root, "supabase", ...parts)), true, `${parts.at(-1)} must remain outside the active migration directory`);
}

const canonical = readFileSync(join(migrations, "0027_ascend_canonical_runtime.sql"), "utf8");
for (const required of [
  "ascend_referrals_public_rank_idx",
  "ascend_referral_events",
  "increment_ascend_referral_idempotent",
  "get_ascend_personal_rank",
  "ascend_schools",
  "ascend_school_cup_events",
  "prevent_ascend_school_cup_event_changes",
  "is_ascend_school_admin",
  "record_ascend_school_cups"
]) {
  assert.match(canonical, new RegExp(required), `0027 must define ${required}`);
}
assert.doesNotMatch(canonical, /function public\.get_ascend_public_leaderboard/i, "obsolete referral leaderboard RPC must stay absent");
assert.doesNotMatch(canonical, /function public\.get_ascend_school_cup_leaderboard/i, "obsolete school leaderboard RPC must stay absent");
assert.doesNotMatch(canonical, /cup_purchases|ascend_purchase_logs|record_ascend_cup_purchase/i, "deferred 0020 objects must stay absent");
assert.doesNotMatch(canonical, /student_month_|partner_|refund|reversal|payout/i, "0027 must contain only ASCEND 0019 and 0021 descendant state");

const partner = readFileSync(join(migrations, "0022_corporate_partner_referrals.sql"), "utf8");
const cap = readFileSync(join(migrations, "0025_partner_combined_commercial_cap.sql"), "utf8");
assert.match(partner, /create table public\.partners/i, "0022 must create the partners dependency used by 0025");
assert.match(partner, /create or replace function public\.update_partner_commercial_rates/i, "0022 must create the rate RPC replaced by 0025");
assert.match(cap, /alter table public\.partners/i, "0025 must operate directly on the 0022 partners table");
assert.match(cap, /create or replace function public\.update_partner_commercial_rates/i, "0025 must replace the 0022 rate RPC directly");
assert.doesNotMatch(cap, /refund|reversal|payout|refunded_amount/i, "0025 must not depend on archived refund migrations");

const paidOnlyRpc = readFileSync(join(migrations, "0029_partner_paid_only_pos_rpc.sql"), "utf8");
assert.match(paidOnlyRpc, /create or replace function public\.process_partner_pos_event\(p_event jsonb\)/i, "0029 must replace only the Partner POS event RPC");
assert.match(paidOnlyRpc, /v_event_type <> 'payment_succeeded'/i, "0029 must ignore every non-paid event");
assert.match(paidOnlyRpc, /v_gross \* v_rate/i, "0029 must preserve gross-based commission");
assert.match(paidOnlyRpc, /revoke all on function public\.process_partner_pos_event\(jsonb\) from public, anon, authenticated/i, "0029 must preserve the canonical revoke boundary");
assert.match(paidOnlyRpc, /grant execute on function public\.process_partner_pos_event\(jsonb\) to service_role/i, "0029 must remain service-role only");
assert.doesNotMatch(paidOnlyRpc, /partial_refund|refundedAmount|commission_reversal|partner_payouts|refunded_amount/i, "0029 must contain no refund-era behavior");
assert.doesNotMatch(paidOnlyRpc, /\b(create|alter|drop)\s+table\b|\b(create|alter|drop)\s+(index|trigger|policy)\b/i, "0029 must not change structural database objects");

console.log("Canonical migration chain source checks passed.");

require("typescript");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const root = process.cwd();
const migration = readFileSync(join(root, "supabase", "migrations", "0021_ascend_school_cup_leaderboard.sql"), "utf8");
const api = readFileSync(join(root, "app", "api", "admin", "ascend", "school-cups", "route.ts"), "utf8");
const form = readFileSync(join(root, "components", "ascend", "ascend-school-cup-admin.tsx"), "utf8");
const publicPage = readFileSync(join(root, "app", "[locale]", "(public)", "ascend", "leaderboard", "page.tsx"), "utf8");
const deferred = readFileSync(join(root, "supabase", "migrations", "0020_ascend_cup_purchases.sql"), "utf8");

assert.match(deferred, /DEFERRED: member-level cup purchase attribution is not approved for deployment/, "0020 must remain deferred");
assert.match(migration, /create table public\.ascend_schools/i, "school table must exist");
assert.match(migration, /create table public\.ascend_school_cup_events/i, "append-only cup event table must exist");
assert.match(migration, /check \(cups > 0\)/i, "cup entries must be positive");
assert.match(migration, /created_by uuid not null/i, "cup entries must identify the admin");
assert.match(migration, /prevent_ascend_school_cup_event_changes/i, "cup entries must reject overwrites");
assert.match(migration, /having sum\(e\.cups\) >= 10/i, "rankings require at least ten cups");
assert.match(migration, /max\(e\.created_at\) as last_updated/i, "rankings must expose last updated");
assert.match(migration, /set search_path = ''/i, "security-definer functions must fix search_path");
assert.match(migration, /role_code in \('staff', 'manager', 'super_admin'\)/i, "recording requires an approved role");
assert.doesNotMatch(migration, /add_ascend_school|rename_ascend_school|deactivate_ascend_school|p_note|ascend_referrals|phone|username|member_name|customer/i, "MVP migration must exclude deferred features");
assert.match(api, /getAdminAuthorizationForUser/, "admin API must authenticate staff");
assert.match(api, /record_ascend_school_cups/, "admin API must use the protected recording RPC");
assert.match(api, /revalidatePath\("\/en\/ascend\/leaderboard"\)/, "a saved entry must refresh the public leaderboard");
for (const label of ["Select School", "Cup Quantity", "Save"]) assert.match(form, new RegExp(label), `admin UI must include ${label}`);
assert.doesNotMatch(form, /QR|Search|Phone|Username|Member|Reward|Analytics|Note|Receipt|Purchase recorded successfully|New total/i, "admin UI must contain only the MVP workflow");
assert.match(publicPage, /SCHOOL CUP LEADERBOARD/, "public page must be school-only");
assert.match(publicPage, /Last updated/, "public page must show last updated");
assert.doesNotMatch(publicPage, /profile completion|ASCEND result|referral workflow|share card|reward/i, "public page must exclude deferred concepts");

console.log("Student school cup leaderboard MVP checks passed.");

const assert = require("node:assert/strict");
const { existsSync, readFileSync } = require("node:fs");
const { join } = require("node:path");

const root = process.cwd();
const canonicalPath = join(root, "supabase", "migrations", "0030_store_menu_cms.sql");
const archivedPath = join(root, "supabase", "migrations_archive", "not-deployed", "0026_store_menu_cms.sql");
const pendingPath = join(root, "supabase", "migrations_pending", "0026_store_menu_cms.sql");
const migration = readFileSync(canonicalPath, "utf8");

assert.equal(existsSync(pendingPath), false, "never-deployed 0026 must leave the pending directory");
assert.equal(existsSync(archivedPath), true, "never-deployed 0026 must remain archived for history");

assert.match(migration, /duplicate generated public_slug values exist within a brand/i, "duplicate generated slugs must stop migration");
assert.match(migration, /an outlet has multiple active menus/i, "multiple active menus must stop migration");
assert.match(migration, /a product has multiple active primary images/i, "multiple active primary images must stop migration");

assert.match(migration, /v_canonical_brand_id constant uuid := '22222222-2222-2222-2222-222222222222'/i, "bootstrap must use the established canonical QYJ brand UUID");
assert.match(migration, /if v_brand_count = 0 then[\s\S]*insert into public\.brands[\s\S]*'QYJ', 'QING YUN JIAN'/i, "zero existing QYJ brands must create the canonical brand");
assert.match(migration, /else[\s\S]*select b\.id into v_brand_id[\s\S]*where b\.brand_code = 'QYJ'/i, "one existing QYJ brand must be reused without replacing its UUID");
assert.match(migration, /set name_en = 'QING YUN JIAN'[\s\S]*where id = v_brand_id and name_en = 'Qing Yun Jian'/i, "only the approved legacy brand capitalization may be normalized");
assert.match(migration, /canonical QYJ brand UUID is occupied by a different entity/i, "a canonical brand UUID collision must stop migration");
assert.match(migration, /multiple QYJ brand identities require manual review/i, "multiple QYJ brand identities must stop migration");
assert.match(migration, /QYJ brand exists but is inactive or deleted; owner decision required/i, "an inactive or deleted QYJ brand must not be silently reactivated");
assert.match(migration, /if v_target_count = 0 then[\s\S]*insert into public\.stores/i, "zero existing MacPherson stores must create the canonical store");
assert.match(migration, /if v_target_count = 1 then[\s\S]*select s\.id into v_store_id/i, "one existing MacPherson store must be reused");
assert.match(migration, /duplicate QYJ-MPM-001 stores require manual review/i, "duplicate MacPherson stores must stop migration");
assert.match(migration, /exists only as a deleted store; owner decision required/i, "a deleted identity must not be silently restored or duplicated");
assert.match(migration, /QYJ-MPM-001 exists but is not active; owner decision required/i, "an inactive identity must not be silently reactivated or reused");
assert.match(migration, /another QYJ outlet is already primary; owner decision required/i, "a conflicting primary outlet must stop migration");
assert.match(migration, /macpherson-mall is already assigned to another QYJ store/i, "the approved MacPherson slug must not be stolen from another outlet");
assert.match(migration, /another QYJ store already uses the MacPherson Mall identity/i, "an ambiguous outlet name must stop creation");
assert.match(migration, /QYJ-MPM-001 has an unexpected existing ordering URL/i, "an existing ordering destination conflict must stop migration");
assert.match(migration, /'QYJ-MPM-001', 'MacPherson Mall', '401 MacPherson Road', '#01-23 MacPherson Mall'/i, "created store must use canonical identity and required address data");
assert.match(migration, /'macpherson-mall', 'https:\/\/order\.qyjworld\.com', true/i, "created store must use approved slug, ordering URL and primary status");
assert.doesNotMatch(migration, /insert into public\.stores[\s\S]{0,700}\bphone\b/i, "store bootstrap must not invent a phone number");

assert.match(migration, /set archived_at = coalesce\(archived_at, updated_at, now\(\)\)[\s\S]*where status = 'archived' and archived_at is null/i, "archived products must receive an archive timestamp before the invariant is added");
assert.match(migration, /set archived_at = null[\s\S]*where status <> 'archived' and archived_at is not null/i, "non-archived products must be normalized before the invariant is added");
assert.match(migration, /products_archive_state_check/i, "normalized product archive state must be constrained");

assert.match(migration, /existing Store permission conflicts with canonical configuration/i, "material permission conflicts must stop migration");
assert.match(migration, /existing Store\/Menu role conflicts with canonical configuration/i, "material role identity conflicts must stop migration");
assert.match(migration, /existing Store role permission conflicts with canonical configuration/i, "material role-permission conflicts must stop migration");
assert.match(migration, /\('menu\.manage', 'menu manage'\)/i, "canonical replay must create the established Menu CMS permission");
assert.match(migration, /\('super_admin', 'Super Admin', 'Full company-level access'\)/i, "canonical replay must establish the super-admin role used by Store/Menu mappings");
assert.match(migration, /\('manager', 'Manager', 'Brand or store management access'\)/i, "canonical replay must establish the manager role used by Store/Menu mappings");
assert.match(migration, /p\.permission_code in \('store\.identity\.manage', 'store\.operations\.manage', 'menu\.manage'\)[\s\S]*r\.role_code = 'super_admin'/i, "super admins must receive all Store/Menu management permissions");
assert.match(migration, /p\.permission_code in \('store\.operations\.manage', 'menu\.manage'\)[\s\S]*r\.role_code = 'manager'/i, "managers must receive operations and Menu CMS permissions without store identity permission");
assert.doesNotMatch(migration, /on conflict \(permission_code\) do update/i, "migration must not silently rewrite existing permissions");
assert.match(migration, /on conflict \(permission_code\) do nothing/i, "an already-canonical permission may be preserved");

assert.match(migration, /existing product-images bucket configuration is incompatible/i, "material bucket conflicts must stop migration");
assert.match(migration, /b\.public is distinct from true/i, "bucket visibility must be preflighted");
assert.match(migration, /b\.file_size_limit is distinct from 5242880/i, "bucket size limit must be preflighted");
assert.match(migration, /allowed_mime_types @> array\['image\/jpeg','image\/png','image\/webp'\]/i, "required MIME types must be preflighted");
assert.match(migration, /allowed_mime_types <@ array\['image\/jpeg','image\/png','image\/webp'\]/i, "unexpected MIME types must be rejected");
assert.match(migration, /on conflict \(id\) do nothing/i, "an already-canonical bucket must be preserved without rewriting it");
assert.doesNotMatch(migration, /on conflict \(id\) do update set public/i, "bucket configuration must not be silently replaced");

const runtimeFunction = migration.match(/create or replace function public\.replace_store_weekly_hours[\s\S]*?\$\$;/i)?.[0] ?? "";
assert.match(runtimeFunction, /insert into public\.store_operating_hours/i, "the protected Admin hours RPC must remain available");
const migrationWithoutRuntimeFunction = migration.replace(runtimeFunction, "");
assert.doesNotMatch(migrationWithoutRuntimeFunction, /insert into public\.store_operating_hours/i, "migration-time SQL must not invent operating hours");

console.log("Store/Menu migration preflight tests passed.");

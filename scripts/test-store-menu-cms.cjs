const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const root = process.cwd();
const migration = readFileSync(join(root, "supabase", "migrations", "0030_store_menu_cms.sql"), "utf8");
const menu = readFileSync(join(root, "lib", "menu.ts"), "utf8");
const catalogue = readFileSync(join(root, "components", "menu", "menu-catalogue.tsx"), "utf8");
const home = readFileSync(join(root, "app", "[locale]", "(public)", "page.tsx"), "utf8");
const contact = readFileSync(join(root, "app", "[locale]", "(public)", "contact", "page.tsx"), "utf8");
const menuAdmin = readFileSync(join(root, "app", "[locale]", "admin", "menu", "page.tsx"), "utf8");
const menuActions = readFileSync(join(root, "app", "[locale]", "admin", "menu", "actions.ts"), "utf8");
const storeActions = readFileSync(join(root, "app", "[locale]", "admin", "stores", "actions.ts"), "utf8");

assert.match(migration, /public_slug text/i, "stores require a stable public slug");
assert.match(migration, /stores_brand_public_slug_idx/i, "store slugs must be unique within a brand");
assert.match(migration, /stores_one_primary_per_brand_idx/i, "one primary outlet must be enforced");
assert.match(migration, /interval_no/i, "hours storage must preserve future multiple-interval support");
assert.doesNotMatch(migration, /opens_at\s*<\s*closes_at/i, "database constraints must not reject overnight intervals");
assert.match(migration, /products_archive_state_check/i, "archive status and timestamp must remain consistent");
assert.match(migration, /status = 'inactive', archived_at = null/i, "restore must return products to inactive");
assert.doesNotMatch(migration, /Golden Tide/i, "migration must not infer coming-soon state from Golden Tide's name");
assert.match(migration, /ordering_domain_allowlist/i, "ordering URLs must use an approved-domain configuration");
assert.match(migration, /Ordering URL domain is not approved/i, "unapproved ordering destinations must be rejected");
assert.match(migration, /store\.identity\.manage/i, "store identity permission must be explicit");
assert.match(migration, /store\.operations\.manage/i, "store operations permission must be explicit");
assert.match(migration, /\('menu\.manage', 'menu manage'\)/i, "Menu CMS permission must be established by the canonical migration");
assert.match(menuActions, /requireAdminPermission\([^;]+"menu\.manage"/g, "Menu CMS mutations must require menu.manage in the application layer");
assert.match(storeActions, /requireAdminPermission\([^;]+"store\.identity\.manage"/g, "store identity mutations must retain their separate permission");
assert.match(storeActions, /requireAdminPermission\([^;]+"store\.operations\.manage"/g, "store operations and hours must retain their separate permission");
assert.match(migration, /staff_has_permission\('menu\.manage'/i, "Menu CMS RLS and RPC paths must enforce menu.manage");
for (const table of ["product_categories", "products", "product_images", "menus", "menu_items"]) {
  assert.match(
    migration,
    new RegExp(`grant insert, update, delete on public\\.${table} to authenticated`, "i"),
    `${table} must grant only the DML privileges required before RLS evaluation`
  );
}
assert.match(migration, /old.*to_jsonb\(old\)/is, "audit metadata must preserve old values");
assert.match(migration, /new.*to_jsonb\(new\)/is, "audit metadata must preserve new values");
assert.match(menu, /QYJ_MENU_FALLBACK_ACTIVE/, "development fallback activation must be visible in logs");
assert.match(menu, /NODE_ENV === "production".*throw/s, "production query failures must not silently fall back");
assert.doesNotMatch(catalogue, /signatureNames|golden tide/i, "public menu behaviour must not depend on product names");
assert.match(catalogue, /availability_status === "coming_soon"/, "coming soon must use the menu-item flag");
assert.match(catalogue, /item\.is_signature/, "Signature presentation must use the product flag");
assert.match(menuAdmin, /\["active", "inactive"\]/, "the normal Menu CMS view must load active and inactive products");
assert.match(menuAdmin, /Inactive products/, "inactive products must remain accessible from Menu CMS");
for (const source of [home, contact]) {
  assert.doesNotMatch(source, /11:00 AM|9:00 PM|Daily\s*<br/i, "public opening hours must not be hard-coded");
  assert.match(source, /getPrimaryStore/, "public outlet facts must use the shared store service");
}
console.log("Store and Menu CMS tests passed.");

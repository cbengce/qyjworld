const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const root = process.cwd();
const migration = readFileSync(join(root, "supabase", "migrations", "0031_public_menu_idempotency.sql"), "utf8");
const actions = readFileSync(join(root, "app", "[locale]", "admin", "menu", "actions.ts"), "utf8");

assert.match(migration, /create unique index menus_one_canonical_public_per_store_idx[\s\S]*on public\.menus \(store_id\)[\s\S]*name = 'Public Menu'[\s\S]*deleted_at is null/i, "one non-deleted canonical Public Menu per outlet must be enforced in the database");
assert.match(migration, /m\.brand_id <> s\.brand_id[\s\S]*reconcile it before retrying/i, "the migration must fail closed on an incompatible existing Public Menu");
assert.match(migration, /select \* into v_store[\s\S]*where id = p_store_id[\s\S]*for update/i, "creation requests for the same outlet must serialize on the store row");
assert.match(migration, /select \* into v_menu[\s\S]*store_id = v_store\.id[\s\S]*name = 'Public Menu'[\s\S]*if not found then[\s\S]*insert into public\.menus/i, "an existing canonical Public Menu must be reused before insertion is attempted");
assert.match(migration, /elsif v_menu\.brand_id <> v_store\.brand_id then[\s\S]*raise exception/i, "an incompatible existing Public Menu must fail closed");
assert.match(migration, /staff_has_permission\('menu\.manage', v_store\.brand_id, v_store\.id, null\)/i, "the database RPC must enforce scoped menu.manage authorization");
assert.match(migration, /v_menu := public\.activate_store_menu\(v_menu\.id\)/i, "the existing one-active-menu-per-store activation path must be preserved");
assert.match(migration, /revoke all on function public\.get_or_create_public_menu\(uuid\) from public, anon/i, "anonymous callers must not execute the creation RPC");
assert.match(migration, /grant execute on function public\.get_or_create_public_menu\(uuid\) to authenticated/i, "authenticated staff must reach the permission-protected RPC");
assert.match(actions, /requireAdminPermission\(locale, "menu\.manage", \{ brandId, storeId \}\)[\s\S]*rpc\("get_or_create_public_menu", \{ p_store_id: storeId \}\)/i, "the server action must retain application authorization and use the idempotent RPC");
assert.doesNotMatch(actions, /from\("menus"\)\.insert\([\s\S]{0,300}name: "Public Menu"/i, "the server action must not perform a separate non-atomic menu insert");
assert.doesNotMatch(migration, /(?:insert|update|delete)\s+(?:into\s+|from\s+)?public\.menu_items/i, "idempotent menu creation must not modify menu items, products or prices");

function createOrReuse(state, storeId) {
  const existing = state.find((menu) => menu.storeId === storeId && menu.name === "Public Menu" && !menu.deleted);
  if (existing) {
    for (const menu of state) if (menu.storeId === storeId && menu.active) menu.active = false;
    existing.active = true;
    return existing;
  }
  const created = { id: `menu-${state.length + 1}`, storeId, name: "Public Menu", active: true, deleted: false };
  for (const menu of state) if (menu.storeId === storeId && menu.active) menu.active = false;
  state.push(created);
  return created;
}

const state = [];
const first = createOrReuse(state, "macpherson");
assert.equal(state.length, 1, "first creation must create one menu");
assert.equal(createOrReuse(state, "macpherson").id, first.id, "a retry must reuse the canonical menu");
assert.equal(state.length, 1, "a retry must not create a duplicate menu");
first.active = false;
assert.equal(createOrReuse(state, "macpherson").id, first.id, "an inactive canonical menu must be reused and activated");
const secondOutlet = createOrReuse(state, "second-outlet");
assert.notEqual(secondOutlet.id, first.id, "another outlet must have its own canonical menu");
assert.equal(state.length, 2, "one canonical menu per outlet must be supported");

console.log("Public Menu idempotency tests passed.");

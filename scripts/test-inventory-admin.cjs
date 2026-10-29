const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function load(file, mocks = {}) {
  const filename = path.join(process.cwd(), file);
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(process.cwd());
  mod.require = name => name in mocks ? mocks[name] : require(name);
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX }
  }).outputText, filename);
  return mod.exports;
}

const purchasing = load('lib/inventory/purchasing.ts');
assert.deepEqual(purchasing.PURCHASE_PLATFORMS, {pinduoduo:'拼多多',douyin:'抖音',taobao:'淘宝',wechat:'微信'});
assert.equal(purchasing.moneyMinor('265.05'),26505n);
assert.equal(purchasing.actualSgdCost([{actualSgd:'265.05',feeSgd:'1.20'}]),26625n);
assert.throws(()=>purchasing.moneyMinor('1.001'));
assert.throws(()=>purchasing.allocateFreight(100n,[{id:'a',weight:'0'}]));
for(let cents=0n;cents<200n;cents++) {
 const shares=purchasing.allocateFreight(cents,[{id:'c',weight:'1'},{id:'a',weight:'1'},{id:'b',weight:'1'}]);
 assert.equal(shares.reduce((sum,r)=>sum+BigInt(r.minor),0n),cents);
}
assert.equal(purchasing.allocateFreight(1n,[{id:'b',weight:'1'},{id:'a',weight:'1'}]).find(r=>r.id==='a').minor,'1');
console.log('Purchasing: four platforms, exact SGD fees and 200 freight-cent conservation cases passed.');
const validation = load('lib/inventory/validation.ts', { './purchase-validation': load('lib/inventory/purchase-validation.ts') });
for (const q of ['0', '1', '500', '0.000001', '99999999999999.999999']) assert.equal(validation.inventoryQuantity.safeParse(q).success, true, q);
for (const q of ['-1', 'NaN', 'Infinity', '1e3', '01', '1.0000001', '100000000000000', '']) assert.equal(validation.inventoryQuantity.safeParse(q).success, false, q);

const key = '34000000-0000-4000-8000-000000000001';
const location = '34000000-0000-4000-8000-000000000002';
const material = '34000000-0000-4000-8000-000000000003';
let authCalls = 0, refreshed = 0, failAuth = false, failure = null, existing = null;
const calls = [];
const db = {
  async rpc(name, args) { calls.push({ name, args }); return { data: name === 'post_inventory_stocktake' ? null : key, error: failure }; },
  from(table) {
    let operation;
    const query = {
      insert(row) { operation = { table, row }; calls.push(operation); return query; },
      upsert(row, opts) { calls.push({ table, row, opts }); return Promise.resolve({ error: failure }); },
      select() { return query; }, eq() { return query; },
      single() { return Promise.resolve({ data: { brand_id: key, base_unit: 'each' }, error: null }); },
      maybeSingle() { return Promise.resolve({ data: existing, error: null }); },
      then(resolve, reject) { return Promise.resolve({ error: failure }).then(resolve, reject); }
    };
    return query;
  }
};
const { saveInventory } = load('app/[locale]/admin/inventory/actions.ts', {
  '@/lib/data': { async requireAdmin() { authCalls++; if (failAuth) throw new Error('denied'); } },
  '@/lib/supabase/server': { createClient: () => db },
  '@/lib/inventory/validation': validation,
  '@/lib/inventory/purchasing': load('lib/inventory/purchasing.ts'),
  'next/cache': { revalidatePath() { refreshed++; } }
});
function form(values) { const data = new FormData(); Object.entries({ locale: 'zh', key, ...values }).forEach(([k, v]) => data.set(k, v)); return data; }
const movement = { operation: 'movement', locationId: location, materialId: material, kind: 'wastage', quantity: '2', reason: 'Damaged' };

(async () => {
  let result = await saveInventory({}, form(movement));
  assert.equal(result.ok, true);
  assert.notEqual(result.key, key);
  assert.equal(calls.at(-1).name, 'post_inventory_movement');
  assert.equal(calls.at(-1).args.p_quantity_delta, '-2');
  assert.equal(calls.at(-1).args.p_idempotency_key, key);
  const retryKey = result.key;
  failure = { message: 'Insufficient inventory stock' };
  result = await saveInventory({ key: retryKey }, form({ ...movement, key: retryKey }));
  assert.equal(result.error, 'stock');
  assert.equal(result.key, retryKey, 'failed submission retains its current retry key');
  failure = { message: 'secret database connection detail' };
  assert.equal((await saveInventory({}, form(movement))).error, 'save', 'raw backend error is not exposed');
  const before = calls.length;
  assert.equal((await saveInventory({}, form({ ...movement, quantity: '1e3' }))).error, 'invalid');
  assert.equal(calls.length, before, 'invalid input does not reach database');
  failure = null;
  result = await saveInventory({}, form({ operation: 'stocktake', locationId: location, materialId: material, counted: '98', expected: '100', reason: 'Count' }));
  assert.equal(result.noChange, true);
  assert.equal(calls.at(-1).name, 'post_inventory_stocktake');
  assert.equal(calls.at(-1).args.p_expected_quantity, '100');
  failure = { message: 'Inventory changed since this form was loaded; refresh and count again' };
  assert.equal((await saveInventory({}, form({ operation: 'stocktake', locationId: location, materialId: material, counted: '98', expected: '100', reason: 'Count' }))).error, 'stale');
  failure = null;
  failure = null;
  result = await saveInventory({}, form({ operation:'receipt', lineId:material, locationId:location, expected:'400', accepted:'380', damaged:'10', short:'10', reference:'DELIVERY-1', receivedOn:'2026-10-30', notes:'Test' }));
  assert.equal(result.ok,true);
  assert.equal(calls.at(-1).name,'receive_inventory_purchase');
  assert.equal(calls.at(-1).args.p_accepted,'380');
  failure={message:'Receipt exceeds outstanding purchase quantity'};
  assert.equal((await saveInventory({}, form({operation:'receipt',lineId:material,locationId:location,expected:'400',accepted:'380',damaged:'10',short:'10',reference:'DELIVERY-1',receivedOn:'2026-10-30',notes:''}))).error,'receipt');
  failure=null;
  const newMaterial = { operation: 'material', brandId: key, name: 'Test cup', category: 'packaging', baseUnit: 'each', colour: '' };
  result = await saveInventory({}, form(newMaterial));
  assert.equal(result.ok, true);
  const inserted = calls.at(-1);
  assert.equal(inserted.row.id, key, 'material create is keyed for safe retry');
  assert.equal(inserted.table, 'inventory_materials');
  assert.equal('sku' in inserted.row, false, 'database generates SKU');
  failure = { code: '23505', message: 'duplicate key' };
  existing = inserted.row;
  assert.equal((await saveInventory({}, form(newMaterial))).ok, true, 'same material create can safely retry');
  existing = { ...inserted.row, name: 'Different' };
  assert.equal((await saveInventory({}, form(newMaterial))).error, 'duplicate');
  failure = null;
  assert.equal((await saveInventory({}, form({ operation: 'unit', materialId: material, label: 'box', quantity: '0.5' }))).error, 'whole');
  failAuth = true;
  await assert.rejects(saveInventory({}, form(movement)), /denied/);
  assert.ok(authCalls > 0 && refreshed > 0);
  console.log('Inventory admin: exact decimal validation, authenticated writes, safe retries, error sanitisation, signed consumption and stale count handling passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });

(async () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  let unavailable = false;
  const fixture = {
    inventory_materials: [{ id: material, brand_id: key, name: 'Fixture cup', sku: 'MAT-FIXTURE', category: 'packaging', base_unit: 'each', active: true }],
    inventory_locations: [{ id: location, brand_id: key, store_id: key, name: 'Fixture outlet', active: true }],
    inventory_balances: [{ brand_id: key, location_id: location, material_id: material, quantity: '100.000000' }],
    inventory_material_units: [], inventory_reorder_settings: []
  };
  const pageDb = {
    rpc: async () => ({ data: true, error: null }),
    from(table) {
      const q = { select() { return q; }, eq() { return q; }, is() { return q; }, order() { return q; }, limit() { return q; }, then(resolve, reject) {
        return Promise.resolve({ data: table === 'brands' ? [{ id: key, name_en: 'Fixture brand' }] : table === 'stores' ? [{ id: key, brand_id: key, name: 'Fixture outlet' }] : [], error: null }).then(resolve, reject);
      }}; return q;
    }
  };
  const { default: Page } = load('app/[locale]/admin/inventory/page.tsx', {
    '@/lib/data': { requireAdmin: async () => ({ role: 'super_admin' }) },
    '@/lib/supabase/server': { createClient: () => pageDb },
    '@/lib/inventory/admin': { readInventoryTable: async table => { if (unavailable) throw new Error('unavailable'); return fixture[table]; } },
    '@/components/admin/admin-navigation': { AdminNavigation: () => React.createElement('nav', null, 'Admin') },
    '@/components/admin/inventory-form': { InventoryForm: ({ operation, children }) => React.createElement('form', { 'data-operation': operation }, children) }
  });
  for (const locale of ['en', 'zh']) {
    const html = renderToStaticMarkup(await Page({ params: { locale } }));
    assert.match(html, /Fixture cup/);
    for (const operation of ['material', 'location', 'unit', 'movement', 'stocktake', 'reorder']) assert.ok(html.includes('data-operation="' + operation + '"'), operation);
    assert.match(html, /name="expected" value="100.000000"/);
    assert.doesNotMatch(html, /undefined/);
  }
  unavailable = true;
  const html = renderToStaticMarkup(await Page({ params: { locale: 'en' } }));
  assert.match(html, /Inventory is not enabled/);
  assert.doesNotMatch(html, /data-operation=/, 'no write forms when inventory cannot be loaded');
  console.log('Inventory server page: EN/ZH forms, exact stock snapshot, empty/error boundary and stock labels render correctly.');
})().catch(error => { console.error(error); process.exitCode = 1; });

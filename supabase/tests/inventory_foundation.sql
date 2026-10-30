-- Disposable database only. All fixtures and changes roll back.
begin;
create temporary table inventory_test_session (id integer);

create function pg_temp.inventory_assert(p_ok boolean, p_message text)
returns void language plpgsql as $$
begin
  if p_ok is distinct from true then raise exception 'FAIL: %', p_message; end if;
end;
$$;
create function pg_temp.inventory_expect_error(p_sql text, p_pattern text)
returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlerrm not like p_pattern then raise exception 'FAIL: expected %, got %', p_pattern, sqlerrm; end if;
    return;
  end;
  raise exception 'FAIL: operation unexpectedly succeeded: %', p_sql;
end;
$$;
do $$
begin
  execute format('grant usage on schema %I to authenticated, anon, service_role',
    (select nspname from pg_namespace where oid = pg_my_temp_schema()));
end;
$$;

insert into public.companies (id, legal_name, country_code)
values ('33000000-0000-0000-0000-000000000001', 'Inventory fixture company', 'SG');
insert into public.brands (id, company_id, brand_code, name_en) values
  ('33000000-0000-0000-0000-000000000002', '33000000-0000-0000-0000-000000000001', 'INVTEST', 'Inventory fixture brand'),
  ('33000000-0000-0000-0000-000000000003', '33000000-0000-0000-0000-000000000001', 'INVOTHER', 'Other fixture brand');
insert into public.stores (id, brand_id, store_code, name, address_line_1, public_slug) values
  ('33000000-0000-0000-0000-000000000011', '33000000-0000-0000-0000-000000000002', 'INV-A', 'Fixture A', 'Test', 'inv-a'),
  ('33000000-0000-0000-0000-000000000012', '33000000-0000-0000-0000-000000000002', 'INV-B', 'Fixture B', 'Test', 'inv-b'),
  ('33000000-0000-0000-0000-000000000013', '33000000-0000-0000-0000-000000000003', 'INV-C', 'Fixture C', 'Test', 'inv-c');
insert into auth.users (id) values
  ('33000000-0000-0000-0000-000000000021'),
  ('33000000-0000-0000-0000-000000000022'),
  ('33000000-0000-0000-0000-000000000023');
insert into public.staff_users (id, auth_user_id, staff_no, full_name, email_raw) values
  ('33000000-0000-0000-0000-000000000031', '33000000-0000-0000-0000-000000000021', 'INV-OWNER', 'Fixture owner', 'inv-owner@example.invalid'),
  ('33000000-0000-0000-0000-000000000032', '33000000-0000-0000-0000-000000000022', 'INV-STORE', 'Fixture store user', 'inv-store@example.invalid');
insert into public.roles (id, role_code, name) values
  ('33000000-0000-0000-0000-000000000041', 'inventory_fixture_staff', 'Inventory fixture staff');
insert into public.role_permissions (role_id, permission_id)
select '33000000-0000-0000-0000-000000000041', id from public.permissions
where permission_code in ('inventory.read', 'inventory.post');
insert into public.staff_role_assignments (staff_user_id, role_id, scope_type, brand_id)
select '33000000-0000-0000-0000-000000000031', id, 'brand', '33000000-0000-0000-0000-000000000002'
from public.roles where role_code = 'super_admin';
insert into public.staff_role_assignments (staff_user_id, role_id, scope_type, store_id)
values ('33000000-0000-0000-0000-000000000032', '33000000-0000-0000-0000-000000000041', 'store', '33000000-0000-0000-0000-000000000011');

insert into public.inventory_locations (id, brand_id, store_id, location_code, name, kind) values
  ('33000000-0000-0000-0000-000000000051', '33000000-0000-0000-0000-000000000002', '33000000-0000-0000-0000-000000000011', 'INV-A', 'Fixture A stock', 'store'),
  ('33000000-0000-0000-0000-000000000052', '33000000-0000-0000-0000-000000000002', '33000000-0000-0000-0000-000000000012', 'INV-B', 'Fixture B stock', 'store'),
  ('33000000-0000-0000-0000-000000000053', '33000000-0000-0000-0000-000000000002', null, 'INV-WH', 'Fixture warehouse', 'warehouse');
insert into public.inventory_materials (id, brand_id, name, category, base_unit) values
  ('33000000-0000-0000-0000-000000000061', '33000000-0000-0000-0000-000000000002', 'Fixture cup', 'packaging', 'each'),
  ('33000000-0000-0000-0000-000000000062', '33000000-0000-0000-0000-000000000002', 'Fixture jelly', 'ingredient', 'g'),
  ('33000000-0000-0000-0000-000000000063', '33000000-0000-0000-0000-000000000003', 'Other brand cup', 'packaging', 'each');
insert into public.inventory_material_units (brand_id, material_id, unit_label, base_quantity)
values ('33000000-0000-0000-0000-000000000002', '33000000-0000-0000-0000-000000000061', 'box', 500);
insert into public.inventory_reorder_settings (brand_id, location_id, material_id, minimum_quantity, lead_time_days)
values ('33000000-0000-0000-0000-000000000002', '33000000-0000-0000-0000-000000000051', '33000000-0000-0000-0000-000000000061', 100, 21);

-- Owner runs through the actual authenticated API boundary, not as database owner.
select set_config('request.jwt.claim.sub', '33000000-0000-0000-0000-000000000021', true);
set local role authenticated;
select pg_temp.inventory_assert((select sku like 'MAT-%' from public.inventory_materials where id = '33000000-0000-0000-0000-000000000061'), 'automatic SKU');
select pg_temp.inventory_assert((select count(*) = 2 from public.inventory_materials), 'brand-scoped owner cannot read other brand');
select public.post_inventory_movement('33000000-0000-0000-0000-000000000051', '33000000-0000-0000-0000-000000000061', 'opening', 1000, 'Counted opening stock', 'inv-opening-a');
select public.post_inventory_movement('33000000-0000-0000-0000-000000000051', '33000000-0000-0000-0000-000000000061', 'opening', 1000, 'Counted opening stock', 'inv-opening-a');
select pg_temp.inventory_assert((select count(*) = 1 from public.inventory_movements), 'retry creates one movement');
select pg_temp.inventory_assert((select quantity = 1000 from public.inventory_balances), 'retry does not double stock');
select public.post_inventory_movement('33000000-0000-0000-0000-000000000052', '33000000-0000-0000-0000-000000000061', 'opening', 50, 'Store B count', 'inv-opening-b');
select public.post_inventory_movement('33000000-0000-0000-0000-000000000053', '33000000-0000-0000-0000-000000000061', 'opening', 500, 'Warehouse count', 'inv-opening-wh');
select public.post_inventory_movement('33000000-0000-0000-0000-000000000051', '33000000-0000-0000-0000-000000000061', 'consumption', -100, 'Daily theoretical cup use', 'inv-consume-a');
select public.post_inventory_movement('33000000-0000-0000-0000-000000000051', '33000000-0000-0000-0000-000000000061', 'wastage', -2, 'Damaged cups', 'inv-waste-a');
select public.post_inventory_movement('33000000-0000-0000-0000-000000000051', '33000000-0000-0000-0000-000000000062', 'receipt', 1000.125, 'Received jelly', 'inv-jelly-a');
select public.post_inventory_movement('33000000-0000-0000-0000-000000000051', '33000000-0000-0000-0000-000000000062', 'consumption', -40.125, 'Measured recipe use', 'inv-jelly-use');
select pg_temp.inventory_assert((select quantity = 898 from public.inventory_balances where location_id = '33000000-0000-0000-0000-000000000051' and material_id = '33000000-0000-0000-0000-000000000061'), 'cup stock reconciles');
select pg_temp.inventory_assert((select quantity = 960 from public.inventory_balances where material_id = '33000000-0000-0000-0000-000000000062'), 'fractional ingredient precision');

select pg_temp.inventory_expect_error($q$select public.post_inventory_movement('33000000-0000-0000-0000-000000000051', '33000000-0000-0000-0000-000000000061', 'opening', 999, 'Counted opening stock', 'inv-opening-a')$q$, 'Inventory idempotency key reused%');
select pg_temp.inventory_expect_error($q$select public.post_inventory_movement('33000000-0000-0000-0000-000000000051', '33000000-0000-0000-0000-000000000061', 'consumption', -9999, 'Too much', 'inv-negative-a')$q$, 'Insufficient inventory stock');
select pg_temp.inventory_expect_error($q$select public.post_inventory_movement('33000000-0000-0000-0000-000000000051', '33000000-0000-0000-0000-000000000061', 'opening', 1, 'Second opening', 'inv-opening-again')$q$, 'Opening inventory must be the first movement');
select pg_temp.inventory_expect_error($q$select public.post_inventory_movement('33000000-0000-0000-0000-000000000051', '33000000-0000-0000-0000-000000000061', 'receipt', 0.5, 'Half a cup', 'inv-half-cup')$q$, 'Counted materials require whole units');
select pg_temp.inventory_expect_error($q$select public.post_inventory_movement('33000000-0000-0000-0000-000000000051', '33000000-0000-0000-0000-000000000062', 'receipt', 0.0000001, 'Too precise', 'inv-precision')$q$, 'Inventory quantity must be finite%');
select pg_temp.inventory_expect_error($q$select public.post_inventory_movement('33000000-0000-0000-0000-000000000051', '33000000-0000-0000-0000-000000000062', 'receipt', 'NaN', 'Invalid', 'inv-nan-qty')$q$, 'Inventory quantity must be finite%');
select pg_temp.inventory_expect_error($q$select public.post_inventory_movement('33000000-0000-0000-0000-000000000051', '33000000-0000-0000-0000-000000000062', 'wastage', 5, 'Wrong direction', 'inv-direction')$q$, 'Invalid inventory movement%');
select pg_temp.inventory_expect_error($q$select public.post_inventory_movement('33000000-0000-0000-0000-000000000051', '33000000-0000-0000-0000-000000000063', 'receipt', 5, 'Wrong brand', 'inv-cross-brand')$q$, 'Inventory material not found%');
select pg_temp.inventory_expect_error($q$update public.inventory_materials set base_unit = 'g' where id = '33000000-0000-0000-0000-000000000061'$q$, 'Create a new material%');
select pg_temp.inventory_expect_error($q$update public.inventory_locations set store_id = '33000000-0000-0000-0000-000000000012' where id = '33000000-0000-0000-0000-000000000051'$q$, 'Create a new location%');
select pg_temp.inventory_expect_error($q$insert into public.inventory_locations (brand_id, store_id, location_code, name, kind) values ('33000000-0000-0000-0000-000000000002', '33000000-0000-0000-0000-000000000013', 'BAD', 'Wrong brand', 'store')$q$, 'Inventory location store belongs%');
select pg_temp.inventory_expect_error($q$update public.inventory_balances set quantity = 1$q$, 'permission denied%');
select pg_temp.inventory_expect_error($q$delete from public.inventory_movements$q$, 'permission denied%');
select pg_temp.inventory_expect_error($q$delete from public.inventory_materials$q$, 'permission denied%');
-- Normal master updates exercise guards and audit triggers without changing identity.
update public.inventory_materials set name = 'Fixture cup renamed' where id = '33000000-0000-0000-0000-000000000061';
update public.inventory_locations set name = 'Fixture A renamed' where id = '33000000-0000-0000-0000-000000000051';

-- Purchasing keeps platform identity and company/shop names separate.
insert into public.inventory_suppliers(id,brand_id,platform,company_name,supplier_name)
values ('35000000-0000-0000-0000-000000000001','33000000-0000-0000-0000-000000000002','taobao','Fixture company','Fixture shop');
select public.create_inventory_purchase('35000000-0000-0000-0000-000000000002','35000000-0000-0000-0000-000000000001','ORDER-L1','CNY','2026-10-30','33000000-0000-0000-0000-000000000061','box',2,500,100000);
select public.create_inventory_purchase('35000000-0000-0000-0000-000000000002','35000000-0000-0000-0000-000000000001','ORDER-L1','CNY','2026-10-30','33000000-0000-0000-0000-000000000061','box',2,500,100000);
select pg_temp.inventory_assert((select count(*)=1 from public.inventory_purchase_lines), 'purchase retry is atomic');
update public.inventory_suppliers set company_name='Renamed company' where id='35000000-0000-0000-0000-000000000001';
select pg_temp.inventory_assert((select supplier_snapshot->>'company_name'='Fixture company' from public.inventory_purchase_orders), 'historical supplier snapshot survives renaming');
select pg_temp.inventory_expect_error($q$insert into public.inventory_suppliers(brand_id,platform,company_name,supplier_name) values ('33000000-0000-0000-0000-000000000002','invalid-platform','Company','Shop')$q$, '%check constraint%');
select pg_temp.inventory_assert((select quantity=898 from public.inventory_balances where material_id='33000000-0000-0000-0000-000000000061' and location_id='33000000-0000-0000-0000-000000000051'), 'purchasing does not add stock');
-- Store A can read only its own location, balances, movements and thresholds.
select set_config('request.jwt.claim.sub', '33000000-0000-0000-0000-000000000022', true);
select pg_temp.inventory_assert((select count(*) = 1 from public.inventory_locations), 'store cannot read warehouse or another store');
select pg_temp.inventory_assert((select count(*) = 0 from public.inventory_suppliers), 'store inventory access does not grant central purchasing access');
select pg_temp.inventory_assert((select count(*) = 2 from public.inventory_balances), 'store sees its two material balances only');
select pg_temp.inventory_assert((select count(*) = 2 from public.inventory_materials), 'store can read shared material catalogue');
select pg_temp.inventory_assert((select count(*) = 1 from public.inventory_material_units), 'store can read package conversion');
select pg_temp.inventory_assert((select count(*) = 1 from public.inventory_reorder_settings), 'store can read own reorder settings');
select pg_temp.inventory_expect_error($q$select public.post_inventory_movement('33000000-0000-0000-0000-000000000052', '33000000-0000-0000-0000-000000000061', 'receipt', 5, 'Forbidden', 'inv-other-store')$q$, 'Insufficient inventory permission');
select pg_temp.inventory_expect_error($q$select public.post_inventory_movement('33000000-0000-0000-0000-000000000053', '33000000-0000-0000-0000-000000000061', 'receipt', 5, 'Forbidden', 'inv-warehouse')$q$, 'Insufficient inventory permission');
select pg_temp.inventory_expect_error($q$insert into public.inventory_materials (brand_id, name, category, base_unit) values ('33000000-0000-0000-0000-000000000002', 'Forbidden', 'gift', 'each')$q$, 'new row violates row-level security%');
select public.post_inventory_movement('33000000-0000-0000-0000-000000000051', '33000000-0000-0000-0000-000000000061', 'adjustment', -1, 'Stocktake correction', 'inv-store-adjust');

-- An ordinary signed-in customer has no inventory rights.
select set_config('request.jwt.claim.sub', '33000000-0000-0000-0000-000000000023', true);
select pg_temp.inventory_assert((select count(*) = 0 from public.inventory_materials), 'non-staff cannot see materials');
select pg_temp.inventory_assert((select count(*) = 0 from public.inventory_movements), 'non-staff cannot see ledger');
select pg_temp.inventory_expect_error($q$select public.post_inventory_movement('33000000-0000-0000-0000-000000000051', '33000000-0000-0000-0000-000000000061', 'receipt', 5, 'Forbidden', 'inv-customer')$q$, 'Insufficient inventory permission');

-- Counted stock uses a locked snapshot, not an unconditional balance overwrite.
select set_config('request.jwt.claim.sub', '33000000-0000-0000-0000-000000000022', true);
select public.post_inventory_stocktake('33000000-0000-0000-0000-000000000051', '33000000-0000-0000-0000-000000000061', 896, 897, 'Physical count', 'inv-stocktake-a');
select public.post_inventory_stocktake('33000000-0000-0000-0000-000000000051', '33000000-0000-0000-0000-000000000061', 896, 897, 'Physical count', 'inv-stocktake-a');
select pg_temp.inventory_expect_error($q$select public.post_inventory_stocktake('33000000-0000-0000-0000-000000000051', '33000000-0000-0000-0000-000000000061', 895, 897, 'Stale count', 'inv-stocktake-stale')$q$, 'Inventory changed since%');
select pg_temp.inventory_expect_error($q$select public.post_inventory_stocktake('33000000-0000-0000-0000-000000000051', '33000000-0000-0000-0000-000000000061', 896.5, 896, 'Half cup', 'inv-stocktake-half')$q$, 'Counted materials require whole units');
select pg_temp.inventory_expect_error($q$select public.post_inventory_stocktake('33000000-0000-0000-0000-000000000052', '33000000-0000-0000-0000-000000000061', 49, 50, 'Other store', 'inv-stocktake-other')$q$, 'Insufficient inventory permission');
select pg_temp.inventory_assert(public.post_inventory_stocktake('33000000-0000-0000-0000-000000000051', '33000000-0000-0000-0000-000000000061', 896, 896, 'Matching count', 'inv-stocktake-same') is null, 'matching stocktake does not create a movement');
reset role;
update public.staff_role_assignments set deleted_at = now() where staff_user_id = '33000000-0000-0000-0000-000000000032';
select set_config('request.jwt.claim.sub', '33000000-0000-0000-0000-000000000022', true);
set local role authenticated;
select pg_temp.inventory_assert((select count(*) = 0 from public.inventory_balances), 'soft-deleted assignment grants no rights');
reset role;
select pg_temp.inventory_expect_error($q$update public.inventory_movements set reason = 'Rewritten'$q$, 'Inventory movements are immutable%');
select pg_temp.inventory_assert((select count(*) = 9 from public.audit_logs where action = 'inventory.post' and entity_id in (select id from public.inventory_movements)), 'one audit record per posted movement');
select pg_temp.inventory_assert((select quantity = 896 from public.inventory_balances where location_id = '33000000-0000-0000-0000-000000000051' and material_id = '33000000-0000-0000-0000-000000000061'), 'failed operations leave balance unchanged');
select pg_temp.inventory_assert(not has_table_privilege('anon', 'public.inventory_materials', 'SELECT'), 'anonymous table access denied');
select pg_temp.inventory_assert(not has_function_privilege('anon', 'public.post_inventory_movement(uuid,uuid,text,numeric,text,text,timestamptz)', 'EXECUTE'), 'anonymous RPC denied');
select pg_temp.inventory_assert(not has_table_privilege('service_role', 'public.inventory_balances', 'UPDATE'), 'service role cannot bypass ledger with direct writes');
select pg_temp.inventory_assert((select bool_and(relrowsecurity) from pg_class where oid in ('public.inventory_materials'::regclass, 'public.inventory_material_units'::regclass, 'public.inventory_locations'::regclass, 'public.inventory_balances'::regclass, 'public.inventory_movements'::regclass, 'public.inventory_reorder_settings'::regclass)), 'RLS enabled on every inventory table');

-- Multiple deliveries, replacement quantity, retries and over-receipt rollback.
select set_config('request.jwt.claim.sub', '33000000-0000-0000-0000-000000000021', true);
set local role authenticated;
do $$
declare v_line uuid; v_first uuid; v_retry uuid;
begin
 select id into strict v_line from public.inventory_purchase_lines where order_id='35000000-0000-0000-0000-000000000002';
 v_first:=public.receive_inventory_purchase(v_line,'33000000-0000-0000-0000-000000000051',400,380,10,10,'DELIVERY-1','2026-10-30','First partial delivery','receipt-test-one');
 v_retry:=public.receive_inventory_purchase(v_line,'33000000-0000-0000-0000-000000000051',400,380,10,10,'DELIVERY-1','2026-10-30','First partial delivery','receipt-test-one');
 perform pg_temp.inventory_assert(v_first=v_retry,'same receipt retry returns same ID');
 perform pg_temp.inventory_assert((select count(*)=1 from public.inventory_purchase_receipts),'receipt not duplicated');
 perform pg_temp.inventory_assert((select quantity=1276 from public.inventory_balances where location_id='33000000-0000-0000-0000-000000000051' and material_id='33000000-0000-0000-0000-000000000061'),'only accepted goods enter stock');
 perform pg_temp.inventory_expect_error(format('select public.receive_inventory_purchase(%L,%L,621,621,0,0,%L,%L,%L,%L)',v_line,'33000000-0000-0000-0000-000000000051','TOO-MANY','2026-10-30','Over receipt','receipt-test-over'),'Receipt exceeds outstanding%');
 perform pg_temp.inventory_expect_error(format('select public.receive_inventory_purchase(%L,%L,400,399,0,0,%L,%L,%L,%L)',v_line,'33000000-0000-0000-0000-000000000051','BAD-SUM','2026-10-30','Mismatch','receipt-test-sum'),'Invalid receipt quantities');
 perform pg_temp.inventory_expect_error(format('select public.receive_inventory_purchase(%L,%L,400,380,10,10,%L,%L,%L,%L)',v_line,'33000000-0000-0000-0000-000000000051','DELIVERY-1','2026-10-30','Duplicate reference','receipt-test-ref'),'%unique constraint%');
 perform public.receive_inventory_purchase(v_line,'33000000-0000-0000-0000-000000000051',620,620,0,0,'DELIVERY-2','2026-10-30','Remaining and replacement goods','receipt-test-two');
 perform pg_temp.inventory_assert((select sum(accepted_quantity)=1000 from public.inventory_purchase_receipts),'accepted quantity fulfils order');
 perform pg_temp.inventory_assert((select quantity=1896 from public.inventory_balances where location_id='33000000-0000-0000-0000-000000000051' and material_id='33000000-0000-0000-0000-000000000061'),'duplicate reference rolls back stock and final receipt reconciles');
end;
$$;
reset role;
select pg_temp.inventory_expect_error($q$update public.inventory_purchase_receipts set notes='changed'$q$,'Inventory movements are immutable%');
select pg_temp.inventory_assert(not has_table_privilege('authenticated','public.inventory_purchase_receipts','INSERT'),'receipt table is RPC-write only');

-- Finance entry is brand-scoped; opening batches are atomic and safe to retry.
select set_config('request.jwt.claim.sub','33000000-0000-0000-0000-000000000021',true);
set local role authenticated;
insert into public.inventory_fixed_assets(brand_id,store_id,asset_name,asset_reference,acquired_on,depreciation_start,cost_sgd_minor,cost_status)
 values('33000000-0000-0000-0000-000000000002','33000000-0000-0000-0000-000000000011','Fixture TV','FIXTURE-TV','2026-09-01','2026-10-01',360000,'actual');
insert into public.inventory_monthly_costs(brand_id,store_id,expense_month,entry_kind,category,amount_sgd_minor,reference)
 values('33000000-0000-0000-0000-000000000002','33000000-0000-0000-0000-000000000011','2026-10-01','budget','rent',1000000,'BUDGET-RENT');
select pg_temp.inventory_expect_error($q$insert into public.inventory_monthly_costs(brand_id,store_id,expense_month,entry_kind,category,amount_sgd_minor,reference) values('33000000-0000-0000-0000-000000000002','33000000-0000-0000-0000-000000000013','2026-10-01','actual','rent',100,'WRONG-STORE')$q$,'Inventory finance store belongs%');
insert into public.inventory_materials(id,brand_id,name,category,base_unit) values
 ('37000000-0000-0000-0000-000000000001','33000000-0000-0000-0000-000000000002','Opening test cups','packaging','each'),
 ('37000000-0000-0000-0000-000000000002','33000000-0000-0000-0000-000000000002','Opening zero material','ingredient','g');
select public.post_inventory_opening_batch('37000000-0000-0000-0000-000000000010','33000000-0000-0000-0000-000000000052','[{"materialId":"37000000-0000-0000-0000-000000000001","quantity":"100"},{"materialId":"37000000-0000-0000-0000-000000000002","quantity":"0"}]');
select public.post_inventory_opening_batch('37000000-0000-0000-0000-000000000010','33000000-0000-0000-0000-000000000052','[{"materialId":"37000000-0000-0000-0000-000000000001","quantity":"100"},{"materialId":"37000000-0000-0000-0000-000000000002","quantity":"0"}]');
select pg_temp.inventory_assert((select quantity=100 from public.inventory_balances where location_id='33000000-0000-0000-0000-000000000052' and material_id='37000000-0000-0000-0000-000000000001'),'opening retry does not duplicate quantity');
select pg_temp.inventory_expect_error($q$select public.post_inventory_opening_batch('37000000-0000-0000-0000-000000000011','33000000-0000-0000-0000-000000000052','[{"materialId":"37000000-0000-0000-0000-000000000002","quantity":"0"}]')$q$,'Opening stock already%');
select pg_temp.inventory_expect_error($q$select public.post_inventory_opening_batch('37000000-0000-0000-0000-000000000012','33000000-0000-0000-0000-000000000053','[{"materialId":"37000000-0000-0000-0000-000000000001","quantity":"5"},{"materialId":"37000000-0000-0000-0000-000000000099","quantity":"5"}]')$q$,'Inventory material not found%');
select pg_temp.inventory_assert(not exists(select 1 from public.inventory_balances where location_id='33000000-0000-0000-0000-000000000053' and material_id='37000000-0000-0000-0000-000000000001'),'invalid row rolls back all prior opening rows');
select set_config('request.jwt.claim.sub','33000000-0000-0000-0000-000000000023',true);
select pg_temp.inventory_assert((select count(*)=0 from public.inventory_fixed_assets),'ordinary customer cannot read asset costs');
select pg_temp.inventory_assert((select count(*)=0 from public.inventory_monthly_costs),'ordinary customer cannot read salary/expense records');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','33000000-0000-0000-0000-000000000021',true);
insert into public.inventory_suppliers(id,brand_id,platform,company_name,supplier_name,country_name,default_currency)
select '38000000-0000-0000-0000-000000000001',brand_id,'direct','MY company','MY shop','Malaysia','MYR'
from public.inventory_materials where id='33000000-0000-0000-0000-000000000061';
select public.create_inventory_purchase('38000000-0000-0000-0000-000000000002','38000000-0000-0000-0000-000000000001','MY-ORDER','MYR','2026-10-30','33000000-0000-0000-0000-000000000061','bag',1,500,12345);
select pg_temp.inventory_assert((select currency='MYR' and supplier_snapshot->>'country_name'='Malaysia' and supplier_snapshot->>'default_currency'='MYR' from public.inventory_purchase_orders where id='38000000-0000-0000-0000-000000000002'),'MYR order retains international supplier snapshot');
update public.inventory_suppliers set country_name='Singapore',default_currency='SGD' where id='38000000-0000-0000-0000-000000000001';
select pg_temp.inventory_assert((select supplier_snapshot->>'country_name'='Malaysia' from public.inventory_purchase_orders where id='38000000-0000-0000-0000-000000000002'),'supplier edits cannot change historical country');
select pg_temp.inventory_expect_error($q$update public.inventory_suppliers set default_currency='XYZ' where id='38000000-0000-0000-0000-000000000001'$q$,'%violates check constraint%');
reset role;
rollback;

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

-- Store A can read only its own location, balances, movements and thresholds.
select set_config('request.jwt.claim.sub', '33000000-0000-0000-0000-000000000022', true);
select pg_temp.inventory_assert((select count(*) = 1 from public.inventory_locations), 'store cannot read warehouse or another store');
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

reset role;
update public.staff_role_assignments set deleted_at = now() where staff_user_id = '33000000-0000-0000-0000-000000000032';
select set_config('request.jwt.claim.sub', '33000000-0000-0000-0000-000000000022', true);
set local role authenticated;
select pg_temp.inventory_assert((select count(*) = 0 from public.inventory_balances), 'soft-deleted assignment grants no rights');
reset role;
select pg_temp.inventory_expect_error($q$update public.inventory_movements set reason = 'Rewritten'$q$, 'Inventory movements are immutable%');
select pg_temp.inventory_assert((select count(*) = 8 from public.audit_logs where action = 'inventory.post' and entity_id in (select id from public.inventory_movements)), 'one audit record per posted movement');
select pg_temp.inventory_assert((select quantity = 897 from public.inventory_balances where location_id = '33000000-0000-0000-0000-000000000051' and material_id = '33000000-0000-0000-0000-000000000061'), 'failed operations leave balance unchanged');
select pg_temp.inventory_assert(not has_table_privilege('anon', 'public.inventory_materials', 'SELECT'), 'anonymous table access denied');
select pg_temp.inventory_assert(not has_function_privilege('anon', 'public.post_inventory_movement(uuid,uuid,text,numeric,text,text,timestamptz)', 'EXECUTE'), 'anonymous RPC denied');
select pg_temp.inventory_assert(not has_table_privilege('service_role', 'public.inventory_balances', 'UPDATE'), 'service role cannot bypass ledger with direct writes');
select pg_temp.inventory_assert((select bool_and(relrowsecurity) from pg_class where oid in ('public.inventory_materials'::regclass, 'public.inventory_material_units'::regclass, 'public.inventory_locations'::regclass, 'public.inventory_balances'::regclass, 'public.inventory_movements'::regclass, 'public.inventory_reorder_settings'::regclass)), 'RLS enabled on every inventory table');

rollback;

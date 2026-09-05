begin;

do $$
declare v_brand uuid; v_store uuid; v_product uuid; v_menu_item uuid; v_menu uuid;
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'stores' and column_name = 'public_slug' and is_nullable = 'NO') then raise exception 'public_slug is not required'; end if;
  if not exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'stores_one_primary_per_brand_idx') then raise exception 'primary-store uniqueness is missing'; end if;
  if not exists (select 1 from pg_constraint where conname = 'products_archive_state_check') then raise exception 'product archive invariant is missing'; end if;
  if not exists (select 1 from pg_constraint where conname = 'menu_items_member_price_check' or pg_get_constraintdef(oid) ilike '%member_price%regular_price%') then raise exception 'member-price validation is missing'; end if;
  if not exists (select 1 from public.permissions where permission_code = 'store.identity.manage') then raise exception 'store identity permission is missing'; end if;
  if not exists (select 1 from public.permissions where permission_code = 'store.operations.manage') then raise exception 'store operations permission is missing'; end if;
  if not exists (select 1 from public.permissions where permission_code = 'menu.manage' and description = 'menu manage' and status = 'active' and deleted_at is null) then raise exception 'Menu CMS permission is missing'; end if;
  if not exists (
    select 1 from public.role_permissions rp
    join public.roles r on r.id = rp.role_id
    join public.permissions p on p.id = rp.permission_id
    where r.role_code = 'super_admin' and p.permission_code = 'menu.manage'
      and rp.status = 'active' and rp.deleted_at is null
  ) then raise exception 'super_admin Menu CMS role mapping is missing'; end if;
  if not exists (
    select 1 from public.role_permissions rp
    join public.roles r on r.id = rp.role_id
    join public.permissions p on p.id = rp.permission_id
    where r.role_code = 'manager' and p.permission_code = 'menu.manage'
      and rp.status = 'active' and rp.deleted_at is null
  ) then raise exception 'manager Menu CMS role mapping is missing'; end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'stores' and policyname = 'stores_staff_scoped_read' and qual like '%staff_has_permission%') then raise exception 'scoped staff store reads are missing'; end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'store_operating_hours' and policyname = 'store_hours_staff_manage' and qual like '%store_id%') then raise exception 'store-scoped hours management is missing'; end if;
  if has_table_privilege('anon', 'public.store_operating_hours', 'INSERT') then raise exception 'anonymous users must not insert operating hours'; end if;

  select id into v_brand from public.brands where brand_code = 'QYJ';
  select id into v_store from public.stores where brand_id = v_brand and store_code = 'QYJ-MPM-001';
  if v_store is null then raise exception 'QYJ primary store fixture is missing'; end if;
  if exists (select 1 from public.store_operating_hours where store_id = v_store) then raise exception '0030 must not invent MacPherson operating hours'; end if;

  insert into public.store_operating_hours (store_id, day_of_week, interval_no, opens_at, closes_at, is_closed)
  values (v_store, 1, 99, '22:00', '02:00', false);
  if not exists (select 1 from public.store_operating_hours where store_id = v_store and interval_no = 99 and closes_at < opens_at) then raise exception 'database must support future overnight hours'; end if;

  select id into v_product from public.products where brand_id = v_brand limit 1;
  if v_product is not null then
    begin
      update public.products set status = 'archived', archived_at = null where id = v_product;
      raise exception 'contradictory archive state was accepted';
    exception when check_violation then null;
    end;
  end if;

  select mi.id, mi.menu_id into v_menu_item, v_menu
  from public.menu_items mi join public.menus m on m.id = mi.menu_id
  where m.store_id = v_store limit 1;
  if v_menu_item is not null then
    begin
      update public.menu_items set regular_price = 5, member_price = 6 where id = v_menu_item;
      raise exception 'member price above regular price was accepted';
    exception when check_violation then null;
    end;
  end if;
end
$$;

select p.tablename, p.policyname, p.cmd
from pg_policies p
where p.schemaname = 'public' and p.tablename in ('store_operating_hours', 'store_hours_exceptions', 'ordering_domain_allowlist')
order by p.tablename, p.policyname;

rollback;

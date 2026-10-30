-- Asset and expense entry plus atomic opening inventory. No POS or payroll automation.
begin;
create table public.inventory_fixed_assets (
 id uuid primary key default gen_random_uuid(),
 brand_id uuid not null references public.brands(id),
 store_id uuid references public.stores(id),
 supplier_id uuid,
 asset_name text not null check(btrim(asset_name)<>''),
 asset_reference text not null check(btrim(asset_reference)<>''),
 model text not null default '',
 acquired_on date not null,
 depreciation_start date not null check(extract(day from depreciation_start)=1 and depreciation_start>=date_trunc('month',acquired_on)::date),
 cost_sgd_minor bigint not null check(cost_sgd_minor>0 and cost_sgd_minor<=99999999999999),
 residual_sgd_minor bigint not null default 0 check(residual_sgd_minor>=0 and residual_sgd_minor<cost_sgd_minor),
 useful_months integer not null default 36 check(useful_months=36),
 cost_status text not null check(cost_status in ('estimated','actual')),
 notes text not null default '',
 created_at timestamptz not null default now(),
 foreign key(supplier_id,brand_id) references public.inventory_suppliers(id,brand_id),
 unique(brand_id,asset_reference)
);
create table public.inventory_monthly_costs (
 id uuid primary key default gen_random_uuid(),
 brand_id uuid not null references public.brands(id),
 store_id uuid references public.stores(id),
 expense_month date not null check(extract(day from expense_month)=1),
 entry_kind text not null check(entry_kind in ('budget','actual')),
 category text not null check(category in ('rent','season_parking','utilities','network','salary','other')),
 amount_sgd_minor bigint not null check(amount_sgd_minor>=0 and amount_sgd_minor<=99999999999999),
 reference text not null check(btrim(reference)<>''),
 notes text not null default '',
 created_at timestamptz not null default now(),
 unique(brand_id,reference)
);
create function public.inventory_validate_finance_store()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.store_id is not null and not exists(select 1 from public.stores where id=new.store_id and brand_id=new.brand_id and deleted_at is null) then
  raise exception 'Inventory finance store belongs to a different brand';
 end if;
 return new;
end;
$$;
do $$
declare t text;
begin
 foreach t in array array['inventory_fixed_assets','inventory_monthly_costs'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated,service_role',t);
  execute format('grant select,insert on public.%I to authenticated',t);
  execute format('grant select on public.%I to service_role',t);
  execute format('create policy %I on public.%I for select to authenticated using(public.inventory_has_permission(''inventory.manage'',brand_id))',t||'_read',t);
  execute format('create policy %I on public.%I for insert to authenticated with check(public.inventory_has_permission(''inventory.manage'',brand_id))',t||'_insert',t);
  execute format('create trigger %I before insert on public.%I for each row execute function public.inventory_validate_finance_store()',t||'_store',t);
  execute format('create trigger %I after insert on public.%I for each row execute function public.inventory_audit_master_change()',t||'_audit',t);
  execute format('create trigger %I before update or delete on public.%I for each row execute function public.inventory_prevent_movement_changes()',t||'_immutable',t);
 end loop;
end;
$$;
revoke all on function public.inventory_validate_finance_store() from public,anon,authenticated,service_role;

create table public.inventory_opening_batches (
 id uuid primary key,
 brand_id uuid not null,
 location_id uuid not null,
 rows_json jsonb not null check(jsonb_typeof(rows_json)='array'),
 actor_user_id uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 foreign key(location_id,brand_id) references public.inventory_locations(id,brand_id)
);
alter table public.inventory_opening_batches enable row level security;
revoke all on public.inventory_opening_batches from public,anon,authenticated,service_role;
grant select on public.inventory_opening_batches to authenticated,service_role;
create policy inventory_opening_batch_read on public.inventory_opening_batches for select to authenticated
 using(public.inventory_can_access_location('inventory.read',location_id));
create trigger inventory_opening_batch_immutable before update or delete on public.inventory_opening_batches
 for each row execute function public.inventory_prevent_movement_changes();
create function public.post_inventory_opening_batch(p_id uuid,p_location uuid,p_rows jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare
 l public.inventory_locations%rowtype; old public.inventory_opening_batches%rowtype;
 r jsonb; q numeric; v_material uuid; n integer:=0;
begin
 if p_id is null or p_rows is null or jsonb_typeof(p_rows)<>'array'
  or jsonb_array_length(p_rows) not between 1 and 100 then raise exception 'Opening batch requires 1 to 100 rows'; end if;
 select * into l from public.inventory_locations where id=p_location for share;
 if not found or auth.uid() is null or not l.active or not public.inventory_has_permission('inventory.post',l.brand_id,l.store_id) then
  raise exception 'Insufficient inventory permission'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,1));
 select * into old from public.inventory_opening_batches where id=p_id;
 if found then
  if old.location_id<>p_location or old.rows_json is distinct from p_rows or old.actor_user_id<>auth.uid() then
   raise exception 'Inventory idempotency key reused with different input'; end if;
  return old.id;
 end if;
 if (select count(distinct v->>'materialId') from jsonb_array_elements(p_rows) v)<>jsonb_array_length(p_rows) then
  raise exception 'Duplicate material in opening batch'; end if;
 -- Deterministic material order avoids cross-batch lock inversion. Any invalid row rolls back all rows.
 for r in select v from jsonb_array_elements(p_rows) v order by v->>'materialId' loop
  n:=n+1;
  v_material:=(r->>'materialId')::uuid;
  if r->>'quantity' is null or r->>'quantity' !~ '^(0|[1-9][0-9]{0,13})(\.[0-9]{1,6})?$' then raise exception 'Invalid opening quantity'; end if;
  q:=(r->>'quantity')::numeric;
  -- Material lock protects the no-existing-movement check across all opening methods.
  perform 1 from public.inventory_materials where id=v_material and brand_id=l.brand_id and active for update;
  if not found then raise exception 'Inventory material not found in location brand'; end if;
  insert into public.inventory_balances(brand_id,location_id,material_id)
   values(l.brand_id,p_location,v_material) on conflict(location_id,material_id) do nothing;
  perform 1 from public.inventory_balances where location_id=p_location and material_id=v_material for update;
  if exists(select 1 from public.inventory_movements where location_id=p_location and material_id=v_material)
   or exists(select 1 from public.inventory_stocktakes where location_id=p_location and material_id=v_material) then
   raise exception 'Opening stock already recorded; use stocktake'; end if;
  if q>0 then
   perform public.post_inventory_movement(p_location,v_material,'opening',q,'Confirmed opening stock',p_id::text||':'||v_material::text);
  else
   perform public.post_inventory_stocktake(p_location,v_material,0,0,'Confirmed zero opening stock',p_id::text||':'||v_material::text);
  end if;
 end loop;
 insert into public.inventory_opening_batches(id,brand_id,location_id,rows_json,actor_user_id)
  values(p_id,l.brand_id,p_location,p_rows,auth.uid());
 return p_id;
end;
$$;
revoke all on function public.post_inventory_opening_batch(uuid,uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.post_inventory_opening_batch(uuid,uuid,jsonb) to authenticated;
commit;

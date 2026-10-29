-- Accepted quantity fulfils an order; damaged/short quantities remain outstanding.
begin;
alter table public.inventory_purchase_lines add constraint inventory_purchase_base_precision
 check (package_quantity * base_units_per_package = round(package_quantity * base_units_per_package,6));
create table public.inventory_purchase_receipts (
 id uuid primary key default gen_random_uuid(),
 brand_id uuid not null,
 purchase_line_id uuid not null,
 location_id uuid not null,
 expected_delivery numeric(20,6) not null check (expected_delivery > 0 and expected_delivery < 'Infinity'::numeric),
 accepted_quantity numeric(20,6) not null check (accepted_quantity >= 0 and accepted_quantity < 'Infinity'::numeric),
 damaged_quantity numeric(20,6) not null check (damaged_quantity >= 0 and damaged_quantity < 'Infinity'::numeric),
 short_quantity numeric(20,6) not null check (short_quantity >= 0 and short_quantity < 'Infinity'::numeric),
 delivery_reference text not null check (btrim(delivery_reference) <> ''),
 received_on date not null,
 notes text not null,
 actor_user_id uuid not null references auth.users(id),
 movement_id uuid references public.inventory_movements(id),
 idempotency_key text not null,
 created_at timestamptz not null default now(),
 foreign key(purchase_line_id,brand_id) references public.inventory_purchase_lines(id,brand_id),
 foreign key(location_id,brand_id) references public.inventory_locations(id,brand_id),
 unique(brand_id,idempotency_key),
 unique(purchase_line_id,delivery_reference),
 check(accepted_quantity + damaged_quantity + short_quantity = expected_delivery)
);
alter table public.inventory_purchase_receipts enable row level security;
revoke all on public.inventory_purchase_receipts from public,anon,authenticated,service_role;
grant select on public.inventory_purchase_receipts to authenticated,service_role;
create policy inventory_purchase_receipts_read on public.inventory_purchase_receipts for select to authenticated
 using(public.inventory_has_permission('inventory.manage',brand_id));
create trigger inventory_receipts_immutable before update or delete on public.inventory_purchase_receipts
 for each row execute function public.inventory_prevent_movement_changes();
create index inventory_purchase_receipts_line_idx on public.inventory_purchase_receipts(purchase_line_id);

create function public.receive_inventory_purchase(p_line uuid,p_location uuid,p_expected numeric,
 p_accepted numeric,p_damaged numeric,p_short numeric,p_reference text,p_received_on date,
 p_notes text,p_key text) returns uuid language plpgsql security definer set search_path='' as $$
declare
 l public.inventory_purchase_lines%rowtype;
 old public.inventory_purchase_receipts%rowtype;
 v_total numeric; v_accepted numeric; v_id uuid; v_movement uuid;
begin
 if auth.uid() is null then raise exception 'Inventory requires an authenticated staff user'; end if;
 -- Serialise both different deliveries and duplicate submissions for this purchase line.
 select * into l from public.inventory_purchase_lines where id=p_line for update;
 if not found or not public.inventory_has_permission('inventory.manage',l.brand_id) then
  raise exception 'Insufficient inventory permission';
 end if;
 if not exists(select 1 from public.inventory_locations where id=p_location and brand_id=l.brand_id and active)
  or not public.inventory_can_access_location('inventory.post',p_location) then
  raise exception 'Insufficient inventory permission';
 end if;
 if p_expected is null or p_accepted is null or p_damaged is null or p_short is null
  or not(p_expected>0 and p_expected<'Infinity'::numeric)
  or not(p_accepted>=0 and p_accepted<'Infinity'::numeric)
  or not(p_damaged>=0 and p_damaged<'Infinity'::numeric)
  or not(p_short>=0 and p_short<'Infinity'::numeric)
  or p_expected<>round(p_expected,6) or p_accepted<>round(p_accepted,6)
  or p_damaged<>round(p_damaged,6) or p_short<>round(p_short,6)
  or p_expected<>p_accepted+p_damaged+p_short then raise exception 'Invalid receipt quantities'; end if;
 if exists(select 1 from public.inventory_materials where id=l.material_id and base_unit='each')
  and (p_expected<>trunc(p_expected) or p_accepted<>trunc(p_accepted) or p_damaged<>trunc(p_damaged) or p_short<>trunc(p_short))
  then raise exception 'Counted materials require whole units'; end if;
 if p_reference is null or btrim(p_reference)='' or p_received_on is null or p_notes is null
  or p_key is null or length(p_key) not between 8 and 160 then raise exception 'Receipt reference, date and key required'; end if;
 select * into old from public.inventory_purchase_receipts where brand_id=l.brand_id and idempotency_key=p_key;
 if found then
  if old.purchase_line_id<>p_line or old.location_id<>p_location or old.expected_delivery<>p_expected
   or old.accepted_quantity<>p_accepted or old.damaged_quantity<>p_damaged or old.short_quantity<>p_short
   or old.delivery_reference<>p_reference or old.received_on<>p_received_on or old.notes<>p_notes
   or old.actor_user_id<>auth.uid() then raise exception 'Inventory idempotency key reused with different input'; end if;
  return old.id;
 end if;
 v_total:=l.package_quantity*l.base_units_per_package;
 select coalesce(sum(accepted_quantity),0) into v_accepted from public.inventory_purchase_receipts where purchase_line_id=p_line;
 if p_expected > v_total-v_accepted then raise exception 'Receipt exceeds outstanding purchase quantity'; end if;
 if p_accepted>0 then
  v_movement:=public.post_inventory_movement(p_location,l.material_id,'receipt',p_accepted,
   'Purchase delivery: '||p_reference,'purchase-receipt:'||p_key);
 end if;
 insert into public.inventory_purchase_receipts(brand_id,purchase_line_id,location_id,expected_delivery,
  accepted_quantity,damaged_quantity,short_quantity,delivery_reference,received_on,notes,actor_user_id,movement_id,idempotency_key)
 values(l.brand_id,p_line,p_location,p_expected,p_accepted,p_damaged,p_short,p_reference,p_received_on,p_notes,auth.uid(),v_movement,p_key)
 returning id into v_id;
 perform public.write_audit('inventory.receive_purchase','inventory_purchase_receipts',v_id,p_key,
  jsonb_build_object('purchase_line_id',p_line,'location_id',p_location,'accepted',p_accepted,'damaged',p_damaged,'short',p_short));
 return v_id;
end;
$$;
revoke all on function public.receive_inventory_purchase(uuid,uuid,numeric,numeric,numeric,numeric,text,date,text,text) from public,anon,authenticated,service_role;
grant execute on function public.receive_inventory_purchase(uuid,uuid,numeric,numeric,numeric,numeric,text,date,text,text) to authenticated;
commit;

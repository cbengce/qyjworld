-- Add supplier origin and MYR without changing existing supplier identities or costs.
begin;
alter table public.inventory_suppliers
  add column country_name text check (country_name is null or (btrim(country_name) <> '' and length(country_name) <= 100)),
  add column default_currency text check (default_currency in ('CNY','MYR','SGD'));
-- Existing suppliers remain unspecified until the owner confirms their origin/currency.
alter table public.inventory_suppliers drop constraint inventory_suppliers_platform_check;
alter table public.inventory_suppliers add constraint inventory_suppliers_platform_check
  check (platform in ('pinduoduo','douyin','taobao','wechat','direct','other'));
alter table public.inventory_purchase_orders drop constraint inventory_purchase_orders_currency_check;
alter table public.inventory_purchase_orders add constraint inventory_purchase_orders_currency_check
  check (currency in ('CNY','MYR','SGD'));
alter table public.inventory_shipment_charges drop constraint inventory_shipment_charges_currency_check;
alter table public.inventory_shipment_charges add constraint inventory_shipment_charges_currency_check
  check (currency in ('CNY','MYR','SGD'));
create or replace function public.inventory_purchase_snapshot()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_supplier public.inventory_suppliers%rowtype;
begin
  select * into v_supplier from public.inventory_suppliers where id = new.supplier_id
    and brand_id = new.brand_id and active for share;
  if not found then raise exception 'Active supplier not found in purchase brand'; end if;
  new.supplier_snapshot := jsonb_build_object('platform', v_supplier.platform,
    'company_name', v_supplier.company_name, 'supplier_name', v_supplier.supplier_name,
    'country_name', v_supplier.country_name, 'default_currency', v_supplier.default_currency);
  return new;
end;
$$;
revoke all on function public.inventory_purchase_snapshot() from public, anon, authenticated, service_role;
commit;

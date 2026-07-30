create unique index customer_memberships_one_active_per_brand_idx
  on public.customer_memberships (customer_id, brand_id)
  where status = 'active';

create unique index referral_rewards_one_confirmed_type_idx
  on public.referral_rewards (referral_id, reward_type)
  where reward_status = 'confirmed';
create unique index points_transactions_one_reversal_idx
  on public.points_transactions (reversed_points_transaction_id)
  where reversed_points_transaction_id is not null;
create unique index referral_rewards_idempotency_idx
  on public.referral_rewards (referral_id, idempotency_key)
  where idempotency_key is not null;

create index customers_auth_user_idx on public.customers (auth_user_id);
create index customers_mobile_normalized_idx on public.customers (primary_mobile_normalized);
create index customers_email_normalized_idx on public.customers (primary_email_normalized);
create index memberships_customer_brand_status_idx on public.customer_memberships (customer_id, brand_id, status);
create index memberships_expires_idx on public.customer_memberships (expires_at);
create index membership_events_membership_created_idx on public.membership_events (customer_membership_id, created_at desc);
create index points_accounts_customer_brand_idx on public.points_accounts (customer_id, brand_id, points_currency_code);
create index points_transactions_account_created_idx on public.points_transactions (points_account_id, created_at desc);
create index referrals_brand_referrer_idx on public.referrals (brand_id, referrer_customer_id);
create index referrals_brand_referred_idx on public.referrals (brand_id, referred_customer_id);
create index staff_assignments_staff_scope_idx on public.staff_role_assignments (staff_user_id, scope_type, company_id, brand_id, store_id);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id, created_at desc);
create index products_brand_category_idx on public.products (brand_id, category_id, status);
create index menus_brand_store_idx on public.menus (brand_id, store_id, status);
create index menu_items_menu_featured_idx on public.menu_items (menu_id, is_featured, display_order);

create trigger companies_updated_at before update on public.companies for each row execute function public.set_updated_at();
create trigger brands_updated_at before update on public.brands for each row execute function public.set_updated_at();
create trigger stores_updated_at before update on public.stores for each row execute function public.set_updated_at();
create trigger customers_updated_at before update on public.customers for each row execute function public.set_updated_at();
create trigger customer_profiles_updated_at before update on public.customer_profiles for each row execute function public.set_updated_at();
create trigger customer_consents_updated_at before update on public.customer_consents for each row execute function public.set_updated_at();
create trigger membership_plans_updated_at before update on public.membership_plans for each row execute function public.set_updated_at();
create trigger customer_memberships_updated_at before update on public.customer_memberships for each row execute function public.set_updated_at();
create trigger points_accounts_updated_at before update on public.points_accounts for each row execute function public.set_updated_at();
create trigger referral_codes_updated_at before update on public.referral_codes for each row execute function public.set_updated_at();
create trigger referrals_updated_at before update on public.referrals for each row execute function public.set_updated_at();
create trigger staff_users_updated_at before update on public.staff_users for each row execute function public.set_updated_at();
create trigger roles_updated_at before update on public.roles for each row execute function public.set_updated_at();
create trigger permissions_updated_at before update on public.permissions for each row execute function public.set_updated_at();
create trigger role_permissions_updated_at before update on public.role_permissions for each row execute function public.set_updated_at();
create trigger staff_role_assignments_updated_at before update on public.staff_role_assignments for each row execute function public.set_updated_at();
create trigger product_categories_updated_at before update on public.product_categories for each row execute function public.set_updated_at();
create trigger products_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger product_images_updated_at before update on public.product_images for each row execute function public.set_updated_at();
create trigger menus_updated_at before update on public.menus for each row execute function public.set_updated_at();
create trigger menu_items_updated_at before update on public.menu_items for each row execute function public.set_updated_at();
create trigger site_settings_updated_at before update on public.site_settings for each row execute function public.set_updated_at();

create or replace function public.validate_referral_brand()
returns trigger
language plpgsql
as $$
declare
  code_brand uuid;
  code_owner uuid;
begin
  select brand_id, customer_id into code_brand, code_owner
  from public.referral_codes
  where id = new.referral_code_id;

  if code_brand is distinct from new.brand_id then
    raise exception 'Referral code brand does not match referral brand';
  end if;

  if code_owner is distinct from new.referrer_customer_id then
    raise exception 'Referral code does not belong to referrer';
  end if;

  return new;
end;
$$;

create trigger referrals_validate_brand before insert or update on public.referrals
for each row execute function public.validate_referral_brand();

create or replace function public.validate_staff_role_scope_hierarchy()
returns trigger
language plpgsql
as $$
declare
  store_brand uuid;
  brand_company uuid;
begin
  if new.scope_type = 'brand' then
    select company_id into brand_company from public.brands where id = new.brand_id;
    if brand_company is null then
      raise exception 'Invalid brand scope';
    end if;
  elsif new.scope_type = 'store' then
    select s.brand_id into store_brand from public.stores s where s.id = new.store_id;
    if store_brand is null then
      raise exception 'Invalid store scope';
    end if;
  elsif new.scope_type = 'company' then
    perform 1 from public.companies where id = new.company_id;
    if not found then
      raise exception 'Invalid company scope';
    end if;
  end if;

  return new;
end;
$$;

create trigger staff_role_scope_validate before insert or update on public.staff_role_assignments
for each row execute function public.validate_staff_role_scope_hierarchy();

create or replace function public.validate_menu_brand_integrity()
returns trigger
language plpgsql
as $$
declare
  menu_brand uuid;
  store_brand uuid;
begin
  select m.brand_id, s.brand_id into menu_brand, store_brand
  from public.menus m
  join public.stores s on s.id = m.store_id
  where m.id = new.menu_id;

  if menu_brand is distinct from store_brand then
    raise exception 'Menu brand does not match store brand';
  end if;

  if new.product_brand_id is distinct from menu_brand then
    raise exception 'Menu item product brand does not match menu brand';
  end if;

  return new;
end;
$$;

create trigger menu_items_validate_brand before insert or update on public.menu_items
for each row execute function public.validate_menu_brand_integrity();

create or replace function public.validate_menu_store_brand()
returns trigger
language plpgsql
as $$
declare
  store_brand uuid;
begin
  select brand_id into store_brand from public.stores where id = new.store_id;
  if store_brand is distinct from new.brand_id then
    raise exception 'Menu brand does not match store brand';
  end if;
  return new;
end;
$$;

create trigger menus_validate_store_brand before insert or update on public.menus
for each row execute function public.validate_menu_store_brand();

create or replace function public.validate_product_category_brand()
returns trigger
language plpgsql
as $$
declare
  category_brand uuid;
begin
  if new.category_id is null then
    return new;
  end if;
  select brand_id into category_brand from public.product_categories where id = new.category_id;
  if category_brand is distinct from new.brand_id then
    raise exception 'Product category brand does not match product brand';
  end if;
  return new;
end;
$$;

create trigger products_validate_category_brand before insert or update on public.products
for each row execute function public.validate_product_category_brand();

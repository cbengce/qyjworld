alter table public.companies enable row level security;
alter table public.brands enable row level security;
alter table public.stores enable row level security;
alter table public.customers enable row level security;
alter table public.customer_profiles enable row level security;
alter table public.customer_consents enable row level security;
alter table public.membership_plans enable row level security;
alter table public.customer_memberships enable row level security;
alter table public.membership_events enable row level security;
alter table public.points_accounts enable row level security;
alter table public.points_transactions enable row level security;
alter table public.referral_codes enable row level security;
alter table public.referrals enable row level security;
alter table public.referral_rewards enable row level security;
alter table public.staff_users enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.staff_role_assignments enable row level security;
alter table public.audit_logs enable row level security;
alter table public.product_categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.menus enable row level security;
alter table public.menu_items enable row level security;
alter table public.site_settings enable row level security;

create policy companies_public_read on public.companies for select using (status = 'active');
create policy brands_public_read on public.brands for select using (status = 'active');
create policy stores_public_read on public.stores for select using (status = 'active');

create policy customers_self_or_staff_read on public.customers
  for select using (
    id = public.current_customer_id()
    or exists (
      select 1 from public.customer_memberships cm
      where cm.customer_id = customers.id
        and public.staff_has_permission('member.read', cm.brand_id, null, null)
    )
    or exists (
      select 1 from public.points_accounts pa
      where pa.customer_id = customers.id
        and public.staff_has_permission('member.read', pa.brand_id, null, null)
    )
  );

create policy customer_profiles_self_or_staff_read on public.customer_profiles
  for select using (
    customer_id = public.current_customer_id()
    or exists (
      select 1 from public.customer_memberships cm
      where cm.customer_id = customer_profiles.customer_id
        and public.staff_has_permission('member.read', cm.brand_id, null, null)
    )
  );

create policy customer_consents_self_or_staff_read on public.customer_consents
  for select using (
    customer_id = public.current_customer_id()
    or exists (
      select 1 from public.customer_memberships cm
      where cm.customer_id = customer_consents.customer_id
        and public.staff_has_permission('member.read', cm.brand_id, null, null)
    )
  );

create policy membership_plans_public_read on public.membership_plans
  for select using (status = 'active');

create policy customer_memberships_self_or_staff_read on public.customer_memberships
  for select using (
    customer_id = public.current_customer_id()
    or public.staff_has_permission('membership.read', brand_id, null, null)
  );

create policy membership_events_self_or_staff_read on public.membership_events
  for select using (
    exists (
      select 1 from public.customer_memberships cm
      where cm.id = customer_membership_id
        and (cm.customer_id = public.current_customer_id() or public.staff_has_permission('membership.read', cm.brand_id, null, null))
    )
  );

create policy points_accounts_self_or_staff_read on public.points_accounts
  for select using (
    customer_id = public.current_customer_id()
    or public.staff_has_permission('points.read', brand_id, null, null)
  );

create policy points_transactions_self_or_staff_read on public.points_transactions
  for select using (
    exists (
      select 1 from public.points_accounts pa
      where pa.id = points_account_id
        and (pa.customer_id = public.current_customer_id() or public.staff_has_permission('points.read', pa.brand_id, null, null))
    )
  );

create policy referral_codes_self_or_staff_read on public.referral_codes
  for select using (
    customer_id = public.current_customer_id()
    or public.staff_has_permission('referral.read', brand_id, null, null)
  );

create policy referrals_self_or_staff_read on public.referrals
  for select using (
    referrer_customer_id = public.current_customer_id()
    or referred_customer_id = public.current_customer_id()
    or public.staff_has_permission('referral.read', brand_id, null, null)
  );

create policy referral_rewards_self_or_staff_read on public.referral_rewards
  for select using (
    exists (
      select 1 from public.referrals r
      where r.id = referral_id
        and (
          r.referrer_customer_id = public.current_customer_id()
          or r.referred_customer_id = public.current_customer_id()
          or public.staff_has_permission('referral.read', r.brand_id, null, null)
        )
    )
  );

create policy staff_users_self_or_manager_read on public.staff_users
  for select using (id = public.current_staff_user_id() or public.staff_has_permission('staff.manage', null, null, null));

create policy roles_staff_read on public.roles
  for select using (public.current_staff_user_id() is not null);

create policy permissions_staff_read on public.permissions
  for select using (public.current_staff_user_id() is not null);

create policy role_permissions_staff_read on public.role_permissions
  for select using (public.current_staff_user_id() is not null);

create policy staff_role_assignments_self_or_manager_read on public.staff_role_assignments
  for select using (staff_user_id = public.current_staff_user_id() or public.staff_has_permission('staff.manage', null, null, null));

create policy audit_logs_staff_read on public.audit_logs
  for select using (public.staff_has_permission('audit.read', null, null, null));

create policy product_categories_public_read on public.product_categories
  for select using (status = 'active');

create policy products_public_read on public.products
  for select using (status = 'active');

create policy product_images_public_read on public.product_images
  for select using (status = 'active');

create policy menus_public_read on public.menus
  for select using (status = 'active' and (valid_from is null or valid_from <= now()) and (valid_to is null or valid_to >= now()));

create policy menu_items_public_read on public.menu_items
  for select using (status = 'active');

create policy site_settings_public_read on public.site_settings
  for select using (status = 'active');

create policy product_categories_staff_manage on public.product_categories
  for all using (public.staff_has_permission('menu.manage', brand_id, null, null))
  with check (public.staff_has_permission('menu.manage', brand_id, null, null));

create policy products_staff_manage on public.products
  for all using (public.staff_has_permission('menu.manage', brand_id, null, null))
  with check (public.staff_has_permission('menu.manage', brand_id, null, null));

create policy menus_staff_manage on public.menus
  for all using (public.staff_has_permission('menu.manage', brand_id, store_id, null))
  with check (public.staff_has_permission('menu.manage', brand_id, store_id, null));

create policy menu_items_staff_manage on public.menu_items
  for all using (
    exists (select 1 from public.menus m where m.id = menu_id and public.staff_has_permission('menu.manage', m.brand_id, m.store_id, null))
  )
  with check (
    exists (select 1 from public.menus m where m.id = menu_id and public.staff_has_permission('menu.manage', m.brand_id, m.store_id, null))
  );

create policy product_images_staff_manage on public.product_images
  for all using (
    exists (select 1 from public.products p where p.id = product_id and public.staff_has_permission('menu.manage', p.brand_id, null, null))
  )
  with check (
    exists (select 1 from public.products p where p.id = product_id and public.staff_has_permission('menu.manage', p.brand_id, null, null))
  );

create policy site_settings_staff_manage on public.site_settings
  for all using (public.staff_has_permission('settings.manage', brand_id, null, null))
  with check (public.staff_has_permission('settings.manage', brand_id, null, null));

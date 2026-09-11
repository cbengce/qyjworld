-- Make the normal outlet Public Menu creation path transactional and idempotent.

do $$
begin
  if exists (
    select 1
    from public.menus
    where name = 'Public Menu' and deleted_at is null
    group by store_id
    having count(*) > 1
  ) then
    raise exception 'Public Menu idempotency migration stopped: an outlet has duplicate non-deleted Public Menu records; reconcile them before retrying';
  end if;

  if exists (
    select 1
    from public.menus m
    join public.stores s on s.id = m.store_id
    where m.name = 'Public Menu'
      and m.deleted_at is null
      and m.brand_id <> s.brand_id
  ) then
    raise exception 'Public Menu idempotency migration stopped: a Public Menu brand does not match its outlet; reconcile it before retrying';
  end if;
end
$$;

create unique index menus_one_canonical_public_per_store_idx
  on public.menus (store_id)
  where name = 'Public Menu' and deleted_at is null;

create or replace function public.get_or_create_public_menu(p_store_id uuid)
returns public.menus
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_store public.stores;
  v_menu public.menus;
begin
  -- The store-row lock serializes every canonical-menu creation request for an outlet.
  select * into v_store
  from public.stores
  where id = p_store_id and deleted_at is null
  for update;

  if not found then
    raise exception 'Store not found';
  end if;

  if not public.staff_has_permission('menu.manage', v_store.brand_id, v_store.id, null) then
    raise exception 'Insufficient permission';
  end if;

  select * into v_menu
  from public.menus
  where store_id = v_store.id
    and name = 'Public Menu'
    and deleted_at is null
  for update;

  if not found then
    insert into public.menus (
      brand_id, store_id, name, status, created_by, updated_by
    ) values (
      v_store.brand_id, v_store.id, 'Public Menu', 'inactive', auth.uid(), auth.uid()
    )
    returning * into v_menu;
  elsif v_menu.brand_id <> v_store.brand_id then
    raise exception 'Existing Public Menu brand does not match its outlet';
  end if;

  -- Activation remains in the existing protected RPC and is part of this transaction.
  v_menu := public.activate_store_menu(v_menu.id);
  return v_menu;
end;
$$;

revoke all on function public.get_or_create_public_menu(uuid) from public, anon;
grant execute on function public.get_or_create_public_menu(uuid) to authenticated;

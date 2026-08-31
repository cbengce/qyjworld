begin;

alter table public.partners
  add column archived_at timestamptz,
  add column archived_by uuid references auth.users(id) on delete restrict;

alter table public.partners
  add constraint partners_archive_state_check
  check (
    (archived_at is null and archived_by is null)
    or
    (archived_at is not null and archived_by is not null and status = 'inactive')
  );

create or replace function public.archive_partner(p_partner_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_partner public.partners;
  v_staff_id uuid := public.current_staff_user_id();
  v_previous_status text;
begin
  if auth.uid() is null or v_staff_id is null
     or not public.staff_has_permission('settings.manage', null, null, null) then
    raise exception 'Insufficient permission';
  end if;

  select p.* into v_partner
  from public.partners p
  where p.id = p_partner_id
  for update;

  if v_partner.id is null then
    raise exception 'Partner not found';
  end if;

  if v_partner.archived_at is not null then
    return jsonb_build_object(
      'status', 'already_archived',
      'partnerId', v_partner.id,
      'partnerCode', v_partner.partner_code,
      'archivedAt', v_partner.archived_at
    );
  end if;

  v_previous_status := v_partner.status;
  update public.partners
  set status = 'inactive',
      archived_at = now(),
      archived_by = auth.uid(),
      updated_at = now()
  where id = p_partner_id
  returning * into v_partner;

  insert into public.audit_logs (
    actor_staff_user_id, action, entity_type, entity_id, idempotency_key, metadata, created_by
  ) values (
    v_staff_id,
    'partner.archive',
    'partners',
    v_partner.id,
    'partner-archive:' || v_partner.id::text || ':' || extract(epoch from clock_timestamp())::text,
    jsonb_build_object(
      'partner_code', v_partner.partner_code,
      'previous_status', v_previous_status,
      'archived_at', v_partner.archived_at
    ),
    auth.uid()
  );

  return jsonb_build_object(
    'status', 'archived',
    'partnerId', v_partner.id,
    'partnerCode', v_partner.partner_code,
    'archivedAt', v_partner.archived_at
  );
end;
$$;

create or replace function public.restore_partner(p_partner_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_partner public.partners;
  v_staff_id uuid := public.current_staff_user_id();
  v_archived_at timestamptz;
begin
  if auth.uid() is null or v_staff_id is null
     or not public.staff_has_permission('settings.manage', null, null, null) then
    raise exception 'Insufficient permission';
  end if;

  select p.* into v_partner
  from public.partners p
  where p.id = p_partner_id
  for update;

  if v_partner.id is null then
    raise exception 'Partner not found';
  end if;
  if v_partner.archived_at is null then
    raise exception 'Partner is not archived';
  end if;

  v_archived_at := v_partner.archived_at;
  update public.partners
  set status = 'inactive',
      archived_at = null,
      archived_by = null,
      updated_at = now()
  where id = p_partner_id
  returning * into v_partner;

  insert into public.audit_logs (
    actor_staff_user_id, action, entity_type, entity_id, idempotency_key, metadata, created_by
  ) values (
    v_staff_id,
    'partner.restore',
    'partners',
    v_partner.id,
    'partner-restore:' || v_partner.id::text || ':' || extract(epoch from clock_timestamp())::text,
    jsonb_build_object(
      'partner_code', v_partner.partner_code,
      'previous_status', 'inactive',
      'previous_archived_at', v_archived_at,
      'restored_status', 'inactive'
    ),
    auth.uid()
  );

  return jsonb_build_object(
    'status', 'restored_inactive',
    'partnerId', v_partner.id,
    'partnerCode', v_partner.partner_code
  );
end;
$$;

revoke all on function public.archive_partner(uuid) from public, anon;
revoke all on function public.restore_partner(uuid) from public, anon;
grant execute on function public.archive_partner(uuid) to authenticated;
grant execute on function public.restore_partner(uuid) to authenticated;

commit;

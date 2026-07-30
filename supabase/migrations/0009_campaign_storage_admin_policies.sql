insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'campaigns',
  'campaigns',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists campaigns_public_read on storage.objects;
create policy campaigns_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'campaigns');

drop policy if exists campaigns_staff_insert on storage.objects;
drop policy if exists campaigns_staff_update on storage.objects;
drop policy if exists campaigns_staff_delete on storage.objects;
drop policy if exists campaigns_admin_insert on storage.objects;
drop policy if exists campaigns_admin_update on storage.objects;
drop policy if exists campaigns_admin_delete on storage.objects;

create policy campaigns_admin_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'campaigns'
    and exists (
      select 1
      from public.staff_users su
      join public.staff_role_assignments sra on sra.staff_user_id = su.id
      join public.roles r on r.id = sra.role_id
      where su.auth_user_id = auth.uid()
        and su.status = 'active'
        and su.deleted_at is null
        and sra.status = 'active'
        and sra.deleted_at is null
        and r.status = 'active'
        and r.deleted_at is null
        and r.role_code in ('super_admin', 'manager', 'staff')
    )
  );

create policy campaigns_admin_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'campaigns'
    and exists (
      select 1
      from public.staff_users su
      join public.staff_role_assignments sra on sra.staff_user_id = su.id
      join public.roles r on r.id = sra.role_id
      where su.auth_user_id = auth.uid()
        and su.status = 'active'
        and su.deleted_at is null
        and sra.status = 'active'
        and sra.deleted_at is null
        and r.status = 'active'
        and r.deleted_at is null
        and r.role_code in ('super_admin', 'manager', 'staff')
    )
  )
  with check (
    bucket_id = 'campaigns'
    and exists (
      select 1
      from public.staff_users su
      join public.staff_role_assignments sra on sra.staff_user_id = su.id
      join public.roles r on r.id = sra.role_id
      where su.auth_user_id = auth.uid()
        and su.status = 'active'
        and su.deleted_at is null
        and sra.status = 'active'
        and sra.deleted_at is null
        and r.status = 'active'
        and r.deleted_at is null
        and r.role_code in ('super_admin', 'manager', 'staff')
    )
  );

create policy campaigns_admin_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'campaigns'
    and exists (
      select 1
      from public.staff_users su
      join public.staff_role_assignments sra on sra.staff_user_id = su.id
      join public.roles r on r.id = sra.role_id
      where su.auth_user_id = auth.uid()
        and su.status = 'active'
        and su.deleted_at is null
        and sra.status = 'active'
        and sra.deleted_at is null
        and r.status = 'active'
        and r.deleted_at is null
        and r.role_code in ('super_admin', 'manager', 'staff')
    )
  );

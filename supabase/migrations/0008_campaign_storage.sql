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
  for select using (bucket_id = 'campaigns');

drop policy if exists campaigns_staff_insert on storage.objects;
create policy campaigns_staff_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'campaigns'
    and public.current_staff_user_id() is not null
  );

drop policy if exists campaigns_staff_update on storage.objects;
create policy campaigns_staff_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'campaigns'
    and public.current_staff_user_id() is not null
  )
  with check (
    bucket_id = 'campaigns'
    and public.current_staff_user_id() is not null
  );

drop policy if exists campaigns_staff_delete on storage.objects;
create policy campaigns_staff_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'campaigns'
    and public.current_staff_user_id() is not null
  );

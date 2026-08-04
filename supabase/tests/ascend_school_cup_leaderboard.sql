begin;

do $$
declare
  v_admin_auth uuid := '21000000-0000-0000-0000-000000000001';
  v_admin_staff uuid := '21000000-0000-0000-0000-000000000002';
  v_company uuid := '21000000-0000-0000-0000-000000000003';
  v_school uuid := '21000000-0000-0000-0000-000000000004';
  v_event uuid;
  v_total bigint;
  v_count integer;
  v_updated timestamptz;
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, raw_app_meta_data, raw_user_meta_data, updated_at)
  values (v_admin_auth, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ascend-school-admin@example.invalid', 'test', now(), '{}', '{}', now());

  insert into public.companies (id, legal_name, registration_no, country_code)
  values (v_company, 'ASCEND SCHOOL TEST COMPANY', 'ASC-SCHOOL-TEST', 'SG');

  insert into public.staff_users (id, auth_user_id, staff_no, full_name, email_raw, status)
  values (v_admin_staff, v_admin_auth, 'ASC-SCHOOL-TEST', 'School Test Admin', 'ascend-school-admin@example.invalid', 'active');
  insert into public.staff_role_assignments (staff_user_id, role_id, scope_type, company_id, status)
  select v_admin_staff, r.id, 'company', v_company, 'active' from public.roles r where r.role_code = 'super_admin' limit 1;

  insert into public.ascend_schools (id, school_name) values (v_school, 'Test School Alpha');

  select event_id, total_cups into v_event, v_total
  from public.record_ascend_school_cups(v_admin_auth, v_school, 7);
  if v_event is null or v_total <> 7 then raise exception 'FAIL: first event total'; end if;

  select event_id, total_cups into v_event, v_total
  from public.record_ascend_school_cups(v_admin_auth, v_school, 5);
  if v_total <> 12 then raise exception 'FAIL: append-only total'; end if;

  select count(*), max(last_updated) into v_count, v_updated
  from public.get_ascend_school_cup_leaderboard(10)
  where school_id = v_school and total_cups = 12;
  if v_count <> 1 or v_updated is null then raise exception 'FAIL: eligible school or last update missing'; end if;

  begin
    perform public.record_ascend_school_cups(v_admin_auth, v_school, 0);
    raise exception 'FAIL: zero cups accepted';
  exception when others then
    if sqlerrm = 'FAIL: zero cups accepted' then raise; end if;
  end;

  begin
    update public.ascend_school_cup_events set cups = 99 where id = v_event;
    raise exception 'FAIL: event update accepted';
  exception when sqlstate '55000' then null;
  end;

  begin
    perform public.record_ascend_school_cups(gen_random_uuid(), v_school, 1);
    raise exception 'FAIL: unauthorised actor accepted';
  exception when insufficient_privilege then null;
  end;

  update public.ascend_schools set is_active = false where id = v_school;
  if exists (select 1 from public.get_ascend_school_cup_leaderboard(10) where school_id = v_school) then
    raise exception 'FAIL: inactive school remains public';
  end if;

  raise notice 'PASS: ASCEND school cup leaderboard tests';
end;
$$;

rollback;

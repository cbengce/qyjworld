# Supabase Setup Guide

1. Create a Supabase project.
2. Open SQL Editor or use the Supabase CLI.
3. Run the files in `supabase/migrations` in filename order.
4. Run `supabase/seed.sql`.
5. In Authentication settings, configure the site URL:

```text
https://www.qyjworld.com
```

6. Add redirect URLs:

```text
https://www.qyjworld.com/api/auth/callback
http://localhost:3000/api/auth/callback
```

7. Confirm row-level security is enabled on all Phase 1 tables.

## Admin Account Setup

1. Create the first admin user in Supabase Auth.
2. Find that user's Auth UUID.
3. Insert the staff user:

```sql
insert into staff_users (auth_user_id, staff_no, full_name, email_raw)
values ('PASTE_AUTH_USER_UUID_HERE', 'QYJSA001', 'Owner Name', 'owner@example.com');
```

4. Assign Super Admin at company scope:

```sql
insert into staff_role_assignments (staff_user_id, role_id, scope_type, company_id)
select su.id, r.id, 'company', c.id
from staff_users su
cross join roles r
cross join companies c
where su.email_normalized = 'owner@example.com'
  and r.role_code = 'super_admin'
  and c.legal_name = 'TCM AND HEALTHCARE COLLEGE PTE LTD';
```

5. Log in at `/en/login`.
6. Open `/en/admin`.

Only Super Admin users should manage staff roles.

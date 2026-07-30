-- Qing Yun Jian Phase 1 service helper privilege verification.
-- Read-only. Confirms browser roles still cannot execute normalization helpers
-- while service_role can execute them for trusted server-side writes.

with checked_roles(role_name) as (
  values ('anon'), ('authenticated'), ('service_role')
),
checked_functions(function_identity) as (
  values
    ('public.normalize_email(text)'),
    ('public.normalize_mobile(text)')
)
select
  r.role_name,
  f.function_identity,
  has_function_privilege(r.role_name, f.function_identity, 'EXECUTE') as has_execute,
  case
    when r.role_name = 'service_role' then 'expected true'
    else 'expected false'
  end as expectation
from checked_roles r
cross join checked_functions f
order by r.role_name, f.function_identity;

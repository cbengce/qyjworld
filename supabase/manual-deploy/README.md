# Qing Yun Jian Manual Supabase Deployment

No remote database changes have been made by Codex. This folder is a manual deployment package for a new empty Supabase development project.

## Files

Run these files in this exact order:

1. `01_phase1_schema.sql`
2. `02_seed.sql`
3. `03_verify.sql`
4. Review verification results
5. `06_privilege_patch.sql`
6. `07_privilege_verify.sql`
7. `04_constraint_tests.sql`
8. `05_rls_tests.sql`
9. `08_rpc_extension_search_path_patch.sql` only if hosted Supabase reports `function gen_random_bytes(integer) does not exist`
10. `10_service_helper_privilege_patch.sql` only if the local app reports `permission denied for function normalize_email` or `permission denied for function normalize_mobile` during server-side bootstrap/registration writes
11. `11_service_helper_privilege_verify.sql` after running `10_service_helper_privilege_patch.sql`

## Where To Run

1. Open the Supabase Dashboard.
2. Open your development project.
3. In the left sidebar, open **SQL Editor**.
4. Click **New query**.
5. Open the matching SQL file locally.
6. Paste the full file contents into the SQL Editor.
7. Click **Run**.

Run only one file at a time. Wait for the result before continuing.

## If An Error Appears

Stop immediately. Do not continue to the next file.

Record:

- file name
- exact error message
- line number if Supabase shows one
- screenshot of the SQL Editor result if convenient

Then return that exact error for correction.

## Notes

- `01_phase1_schema.sql` is for one-time execution in a new empty Supabase project.
- `02_seed.sql` is safely rerunnable where practical and inserts only approved seed data.
- No invented menu products, descriptions, or prices are inserted.
- `03_verify.sql` is read-only.
- `06_privilege_patch.sql` grants the required PostgreSQL privileges while keeping RLS enabled.
- `07_privilege_verify.sql` is read-only and reports effective table/RPC privileges.
- `04_constraint_tests.sql` and `05_rls_tests.sql` run in transactions and roll back test data.
- The RLS tests create temporary development-only auth users inside the transaction.
- `08_rpc_extension_search_path_patch.sql` is a runtime compatibility patch for Supabase projects where `pgcrypto` functions resolve through the `extensions` schema.
- `10_service_helper_privilege_patch.sql` grants only service-role EXECUTE on normalization helpers used by generated columns. It does not grant browser roles direct mutation access and does not alter RLS.

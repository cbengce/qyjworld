# Supabase Security — Stage 1 Isolation & Test Plan (2026-11-08)

**Status: partially executed; no database changes.** Owner approved test-environment preparation and testing, **not** production remediation or deployment.

## Confirmed environments
- Production/operational: `qingyunjian-dev` (`cfysrlrcnrbbcgahohlq`), ACTIVE_HEALTHY at inspection.
- Historical test: `qingyunjian-db-test` (`paomadskfmnpgluawzuv`), INACTIVE, region ap-northeast-1. **Not restored**: assess costs, credentials, cron/webhooks and data isolation before activation.
- Supabase project branches: none.
- Code-only work branch: `audit/supabase-security-stage1-20261108`. Do not merge without another approval.
- Existing migration history includes `0013_public_leaderboard_view` and `0032_appzpos_getorders_partner_integration`. Live leaderboard view now computes ranks with `row_number()`, differing from historical migration 0013. Do not replay migration 0013 over live state.

## Read-only verified baseline
| Security advisor finding | Count | Severity | Proposed priority |
|---|---:|---|---|
| Security-definer view | 1 | ERROR | P1 |
| Anonymous executable security-definer functions | 8 | WARN | P1 |
| Authenticated executable security-definer functions | 34 | WARN | P1/P2 |
| RLS enabled without policy | 10 | INFO | Investigate, may be deny-all by design |
| Mutable function search path | 8 | WARN | P2 |
| Extension in public | 1 | WARN | P3 |
| Leaked password protection disabled | 1 | WARN | P2 |

- `public.public_community_leaderboard_entries` is a view, `reloptions=NULL`, and role `anon` has SELECT. Its live definition exposes leaderboard fields and calculated ranks, but invoker/underlying RLS protection remains to be reviewed.
- Anonymous-executable SECURITY DEFINER RPCs found: `audit_store_menu_change`, `current_customer_id`, `current_staff_user_id`, `get_ascend_personal_rank`, `get_ascend_public_leaderboard`, `get_ascend_school_cup_leaderboard`, `staff_has_permission`, `validate_store_ordering_url`.
- Ten zero-policy RLS tables were verified including POS credential/polling state and ASCEND tables. **Do not create public policies merely to silence the advisor.**
- Performance advisor also reported 136 unindexed FKs, 55 multiple-permissive-policy findings, 6 auth-RLS-initplan warnings and 15 unused-index notices; prioritize measured risk, not warning count.

## Intended isolated test gates (NOT RUN)
1. Confirm non-production credentials, safe webhooks/cron isolation, synthetic data, and any project or branch cost.
2. Capture exact DDL/RLS/function definitions and known-good migrations from the current deployment.
3. Draft least-privilege changes as reviewable, reversible migrations only in test.
4. Anonymous cannot access member, partner, POS token or internal records; intentional public leaderboard/menu access remains functional.
5. Test membership activation/expiration, staff authorization, partner RLS, store-specific product/hours, POS 15-min poll and idempotent provider/store/reference ingestion.
6. Confirm PAID/COMPLETED/CANCELLED behavior, cup counting, commission accounting and no duplicate rewards.
7. Run test security/performance advisors, test recovery and rollback with synthetic data.
8. Submit test evidence and deployment plan for **separate explicit production approval**.

## No-go list
No production `ALTER`, `REVOKE`, `GRANT`, `DROP`, migrations, writes, deployments, merges or credential exports. No test project restore / paid branch creation without reviewing cost and isolation.

Tracking: https://github.com/cbengce/qyjworld/issues/42

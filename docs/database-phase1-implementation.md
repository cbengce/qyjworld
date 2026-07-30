# Phase 1 Database Implementation

## Migration Order

1. `0001_extensions_and_types.sql`
2. `0002_core_tables.sql`
3. `0003_indexes_and_triggers.sql`
4. `0004_security_and_business_functions.sql`
5. `0005_rls_policies.sql`
6. `supabase/seed.sql`

## Membership Status Rules

- `pending`: created after registration. No validity period has started.
- `active`: manually activated by a Manager or Super Admin after payment confirmation.
- `expired`: no longer valid. Renewal starts a fresh 60-day period from reactivation time.
- `suspended`: restricted access; Phase 1 suspension does not pause expiry.
- `cancelled`: closed and excluded from normal renewal.

Only one `active` membership can exist per `customer_id + brand_id`, enforced by a partial unique index.

Renewal behavior:

- Active renewal before expiry extends from the current `expires_at`.
- Expired renewal starts from reactivation time.
- Exceptional extension writes both `membership_events` and `audit_logs`.

## Contact Identity

Phase 1 login uses Supabase Auth email/password. Business data stores raw and normalized mobile/email values. Uniqueness uses normalized values.

## Points Safety

The browser never supplies trusted `balance_after`. Points changes must use secure database functions that lock the points account, read the latest balance, validate the mutation, insert the ledger entry, and write an audit log in one transaction.

## Referrals

Referrals are brand-scoped with `unique (brand_id, referred_customer_id)`. Triggers verify the referral code belongs to the same brand and to the referrer. Self-referral is blocked.

## Rollback Guidance

Before launch, rollback by dropping objects in reverse migration order or resetting the Supabase database. After production data exists, do not destructive-rollback append-only tables. Use corrective forward migrations and preserve points, membership events, referral rewards, and audit logs.

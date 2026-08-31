# Corporate Partner Referral System - Phase 1

## Responsibility boundary

QYJ routes and attributes partner traffic, receives authenticated POS events, records transaction facts, calculates partner commission, and reconciles its own ledger. The POS remains responsible for menu, cart, discounts, checkout, payment, refunds, and payment status.

## Development setup

1. Apply `0022_corporate_partner_referrals.sql` to an empty development branch after prior migrations.
2. Set `POS_PROVIDER=mock`, `POS_ORDER_BASE_URL`, `POS_WEBHOOK_SECRET`, parameter names, and a random `PARTNER_IP_HASH_SECRET` in the secure server environment.
3. Create a partner at `/{locale}/admin/partners` and optionally map a Supabase Auth user UUID.
4. Visit `/api/partner/route?partner=PARTNER_CODE` to create attribution and redirect.
5. POST a mock normalized payload to `/api/webhooks/pos` with the secret in `x-qyj-mock-secret`.
6. Review `/{locale}/partner/dashboard`, `/{locale}/admin/partner-transactions`, `/{locale}/admin/webhook-events`, and `/{locale}/admin/reconciliation`.
7. Run `supabase/tests/corporate_partner_referrals.sql` only against a development database. It rolls back fixtures.

## Supplier information still required

- Final ordering URL and supported partner/reference parameter names.
- Whether the POS stores and returns the QYJ referral reference on payment and refund events.
- Webhook authentication/signature algorithm, timestamp tolerance, and replay protection.
- Exact payment, void, cancellation, partial-refund, and full-refund payload schemas.
- Stable event, order, and transaction identifiers.
- Monetary units, tax treatment, currency semantics, and gross-sale definition.
- Retry schedule, timeout behavior, ordering guarantees, and event timing.
- Cup quantity representation.
- Production-safe test procedure and sample signed payloads.
- Transaction-status query or daily POS report/API for two-sided reconciliation.

The mock adapter is development-only. The unconfigured adapter fails closed and never guesses production fields.

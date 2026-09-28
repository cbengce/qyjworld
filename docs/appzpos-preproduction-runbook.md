# APPZPOS pre-production verification and activation runbook

Status: prepared only. This document does not authorise a Production migration, deployment, credential entry, scheduler activation or live supplier call.

## Accepted owner decisions

1. Provider-order idempotency is intentionally store-scoped as `(provider, provider_store_id, order_reference)`. APPZPOS references are not assumed to be globally unique across stores.
2. The current model permits one APPZPOS provider store ID per internal store through `unique (provider, store_id)`. Supporting multiple provider IDs for one internal store requires a future reviewed migration.
3. Initial Production scope is one store. Polling remains every 15 minutes with a shared limit of 12 reservations/hour. At one one-window request per invocation, the current design supports a maximum of three stores at that cadence; historical backfills consume additional reservations and must not run concurrently with routine polling without capacity planning.
4. Initial cup quantity is `sum(itemList[].quantity)` because the current APPZPOS catalogue contains cup-bearing drink products. Before any non-drink merchandise is sold through APPZPOS, implement an admin-managed `counts_as_cup` product rule and migrate aggregation to use it.
5. Migration `0032` is explicitly enclosed in `BEGIN/COMMIT`. Its table, index, function, policy, RLS and grant statements are PostgreSQL transactional DDL and it performs no external or non-transactional operation.
6. The preserved partner commission formula is `round((APPZPOS subTotal / 100) * partners.partner_reward_rate, 2)` in currency units. The rate remains admin-editable; no new commission base is introduced.

The disposable GitHub Actions rehearsal passed on `ubuntu-latest`: the complete canonical migration chain, `supabase/tests/appzpos_getorders_partner_integration.sql`, authenticated partner isolation, anonymous denial and the service-role write path all succeeded. Hosting ownership evidence, credentials, Production migration execution, application deployment, a manually approved live poll and cron activation remain separate operational approvals.

## Confirmed deployment evidence

- `docs/deployment.md` is titled `Vercel Deployment` and directs the repository to be imported into Vercel.
- `README.md` describes the application as Vercel-compatible.
- `docs/student-month-0018-deployment-runbook.md` refers to the Vercel Production commit.
- The Git remote identifies the GitHub source repository, but does not prove the currently connected Vercel project, team or Production deployment.

Owner evidence still required before activation:

1. Vercel team and project name.
2. Production domain and current Production deployment commit SHA.
3. Vercel plan and function-duration limits.
4. Confirmation that the GitHub repository is connected to that Vercel project.
5. Confirmation that initial Production scope remains one store. The accepted current ceiling is three one-window stores at the 15-minute cadence.

## Prepared environment variables

Use `.env.appzpos.example` as the placeholder-only shape. Store real APPZPOS credentials, `CRON_SECRET` and the Supabase service-role key only in Vercel encrypted environment variables. Never place them in Git, build logs, query strings or client-prefixed variables.

## Prepared Vercel scheduler

`docs/vercel-appzpos-cron.example.json` is deliberately inert. After approval, merge its `crons` entry into a root `vercel.json`. Vercel invokes the path with HTTP GET and sends `CRON_SECRET` as `Authorization: Bearer <value>`.

The accepted initial schedule is every 15 minutes for one Production store. The shared 12-request/hour cap supports at most three stores when every invocation requires one request window. Reduce frequency or redesign batching before adding a fourth store, and reserve separate rate-limit capacity for backfills.

## Financial mapping and commission verification

- `item_discount_minor = sum(itemList[].discountAmount)`.
- `discount_minor = orderDetails.discountAmount`.
- `coupon_discount_minor = orderDetails.couponDiscountAmount`.
- `total_payable_minor = orderDetails.totalPayableAmount`; it is never recalculated.
- Modifier `additionalPrice` values are preserved in `item_list` and excluded from discount calculation.
- Commission eligibility passes `orderDetails.subTotal` directly to the existing paid-event function. Migration `0029` calculates `round(v_gross * partners.partner_reward_rate, 2)`.

The available sanitized evidence for `OR822`, `OR818`, `OR808` and `OR806` confirms their referral codes and item discounts, but does not include their `subTotal` values or enough receipt detail to prove whether APPZPOS reports `subTotal` before or after item discounts. Do not infer this from the 5% discount. At a 5% partner rate, the expected commissions are therefore:

| Order | Verified item discount | Expected commission |
| --- | ---: | ---: |
| OR822 | S$0.30 | `round((OR822.subTotal / 100) × 0.05, 2)` |
| OR818 | S$0.30 | `round((OR818.subTotal / 100) × 0.05, 2)` |
| OR808 | S$0.35 | `round((OR808.subTotal / 100) × 0.05, 2)` |
| OR806 | S$0.30 | `round((OR806.subTotal / 100) × 0.05, 2)` |

The one-day controlled verification must record each returned `subTotal`, compare it with the item base, item discount and modifier charges, and classify APPZPOS `subTotal` as pre- or post-item-discount before automatic polling is activated. This is a live business-observation item, not a code-side formula decision: the formula remains unchanged either way because APPZPOS is authoritative.

## Production migration checklist

1. Obtain explicit owner approval naming migration `0032` and the exact Supabase project ref.
2. Verify the target is Production and record a masked project ref; do not infer it from `.temp` files alone.
3. Confirm migrations `0028`, `0029`, `0030` and `0031` prerequisites exist by object/fingerprint checks. Do not repair migration history or run `db push --include-all`.
4. Take a restorable database backup and record its identifier and retention.
5. Capture row counts and content fingerprints for `partners`, `partner_users`, `partner_referral_sessions`, `pos_transactions`, `partner_commission_ledger` and `webhook_events`.
6. Preflight for conflicting object names and function signatures introduced by `0032`.
7. Review enabled stores and create explicit `pos_provider_store_mappings`; do not invent Production mappings.
8. Apply only the exact reviewed `0032` SQL using the previously approved isolated execution path.
9. Verify tables, constraints, indexes, RLS state, policies, grants and function ownership/search paths.
10. Re-run protected-table row counts and fingerprints. Existing rows must be unchanged.
11. Keep APPZPOS credentials and the scheduler absent/disabled until application deployment and smoke tests pass.
12. Deploy the reviewed application commit only under separate approval.
13. Add Vercel secrets, then make one manually authorised short-range poll before enabling the cron.

## Rollback

Preferred pre-activation rollback:

1. Disable or omit the Vercel cron and remove APPZPOS secrets from the deployment environment.
2. Redeploy the previous application commit.
3. Leave the additive `0032` tables dormant. This avoids destructive data loss and is the safest rollback.

Database rollback before any provider orders exist, with separate destructive-change approval:

1. Verify all five `0032` tables are empty and no APPZPOS rows exist in `webhook_events`, `pos_transactions` or `partner_commission_ledger`.
2. Revoke the `0032` grants and drop its policy/functions first.
3. Drop `pos_access_tokens`, `pos_poll_requests`, `pos_poll_state`, `pos_provider_orders` and `pos_provider_store_mappings` in dependency order.
4. Recheck protected-table fingerprints.

After polling has written data, do not use a drop-based rollback. `process_partner_pos_event` may have created financial/audit rows outside the new tables. Disable ingestion, preserve evidence and use a reviewed forward correction or restore from the approved backup.

## One-day live verification for 27 September 2026

This plan requires separate approval and real credentials; it must not be run during pre-production verification.

1. Keep the cron disabled.
2. Confirm the approved store mapping and Singapore window `2026-09-27 00:00:00.000` through `2026-09-28 00:00:00.000`.
3. Trigger one authenticated manual poll and record only sanitized counts, order references, statuses and monetary cents.
4. Verify exactly one provider-order row for each expected reference: `OR822`, `OR818`, `OR808`, `OR806`.
5. Verify referral attribution: `OR822`/`OR806` to `TEF001`; `OR818`/`OR808` to `IBISM2`.
6. Verify item discounts in cents: `30`, `30`, `35`, `30` respectively. Do not calculate an assumed five percent.
7. Verify order and coupon discounts remain separate and `total_payable_minor` equals the APPZPOS value.
8. Inspect item modifiers to confirm their additional charges are preserved but not added to the item-discount field.
9. Repeat the identical poll and verify provider-order, POS transaction and commission-ledger counts do not increase.
10. Poll with a 15-minute overlap and verify no duplication and any status update changes the existing provider-order row.
11. Compare partner and admin dashboards, confirming cancelled orders do not enter completed totals.
12. Review `pos_poll_requests`, `pos_poll_state`, unknown/inactive referral matches and sanitized error logs.

## Automatic polling activation after approval

1. Obtain separate approvals for the Production migration, application deployment, credential entry, manual live poll and cron activation.
2. Apply and verify `0032` using the checklist above.
3. Deploy the exact approved commit with the cron configuration still absent.
4. Add `APPZPOS_STORES_JSON` and `CRON_SECRET` to the Vercel Production environment; confirm `SUPABASE_SERVICE_ROLE_KEY` targets the approved project.
5. Create and verify the Production store mappings.
6. Run the one-day manual verification above.
7. Merge the reviewed cron entry into root `vercel.json`, deploy, and confirm it appears in Vercel Settings > Cron Jobs.
8. Observe the first two invocations and verify leases, checkpoints, counts, status codes and sanitized logs.
9. Keep a named owner and alert path for failed polls, unknown referral codes and stale checkpoints.


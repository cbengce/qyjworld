# Partial purchase deliveries

Migration 0036 and the bilingual `/admin/inventory/purchasing/receipts` route add receipt confirmation against an existing purchase line. No Production migration or deployment has occurred.

Each receipt records delivery reference, received date, destination location, expected delivery, accepted, damaged/rejected and short quantities plus notes and actor. Quantities use the material base unit. Accepted + damaged + short must equal this delivery's expected quantity. That quantity cannot exceed the remaining unfulfilled order quantity.

Only accepted quantity increases stock. Outstanding quantity is ordered minus all accepted receipts. Damage/shortage therefore remains outstanding for replacement; it is not automatically written off or marked fulfilled. Example: ordered 1,000; first expected 400, accepted 380, damaged 10, short 10; outstanding becomes 620. A later receipt can accept 620 including replacements. An all-short or all-damaged delivery is recorded without adding stock. Cancelling the outstanding balance and supplier credit/refund handling are separate workflows not yet implemented.

The RPC locks the purchase line, validates central purchasing and destination posting permissions, checks same-brand destination, recomputes outstanding quantity, and atomically creates receipt, inventory movement and audit records. Exact retries return the prior receipt. Duplicate delivery references and failed validation roll back the complete transaction, including any attempted stock movement. Receipt records cannot be overwritten/deleted. Different delivery references are required for later batches. Do not also enter the same goods in the generic manual receipt form.

The page shows ordered, accepted and outstanding quantities per line using exact decimal arithmetic, with delivery history. It does not infer receipt from payment, supplier dispatch or an accepted purchase. Stock valuation/freight allocation is not finalised by this workflow.

Validation covers partial deliveries, damaged/short goods remaining outstanding, replacements, safe retry, duplicate-reference rollback, over-receipt rejection, incorrect quantity sums, final stock reconciliation, immutable receipts and RPC-only write privileges, plus existing POS and application regression checks. Current implementation serialises competing receipt operations; large-scale multi-session load testing remains outside these checks.

# Purchasing increment

Implemented on inventory-foundation; not deployed to Production.

- Suppliers require platform (Pinduoduo, Douyin, Taobao, WeChat), company name and shop/supplier name as separate fields. No inferred legal names or seeded supplier records.
- Supplier identities are snapshotted on each purchase record. Editing a supplier later does not rewrite historical purchases.
- Atomic, idempotent purchase entry stores original currency, platform order reference, material, package count, conversion snapshot and goods amount. Initial form supports one material per record, with a line suffix on the external reference. A multi-line order editor is still needed before broad staff rollout.
- Partial payments store order-currency amount, actual SGD debit, separate SGD fee, date and payment reference. No payment provider is called and no money is transferred.
- Separate transport batch, purchase-line membership, allocation basis and charge tables are prepared. Charges distinguish China delivery, international freight, insurance, clearance, local delivery and other costs, plus original currency and estimated/actual SGD amounts.
- The freight preview uses exact integer cents and largest remainders with stable ID tie-breaking. A preview does not save an allocation or post landed cost. All weights in one allocation must use the same basis.
- Existing stock, POS, commissions, menu and checkout behaviour remain unchanged. Purchase entry never implies receipt. Existing authenticated brand/company inventory-manage permission is required for purchasing.

Remaining before operational purchasing completion: multi-line order editing, additional lines for existing purchases, purchasing correction/void workflow, payment-total reconciliation, transport batch entry UI, transport-to-receipt linkage, saved allocation revisions and final landed valuation. Estimates must remain labelled and cannot be treated as paid actual cost. Partial payments cannot establish final whole-order unit cost. Avoid charging the same freight/fee both in goods payment and shipment charges. Taxes and accounting treatment remain outside this increment.

Validation: exact-decimal/cent-conservation cases and existing npm tests; full migration chain and inventory plus existing APPZPOS SQL assertions in disposable PostgreSQL/PGlite. GitHub CI runs real Supabase/PostgreSQL assertions and app build. No live migration or real purchasing data was used.

Partial receipt confirmation against purchase lines is now implemented in migration 0036; see partial-receipts.md. It posts accepted quantities only and retains damaged/short quantities as outstanding.

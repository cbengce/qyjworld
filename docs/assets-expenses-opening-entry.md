# Assets, monthly costs and initial stock entry

This increment is prepared on the inventory development branch. It has not been applied to the live database or deployed to Production.

## Data location and entry points

All business records remain in the existing Supabase/PostgreSQL database. References attach data to the existing brand, outlet and inventory location. These are new additive tables, not replacement customer/menu/POS tables.

- `/admin/inventory/opening`: first-entry checklist and batch opening counts for existing material masters, up to 100 rows per batch. Staff select a warehouse/outlet and material names; no database IDs need typing. All rows succeed together or roll back together. Zero counts are recorded and cannot be silently reinitialised. Existing stock must use stocktake.
- `/admin/inventory/finance`: fixed assets, manual monthly budgets/actual expenses, month selection and depreciation preview.
- `/admin/inventory/finance/export`: authenticated partial-accounting Excel export with Read me, Fixed assets and Monthly costs sheets. Budget is separate from actual expense; neither proves payment. This is not a complete P&L or Balance Sheet.

Opening counts mean physical stock at the chosen start point, not all purchases since the business began. Do not both enter current opening stock and replay historical deliveries into it. Material/supplier masters must be entered first; bulk supplier/material-master creation is not part of this count batch.

## Fixed assets

Equipment/TV records retain supplier, outlet/shared use, asset reference, model, acquired date, cost (actual/estimated), explicit depreciation-start month and residual value. Useful life is 36 months. The start month cannot predate acquisition month. The entered SGD cost is the reconciled landed asset cost; this increment does not automatically allocate purchase/shipment costs into assets.

The monthly preview uses full-month straight-line depreciation. Integer-cent remainders are distributed across the initial months so 36 charges exactly equal cost minus residual. No tax depreciation or capital-allowance calculation is implied. Prior accumulated depreciation/carrying values must be reconciled for existing equipment; this entry does not import another accountant's historical books. Future-acquired assets are excluded from earlier-month reports. Estimated costs remain labelled, including in Excel.

## Monthly costs

Rent, season parking, utilities, network, salary summaries and other costs can be entered as either budget or actual for an explicit month. Entries retain outlet/shared scope, document reference and notes. They do not transfer money or create a payment confirmation. Recurring monthly generation, attendance, CPF, deductions and individual payroll are not implemented. Records are append-only; a correction/void workflow remains a follow-up.

## Stock deductions: current boundary

Partial purchase receipts already add accepted quantity to the selected location. Warehouse-to-outlet dispatch/receipt transfers and automatic POS/recipe deductions are not yet activated. Once those workflows are built and reconciled, sales at MacPherson deduct from MacPherson's own stock, not from the warehouse again. Cup sizes require confirmed POS product mappings; ingredients require recipes/preparation batches. Physical counts remain the check against theoretical stock.

## Preview and checks

`docs/ui-previews/finance.png` and `opening.png` show actual server-page layouts rendered with explicitly labelled fixture data. No demo records are inserted in a real database. `scripts/render-inventory-entry-preview.cjs` generates the preview markup after an application build; the local screenshot tool/fonts are temporary preview dependencies, not production dependencies.

Validation includes the complete canonical migration chain, RLS and original APPZPOS regression tests; opening-batch rollback/retry/zero-count checks; exact depreciation totals and residual cases; Excel round-trip, safe string cells, permissions and fail-closed export checks; app tests, typecheck, lint and build. Production setup still requires verified target, backup and exact additive migrations, not a database reset.

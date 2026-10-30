# Inventory foundation: implementation and connection audit

Status: foundation prepared on an isolated branch; not applied to Production.
No live credentials, supplier calls, Production database writes or scheduler changes were used.

## Existing integration points checked

| Existing component | Foundation decision |
| --- | --- |
| `companies` / `brands` / `stores`, migrations 0002 and 0030 | Reference existing identities. Never seed guessed outlets, warehouses or balances. No changes to opening hours or store identity. |
| `products`, `menus`, `menu_items` | Keep customer-facing drink SKUs separate from internal material SKUs. No automatic availability change. A future recipe/version model will reference existing products. |
| `staff_users`, `roles`, `permissions`, `staff_role_assignments` | Add three inventory permissions and reuse company/brand/store assignments. Exclude inactive and soft-deleted staff, roles and assignments. Store staff cannot access other stores or the central warehouse. |
| `audit_logs` / `write_audit` | Record master changes and each successful inventory movement in the existing audit system. |
| `pos_provider_orders.item_list`, migration 0032 | Available future mapping source. No inventory deduction hook yet; product/modifier mapping and deduplication across sales channels must precede activation. |
| `scripts/appzpos-sync.cjs`, installer and API route | Existing ingestion paths remain unchanged. Owner confirmed the AliCloud fixed-IP/whitelist arrangement; this work did not log into or verify that server. |
| Partner commission and reconciliation modules | No formula, payment status, dashboard or existing transaction changes. |

The existing APPZPOS polling reservation cap is 12 requests/hour. The current documented
15-minute, one-window-per-store polling strategy fits at most three stores before backfill
traffic. Multi-store inventory has no fixed store-count limit, but POS scheduling needs
separate redesign/capacity validation before larger rollouts. Do not promise 100-store
throughput based solely on this schema.

## Implemented database boundary

Migration `0033_inventory_foundation.sql` adds six tables:

- `inventory_materials`: internal automatic SKU, name, category (ingredient, packaging,
  gift, consumable), base unit (`each`, `g`, `ml`), optional attributes such as colour.
- `inventory_material_units`: material-specific box/bottle/bag conversion into the base
  unit. Does not equate millilitres and grams. Future receipt entry must snapshot the
  entered purchase quantity and the conversion used; changing a conversion must never
  reinterpret posted movements.
- `inventory_locations`: existing-store locations or brand-level warehouses; no hard-coded
  store list. Store ownership must match the location brand and is immutable.
- `inventory_balances`: current quantity per material/location. Readable only within scope;
  writable only through the movement function.
- `inventory_movements`: append-only opening, receipt, issue, consumption, wastage and
  documented stocktake adjustment, in base units with actor, reason and timestamps.
- `inventory_reorder_settings`: per-location thresholds and lead time. No alerts or
  purchasing automation are activated by this foundation.

`post_inventory_movement` checks staff scope, material/location ownership, active status,
quantity direction/precision, whole counts for `each`, sufficient stock and a reason.
It serialises balance changes and idempotent retries in one transaction. Reusing a key
with different input fails. A retry of the same operation returns the original ID without
changing the stock again. An opening movement is allowed only before any other movement
for that material/location. Historical base units and location ownership cannot change;
create a replacement master instead. Staff may archive masters but cannot hard-delete them.

Only existing active `super_admin` roles receive the new permissions. No employee role
assignment is invented. Store permissions can be granted later through the existing role
model. API calls must use the authenticated staff session. Anonymous users have neither
table access nor RPC execution; the service role has read-only access to new tables and
cannot directly write balances/ledger. Future background deductions require a separate,
narrowly scoped and reviewed service API, not broad direct write grants.

Quantity is not money. Currency conversion, freight allocation, landed valuation and
cost history belong to the next purchasing phase. No estimated costs or owner data are
invented. Colour can be stored as an optional attribute without per-sale colour tracking.

## Admin entry added in the next increment

The bilingual route `/en/admin/inventory` or `/zh/admin/inventory` now provides material
creation, outlet/warehouse location creation, packaging conversions, opening/receipt/use/
wastage entry, physical counts, quantity history and reorder settings. Writes use the
logged-in staff session and the database permission boundary, never a service key.
The existing administrator navigation adds one inventory link for Super Admin.

Migration `0034_inventory_stocktake.sql` adds immutable counted-stock records and an
atomic stocktake RPC. It validates the displayed expected balance under a row lock; if
stock changed while the form was open it rejects the stale count. Both changed and
matching counts are recorded. Only a changed count posts an adjustment. Full expected/
counted values, actor and reason are retained for exact retry validation.

Form submission IDs survive errors, and successful submissions receive a fresh ID.
Database errors map to short bilingual messages without exposing raw database details.
Quantity inputs are exact decimal strings, with no exponent notation or implicit package
conversion. History displays the latest 50 records in Singapore time. Catalogue/balance
reads paginate and fail explicitly at their safety limit rather than silently truncating.
When the module cannot load, write forms are hidden and the page says it is unavailable;
missing stock is never presented as a completed count.

This increment does not include purchasing costs, receipt document upload, transfers,
recipe deductions or notification delivery. Receiving here records quantity only.

## Explicitly deferred business workflows

- Supplier/purchase documents, CNY payments, actual SGD payments, transport batches,
  freight allocation and final versus provisional landed cost.
- Transfer dispatch, in-transit quantity, receiving confirmation and discrepancies. An
  `issue` is **not** a completed branch transfer. A future transfer document must link
  the two locations with explicit dispatch/receipt stages.
- Recipe versions, prepared tea/jelly batches, lot-level stock, expiry/FEFO and opening
  dates. This foundation has location-level quantity, not batch-level traceability.
- POS/online product mapping, modifiers, cup-bearing merchandise flags, automated
  deductions and refund/consumption treatment. No cup colour inference.
- Bulk imports, notifications, valuation reports and user training.

## Validation and release

Run the existing application checks (`npm test`, `npm run typecheck`, `npm run lint`) and
the production build. In a disposable Supabase database after a full migration reset, run:

```sh
psql "$INVENTORY_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/inventory_foundation.sql
psql "$INVENTORY_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/appzpos_getorders_partner_integration.sql
```

The inventory SQL test rolls back all fixtures and exercises authorised posting, retry
idempotency, negative-stock protection, decimal precision, invalid direction, cross-brand
rejection, per-store isolation, ordinary customer denial, soft-deleted assignment denial,
immutable movements, master identity protection and audit counts. The separate CI job uses
an ephemeral real Supabase/PostgreSQL instance; no Production secrets are referenced.

Before any live application: establish the exact target project and applied migration
state, take a restorable backup, snapshot existing tables, run the SQL tests in staging,
review migrations 0033 and 0034 and apply only those exact additive migrations. Do not run a blanket
database reset or replay older migrations against Production. No Production connection
was available/used in this work. Safe rollback is to leave the additive tables dormant;
the inventory route is isolated from existing sales and public pages. Do not drop tables once real inventory has been posted.

## Verification recorded for this branch

- Existing `npm test`, TypeScript check, ESLint and the production build passed locally for the foundation. Subsequent admin changes have their own checks.
- The complete canonical migration chain, seed, new inventory SQL assertions and existing
  APPZPOS/partner SQL assertions passed in disposable PGlite PostgreSQL with local
  Supabase auth/storage schema stand-ins. This validates database behaviour, not live
  Supabase configuration or multi-session load.
- Before applying 0033, the local rehearsal captured content fingerprints for seeded
  stores, products, menus, menu items, customers, memberships, partners, POS transactions,
  commission ledger and provider orders. All fingerprints were unchanged after 0033.
- A real Supabase/PostgreSQL GitHub Actions rehearsal is configured separately. Its
  outcome must be checked before deployment; this document does not predeclare a pass.

The admin increment adds automated action tests and EN/ZH server rendering tests via
`scripts/test-inventory-admin.cjs`, included in `npm test`.

## Production activation preparation — 30 October 2026

Owner requested real database persistence while retaining all existing functionality.
This request authorises activation, but the production Supabase connection is not yet
available in this session. Do not describe the production module as activated until
migration and authenticated save/reload checks have succeeded against the verified project.

- Migration 0038 adds supplier country and default currency, direct/other platforms,
  and MYR alongside CNY/SGD. Existing supplier origins are not guessed. Orders retain
  supplier origin/currency snapshots even if the supplier is later edited.
- The existing `/[locale]/admin/operations` entrance selects the live inventory page
  only after all required inventory tables/columns are readable. Otherwise it clearly
  reports activation pending and retains the browser preview.
- Prior preview entries remain accessible at `/[locale]/admin/operations/preview` and
  are excluded from live stock. Never automatically import sample quantities/costs.
- Each payment keeps original goods amount, actual SGD debit and separately charged
  fees. There is no global fixed exchange rate. Freight allocation remains a preview;
  saved shipment allocation, unpaid-order estimated rates and automatic POS deductions
  are still separate unfinished workflows, not implied by basic production activation.

Activation procedure after connection:
1. Confirm the project is the existing qyjworld.com production database using configured
   website project identity; inspect migration history and existing schema read-only.
2. Verify backup/recovery availability. Preserve current public tables, RLS, auth,
   existing role assignments, POS schedules and all existing business records.
3. Apply only unapplied, ordered migrations 0033–0038 after dependency verification.
   Never run db reset, seed.sql or the fixture SQL tests against production.
4. Release the reviewed application tree on top of current main, preserving newer main
   changes, including info@qyjworld.com and facebook.com/qyjworld footer links.
5. Under the owner's authenticated session, verify new material and supplier persist
   across reload/device, permissions reject anonymous/cross-store access, and a receipt
   increments only its destination stock once. Use clearly identified setup records and
   no invented opening quantities. Recheck member, sales, partner and public website paths.

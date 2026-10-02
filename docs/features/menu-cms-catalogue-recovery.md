# Original catalogue into Menu CMS — 2 October 2026

The public menu previously recovered the original nine drinks for a never-configured outlet without putting them into editable CMS records. The authenticated Menu CMS now triggers a server action to connect this same catalogue to the primary outlet on its first empty visit.

The action requires both admin authentication and scoped `menu.manage` permission. It uses the DB primary outlet, never a client-selected brand or outlet. Existing menu items (including historical/archived items) suppress import. Existing inactive/archived menus require review. Missing categories, products and images are inserted idempotently; existing values and lifecycle decisions are not overwritten. Menu entries are published in one batch after images/products are ready. Blank prices preserve the public menu's previous price behaviour: owner confirms regular/member prices in the outlet editor. No paid checkout is enabled.

The nine names, descriptions, category names and image paths are reused verbatim from `lib/final-menu-items.ts`, the current public recovery catalogue. No new recipe or price claims are added. Existing catalogue wording is not refreshed in this change.

The CMS also explains where prices are edited, displays empty states, and distinguishes query failures from an empty catalogue. Catalogue errors have a visible retry action.

Chrome installation: the repository has a manifest, but no `beforeinstallprompt` handler or call to show an install prompt. Browser-owned installation UI is optional and not a CMS error. Removing the manifest would not guarantee removing Chrome's own Install page as app command, so no unrelated installability changes were made.

## Validation
- Import execution tests: nine drinks, original images/categories, blank prices, repeat import, interrupted retry, preserved edited names, inactive/archived menus, existing archived entries and database errors.
- TypeScript, ESLint and existing test suite passed.
- Live authenticated DB initialisation requires the owner to reopen Menu CMS; no account impersonation or manual production DB changes were performed.

## Editorial audit
Content: catalogue recovery v1; auditor: Codex; date: 2026-10-02.
Facts/source: existing catalogue copied verbatim; no invented brand/product history, results, health/nutrition or investment claims. Prices intentionally not reused. No new public product prose, keywords or comparisons. Practical usefulness: editable original catalogue with safe retry and visible errors. Brand identity/assets unchanged. Approval: owner's explicit request to fill Menu CMS. Decision: PUBLISH implementation; owner confirms current prices in CMS.

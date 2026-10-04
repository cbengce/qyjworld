# Tea discovery and group-order publication audit

Version: discovery-v1. Auditor and remediation owner: Codex. Date: 4 October 2026.

Scope: three rewritten articles (`sparkling-tea-singapore-guide`, `sparkling-tea-vs-bubble-tea`, `macpherson-tea-guide`); three new guides (`first-visit-tea-menu-guide`, `office-tea-group-orders-singapore`, `event-tea-order-checklist`); Chinese versions of all six; menu detail template; group planning copy and discovery links. Existing Our Story chapters and other legacy articles are outside this change.

Approval evidence: owner explicitly authorised improving SEO and GEO, including the group page, with discretion to implement and deploy, in the current 4 October conversation. This is scope/publication authorisation, not a claim of sentence-by-sentence manuscript review. No named physician has been attributed as author or reviewer.

## Findings by audit dimension

| Dimension | Findings and evidence |
| --- | --- |
| 1. Accuracy | Brand line/direction and first-store location match BF-004, BF-005, BF-008. Current names, descriptions, status and prices come from `getMenuItems`; address and ordering link come from `getPrimaryStore`. Group workflow matches `lib/group-orders.ts`, `components/group-orders/order-form.tsx` and its submission action. |
| 2. Invented facts | No invented founder biography, sourcing, awards, tea laboratory results, customer numbers, performance or expansion claims. No hard-coded opening hours or recipes. Rewritten manuscripts use the actual revision/publication date rather than retaining template-generated January timestamps. |
| 3. Sources | Saicho Singapore's first-party sparkling tea FAQ supports only general category context, not QYJ preparation. Taiwan Tourism Administration's drinks page describes pearls in milk tea. Public references clearly separate category sources from QYJ recipes. Owner fact register and current code support operational statements. |
| 4. First-hand evidence | Store and packaging images are owner-supplied photographs already published in the repository. Copy describes the photographed setting without inventing a visit, tasting test or testimony. No claim of an author's physical visit. |
| 5. Claims risk | No health benefit, caffeine quantity, nutrition comparison, medical, investment or ranking claims. Ingredient questions are referred to the store. No fixed discount, delivery coverage, lead time or event package asserted. Photographed offers are explicitly not current pricing evidence. |
| 6. Duplication | Replaces three repetitive generated entries at their existing URLs. Three new guides have distinct first-order, office-organiser and event-checklist intent. Necessary quotation/confirmation facts recur consistently. Other legacy template entries still require their separate recorded review. |
| 7. Search phrasing | Titles reflect actual questions and use Singapore or MacPherson only where useful. No keyword-density target or repetitive location lists. |
| 8. Readability | Short paragraphs, concrete headings, checklists, detail links and clearly labelled next steps. English and Chinese versions convey the same operational limits. No padding to a word-count target. |
| 9. Language | British English: organiser, flavour, enquiry, fulfilment, quotation. New Chinese headings have Unicode-safe anchor IDs. |
| 10. Cultural accuracy | No tea-history narrative or disputed origin claims. Modern Oriental is brand positioning, not an invented historical category. |
| 11. Usefulness | Current menu selection, optional store location, independent drink details, office request preparation and event checklists connect readers to real actions. |
| 12. Voice | Restrained and practical. Approved brand identity retained. Existing Pegasus illustrations/official logo untouched. |
| 13. Readiness | PUBLISH within authorised scope, subject to technical route and deployment validation. All brand/operational assertions trace to approved facts or current managed data. No specialist health/legal reviewer required for the claims included. |

## Technical intent

- Group page receives its own canonical URL and bilingual sitemap entries.
- Active public catalogue items receive stable ID-based detail URLs; ordinary CMS additions, renaming, price changes and disabling do not require a code release.
- Product schema uses the same fields visible on the page. Only available items with a known regular price expose an Offer; conditional member prices are displayed separately with membership terms. No fabricated reviews, rating, SKU, recipe or nutrition fields.
- Current catalogue controls eligibility. Missing or inactive IDs produce 404; coming-soon items have no order/group action or purchasable offer.
- All six entries have Chinese equivalents and language alternates; new multilingual pages are listed in sitemap. English-only legacy cards link to their English page.
- Home, menu, footer, guides, articles and group page link the discovery cluster to current menus and the group request.
- FAQ schema mirrors visible questions and answers. This does not claim Google FAQ rich-result eligibility.
- Robots already permits `*`; OAI-SearchBot and Googlebot are not disallowed by that file. Live infrastructure access still needs observation; no claim of guaranteed crawling or AI citations.

## Discovery measurement follow-up

Owner-side Search Console and Business Profile access are not configured in this workspace. Do not claim sitemap submission, request-indexing completion, ranking improvements or traffic increases. Website publication is not a measurement result.

After those properties are available, measure weekly: impressions/clicks for sparkling tea, brand, MacPherson tea and office/event group queries; landing pages; group requests actually received. Compare equivalent periods, and review the originating page when analytics are available. Do not manufacture conversion attribution from request counts alone. Keep Business Profile address, hours, photographs and website link aligned with the managed store record. AI search citations vary and cannot be promised.

Official technical references checked 4 October 2026:
- https://developers.google.com/search/docs/appearance/ai-features
- https://developers.openai.com/api/docs/bots

Re-check: at any workflow, catalogue, store or pricing change; technical discovery results after a real observation period. Publication authority remains the owner.

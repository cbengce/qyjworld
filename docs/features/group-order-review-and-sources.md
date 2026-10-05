# Group request review and source reporting — 5 October 2026

Customers now review quantities, contact details, date/time, fulfilment and notes before a request is sent. Editing preserves the draft; retries of an unchanged request retain its idempotency identifier. A success receipt appears only after the server confirms persistence. Signed-in customers can follow their own records through the existing guest page; anonymous customers use their reference to contact the store. No anonymous status lookup or retrospective email linking is introduced.

An optional source selector accepts only the recognised channel labels in `lib/group-order-source.ts`. A recognised `utm_source` on the group-request page preselects the label, which customers may change. No full referrer, arbitrary URL parameter, search query, campaign token or third-party tracking cookie is stored. Source is self-reported/link-supplied and does not award commissions, discounts or eligibility. Old records display unspecified.

Manager/super-admin discovery reporting groups the latest 30 days of requests by source and current confirmed/fulfilled state. It reads at most 1,001 rows, displays at most 1,000, and explicitly flags truncation. Database failures are unavailable rather than zero. Counts are requests and operational states, not visitors, click-through rates, paid sales or verified SEO/GEO attribution. Attribution for online retail checkout and external delivery platforms remains outside this implementation.

Product editing is bilingual and includes a checklist for missing bilingual names/descriptions plus instructions to record verified serving size, tea base, ingredients and available options in existing managed descriptions. Prices and availability continue to belong to each outlet menu. No recipe or price is inferred, and no schema migration is needed.

Validation: typecheck, lint, existing suite, group-order validation, targeted review/draft/retry/privacy tests and discovery permission/failure tests.

## Editorial audit
Content ID: group-review-source-ui-v1. Auditor: Codex implementation review. Date: 2026-10-05. Owner authorised continued implementation and publication in the current conversation.

| Dimension | Finding |
|---|---|
| Factual accuracy | Describes actual request workflow; no paid revenue claimed. |
| Invented brand facts | No biography, recipes, prices or expansion claims added. |
| Sources | Existing managed product records remain authoritative. |
| First-hand evidence | Local UI tests verify draft retention, review and retry. |
| Regulated claims | No health/financial benefits; no payment processing introduced. |
| Duplication | Functional interface wording only. |
| Search phrasing | No keyword expansion or stuffing. |
| Readability | Bilingual labels; review separates draft from saved request. |
| Grammar | British English retained. |
| Cultural accuracy | No new cultural claims. |
| Practical value | Reduces submission mistakes; exposes request-source outcomes. |
| Brand voice | Plain and restrained operational copy. |
| Readiness | Publish after configured deployment verification. Unfilled prices/recipes require owner entry. |

No numeric editorial scores or expert approvals are fabricated. Remediation owner: website implementation for workflow; operations for actual product facts.

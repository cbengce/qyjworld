# POS Integration Boundary

This folder defines the provider-neutral boundary for replaceable commerce integrations. It does not contain an active Appzgate API or webhook implementation.

## Confirmed Appzgate entry points

- Sign Up: `https://order.qyjworld.com?PageMode=sign-up`
- Sign In: `https://order.qyjworld.com?PageMode=sign-in`
- Direct Ordering: `https://order.qyjworld.com`
- View Profile: use Sign In; Profile is available only after authentication.
- Forgot Password: use Sign In; the vendor supplies its Forget Password link there.

## Rules

- Phase 1 is redirect-only.
- QYJWorld does not read or display POS profile, points, membership expiry, or purchase history.
- Customer-entered Member Number is unverified.
- D-14 requires every Appzgate mapping to remain unverified until a documented vendor-supported method is implemented through an approved provider-neutral server-side adapter.
- POS authentication, browser sessions, identifiers, contact/profile matching, screenshots and receipts never authenticate ASCEND or automatically verify ownership.
- Unverified mappings grant no verified entitlement, reward, collection, Tea Passport proof, or recovery authority.
- Verification/revocation history is append-only; secrets and trust decisions never enter browser code or public URLs.
- Product deep links belong in one central configuration registry keyed by QYJ product code; never scatter vendor URLs across components.
- Product deep links are unstable and require fallback to Direct Ordering.
- Promo codes are never encoded in URLs.
- No webhook code is added before authenticity, payload, retries, timing, samples, and safe testing are documented.

## Reserved New Order adapter

A future adapter must be server-side, authentic, idempotent, replay-resistant, privacy-minimized, and safely auditable. An order can create a verified Tea Passport signal only when the payload includes a stable customer/member identifier and an approved identity mapping exists. Otherwise it is anonymous operational analytics only.

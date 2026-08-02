# Fact Register

Status values: `VERIFIED`, `PROVISIONAL`, `DISPUTED`, `RETIRED`.

“Verified” here means approved for editorial use from the supplied authority or a clearly matching live repository constant. It does not imply independent third-party verification.

| Fact ID | Statement | Status | Source | Last verified | Owner | Permitted usage | Notes |
|---|---|---|---|---|---|---|---|
| BF-001 | The brand name is QING YUN JIAN. | VERIFIED | Editorial System v1.0 brief; `lib/constants.ts` | 2026-08-03 | Brand owner | Brand identification | Preserve capitalisation in formal display |
| BF-002 | The Chinese brand name is 青云间. | VERIFIED | Editorial System v1.0 brief; live UI references | 2026-08-03 | Brand owner | Brand identification | Some source files contain encoding corruption; do not reproduce mojibake |
| BF-003 | The primary tagline is “Born to Ascend”. | VERIFIED | Editorial System v1.0 brief; `lib/constants.ts` | 2026-08-03 | Brand owner | Approved brand copy | Not a performance guarantee |
| BF-004 | The core English brand line is “Sparkling Tea Reimagined”. | VERIFIED | Editorial System v1.0 brief; `lib/constants.ts` | 2026-08-03 | Brand owner | Approved brand copy | Preserve wording |
| BF-005 | The brand direction is a Modern Oriental tea experience. | VERIFIED | Editorial System v1.0 brief | 2026-08-03 | Brand owner | Positioning and editorial context | Do not present as a historical tea category |
| BF-006 | QING YUN JIAN originated in Singapore. | VERIFIED | Editorial System v1.0 brief | 2026-08-03 | Brand owner | Brand and local context | Avoid unsupported “Singapore first” claims |
| BF-007 | QING YUN JIAN was founded in 2026. | VERIFIED | Editorial System v1.0 brief | 2026-08-03 | Brand owner | About, metadata, brand journalism | Founder circumstances are not verified |
| BF-008 | The first store is at MacPherson Mall, Singapore. | VERIFIED | Editorial System v1.0 brief | 2026-08-03 | Brand owner | Store and brand context | Do not infer opening date or performance |
| BF-009 | The store address is 401 MacPherson Road, MacPherson Mall, Singapore 368125. | VERIFIED | Editorial System v1.0 brief | 2026-08-03 | Operations | Public address | Live UI also uses unit `#01-23`; resolve this difference before treating the unit as part of this supplied fact |
| BF-010 | The company is TCM AND HEALTHCARE COLLEGE PTE LTD. | VERIFIED | Editorial System v1.0 brief; `lib/constants.ts` | 2026-08-03 | Company owner | Legal or corporate identification where required | Consumer footer may intentionally use brand name |
| BF-011 | The brand symbol is a Pegasus / winged horse. | VERIFIED | Editorial System v1.0 brief; official logo asset | 2026-08-03 | Brand owner | Symbol description and image alt text | Do not invent its design history |
| BF-012 | The name and Pegasus express upward movement, aspiration, and rising towards the clouds. | VERIFIED | Editorial System v1.0 brief | 2026-08-03 | Brand owner | Approved interpretation | Not a founder quotation |
| BF-013 | Official website domain is https://qyjworld.com. | VERIFIED | `lib/constants.ts` | 2026-08-03 | Digital owner | Canonical and public website references | Use HTTPS |
| BF-014 | Official Instagram is https://www.instagram.com/qyjworld. | VERIFIED | `components/footer.tsx`; `app/layout.tsx` | 2026-08-03 | Digital owner | Public social link and structured data | Re-verify periodically |
| BF-015 | Official TikTok is https://www.tiktok.com/@qingyunjian. | VERIFIED | `components/footer.tsx`; `app/layout.tsx` | 2026-08-03 | Digital owner | Public social link and structured data | Re-verify periodically |
| BF-016 | Official Xiaohongshu link is https://xhslink.cn/m/8DgLoyGB3jD. | VERIFIED | `components/footer.tsx`; `app/layout.tsx` | 2026-08-03 | Digital owner | Public social link and structured data | Short links should be re-verified periodically |

Conflicts must be reported and resolved by the named owner. Do not silently convert a provisional, disputed, or retired fact into approved copy.


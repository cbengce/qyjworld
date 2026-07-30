# Implementation Plan

1. Establish a deployable Next.js App Router project with TypeScript strict mode, Tailwind CSS and Vercel-compatible settings.
2. Create Supabase PostgreSQL schema for customers, customer profiles, memberships, points ledger, referrals, scoped staff roles, audit logs, menu data and site settings.
3. Enable row-level security so members read only their own data and admin access is role controlled.
4. Build registration and login using Supabase Auth with server-side validation.
5. Register members into pending membership status, never auto-activating during soft launch.
6. Build member dashboard with status, validity dates, days remaining, points balance, member number, QR code and referral link.
7. Build admin portal with role-aware access, member search, membership activation, points ledger transactions and CSV exports.
8. Build mobile-first bilingual public pages for home, menu, membership, about, contact, FAQ, privacy and terms.
9. Add docs, seed data, deployment guide, UAT checklist, security checklist and business assumptions.
10. Run lint, type checks, tests and production build in an environment with Node.js installed.

# Testing Instructions

Run:

```bash
npm install
npm run lint
npm run typecheck
npm run test
npm run build
```

Database constraint checks:

```bash
psql "$SUPABASE_DB_URL" -f supabase/tests/phase1_constraints.sql
psql "$SUPABASE_DB_URL" -f supabase/tests/phase1_rls.sql
```

Manual checks:

- Register a member with a Singapore mobile number.
- Confirm the created membership is pending.
- Log in as a member.
- Confirm dashboard shows status, member number, referral code, referral URL, QR code, points and activity.
- Log in as admin.
- Search member by name, email, mobile and member number.
- Activate membership.
- Add and deduct points.
- Export members CSV.
- Export points transactions CSV.
- Confirm non-admin users cannot open `/en/admin`.
- Confirm English is default and Simplified Chinese pages load under `/zh`.

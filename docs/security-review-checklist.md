# Security Review Checklist

- Supabase row-level security is enabled.
- Members can only read their own profile, memberships, points and relevant audit activity.
- Customers and staff are separated from Supabase authentication identity.
- Admin routes call server-side role checks.
- Service role key is only used server-side.
- Points are stored in a ledger.
- Points balance is calculated and stored server-side by transactional functions only.
- Customers cannot edit their own points.
- Membership activation is manual and audited.
- Sensitive mutations use idempotency keys.
- Referral rewards are not automatically awarded in Version 1.
- CSV exports require admin authentication.
- Forms use server-side validation.
- Rate limiting is applied to registration attempts.
- No payment card data is stored.
- Privacy and terms copy must receive Singapore PDPA/legal review before launch.
- Admin role creation should be limited to super admin users.
- Production Supabase email and password policies should be configured before launch.

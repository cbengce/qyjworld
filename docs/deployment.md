# Vercel Deployment

1. Push this project to a Git repository.
2. Import the repository into Vercel.
3. Set environment variables:

```text
NEXT_PUBLIC_SITE_URL=https://www.qyjworld.com
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=12
```

4. Set the production domain to `www.qyjworld.com`.
5. Configure DNS at the domain registrar using Vercel's instructions.
6. Apply database migrations in filename order, then run `supabase/seed.sql`.
7. Run the production build:

```bash
npm run build
```

8. Deploy.

## Payment Integration Placeholder

Live payment is intentionally not implemented for Version 1. The database has `payment_reference` and configurable `site_settings` so Stripe or HitPay can be added later without changing the membership lifecycle.

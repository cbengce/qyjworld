# Qing Yun Jian Website and Membership Portal

Production-ready MVP for the Qing Yun Jian soft launch.

## Brand

- Company: TCM AND HEALTHCARE COLLEGE PTE LTD
- Brand: QING YUN JIAN / 青云间
- Tagline: Born to Ascend
- Core line: Sparkling Tea Reimagined
- Store: 401 MacPherson Road, MacPherson Mall, Singapore 368125

## Stack

- Next.js App Router with TypeScript strict mode
- Supabase PostgreSQL, Auth and row-level security
- Tailwind CSS
- Vercel-compatible deployment

## Local Setup

1. Install Node.js 20 LTS or newer.
2. Install dependencies:

```bash
npm install
```

3. Copy environment variables:

```bash
cp .env.example .env.local
```

4. Fill in Supabase values in `.env.local`.
5. Apply the SQL migrations in filename order and then run `supabase/seed.sql`.
6. Start the app:

```bash
npm run dev
```

## Scripts

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Important Notes

Registration creates a pending membership. Version 1 does not take live payment and does not activate membership automatically. A Manager or Super Admin activates the 60-day membership after confirming payment.

The seed data intentionally creates only the legal company, Qing Yun Jian brand, MacPherson Mall store, SGD 39.90 membership plan, roles, permissions and essential settings. Live menu items, names, prices and descriptions are not invented.

The Qing Yun Jian official logo is served from `public/assets/qing-yun-jian-logo-official.png`.

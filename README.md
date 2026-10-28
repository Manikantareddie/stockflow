# StockFlow

Multi-tenant inventory management SaaS. Each signed-up user gets their own organization, and
Postgres Row Level Security guarantees that no organization can read or modify another
organization's products.

## Features

- **Authentication** — email/password signup (with organization creation), login, logout, session
  refresh in middleware, and protected application routes.
- **Multi-tenancy** — `organizations`, `profiles`, and `products` with RLS policies scoped to the
  signed-in user's organization. The browser never supplies `organization_id`.
- **Products** — list, create, edit, delete (with confirmation dialog), search by name or SKU,
  filter by All / In stock / Low stock, and sorted by name.
- **Stock adjustments** — atomic database function that rejects zero adjustments and any change
  that would drive quantity below zero, while recording `last_updated_by` and `updated_at`.
- **Dashboard** — organization name, total products, total units on hand, count of low-stock
  products, and a low-stock table.
- **Settings** — editable default low-stock threshold plus read-only organization name and email.
- **CSV export** — exports the current organization's products with safe CSV escaping.

## Tech stack

- Next.js 15 (App Router) with TypeScript strict mode
- Tailwind CSS with shadcn/ui-style components on Radix primitives
- React Hook Form + Zod (shared client and server validation)
- Supabase Auth and PostgreSQL with Row Level Security
- `@supabase/ssr` and `@supabase/supabase-js`
- Server Components and Server Actions
- npm, Vercel (hosting), Supabase Cloud (database)

There is no separate Express backend.

## Prerequisites

- Node.js 20 or newer (developed against Node 24)
- npm
- A Supabase project (free tier is sufficient)

## Installation

```bash
npm install
```

## Environment variables

Copy `.env.example` to `.env.local` and fill in the values from your Supabase project
(**Project Settings → API**):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Use the publishable key if your project provides one, otherwise the legacy `anon` key. Never put a
service-role or secret key in a `NEXT_PUBLIC_*` variable — those are shipped to the browser.

`.env.local` is git-ignored. Do not commit it.

## Supabase migration

1. Open the Supabase dashboard for your project.
2. Go to **SQL Editor → New query**.
3. Paste the contents of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)
   and run it.
4. The migration creates the three tables, constraints (`unique (organization_id, sku)`, non-negative
   checks), indexes, the `updated_at` trigger, the signup trigger, the `current_organization_id()`
   helper, the `adjust_stock()` function, and all RLS policies.

It is idempotent for a fresh project (`create table if not exists`, `create or replace`). It does not
drop or reset existing data.

### Authentication settings

1. Go to **Authentication → Sign In / Providers → Email** and make sure Email is enabled.
2. For a demo environment you may also turn off **Confirm email** so signup logs the user in
   immediately. With confirmation enabled, users must click the emailed link;
   `app/auth/callback/route.ts` handles the resulting code exchange.
3. Go to **Authentication → URL Configuration** and set:
   - **Site URL**: `http://localhost:3000` for local development (your production URL once deployed).
   - **Redirect URLs**: add `http://localhost:3000/**` (and your production URL with `/**`).

## Local development

```bash
npm run dev
```

Open http://localhost:3000. Unauthenticated visits to `/dashboard`, `/products`, or `/settings`
redirect to `/login`.

## Testing and verification commands

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # ESLint
npm test            # node:test unit tests for the effective-threshold logic
npm run build       # production build
```

## Manual test checklist

| # | Check | How to verify |
|---|-------|---------------|
| 1 | Signup works | Create an account at `/signup` |
| 2 | Organization + profile created | Dashboard shows your organization name |
| 3 | Login / logout | Log out from the user menu, log back in |
| 4 | Protected routes redirect | Visit `/dashboard` in a private window |
| 5 | Tenant isolation | Two accounts; confirm neither sees the other's products |
| 6 | Product create | Add a product from `/products` |
| 7 | Product edit persists | Edit and reload the page |
| 8 | Duplicate SKU rejected | Create two products with the same SKU |
| 9 | Delete needs confirmation | Delete shows a confirmation dialog |
| 10 | Search and filters | Search by name/SKU; switch stock-status filter |
| 11 | Positive adjustment | Add 10 units |
| 12 | Negative adjustment blocked | Try to remove more units than exist |
| 13 | Effective threshold | Product with no override uses the organization default |
| 14 | Zero threshold | Set a product threshold to 0 and confirm behaviour |
| 15 | Settings update | Change the default and confirm the dashboard updates |
| 16 | Dashboard totals | Counts match the product list |
| 17 | Invalid input rejected | Submit a blank form or a negative quantity |
| 18 | No secrets committed | `git status` shows no `.env.local` |
| 19 | Checks pass | typecheck, lint, test, build |
| 20 | End-to-end | Full pass through the app in the browser |

## GitHub and deployment

```bash
git init
git add .
git commit -m "feat: implement secure inventory MVP"
git remote add origin <your-repository-url>
git push -u origin main
```

For Vercel: import the repository, add `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` as environment variables, then add the production URL to Supabase's
**Site URL** and **Redirect URLs** and redeploy.

## Database schema and RLS summary

- `organizations` — `id`, `name` (2–60 chars), `default_low_stock_threshold` (>= 0, default 5),
  `created_at`. RLS: members may `select` and `update` only their own organization.
- `profiles` — `id` (references `auth.users`), `organization_id`, `email`, `created_at`. RLS: a user
  may select only their own profile.
- `products` — `id`, `organization_id`, `name`, `sku`, `description`, `quantity_on_hand` (>= 0),
  `cost_price` (>= 0), `selling_price` (>= 0), `low_stock_threshold` (>= 0 or null),
  `last_updated_by`, `created_at`, `updated_at`. Unique `(organization_id, sku)`. RLS: select,
  insert, update, and delete are all restricted to rows whose `organization_id` equals
  `current_organization_id()`.
- `current_organization_id()` is `SECURITY DEFINER` with a fixed `search_path`, so policies can read
  `profiles` without recursing into its own RLS.
- `handle_new_user()` runs after insert on `auth.users` and creates the organization and profile in
  one transaction, reading the organization name from `raw_user_meta_data`.
- `adjust_stock(product_id, delta)` is `SECURITY DEFINER`, verifies the product belongs to the
  caller's organization, rejects zero deltas, and refuses to go below zero.

## Known limitations

- No password reset, role management, or multi-user organizations — one organization per account.
- Stock adjustment notes are not persisted; there is no stock movement history table (explicitly out
  of scope for this MVP).
- Product search and filtering run in the application layer over the organization's product set.
- Email confirmation depends on the Supabase project setting described above.

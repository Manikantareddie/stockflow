====LIVE SERVER https://stockflowinventoryy.netlify.app/ ===============

# StockFlow

Multi-tenant inventory management SaaS. Each signed-up user gets their own organization, and
Postgres Row Level Security guarantees that no organization can read or modify another
organization's products.

To run the project locally:

```bash
npm install
npm run dev
```

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
  products, inventory value at cost, retail value, potential profit, a top-products-by-value chart,
  and a low-stock table.
- **Stock movement history** — an append-only ledger records every quantity change (creation, edit,
  and manual adjustment) with the resulting quantity, the reason, and the adjustment note. Each
  product's history is available from the row actions menu.
- **CSV import** — upload a CSV of products with per-row validation and error reporting; only valid,
  non-duplicate rows are inserted.
- **Settings** — editable default low-stock threshold plus read-only organization name and email.
- **Password reset** — request a reset link by email and choose a new password from a signed-in
  recovery session.
- **Roles and team** — members belong to an organization as `owner` or `member`. Owners can change
  roles, remove members, and create invite codes that let a new signup join the existing
  organization instead of creating a new one.
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
3. Run the migrations in order, one file at a time:
   1. [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) — tables, constraints,
      indexes, the `updated_at` trigger, the signup trigger, the `current_organization_id()` helper,
      the `adjust_stock()` function, and all RLS policies.
   2. [`supabase/migrations/0002_stock_movements.sql`](supabase/migrations/0002_stock_movements.sql) —
      the `stock_movements` ledger, the trigger that records every quantity change, and the
      three-argument `adjust_stock(product_id, delta, note)`.
   3. [`supabase/migrations/0003_roles.sql`](supabase/migrations/0003_roles.sql) — the `role` column on
      `profiles`, the `organization_invites` table, the `current_user_role()` helper, owner-scoped
      RLS, and invite-code support in the signup trigger.

It is idempotent for a fresh project (`create table if not exists`, `create or replace`). It does not
drop or reset existing data. `0002` deliberately drops the old two-argument `adjust_stock` overload
so PostgREST never has to choose between two candidates.

### Authentication settings

1. Go to **Authentication → Sign In / Providers → Email** and make sure Email is enabled.
2. For a demo environment you may also turn off **Confirm email** so signup logs the user in
   immediately. With confirmation enabled, users must click the emailed link;
   `app/auth/callback/route.ts` handles the resulting code exchange.
3. Go to **Authentication → URL Configuration** and set:
   - **Site URL**: `http://localhost:3001` for local development (your production URL once deployed).
   - **Redirect URLs**: add `http://localhost:3001/**` (and your production URL with `/**`).
4. Password reset emails are sent by Supabase. On the built-in email service they are rate limited and
   can only be delivered to members of your Supabase team; configure **Authentication → Emails →
   SMTP Settings** (or use a teammate address) to test the reset flow.

## Local development

```bash
npm run dev
```

Open http://localhost:3001. Unauthenticated visits to `/dashboard`, `/products`, or `/settings`
redirect to `/login`.

## Testing and verification commands

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # ESLint
npm test            # node:test unit tests for threshold and CSV logic
npm run test:integration  # live Supabase RLS / trigger / role checks (needs migrations applied)
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
| 18 | CSV import | Import a CSV, confirm valid rows are added and duplicates/invalid rows are reported |
| 19 | Stock history | Open a product's history from the row menu; confirm create/edit/adjust rows with notes |
| 20 | Password reset | Request a reset from `/forgot-password`, then set a new password from `/update-password` |
| 21 | Roles and team | As the owner, invite a member, change a role, and remove a member |
| 22 | Invite-code signup | Sign up with an invite code and confirm the new profile joins the existing organization |
| 23 | No secrets committed | `git status` shows no `.env.local` |
| 24 | Checks pass | typecheck, lint, test, build |
| 25 | End-to-end | Full pass through the app in the browser |

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
  `created_at`. RLS: members may `select` their own organization; only owners may `update` it.
- `profiles` — `id` (references `auth.users`), `organization_id`, `email`, `role` (`owner` or
  `member`, default `member`), `created_at`. RLS: members of the same organization may `select` one
  another; only owners may `update` or `delete` (used for role changes and member removal).
- `products` — `id`, `organization_id`, `name`, `sku`, `description`, `quantity_on_hand` (>= 0),
  `cost_price` (>= 0), `selling_price` (>= 0), `low_stock_threshold` (>= 0 or null),
  `last_updated_by`, `created_at`, `updated_at`. Unique `(organization_id, sku)`. RLS: select,
  insert, and update are restricted to rows whose `organization_id` equals
  `current_organization_id()`; `delete` additionally requires the `owner` role.
- `stock_movements` — append-only ledger: `id`, `organization_id`, `product_id`, `user_id`, `delta`,
  `quantity_after` (>= 0), `reason` (`created` | `adjustment` | `edit`), `note`, `created_at`.
  Indexed by `(product_id, created_at desc)` and `(organization_id, created_at desc)`. RLS: members
  may `select` and `insert` rows for their own organization; rows are never updated or deleted.
- `organization_invites` — `id`, `organization_id`, `code` (unique, 8 chars), `role`, `created_by`,
  `created_at`, `expires_at`, `used_by`, `used_at`. RLS: owners may `select`, `insert`, and `delete`;
  the signup trigger consumes them under `SECURITY DEFINER`.
- `current_organization_id()` and `current_user_role()` are `SECURITY DEFINER` with a fixed
  `search_path`, so policies can read `profiles` without recursing into its own RLS.
- `handle_new_user()` runs after insert on `auth.users`. With an `invite_code` in
  `raw_user_meta_data` it joins the existing organization (rejecting invalid or expired codes and
  marking the invite used); otherwise it creates a new organization and inserts the profile with the
  `owner` role.
- `adjust_stock(product_id, delta, note)` is `SECURITY DEFINER`, verifies the product belongs to the
  caller's organization, rejects zero deltas, and refuses to go below zero. It stashes the note in a
  transaction-local setting so the movement trigger can persist it.
- A trigger on `products` (`after insert or update of quantity_on_hand`) writes the corresponding
  `stock_movements` row for creation, edits, and adjustments, skipping zero deltas.

## Known limitations

- Invite codes are single-use and expire after seven days; there is no email invitation — the owner
  shares the code out of band.
- Product search and filtering run in the application layer over the organization's product set.
- Stock movement history shows the most recent 50 entries per product.
- Email confirmation and password-reset delivery depend on the Supabase project settings and SMTP
  configuration described above.

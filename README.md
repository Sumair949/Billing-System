# Steel Shop Billing

A production-ready billing system for a steel shop, built with Next.js 16 (App
Router), Supabase (Postgres + Auth), TypeScript, Tailwind CSS, and Zod.

Each user's bills are stored in Postgres with three fields — **bill number**,
**description**, and **amount** — and can be searched by either the bill
number or the description. Every query is scoped to the logged-in user by
Postgres Row-Level Security, so one account cannot ever see another's data.

## Features

- Email + password authentication via Supabase Auth
- Create, edit, delete bills (server actions, Zod-validated on the server)
- Search by bill number **or** description, backed by Postgres trigram indexes
- Pagination (20 rows per page)
- Row-Level Security — zero trust on the client
- All writes go through server actions; no client-side secrets
- Error / not-found boundaries
- Ready to deploy on Vercel with Supabase as the backend

## Tech stack

| Layer         | Choice                                                       |
| ------------- | ------------------------------------------------------------ |
| Framework     | Next.js 16 (App Router, Server Actions, Turbopack)           |
| Language      | TypeScript (strict)                                          |
| Styling       | Tailwind CSS v4                                              |
| Auth + DB     | Supabase (Postgres + Auth, `@supabase/ssr`)                  |
| Validation    | Zod (same schema runs on client and server)                  |
| Deployment    | Vercel                                                       |

## Getting started

### 1. Create a Supabase project

1. Go to <https://supabase.com>, create a new project, and wait for it to
   finish provisioning.
2. In **Project Settings → API**, copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. Apply the database migration

Open **SQL Editor** in the Supabase dashboard and run the migrations in order:

1. [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) —
   `bills` table, trigram / full-text search indexes, `updated_at` trigger,
   and Row-Level Security policies.
2. [`supabase/migrations/0002_auto_bill_number.sql`](supabase/migrations/0002_auto_bill_number.sql)
   — per-user `bill_counters` table and the `BEFORE INSERT` trigger that
   auto-assigns bill numbers like `INV-00001`.
3. [`supabase/migrations/0003_payment_status.sql`](supabase/migrations/0003_payment_status.sql)
   — `bill_status` enum (`unpaid` / `paid`) and a composite index for fast
   "outstanding" queries. *(Superseded by migration 0005 — the status column
   is dropped; kept here for projects that applied 0003 before 0005.)*
4. [`supabase/migrations/0004_bill_stats.sql`](supabase/migrations/0004_bill_stats.sql)
   — `bill_stats()` RPC that returns total count, total revenue, outstanding
   amount, and this-month count in a single round trip.
5. [`supabase/migrations/0005_line_items.sql`](supabase/migrations/0005_line_items.sql)
   — **⚠️ Destructive.** Restructures `bills` from a single-item model to a
   multi-line invoice model: adds `customer_name`, `bill_date`,
   `received_amount`, `total_amount`, creates a `bill_items` child table with
   a trigger that keeps `bills.total_amount` in sync with the sum of items.
   Deletes existing bills and counters.
6. [`supabase/migrations/0006_stats_and_pendings.sql`](supabase/migrations/0006_stats_and_pendings.sql)
   — Updates `bill_stats()` for the new schema and adds `customer_pendings()`,
   which powers the `/pendings` page.
7. [`supabase/migrations/0007_bill_status_column.sql`](supabase/migrations/0007_bill_status_column.sql)
   — Adds a STORED generated `status` column (`paid` / `partial` / `unpaid`)
   on `bills`, derived from `total_amount` / `received_amount`, indexed by
   `(user_id, status)`. Powers the status filter on `/bills`.

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

- **`NEXT_PUBLIC_SUPABASE_URL`** — from step 1
- **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** — from step 1
- **`SUPABASE_SERVICE_ROLE_KEY`** — from Supabase Dashboard → **Project
  Settings → API Keys → `service_role` `secret`**. Used by the admin routes
  to create / delete users and to read all shops' data. **Never** prefix
  this with `NEXT_PUBLIC_` — it must stay server-only.
- **`ADMIN_EMAILS`** — comma-separated list of admin emails (e.g.
  `you@steelshop.com`). Any signed-in user whose email matches an entry in
  this list gets access to `/admin`.

### 4. Create the first admin user

Since self-signup is disabled, create the first account directly in the
Supabase dashboard:

1. **Authentication → Users → Add user → Create new user**
2. Enter the email you put in `ADMIN_EMAILS` above, choose a password, and
   (optionally) tick **Auto Confirm User**.
3. That user will now see the **Admin** nav item after logging in. From
   there, they can create additional shop-owner accounts through the UI.

### 5. Run locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. You'll be redirected to `/login`. Sign in
with the admin account you created in step 4, then use **Admin → New user**
to invite shop owners.

## Deploying to Vercel

1. Push this repo to GitHub.
2. In Vercel, **Add New → Project** and import the repo.
3. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (mark as Sensitive / Secret)
   - `ADMIN_EMAILS`
4. Deploy.
5. In Supabase → **Authentication → URL Configuration**, add your Vercel URL
   (`https://your-app.vercel.app`) to **Site URL** and **Redirect URLs** so
   that email confirmations redirect back to the deployed app.

## Project layout

```
src/
  app/
    (auth)/            login + signup pages and auth server actions
    bills/             list, search, create, edit, delete
    error.tsx          global error boundary
    not-found.tsx      404 page
    page.tsx           redirects to /bills
  components/ui/       small presentational primitives (Button, Input, Label)
  lib/
    env.ts             zod-validated env at import time
    format.ts          currency/date formatting + ILIKE escaping
    supabase/          server, browser, and middleware Supabase clients
    validation/        zod schemas for auth and bill inputs
  middleware.ts        session refresh + route protection
supabase/
  migrations/0001_init.sql   database schema
```

## Security notes

- **RLS is the last line of defense.** The `bills` table enables Row-Level
  Security with per-user `SELECT/INSERT/UPDATE/DELETE` policies. Even if the
  anon key leaks (it is public by design), no user can read or modify another
  user's rows.
- **All writes are server actions.** The browser never talks to the database
  with mutation intent — it calls a server action, which re-validates with
  Zod before inserting.
- **Input is validated twice** — once for HTML-level hints in the client, and
  again on the server where the validation actually matters.
- **Search is injection-safe.** `ILIKE` pattern characters (`%`, `_`) and
  PostgREST `or()` separators are escaped in `lib/format.ts`.
- **Unique constraint on (user_id, bill_no).** The UI maps the Postgres
  `23505` error back to a friendly field error.

## Future enhancements (not in scope of the initial build)

- CSV export of bills
- PDF invoice generation
- Multi-user shops (invite coworkers, role-based access)
- Audit log / soft deletes
- Rate limiting on auth (Supabase covers the basics; add Upstash for custom)

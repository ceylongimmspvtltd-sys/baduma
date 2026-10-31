# බැදුම · Baduma

Next.js 16 (App Router) + Supabase restaurant platform: customer storefront (OTP only) and an
isolated backend portal for Master Admin + staff.

## Quick start

```bash
npm install
cp .env.example .env.local     # fill in the Supabase values
npx next build && npm start    # or: npm run dev
```

Apply the database schema once: run [`supabase/schema.sql`](./supabase/schema.sql) in the Supabase
SQL Editor (existing projects: [`supabase/migrations/20261031_backend_auth_hardening.sql`](./supabase/migrations/20261031_backend_auth_hardening.sql)).

## Authentication

| Portal | URL | Method |
|---|---|---|
| Customer storefront | `/login` | **OTP only** — phone/email, no password, ever |
| Master Admin | `/admin/login` | email **or mapped username** + password (Supabase Auth, `app_metadata.role = admin`) |
| Staff (Manager / Kitchen / Driver) | `/employee/login` | generated username + password (scrypt, `public.employees`) |

Customer routes are publicly reachable and contain no links to `/admin`, `/pos`, `/driver` or
`/employee`. Backend routes are protected by `middleware.ts`, which verifies the session
server-side on every request.

### Create the Master Admin login — one command

**New here? Read [`docs/LOGIN.md`](./docs/LOGIN.md) first — it walks through this with the error table.**

```bash
export SUPABASE_URL=https://YOUR-PROJECT.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=YOUR-SERVICE-ROLE-KEY
npm run setup:backend -- owner@baduma.lk --username baduma-owner
```

`setup:backend` checks the env, checks (or applies) the schema, creates the account, **proves the
login works with a real password grant**, and prints the credentials once. Add
`--verify https://your-site.vercel.app` to also test the deployed app's `/api/admin/login`.

The lower-level command, if you prefer to drive it yourself:

```bash
node scripts/create-admin.mjs admin@baduma.lk --username baduma-admin
```

- Generates the account with **`app_metadata.role = "admin"`** (the claim that RLS and the
  middleware read — never `user_metadata`), or resets it if the email already exists
- `--username` also enables sign-in with a username, mapped to the email via `public.admin_users`
- Omit the password to auto-generate a strong one (printed once)
- Service role key: Supabase → Project Settings → API. Keep it server-side only.

Then sign in at `/admin/login`.

## Verify the hardening

```bash
npm run build
BASE_URL=http://localhost:3000 EMPLOYEE_SESSION_SECRET=... npm run verify:security
```

25 automated checks: anonymous/forged session rejection, token-planting refusal, staff role
matrix, rate limiting and security headers. Exits non-zero if anything regresses, so it can run in CI.

## The ordering pipeline

| Step | Where | What happens |
|---|---|---|
| Add to cart | `/` and `/product/[id]` | Client cart (localStorage), live count in the nav |
| Checkout | `/cart` | Needs an OTP session; sends **ids/sizes/quantities only** |
| Price | `POST /api/orders` | Re-reads `public.products`, ignores client prices, rejects inactive items, snapshots line totals |
| Kitchen/POS | `/pos` | Accept → prepare → dispatch, driver assignment (Manager) |
| Delivery | `/driver` | Driver sees assigned runs, calls, opens Maps, marks delivered |
| Tracking | `/track-orders` | Customer's own orders + status timeline, cancel while pending |
| Oversight | `/admin/orders` | Every order, force status, assign drivers |

Order statuses: `pending → accepted → preparing → out_for_delivery → delivered` (or `cancelled`), with
every transition validated server-side by role. Customers can only read their own orders (RLS);
all writes go through the API with the service role after authentication.

## What the backend can now do

| Screen | Behaviour |
|---|---|
| Storefront `/` | Menu read from `public.products` (fallback: curated list), ISR 60 s |
| `/admin` | Analytics: products, combos, add-ons, offers, active staff |
| `/admin/products` | Menu & inventory CRUD + image upload (validated) |
| `/admin/promotions` | Combos, add-ons, daily offers |
| `/admin/employees` | Generate Manager/Kitchen/Driver credentials (scrypt, shown once) |
| `/admin/settings` | Restaurant profile saved to `public.settings`, rendered in the footer |
| `/employee/login` → `/pos` | Staff sign-in; Managers + Kitchen get the order board |
| `/employee/login` → `/driver` | Drivers get the delivery screen |

Run the whole pipeline offline against the bundled Supabase emulator — see
`docs/backend-auth-setup.md` §5.1. Still missing (product scope, not security): real card payments,
push/ETA notifications, and multi-branch support.

## Documentation

- [`docs/LOGIN.md`](./docs/LOGIN.md) — **start here**: how to get a working backend login, and what
  every error means
- [`docs/backend-auth-setup.md`](./docs/backend-auth-setup.md) — Supabase configuration, credential
  generation, the exact login code, verification and troubleshooting
- [`docs/security-audit.md`](./docs/security-audit.md) — full audit: vulnerabilities, root cause of
  the login failure, route isolation matrix, remediation roadmap
- [`docs/whatsapp-otp-setup.md`](./docs/whatsapp-otp-setup.md) — WhatsApp OTP via Twilio

## Scripts

```bash
npm run dev        # development server
npm run build      # production build
npm run start      # production server
npm run typecheck  # tsc --noEmit
npm run verify:security   # security smoke test against BASE_URL
npm run setup:backend     # GUIDED: env + schema + admin user + proven login
npm run create:admin      # provision/reset the Master Admin login (low level)
```

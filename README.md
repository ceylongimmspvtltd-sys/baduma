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

### Create the Master Admin login

```bash
SUPABASE_URL=https://YOUR-PROJECT.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=YOUR-SERVICE-ROLE-KEY \
node scripts/create-admin.mjs admin@baduma.lk --username baduma-admin
```

- Generates the account with **`app_metadata.role = "admin"`** (the claim that RLS and the
  middleware read — never `user_metadata`), or resets it if the email already exists
- `--username` also enables sign-in with a username, mapped to the email via `public.admin_users`
- Omit the password to auto-generate a strong one (printed once)
- Service role key: Supabase → Project Settings → API. Keep it server-side only.

Then sign in at `/admin/login`.

## Documentation

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
```

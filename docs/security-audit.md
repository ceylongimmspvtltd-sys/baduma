# බැදුම (Baduma) — Security & Architecture Audit

**Date:** 2026-10-31
**Scope:** Next.js 16 App Router app + Supabase (Postgres RLS, Auth, Storage, Edge Functions)
**Branch:** `arena/d3dd5a69-baduma`
**Verdict:** The app built and shipped a **full backend authentication bypass**. Three independent
critical issues (unsigned JWT trust, user-writable role claim, and public staff-hash RPC) meant
anyone with a browser could read customer PII and modify the menu. All three are fixed in this
branch, the login flow is rebuilt server-side, and route isolation is now enforced in middleware.

---

## 1. Executive summary

| Area | Before | After |
|---|---|---|
| Admin session validation | JWT payload **decoded**, never verified (forged cookie = admin) | Verified with Supabase Auth `GET /auth/v1/user` on every request |
| Admin role source | `user_metadata.role` (user-editable ⇒ self-promotion) | `app_metadata.role` (server-writable only) + `admin_users` allowlist |
| Login mechanism | Browser `signInWithPassword` → token POSTed to an API | Server route `POST /api/admin/login`, `httpOnly` cookie, server-verified re-sync |
| Staff credentials | `anon` could call `get_employee_by_username` and dump hashes | RPC `EXECUTE` locked to `service_role`; called server-side only |
| `/pos`, `/driver` | Public. Driver portal showed a customer's name/phone/address to anyone | Staff session required (HMAC-verified, role-aware) |
| `/api/admin/*` | Forgeable cookie + missing role checks | Verified cookie, JSON 401, service-role writes |
| Loyalty points | Client could `UPDATE profiles SET points = 999999` | Immutable ledger + `complete_loyalty_task()` RPC, trigger blocks direct writes |
| Uploads | Any type/size into a public bucket (stored XSS) | MIME + magic-byte check, 5 MB cap, server-generated names |
| Rate limiting | None | IP + identifier throttles on both login endpoints, OTP throttle |
| Response headers | None | CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy, Permissions-Policy |

---

## 2. Root cause of the backend login failure ("missing username")

There was **no single missing field — the backend had no server-side login at all.** Three
compounding defects produced the "login fails / asks for a username" behaviour:

### 2.1 Supabase Auth has no `username` column, but staff accounts only have usernames

`app/api/admin/employees/route.ts` created staff with a generated **username** and a scrypt hash
written to `public.employees`:

```ts
const username = `${position.toLowerCase().slice(0, 3)}${randomBytes(3).toString('hex')}`; // e.g. mgr1a2b3c
await supabase.from('employees').insert({ username, password_hash: hashPassword(password), ... });
```

No `auth.users` row and no email address is ever created for that account. The admin portal,
however, authenticated with `supabase.auth.signInWithPassword({ email, password })`
(`app/(admin)/(auth)/admin/login/page.tsx`). Typing the generated `mgr1a2b3c` into that form
sends a non-email `email` value and GoTrue rejects it:

```
POST /auth/v1/token?grant_type=password  →  400
{ "error_code": "validation_failed",
  "msg": "Unable to validate email address: invalid format" }
```

i.e. the account **has a username but no email**, and Supabase Auth only knows emails/phones.
Drivers hit the same wall because `/driver/login` used the *customer* OTP flow, which produced a
customer session the driver portal never consumed.

### 2.2 The admin route that "logged in" never checked the role and swallowed failures

`app/(admin)/(auth)/admin/login/page.tsx` posted the token and **ignored the response status**:

```ts
await fetch("/api/admin/session", { method: "POST", … });  // no res.ok check, no throw
router.push(nextUrl);                                      // then navigates to /admin
```

If the cookie was not set (400/401/403, or missing env vars — the old route skipped validation
entirely when `NEXT_PUBLIC_SUPABASE_*` were absent), the user was still pushed to `/admin`, where
the middleware bounced them back to `/admin/login`. Result: **an infinite "login does nothing"
loop with no error message** — the reported symptom.

### 2.3 The session cookie was trusted without verification

`lib/adminAuth.ts › isAdminToken()` split the JWT and read `user_metadata.role` from the payload
with `atob` — **no signature check**. A cookie like
`<anything>.<base64({"exp":9999999999,"user_metadata":{"role":"admin"}})>.<anything>` was accepted
as a Master Admin by both `middleware.ts` and every `/api/admin/*` route. Verified live before the
fix (the same value is now rejected — see §6).

### The fix (implemented)

| Concern | Implementation |
|---|---|
| Email/password admin login | `app/api/admin/login/route.ts` — server-side `signInWithPassword`, role check, `httpOnly` cookies |
| Username login mapped to email | `public.admin_users (user_id, username, email)`; the login route resolves username → email with the **service-role** client |
| Session validation | `lib/adminAuth.ts › fetchSupabaseUser()` calls `GET /auth/v1/user` (server-verified, cached off) |
| Role source | `app_metadata.role = 'admin'` (only the service role can write it) |
| Refresh | Supabase client rotates the token in the browser; `POST /api/admin/session` re-verifies it (Auth server + role) before updating the cookie |
| Staff login | `app/api/employee/login/route.ts` (mapped username/password, rate-limited, HMAC session) |
| Customers | unchanged: **password-less OTP only**, no admin/staff links, no credentials ever issued |

Full operator instructions: **[docs/backend-auth-setup.md](./backend-auth-setup.md)**.

---

## 3. Findings

Severity: 🔴 critical · 🟠 high · 🟡 medium · ⚪ low

### 🔴 C1 — Admin authentication bypass via forged, unverified JWT

**Where:** `lib/adminAuth.ts`, `middleware.ts`, `app/api/admin/employees/route.ts`,
`app/api/admin/storage/route.ts`

```ts
// BEFORE — signature never checked
export function isAdminToken(token?: string | null): boolean {
  const payload = decodeJwtPayload(token);              // base64 decode only
  if (!payload || payload.exp! <= Date.now()/1000) return false;
  return (payload.user_metadata?.role ?? payload.app_metadata?.role) === "admin";
}
```

Anyone could mint a 3-part string with a future `exp` and `role: "admin"` and get: the whole admin
dashboard, staff-account creation, product-image upload/delete, and (through the API route) any
RLS-protected data the service acted on.

**Fix:** tokens are now treated as opaque and verified by the Auth server
(`fetchSupabaseUser`); the role comes from `app_metadata` in the verified response. Verified: a
forged cookie now yields `307 → /admin/login`.

---

### 🔴 C2 — Privilege escalation: role read from user-writable `user_metadata`

**Where:** `supabase/schema.sql` (all RLS policies), `middleware.ts`, login page

Every policy and the middleware authorised with
`(auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'`. `user_metadata` is **editable by the
account owner**:

```js
await supabase.auth.updateUser({ data: { role: "admin" } }); // instant admin, in RLS and middleware
```

Combined with the OTP sign-up on the storefront (any phone number creates an account), this was a
one-line path from anonymous → full admin.

**Fix:** all authorisation uses `public.is_admin()`, which reads `app_metadata` (only writable with
the service-role key) or membership of `public.admin_users`. The migration strips the legacy
`role` key from `user_metadata` and promotes real admins into `app_metadata`.

---

### 🔴 C3 — Staff password-hash disclosure + username enumeration

**Where:** `supabase/schema.sql` (`get_employee_by_username`), `app/api/employee/login/route.ts`

The function was `security definer` and, like every new function, `EXECUTE` was granted to
`PUBLIC` — including `anon`. With only the public anon key (shipped in the JS bundle):

```bash
curl -s "https://<project>.supabase.co/rest/v1/rpc/get_employee_by_username" \
  -H "apikey: <anon key>" -H "Content-Type: application/json" \
  -d '{"p_username":"mgr1a2b3c"}'
# → [{"username":"mgr1a2b3c","password_hash":"scrypt$…","position":"Manager", …}]
```

Offline scrypt cracking of staff credentials becomes possible, and the endpoint confirms which
usernames exist.

**Fix:** `revoke all … from public, anon, authenticated; grant execute … to service_role;` — the
route now calls it with the service-role client, plus constant-time dummy verification (no
timing oracle) and per-IP/per-username throttles.

---

### 🔴 C4 — Session fixation in `/api/admin/session`

**Where:** `app/api/admin/session/route.ts`

`POST` accepted **any** string that Supabase considered a valid user token (no role check) and
stored it as the admin cookie, with `maxAge` also taken from the request body. A customer could
log in with their own OTP account, call this endpoint, and receive an "admin" cookie — and with
C1/C2 the middleware would then accept it.

**Fix:** `POST` returns `405`. Cookies are only written by `/api/admin/login` after a verified
password + role check. `POST` is kept only to re-sync a token the browser client already rotated — it is verified with the Auth server **and** role-checked before storing; `DELETE` revokes the session at GoTrue.

---

### 🔴 C5 — `/pos` and `/driver` completely unprotected; driver PII public

**Where:** `middleware.ts` (`matcher: ["/admin/:path*"]`), `app/driver/page.tsx`, `app/(pos)/pos/page.tsx`

There was no middleware at all for `/pos`, `/driver`, `/employee`, `/api/employee`. `/driver`
rendered a hard-coded customer (name, phone, address, order total) to any visitor, and `/pos`
exposed the live order dashboard. The driver "login" (phone OTP) set no staff session, so it was
decorative.

**Fix:** middleware now matches `/admin`, `/api/admin`, `/employee`, `/api/employee`, `/pos`,
`/driver`. Staff sessions are HMAC-verified in the Edge runtime (Web Crypto) and role-aware:

| Route | Requirement |
|---|---|
| `/pos` | `Manager` with `full` or `orders` permission |
| `/driver` | `Driver`, or `Manager` |
| `/employee/login` | public (redirects when already signed in) |
| `/driver/login` | redirects to `/employee/login` — drivers are staff, not customers |

---

### 🟠 H1 — Admin sessions expired after 1 h with no refresh

The cookie `maxAge` was `session.expires_in` (3600 s) and nothing refreshed it, while the
middleware also accepted `maxAge` from the request body. Admins were silently logged out mid-shift
and land back on the login page.

**Fix:** the cookie now expires with the token's own `exp` (`accessTokenMaxAge`), and the dashboard
re-syncs it via `POST /api/admin/session` whenever Supabase rotates the access token
(`onAuthStateChange`) or when the login page finds a still-valid browser session. The refresh token
is *not* mirrored into a second cookie: two refreshers would fight over Supabase's refresh-token
rotation and silently log admins out.

---

### 🟠 H2 — No rate limiting on any authentication endpoint

Admin login, staff login, and OTP requests were unthrottled → password spraying, username
enumeration, OTP bombing, and unbounded Twilio spend.

**Fix:** `lib/rateLimit.ts` —
admin: 10/IP and 5/identifier per 10 min · staff: 20/IP and 6/username per 10 min · OTP:
`otp_request_allowed()` (5 per phone per 10 min) · 429 + `Retry-After`.
*Note:* the in-process store is per-instance; use Upstash/Vercel KV for multi-region guarantees.

---

### 🟠 H3 — Insecure default staff-session secret

`const SECRET = process.env.EMPLOYEE_SESSION_SECRET || 'dev-only-insecure-secret-change-me'`.
A deployment that forgot the env var signed staff cookies with a **publicly known string** —
anyone could forge a Manager token.

**Fix:** `getEmployeeSecret()` accepts only ≥ 32-char secrets; in production a missing secret
fails closed (login returns 503, middleware rejects every token). Add to `.env.example`:
`EMPLOYEE_SESSION_SECRET=$(openssl rand -base64 48)`.

---

### 🟠 H4 — Weak generated credentials

Staff passwords were `randomBytes(6)` → 48 bits, usernames 24 bits. 12h sessions were issued as
7-day cookies.

**Fix:** 96-bit passwords (`randomBytes(12)`), 24-bit unique usernames retained for readability
but no longer the only factor, 12 h sessions, drivers restricted to `delivery`/`viewer`.

---

### 🟠 H5 — Unrestricted file upload into a public bucket (stored XSS)

`app/api/admin/storage/route.ts` accepted any `File`, any size, derived the extension from the
client-provided **filename**, and uploaded to a public bucket. An `.html`/`.svg` upload served
from the Supabase CDN domain executes script in that origin (and can exfiltrate any localStorage
session token).

**Fix:** MIME allowlist + magic-byte sniffing + 5 MB cap + server-generated
`randomUUID().<canonical-ext>` + service-role upload after admin verification. Deletion paths are
regex-validated (no traversal/other-bucket keys).

---

### 🟠 H6 — Loyalty points forgeable; "2FA" was a boolean flag

`profiles` used a `FOR ALL` policy with `with check (auth.uid() = user_id)`, so the owner could set
`points` to any value, and the task "+75 points" was granted client-side. `two_factor_enabled` was
a checkbox with no second factor behind it.

**Fix:** `loyalty_events` ledger (PK `(user_id, task)`), `complete_loyalty_task()` security-definer
RPC (server-priced awards, once per task), and a `protect_profile_points` trigger that rejects any
direct `points` write from clients. The profile page now calls the RPC. ⚠️ Real 2FA still needs
Supabase MFA (`auth.mfa.enroll()`) — the flag remains cosmetic, see roadmap.

---

### 🟠 H7 — OTP brute force, no CORS on Edge Functions, missing `attempts`

`verify-whatsapp-otp` looked up `phone + code` with no attempt counter, so a 6-digit code could be
brute-forced inside its 10-minute window; both functions returned no CORS headers, so the
documented browser `fetch('/functions/…')` calls could never succeed.

**Fix:** newest-code lookup + `attempts` column (5 tries, then the code is burned), per-phone send
throttle, and `OPTIONS` + `Access-Control-Allow-*` on both functions.

---

### 🟠 H8 — Open redirect after login

`next` came straight from the query string into `router.push()`, so `/admin/login?next=//evil.com`
(or `https://evil.com`) navigated off-site right after a successful admin login — a credible
phishing pivot.

**Fix:** `safeNextPath()` (local paths only, rejects `//`, `/\`, CR/LF) applied on the server and
in the form.

---

### 🟡 M1 — `supabase/schema.sql` fails on a fresh project

1. `public.combo_addons` is created **before** `public.addons` → `relation "public.addons" does not
   exist` (the whole migration aborts).
2. Phase 4 runs `alter table public.employees …` **before** Phase 3 creates `employees`.
3. `avatars_user_prefix` references `storage.object.name`, which is not a valid relation → policy
   creation fails.
4. Menu tables were readable only by `authenticated`, so the anonymous storefront could read
   nothing from the DB.
5. No `handle_new_user` trigger → OTP sign-ups had no `profiles` row (the client then tried to
   insert one, racing the UI).

**Fix:** `schema.sql` rewritten in dependency order with the corrected storage policy, public read
of active rows, and a profile-creation trigger. Existing projects:
`supabase/migrations/20261031_backend_auth_hardening.sql` (idempotent).

---

### 🟡 M2 — Security headers / CSP absent

No CSP, HSTS, `X-Frame-Options`, or `nosniff`; `X-Powered-By` leaked the stack, and `/api/*`
responses were cacheable by intermediaries.

**Fix:** `next.config.mjs` sets CSP (`frame-ancestors 'none'`, no third-party script origins),
HSTS (prod), `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy, Permissions-Policy,
`poweredByHeader: false`, and `Cache-Control: no-store` on `/api/*`.

---

### 🟡 M3 — Service-role key handling was ambiguous and easy to get wrong

`.env.example` only exposed `SUP_ADMIN_KEY`, and `scripts/create-admin.mjs` silently fell back to
`SUP_ANON_KEY`, which cannot create users. Operators saw cryptic failures and were nudged toward
putting an admin key in a file that also holds `NEXT_PUBLIC_*` values.

**Fix:** `.env.example` documents `SUPABASE_SERVICE_ROLE_KEY` as server-only with a rotation note;
`lib/supabaseServer.ts` refuses to start if the key's JWT `role` is not `service_role`;
`lib/supabaseClient.ts` throws if a service-role key is ever put in `NEXT_PUBLIC_*`.

---

### ⚪ L1 — Remaining functional bugs (not security)

| File | Bug |
|---|---|
| `app/(customer)/page.tsx`, `lib/products.ts`, `components/ProductMenu.tsx` | Storefront menu is **hard-coded**. Admin "Menu & Inventory" writes to `public.products`/`combos`, so price/availability edits never reach customers. |
| `app/(customer)/loyalty/page.tsx` | Uses `const POINTS = 1250` instead of the signed-in profile → reward claims are pure UI. |
| `app/(customer)/cart`, `track-orders` | `PlaceholderPage` — no cart/checkout pipeline exists yet, although copy promises ordering. |
| `app/(admin)/(dashboard)/admin/products/page.tsx` | `insert([row])` uses the array form while other calls use objects (inconsistent, harmless). |
| `app/(admin)/(dashboard)/admin/promotions/page.tsx` | Mutates the `comboForm` state object (`comboForm.id = data.id`) before inserting `combo_addons`; can insert `combo_id: undefined` on fast re-submits. |
| `app/driver/page.tsx` | Hard-coded order/customer data (now behind staff auth, but still not wired to the DB). |
| repo-wide | No tests, no ESLint config, `next-env.d.ts` git-ignored (first `tsc --noEmit` fails on CSS imports until a build runs). |

---

## 4. Route isolation matrix (post-fix)

| Route | Audience | Gate | Credentials |
|---|---|---|---|
| `/`, `/product/[id]`, `/cart`, `/loyalty`, `/schedule-order`, `/settings`, `/track-orders` | Customers | none (public read of active menu via RLS) | none |
| `/login`, `/profile` | Customers | Supabase OTP session | **OTP only — no password, no username** |
| `/admin/login` | Admins | rate-limited login form | email **or mapped username** + password |
| `/admin/*` | Admins | middleware → verified token + `app_metadata.role` | httpOnly access cookie (synced on rotation) |
| `/api/admin/login` | Admins | rate limit + GoTrue verification | email/username + password |
| `/api/admin/session` | Admins | verified cookie (`GET`), revocation (`DELETE`) | cookie |
| `/api/admin/employees`, `/api/admin/storage` | Admins | verified cookie + `is_admin` | cookie + service role server-side |
| `/employee/login` | Staff | public form | mapped username + password |
| `/api/employee/login` | Staff | rate limit + scrypt verify | username + password |
| `/pos` | Managers (`full`/`orders`) | HMAC staff session | staff cookie |
| `/driver` | Drivers / Managers | HMAC staff session | staff cookie |
| `/driver/login` | — | redirects to `/employee/login` | — |

Customer UI contains **no** links to `/admin`, `/pos`, `/driver` or `/employee` (verified by grep),
and no staff route is reachable without a verified session.

---

## 5. Files changed

```
lib/adminAuth.ts                 rewritten — server-verified sessions, safe redirects, cookie helpers
lib/sessionToken.ts              NEW — Edge-safe HMAC tokens (Web Crypto)
lib/employeeSession.ts           NEW — Edge-safe staff session + role/path rules
lib/employeeAuth.ts              rewritten — scrypt hashing, dummy hash, credential generators
lib/supabaseServer.ts            NEW — service-role + anon server clients (server-only guard)
lib/rateLimit.ts                 NEW — fixed-window limiter for auth endpoints
lib/supabaseClient.ts            hardened — PKCE session, service-role key guard
middleware.ts                    rewritten — verifies admin & staff sessions, protects /pos /driver /employee
app/api/admin/login/route.ts     NEW — the backend login (username→email, verified role, cookies)
app/api/admin/session/route.ts   rewritten — GET introspection, DELETE revocation, POST 405
app/api/admin/employees/route.ts rewritten — verified admin + service-role writes + throttling
app/api/admin/storage/route.ts   rewritten — MIME/magic-byte/size checks, safe paths
app/api/employee/login/route.ts  rewritten — service-role RPC, timing-safe, rate-limited
app/(admin)/(auth)/admin/login/page.tsx          rewritten — posts credentials to the API
app/(admin)/(dashboard)/admin/layout.tsx         logout revokes cookies + session
app/driver/login/page.tsx                        redirects drivers to the staff login
app/(customer)/profile/page.tsx                  points via RPC (no client-side writes)
next.config.mjs                  security headers + CSP
supabase/schema.sql              rewritten — correct order + hardened RLS
supabase/migrations/20261031_backend_auth_hardening.sql   NEW — idempotent upgrade
supabase/migrations/otp_codes.sql                        grants, attempts, throttle RPC
supabase/functions/*/index.ts    CORS, OTP throttling, attempt lockout
scripts/create-admin.mjs         app_metadata role, email_confirm, admin_users mapping, --json
.env.example, README.md          server-only secrets documented
docs/backend-auth-setup.md       NEW — operator runbook
```

---

## 6. Verification performed

```bash
npx tsc --noEmit      # clean
npx next build        # 44 routes compiled
```

Runtime checks against `next start` (production build):

| Test | Result |
|---|---|
| `GET /` | `200` |
| `GET /admin` (no cookie) | `307 → /admin/login?next=%2Fadmin` |
| `GET /admin` with **forged** admin cookie | `307 → /admin/login` (was: `200` admin dashboard) |
| `GET /admin` with valid token but non-admin account | `307 → /admin/login` (verified through GoTrue) |
| `GET /pos` (no cookie) | `307 → /employee/login?next=%2Fpos` |
| `GET /pos` with valid Manager HMAC token | `200` |
| `GET /pos` with Kitchen token | `307 → /employee/login?error=forbidden` |
| `GET /pos` tampered / expired token | `307` |
| `GET /driver` / `GET /driver/login` | `307` (staff login) |
| `GET /api/admin/employees` (no cookie) | `401 {"error":"Unauthorized"}` |
| `POST /api/admin/session` (old token-planting) | `405` |
| Admin login, 5 bad attempts | `401 ×5`, then `429` with `Retry-After` |
| `DELETE /api/admin/session` | clears both cookies (`HttpOnly; Secure; SameSite=lax`) |
| Response headers | CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy, Permissions-Policy |

---

## 7. Remediation roadmap (recommended next)

1. **Move dashboard CRUD behind API proxies.** `/api/admin/login` currently returns the session
   once so the browser client can run RLS-scoped queries (the dashboard was written that way).
   Proxying `products`/`combos`/`employees` through `/api/admin/*` would keep admin tokens out of
   JS entirely.
2. **Real 2FA** via `supabase.auth.mfa.enroll()` for admin accounts; today the profile flag is
   cosmetic.
3. **Distributed rate limiting / WAF** (Upstash, Cloudflare) — the in-memory limiter is
   per-instance.
4. **Wire the storefront to Postgres** (`public.products`) instead of `lib/products.ts`, otherwise
   inventory controls are decorative.
5. **CI**: `npm run typecheck`, `next build`, `supabase db lint`, and a dependency audit
   (`npm audit`) on every PR. Add `next-env.d.ts` generation before `tsc` in CI.
6. **Audit logging**: write admin actions (staff creation, deletions, uploads) to an
   `admin_audit_log` table with the verified actor id.
7. **Turnstile/CAPTCHA** on `signInWithOtp` and admin login; enforce Supabase Auth rate limits
   (`Auth → Rate Limits`) and a minimum password policy.
8. **Key hygiene**: rotate the service-role key and the anon key if they were ever committed or
   pasted into a client bundle; confirm `SUPABASE_SERVICE_ROLE_KEY` exists only in Vercel's
   server-side env.

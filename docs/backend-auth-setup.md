# Backend / Admin authentication — setup & credentials

Two separate identity systems, by design:

| | Customer storefront | Backend (Admin + Staff) |
|---|---|---|
| Method | **OTP only** (phone/email), password-less | **Password** |
| Identity store | `auth.users` (Supabase Auth) | Admins: `auth.users` + `app_metadata.role`; Staff: `public.employees` |
| Session | Supabase client session | httpOnly admin cookie + HMAC-signed staff token |
| Routes | `/`, `/login`, `/profile`, … | `/admin/*`, `/pos`, `/driver`, `/employee/*` |

Nothing in the customer UI can request a password, and nothing in the backend can use OTP.

---

## 1. Supabase configuration

### 1.1 Project settings

1. **Authentication → Providers → Email**: enable **Email** provider.
   - "Confirm email": **off** for backend accounts (the script creates them pre-confirmed).
   - "Allow new users to sign up": you may turn **off** for a closed admin portal; the OTP
     storefront creates customer users through `/auth/v1/otp` and is unaffected.
2. **Authentication → Providers → Phone**: enable (Twilio) and set the sender to
   `whatsapp:+…` for WhatsApp OTP — see [whatsapp-otp-setup.md](./whatsapp-otp-setup.md).
3. **Authentication → Rate Limits**: set password sign-in to ~30/hour/IP and OTP to ~5/hour/phone.
4. **Project Settings → API**: copy
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` / publishable key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` / secret key → `SUPABASE_SERVICE_ROLE_KEY` (**server only — never `NEXT_PUBLIC_`**)
5. **Storage → Buckets**: `product-images` (public) and `avatars` (public), RLS on.

### 1.2 Database

Fresh project:

```sql
-- Supabase Dashboard → SQL Editor → paste the whole file → Run
-- supabase/schema.sql
```

Existing project (idempotent upgrade, keeps data):

```sql
-- supabase/migrations/20261031_backend_auth_hardening.sql
-- supabase/migrations/otp_codes.sql          (if you use the custom OTP mode)
```

Verify:

```sql
select public.is_admin();                       -- false while anonymous
select proname, proacl from pg_proc where proname = 'get_employee_by_username';
select tablename, policyname from pg_policies where schemaname = 'public' order by 1, 2;
```

`get_employee_by_username` must show `{postgres=X/postgres,service_role=X/postgres}` — **no `anon`
or `authenticated` entry**. If `anon=X` appears, authentication is still leaking password hashes.

### 1.3 Environment variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>     # server only
EMPLOYEE_SESSION_SECRET=$(openssl rand -base64 48)
```

On Vercel: Project → Settings → Environment Variables. `SUPABASE_SERVICE_ROLE_KEY` and
`EMPLOYEE_SESSION_SECRET` **must not** be exposed to the client bundle (no `NEXT_PUBLIC_` prefix).

---

## 2. Create the Master Admin (email or mapped username)

```bash
SUPABASE_URL=https://<ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service role key> \
node scripts/create-admin.mjs admin@baduma.lk \
  --username baduma-admin \
  --name "Master Admin"
```

Output (once):

```
✅ Master Admin CREATED
LOGIN PATH : /admin/login
EMAIL      : admin@baduma.lk
USERNAME   : baduma-admin  (mapped (@baduma-admin))
PASSWORD   : <24-char generated or --password value>
ROLE       : app_metadata.role = "admin"  (server-only claim)
```

What the script writes:

| Destination | Change |
|---|---|
| `auth.users` | user created/updated, `email_confirm: true`, **`app_metadata.role = "admin"`** |
| `auth.users.user_metadata` | `full_name` only — any legacy `role` key is **removed** |
| `public.admin_users` | `(user_id, username, email, display_name)` upsert for username login |

Add `--password 'YourStrongPassphrase1!'` for a fixed password, or `--json` for automated/CI
provisioning (never echo the password into CI logs).

To rotate: run the same command again — it updates the password and re-asserts the role.

To revoke an admin:

```sql
update auth.users
set raw_app_meta_data = raw_app_meta_data - 'role'
where email = 'admin@baduma.lk';

update public.admin_users set is_active = false where email = 'admin@baduma.lk';
```

---

## 3. Create staff accounts (Manager / Kitchen / Driver)

Sign in at `/admin` → **Manage Staff**. The UI calls `POST /api/admin/employees`, which:

1. verifies the caller's admin cookie against Supabase Auth and `app_metadata.role`;
2. generates `username` (`mgr1a2b3c`) and a 96-bit password;
3. stores only the scrypt hash in `public.employees` via the **service-role** client;
4. returns the plaintext password exactly once (never stored, `Cache-Control: no-store`).

Staff sign in at `/employee/login` with that username + password. `Manager → /pos`,
`Driver → /driver`, `Kitchen → /` (no POS rights).

---

## 4. The exact code

### 4.1 `POST /api/admin/login` — the backend login

`app/api/admin/login/route.ts` (abridged; full file with rate limits, revocation and audit in the repo):

```ts
export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. throttle (10/IP, 5/identifier per 10 min)
  // 2. read identifier + password, generic errors only
  let email = identifier;
  if (!identifier.includes("@")) {
    // username → email via the service-role-only allowlist table
    const mapped = await resolveUsername(identifier);
    if (!mapped) return jsonError("Invalid email/username or password.", 401);
    email = mapped;
  }

  // 3. verify the password with GoTrue, server-side (anon key, no session in JS)
  const { data, error } = await createAnonServerClient()
    .auth.signInWithPassword({ email, password });
  if (error || !data.session) return jsonError("Invalid email/username or password.", 401);

  // 4. authorise: app_metadata only (user_metadata is writable by the account owner)
  if (!isAdminUser(data.user)) {
    await revokeSession(data.session.access_token);
    return jsonError("This account does not have backend admin access.", 403);
  }

  // 5. httpOnly cookies; middleware verifies them on every /admin request
  const res = NextResponse.json({ success: true, user: { id: data.user.id, email } },
    { headers: { "Cache-Control": "no-store" } });
  res.cookies.set(ADMIN_COOKIE, data.session.access_token, adminCookieOptions(accessTokenMaxAge(data.session.access_token)));
  return res;
}
```

### 4.2 Role check (server-verified)

`lib/adminAuth.ts`:

```ts
export async function fetchSupabaseUser(accessToken?: string | null): Promise<SupabaseUser | null> {
  const config = getSupabaseConfig();
  if (!config || !accessToken) return null;
  const res = await fetch(`${config.url}/auth/v1/user`, {
    headers: { apikey: config.anonKey, Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  return res.ok ? ((await res.json()) as SupabaseUser) : null;
}

export function isAdminUser(user: SupabaseUser | null | undefined): boolean {
  const meta = user?.app_metadata;
  if (!meta) return false;
  return meta.role === "admin" || meta.is_admin === true ||
    (Array.isArray(meta.roles) && meta.roles.includes("admin"));
}
```

### 4.3 Database authorisation helper (RLS)

`supabase/schema.sql`:

```sql
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
      or exists (select 1 from public.admin_users a
                  where a.user_id = auth.uid() and a.is_active);
$$;

create policy "menu_admin_write" on public.products
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
```

### 4.4 Login form

`app/(admin)/(auth)/admin/login/page.tsx` posts credentials and never handles a role claim:

```ts
const res = await fetch("/api/admin/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  cache: "no-store",
  body: JSON.stringify({ identifier: identifier.trim(), password }),
});
const json = await res.json();
if (!res.ok || !json.success) throw new Error(json.error || "Sign in failed.");
router.replace(safeNextPath(nextUrl)); // local paths only — no open redirect
```

---

## 4.5 Fast path: one command → your username + password

Generate a strong password and install the account in one step (run it anywhere
that can reach your Supabase project — your machine, or `vercel env pull`):

```bash
export SUPABASE_URL=https://<ref>.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=<service role key>

PASS=$(node -e '
const c=require("node:crypto");
const w=["Kottu","Lava","Gold","Spice","Roti","Ceylon","Pearl","Mango"];
console.log(w[c.randomInt(w.length)]+w[c.randomInt(w.length)]+["#","@","!","$"][c.randomInt(4)]+
  c.randomInt(1000,9999)+c.randomBytes(3).toString("hex").toUpperCase());
')

node scripts/create-admin.mjs owner@baduma.lk --username baduma-owner --password "$PASS"
echo "LOGIN: /admin/login  ·  baduma-owner  ·  $PASS"
```

Re-running the same command **resets the password** (it takes the "UPDATED" path),
so it doubles as a recovery tool. Add `--json` for CI/automation.

> `scripts/create-admin.mjs` needs the **service role key**. The anon key cannot
> create users or write `app_metadata` — that asymmetry is exactly why the admin
> role lives in `app_metadata`.

---

## 5. Verify the whole flow

```bash
npm install
npx tsc --noEmit && npx next build
npm start                    # or: next dev
```

1. `http://localhost:3000/admin` → redirected to `/admin/login?next=%2Fadmin`.
2. Sign in with the email **or** the username from step 2 → dashboard, sidebar, and CRUD work.
3. `curl -i http://localhost:3000/admin` → `307`; `curl -i http://localhost:3000/api/admin/employees`
   → `401 {"error":"Unauthorized"}`.
4. Forged cookie is rejected:

   ```bash
   curl -o /dev/null -w '%{http_code}\n' --cookie \
     'baduma_admin_access=eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjk5OTk5OTk5OTksImFwcF9tZXRhZGF0YSI6eyJyb2xlIjoiYWRtaW4ifX0.x' \
     http://localhost:3000/admin        # → 307
   ```

5. Staff: create a Manager in **Manage Staff**, sign in at `/employee/login` → `/pos`.
6. Customers: `/login` still sends an OTP and never mentions a password.

---

## 5.1 End-to-end proof without a Supabase project

The auth path was verified end-to-end against a local GoTrue/PostgREST emulator,
so you can reproduce the whole thing offline (no keys, no network):

```bash
# terminal 1 — local emulator (:54321)
npm run dev:mock

# terminal 2 — build + run the app against it
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
NEXT_PUBLIC_SUPABASE_ANON_KEY=mock-anon-key \
SUPABASE_SERVICE_ROLE_KEY=mock-service-key \
EMPLOYEE_SESSION_SECRET=$(openssl rand -base64 48) \
npx next build && npx next start -p 3112

# terminal 3 — the checks
BASE_URL=http://127.0.0.1:3112 \
ADMIN_IDENTIFIER=baduma-admin ADMIN_EMAIL=admin@baduma.lk ADMIN_PASSWORD='AdminDemo#2026' \
STAFF_USERNAME=mgr-demo STAFF_PASSWORD='StaffDemo#2026' \
npm run test:e2e

BASE_URL=http://127.0.0.1:3112 \
EMPLOYEE_SESSION_SECRET=<the same secret> npm run verify:security
```

Verified output (2026-10-31):

```
✅ wrong admin password is rejected — HTTP 401
✅ admin login with username "baduma-admin" — HTTP 200
✅ login sets an httpOnly admin cookie
✅ authenticated /admin dashboard renders — HTTP 200
✅ GET /api/admin/employees with session — HTTP 200
✅ PATCH /api/admin/settings persists — HTTP 200
✅ sign-out clears the session — HTTP 200
✅ signed-out cookie can no longer open /admin — HTTP 307
✅ admin login with email "admin@baduma.lk" — HTTP 200
✅ staff login "mgr-demo" — HTTP 200
✅ staff session opens /pos (Manager) — HTTP 200
✅ storefront is public / customer OTP login is public
🎉 end-to-end auth flow works — 17/17
```

The emulator is a **test double only** (`scripts/dev-supabase-mock.mjs`). It is
not secure and must never be deployed.

## 6. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Sign-in is temporarily unavailable` on `/api/admin/login` | `NEXT_PUBLIC_SUPABASE_*` missing/invalid | check `.env.local`, restart the server |
| `Invalid email/username or password` for a username | username not in `admin_users` (migration not run) or `is_active = false` | run the migration; re-run `create-admin.mjs --username …` |
| `This account does not have backend admin access` | password ok, `app_metadata.role` missing | re-run `create-admin.mjs` (it sets `app_metadata`) |
| Login succeeds then bounces back to `/admin/login` | cookie not stored (http on a `Secure` cookie, or a proxy stripping `Set-Cookie`) | use `npm run dev` locally; in production serve over HTTPS and don't strip cookies at the CDN |
| `503` on `/api/employee/login` | `SUPABASE_SERVICE_ROLE_KEY` or `EMPLOYEE_SESSION_SECRET` (< 32 chars) missing | set both |
| Staff sign-in "works" but `/pos` redirects with `?error=forbidden` | non-Manager account, or permission not `full`/`orders` | recreate the account with the right permission |
| `permission denied for function get_employee_by_username` | RPC called with anon/authenticated | expected — only the server may call it |

# Baduma — Backend Login Guide (ඔයාට log වෙන්න)

> **කෙටියෙන්:** ඔයාගේ Supabase project එකේ URL එකයි service_role key එකයි දීලා, එක command එකක් run කරන්න.
> එයා ඔයාට username + password එකක් හදලා දෙනවා, ඒකෙන් `/admin/login` එකට ඇතුල් වෙන්න.
>
> Customer site එක OTP only — මේකෙන් ඒකට කිසි වෙනසක් නෑ.

---

## 0. මුලින්ම — ඔයාට තියෙන ප්‍රශ්නය මොකක්ද?

| ඔයා දැන් කරන්න හදන්නේ | යන්න |
|---|---|
| ඉක්මනට බලන්න, වැඩ කරනවද කියලා (Supabase එකක් නැතුව) | [A. Demo](#a-දැන්ම-බලන්න-වැඩ-කරනවාද) |
| ඇත්තටම ඔයාගේ site එකට log වෙන්න | [B. Real setup](#b-ඇත්තටම-log-වෙන්න-පියවර-3) |
| දැනටමත් deploy කරලා තියෙන site එකේ login වැඩ කරන්නේ නෑ | [C. Troubleshooting](#c-වැඩ-කරන්නේ-නැත්නම්) |

---

## A. දැන්ම බලන්න වැඩ කරනවාද

```bash
npm install
npm run dev:mock          # terminal 1 — fake Supabase (dev only)
npm run dev              # terminal 2 — http://localhost:3000
```

ඊට පස්සේ **http://localhost:3000/admin/login** එකට ගිහින්:

| | |
|---|---|
| Username | `baduma-admin` |
| Password | `AdminDemo#2026` |

මේක demo data විතරයි — ඇත්තටම use කරන්න [B](#b-ඇත්තටම-log-වෙන්න-පියවර-3) කරන්න.

---

## B. ඇත්තටම log වෙන්න — පියවර 3

### පියවර 1 — Supabase project එකේ values ටික ගන්න

Supabase Dashboard → ඔයාගේ project → **Project Settings → API**:

- **Project URL** → `https://xxxxxxxx.supabase.co`
- **service_role** key (secret එක, `anon` එක නෙවෙයි)

### පියවර 2 — Database එක හදන්න

Supabase → **SQL Editor → New query** → මේ files තුනේ content එක **පිළිවෙලට** paste කරලා **Run** කරන්න:

1. `supabase/migrations/otp_codes.sql`
2. `supabase/migrations/20261031_backend_auth_hardening.sql`
3. `supabase/migrations/20261101_orders.sql`

*(හෝ — `SUPABASE_ACCESS_TOKEN` එකක් තියෙනවා නම්, පියවර 3 script එකම මේක කරලා දෙනවා.)*

### පියවර 3 — එක command එකක්

```bash
export SUPABASE_URL=https://xxxxxxxx.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...service_role...
export EMPLOYEE_SESSION_SECRET="$(openssl rand -base64 48)"

npm run setup:backend -- owner@baduma.lk --username baduma-owner
```

එයා මේක කරනවා:

```
[1] Checking configuration        ← env vars තියෙනවද
[2] Talking to Supabase           ← URL/key හරිද
[3] Checking the database schema  ← tables තියෙනවද (නැත්නම් apply කරනවා)
[4] Creating the master admin     ← user එක හදනවා
[5] Proving the login works       ← ඇත්තටම password grant එකක් ගහලා test කරනවා
[6] Signing in through the app    ← (optional) deployed site එකෙත් test කරනවා
```

අන්තිමට මේක print වෙනවා:

```
  ✅ BACKEND LOGIN IS READY
  Login page : https://baduma.vercel.app/admin/login
  Username   : baduma-owner
  Password   : RotiCeylon@A1B2C3D4E5F6
  Email      : owner@baduma.lk   (email login works too)
```

ඒ password එක **password manager එකේ දාගන්න** — එයා තව කොහෙවත් save කරන්නේ නෑ.
Password එක මතක නැති වුනොත් — ඔය command එකම ආයේ run කරන්න. අලුත් එකක් හදනවා.

ඔයාගේම password එකක් ඕනෙ නම්: `--password 'MyOwn@Password123'` (අඩුම අකුරු 12).

---

## C. වැඩ කරන්නේ නැත්නම්

### Deployed site එක (Vercel) — env vars

Vercel → Project → Settings → Environment Variables. මේක **අනිවාර්යයි**:

| Variable | තියෙන්න ඕන | නැත්නම් වෙන්නේ |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ඔව් | site එකට Supabase හම්බවෙන්නේ නෑ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ඔව් | OTP / customer login fail |
| `SUPABASE_SERVICE_ROLE_KEY` | ඔව් | admin login → **503** |
| `EMPLOYEE_SESSION_SECRET` | ඔව් | staff (POS/driver) login → **503** |

> **2026-11-01:** `EMPLOYEE_SESSION_SECRET` එක Vercel project එකට එකතු කරලා තියෙනවා.
> ඒක ප්‍රයෝජනයට ගන්න **Redeploy** එකක් ඕනේ (Deployments → ⋯ → Redeploy).

### Error කේත බලලා හඳුනාගන්න

| දකින්නේ | අර්ථය | කරන්නේ |
|---|---|---|
| `Invalid username or password` | user නෑ / password වැරදි | `npm run setup:backend -- ...` ආයේ run කරන්න |
| `503` | server env එකේ key එකක් නෑ | උඩ table එක බලන්න → Redeploy |
| `Email not confirmed` | GoTrue එකේ confirm වෙලා නෑ | `create-admin.mjs` ආයේ run කරන්න (confirm කරනවා) |
| `/admin` එකට ගිහාම ආයේ login එකට විසි වෙනවා | cookie set වෙන්නේ නෑ | HTTPS එකෙන් යන්න, browser එකේ cookies block කරලා නැද්ද බලන්න |
| `role = authenticated` (admin නෙවෙයි) | `app_metadata.role` set වෙලා නෑ | `create-admin.mjs` එකෙන් විතරයි මේක හදන්න පුළුවන් |

### තමන්ම test කරන්න

```bash
# 1. Login API එක
curl -i -X POST https://baduma.vercel.app/api/admin/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"baduma-owner","password":"YOUR_PASSWORD"}'

# 2. Security regression suite (25 checks)
BASE_URL=https://baduma.vercel.app npm run verify:security
```

---

## D. ඇයි password customer ට නෑ?

| Portal | Auth | ඇයි |
|---|---|---|
| Customer (`/`, `/cart`, `/track-orders`) | **OTP only** — password නෑ | phone එකට code එකක්. Password reset support, leak risk, forgotten-password calls — ඔක්කොම නෑ |
| Admin (`/admin`) | email **හෝ** username + password | dashboard එකට යන්නේ එක මිනිහෙක්/දෙන්නෙක්. Supabase Auth (GoTrue) — bcrypt, rate limits, session rotation |
| Staff (`/pos`, `/driver`) | username + password | row එක `public.employees`, scrypt hash, HMAC signed cookie (12h) |

Admin account එකේ role එක තියෙන්නේ `app_metadata.role = "admin"` එකේ — **`user_metadata` එකේ නෙවෙයි**.
`user_metadata` එක user ටම edit කරන්න පුළුවන් — ඒ නිසා එතන role එකක් තිබ්බොත් කවුරුත් තමන්ට admin දෙන්න පුළුවන්.
`app_metadata` එක service_role එකෙන් විතරයි ලියන්න පුළුවන්.

---

## E. තවත් admin කෙනෙක් එකතු කරන්න

```bash
npm run create:admin -- accounting@baduma.lk --username baduma-accounts --name "Accounts"
```

එයාගේ access එක අයින් කරන්න: Supabase → Authentication → Users → user → Delete.
(RLS එකේ `public.is_admin()` එක `admin_users` table එක බලනවා — එතනින් row එකත් delete කරන්න.)

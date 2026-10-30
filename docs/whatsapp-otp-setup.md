# Baduma.sl — WhatsApp OTP via Twilio + Supabase

> This guide covers configuring Supabase Auth to send OTPs via **WhatsApp** (instead of standard SMS) using **Twilio**, and a Supabase Edge Function fallback architecture for sending **custom WhatsApp templates** when Supabase's native Phone provider is insufficient.

---

## 1. Configure Twilio WhatsApp in the Supabase Dashboard

### 1.1 Enable the Phone provider

1. Open the Supabase Dashboard → your project.
2. Go to **Authentication** → **Providers** → **Phone**.
3. Toggle **Phone** to **Enabled**.
4. Under **Message Provider**, select **Twilio**.
5. Fill in the Twilio credentials:
   - **Messaging Service SID**: your Twilio messaging service SID (optional)
   - **Phone Number**: your Twilio sender number — see formatting below
6. Click **Save**.

### 1.2 Configure the Phone Provider for WhatsApp

In the Phone provider settings, the sender number determines the delivery channel:

| Sender format | Channel |
|---|---|
| `+14155238886` | SMS |
| `whatsapp:+14155238886` | **WhatsApp** |

To send OTPs via WhatsApp, use the `whatsapp:` prefix:

```
whatsapp:+14155238886
```

### 1.3 Twilio WhatsApp Sandbox vs Production

**Sandbox (development):**
- Use the Twilio WhatsApp Sandbox number (e.g. `+14155238886`).
- Join the sandbox via the keyword `join baduma` (or your chosen keyword) from a test WhatsApp number.
- Messages are free-form — no template approval needed.
- Set the sender as: `whatsapp:+14155238886`

**Production:**
- Request a Twilio number with WhatsApp enabled, or connect your WhatsApp Business API account.
- **All outbound messages must use Meta-approved templates.**
- Supabase's default OTP message is plain text — it may NOT be approved as a WhatsApp template. Use the Edge Function fallback below for production.

---

## 2. Sender Phone Number Formatting

The sender number is configured in the Phone provider settings:

```
whatsapp:+<country_code><number>
```

Examples:

| Provider | Sender |
|---|---|
| Twilio Sandbox | `whatsapp:+14155238886` |
| Twilio Production | `whatsapp:+14155550123` |

The `whatsapp:` prefix tells Supabase/Twilio to route the message through the WhatsApp channel. Without it, the message goes via SMS.

The recipient number is formatted in the client-side call:

```typescript
await supabase.auth.signInWithOtp({ phone: '+94771234567' });
```

Supabase normalizes the phone number (E.164) and sends to `whatsapp:+94771234567` via Twilio.

---

## 3. Edge Function Fallback — Custom WhatsApp Templates

### When to use the fallback

Supabase's native Phone provider sends a default OTP message. In **production WhatsApp**, Meta requires all outbound messages to use **pre-approved templates**. Supabase's default message is not a template, so you need an Edge Function to send a custom approved template.

### Architecture overview

```
Client                    Edge Function                 Twilio
  │                          │                            │
  │ POST /send-whatsapp-otp  │                            │
  │ { phone, mode }          │                            │
  ├─────────────────────────►│                            │
  │                          │                            │
  │           ┌───────────────┤                            │
  │           │ mode: native │                            │
  │           │ (verifyOtp-  │                            │
  │           │  compatible)│                            │
  │           │             │ 1. POST /auth/v1/otp       │
  │           │             │    (service role)          │
  │           │             │    → OTP stored in        │
  │           │             │      Supabase Auth         │
  │           │             │ 2. Supabase sends OTP      │
  │           │             │    via Phone provider      │
  │           │             │    (WhatsApp)              │
  │           │             │ 3. Branded notification   │
  │           │             │    via Twilio WhatsApp     │
  │           │             │                            │
  │           │             │◄───────────────────────────┘
  │           │             │                            │
  │           │             │ 4. Client calls            │
  │           │             │    supabase.auth.          │
  │           │             │    verifyOtp()             │
  │           │             │                            │
  │           └───────────────┤                            │
  │           │ mode: custom  │                            │
  │           │ (full control)│                            │
  │           │             │ 1. Generate OTP (crypto)    │
  │           │             │ 2. Store in otp_codes table│
  │           │             │ 3. Send via Twilio         │
  │           │             │    WhatsApp (template)     │
  │           │             │                            │
  │           │             │◄───────────────────────────┘
  │           │             │                            │
  │           │             │ 4. Client calls            │
  │           │             │    /verify-whatsapp-otp   │
  │           │             │    → Edge Function checks │
  │           │             │      DB, ensures user     │
  └─────────────────────────►│                            │
```

### 3.1 Edge Functions

Two Edge Functions are provided:

| Function | Path | Purpose |
|---|---|---|
| `send-whatsapp-otp` | `supabase/functions/send-whatsapp-otp/index.ts` | Sends the WhatsApp OTP (native or custom mode) |
| `verify-whatsapp-otp` | `supabase/functions/verify-whatsapp-otp/index.ts` | Verifies the OTP (custom mode only) |

### 3.2 Required environment variables

Set these in the Supabase Dashboard → **Edge Functions** → **Variables**:

| Variable | Example | Notes |
|---|---|---|
| `SUPABASE_URL` | `https://xyzcompany.supabase.co` | Your project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Service role key (secret) |
| `TWILIO_ACCOUNT_SID` | `ACxxxxxxxxxxxxxxxxxxxx` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | `xxxxxxxxxxxxxxxxxxxx` | Twilio auth token (secret) |
| `TWILIO_WHATSAPP_SENDER` | `whatsapp:+14155238886` | WhatsApp sender |

### 3.3 Database migration

The custom mode stores OTPs in a Postgres table. Run this migration:

```sql
-- supabase/migrations/otp_codes.sql
create table if not exists public.otp_codes (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  code text not null,
  expires_at timestamptz not null,
  used boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists otp_codes_phone_idx on public.otp_codes (phone);
```

### 3.4 Client-side usage

**Native mode (verifyOtp-compatible):**

```typescript
// Step 1 — request OTP
await fetch('/functions/send-whatsapp-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phone: '+94771234567', mode: 'native' }),
});

// Step 2 — verify with Supabase Auth (OTP is in Supabase's store)
await supabase.auth.verifyOtp({
  phone: '+94771234567',
  token: '123456',
  type: 'sms',
});
// → session returned
```

**Custom mode (custom template):**

```typescript
// Step 1 — request OTP
await fetch('/functions/send-whatsapp-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phone: '+94771234567', mode: 'custom' }),
});

// Step 2 — verify via Edge Function
const { data, error } = await fetch('/functions/verify-whatsapp-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phone: '+94771234567', token: '123456' }),
});
// → { success: true, user: { id, phone } }
//
// The Edge Function verifies the OTP against the otp_codes table, marks it
// used, and ensures a Supabase Auth user exists for the phone. The client
// then obtains a session via the native flow (signInWithOtp + verifyOtp) —
// see the note below.
```

### 3.5 How `verifyOtp()` works (and its limits)

- `supabase.auth.verifyOtp()` validates an OTP against **Supabase Auth's internal OTP store**.
- The OTP enters that store only when Supabase generates it — i.e. via `signInWithOtp()` or the internal `POST /auth/v1/otp` endpoint.
- The OTP **value is never exposed** to clients or Edge Functions (the `/auth/v1/otp` response contains only `message_id`).
- Therefore:
  - **Native mode**: the Edge Function triggers `POST /auth/v1/otp` (service role), which stores the OTP in Supabase → `verifyOtp()` works.
  - **Custom mode**: the Edge Function generates its own OTP → it is NOT in Supabase's store → `verifyOtp()` **cannot** validate it. Use the `verify-whatsapp-otp` Edge Function instead.

### 3.6 Custom mode — obtaining a session

The `verify-whatsapp-otp` Edge Function verifies the OTP and ensures a Supabase Auth user exists, but does **not** generate a session token directly. This is because `@supabase/auth-js` v2.118 does not expose `admin.generateUserToken()` or `admin.getUserByPhone()` in the admin API.

To obtain a session after custom-mode verification, the client uses the native flow:

```typescript
// After verify-whatsapp-otp confirms the OTP:
await supabase.auth.signInWithOtp({ phone: '+94771234567' }); // sends a new OTP
// ... user enters the new OTP ...
await supabase.auth.verifyOtp({ phone: '+94771234567', token: '123456', type: 'sms' });
// → session returned
```

Alternatively, upgrade to a newer Supabase Auth SDK that exposes `admin.generateUserToken()` for direct session generation inside the Edge Function.

---

## 4. Security checklist

- [ ] Never expose the Twilio auth token or Supabase service role key in client code.
- [ ] Use the service role key only inside Edge Functions (server-side).
- [ ] Validate phone numbers (E.164 format) in the Edge Function before sending.
- [ ] Rate-limit OTP requests per phone number (e.g. 3 requests / 10 minutes).
- [ ] Mark OTPs as single-use (`used = true`) after verification.
- [ ] Set a short expiry (e.g. 10 minutes) on stored OTPs.
- [ ] For production WhatsApp, use only Meta-approved templates.

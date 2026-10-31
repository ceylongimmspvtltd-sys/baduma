# baduma

## Master Admin login

Create the admin login (email + password) for the Staff & Admin Portal:

```bash
SUP_URL=https://YOUR-PROJECT.supabase.co \
SUP_ADMIN_KEY=YOUR-ADMIN-API-KEY \
node scripts/create-admin.mjs hari@baduma.com "strong-password"
```

- Generates the account with the `role: "admin"` claim required by the login
  page and `middleware.ts`, or resets it if the email already exists
- Omit the password argument to auto-generate a strong one (printed once)
- ADMIN API key: https://supabase.com/project/settings/api

Then sign in at `/admin/login` (Email + Password — separate from the
customer OTP flow).

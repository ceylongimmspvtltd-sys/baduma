-- Baduma.sl — WhatsApp OTP storage table
-- Used by the "custom" mode of the send-whatsapp-otp Edge Function.
-- The Edge Function accesses this table with the service role key,
-- which bypasses Row Level Security.

create table if not exists public.otp_codes (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  code text not null,
  expires_at timestamptz not null,
  used boolean not null default false,
  created_at timestamptz not null default now()
);

-- Index for fast OTP lookups.
create index if not exists otp_codes_phone_idx on public.otp_codes (phone);

-- Allow the service role to read/write (Edge Functions use the service role key).
alter table public.otp_codes enable row level security;

-- The Edge Function uses the service role, which bypasses RLS by design.
-- If you ever want clients to read this table directly, add a policy here.

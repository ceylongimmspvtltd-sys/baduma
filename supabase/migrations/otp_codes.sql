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

-- Brute-force counter: a live code is invalidated after 5 wrong attempts.
alter table public.otp_codes add column if not exists attempts integer not null default 0;

-- Index for fast OTP lookups.
create index if not exists otp_codes_phone_idx on public.otp_codes (phone);

-- Allow the service role to read/write (Edge Functions use the service role key).
alter table public.otp_codes enable row level security;

-- No policies are defined, so RLS denies every client request (anon and
-- authenticated) — only the service role (Edge Functions / server) can read
-- OTPs. The grants below make that explicit instead of relying on defaults.
revoke all on public.otp_codes from anon, authenticated;
grant select, insert, update, delete on public.otp_codes to service_role;

-- Housekeeping: drop expired codes.
create index if not exists otp_codes_expires_at_idx on public.otp_codes (expires_at);

-- Per-phone throttle used by the Edge Function (max 5 OTPs / 10 minutes).
create or replace function public.otp_request_allowed(p_phone text, p_limit integer default 5, p_window interval default '10 minutes')
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select count(*) < p_limit
  from public.otp_codes
  where phone = p_phone
    and created_at > now() - p_window;
$$;

revoke all on function public.otp_request_allowed(text, integer, interval) from public, anon, authenticated;
grant execute on function public.otp_request_allowed(text, integer, interval) to service_role;

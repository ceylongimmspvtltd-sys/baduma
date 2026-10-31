-- =====================================================================
-- BADUMA · Canonical schema (hardened, 2026-10-31)
--
-- Run this once on a fresh Supabase project:  SQL Editor → New query → Run.
-- Existing projects: run supabase/migrations/20261031_backend_auth_hardening.sql
-- instead (it is idempotent and migrates data).
--
-- Security model
--   * Customers  : password-less OTP only. Their JWT carries no admin claim.
--   * Staff      : rows in public.employees (username + scrypt hash).
--   * Admins     : Supabase Auth users whose **app_metadata.role = 'admin'**
--                  (server-writable only) and/or members of public.admin_users.
--   * RLS helper : public.is_admin() — never trusts user_metadata.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Extensions
-- ---------------------------------------------------------------------
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. Menu tables (order matters: `addons` before `combo_addons`)
-- ---------------------------------------------------------------------

create table if not exists public.products (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text not null default '',
  category      text not null default 'Other',
  veg           boolean not null default true,
  image_url     text,
  normal_price  numeric(10, 2) not null default 0,
  full_price    numeric(10, 2) not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.addons (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  price         numeric(10, 2) not null default 0,
  image_url     text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.combos (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text not null default '',
  price         numeric(10, 2) not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.combo_addons (
  combo_id  uuid not null references public.combos(id) on delete cascade,
  addon_id  uuid not null references public.addons(id) on delete cascade,
  primary key (combo_id, addon_id)
);

create table if not exists public.daily_offers (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  description       text not null default '',
  discount_percent  numeric(5, 2) not null default 0,
  is_active         boolean not null default true,
  starts_at         timestamptz,
  ends_at           timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. Customers (loyalty)
-- ---------------------------------------------------------------------

create table if not exists public.profiles (
  user_id             uuid primary key references auth.users(id) on delete cascade,
  points              integer not null default 0 check (points >= 0),
  avatar_url          text,
  two_factor_enabled  boolean not null default false,
  email_added         boolean not null default false,
  facebook_linked     boolean not null default false,
  instagram_linked    boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Immutable award ledger: one row per (user, task) → no double-claiming.
create table if not exists public.loyalty_events (
  user_id     uuid not null references auth.users(id) on delete cascade,
  task        text not null check (task in ('avatar', 'twofa', 'email', 'facebook', 'instagram')),
  points      integer not null check (points >= 0),
  created_at  timestamptz not null default now(),
  primary key (user_id, task)
);

-- ---------------------------------------------------------------------
-- 3. Backend staff & admins
-- ---------------------------------------------------------------------

-- Allowlist / username mapping for the backend portal.
create table if not exists public.admin_users (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  username       text not null unique check (username = lower(username) and length(username) between 3 and 40),
  email          text not null,
  display_name   text,
  is_active      boolean not null default true,
  last_login_at  timestamptz,
  created_at     timestamptz not null default now()
);

create table if not exists public.employees (
  id                uuid primary key default gen_random_uuid(),
  username          text not null unique check (username = lower(username)),
  password_hash     text not null,
  full_name         text,
  contact           text,
  position          text not null check (position in ('Manager', 'Kitchen', 'Driver')),
  permission_level  text not null check (permission_level in ('full', 'orders', 'delivery', 'viewer')),
  is_active         boolean not null default true,
  created_by        uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4. Helper functions
-- ---------------------------------------------------------------------

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

/**
 * Authorisation predicate used by every admin RLS policy.
 *
 * Reads ONLY `app_metadata`, which an end user cannot modify (it is writable
 * exclusively with the service-role key). The previous policies read
 * `user_metadata.role`, which any signed-in customer could set to "admin"
 * through `supabase.auth.updateUser({ data: { role: 'admin' } })`.
 */
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
      or exists (
           select 1
           from public.admin_users a
           where a.user_id = auth.uid()
             and a.is_active
         );
$$;

-- Create a loyalty profile for every new auth user (incl. OTP sign-ups).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

-- `profiles.points` must never be writable by the account owner.
create or replace function public.protect_profile_points()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.points is distinct from old.points
     and not public.is_admin()
     and coalesce(auth.jwt() ->> 'role', '') <> 'service_role'
  then
    raise exception 'points are managed by complete_loyalty_task()' using errcode = '42501';
  end if;
  return new;
end;
$$;

/**
 * Award a loyalty task exactly once and return the new balance.
 * Callable by authenticated customers only; never trusts a client-supplied
 * point value.
 */
create or replace function public.complete_loyalty_task(p_task text)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid    uuid := auth.uid();
  v_award  integer;
  v_points integer;
  v_inserted boolean;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  v_award := case p_task
    when 'avatar'    then 50
    when 'twofa'     then 100
    when 'email'     then 75
    when 'facebook'  then 50
    when 'instagram' then 50
    else null
  end;

  if v_award is null then
    raise exception 'unknown loyalty task: %', p_task using errcode = '22023';
  end if;

  insert into public.loyalty_events (user_id, task, points)
  values (v_uid, p_task, v_award)
  on conflict (user_id, task) do nothing;
  v_inserted := found;

  insert into public.profiles (user_id) values (v_uid) on conflict (user_id) do nothing;

  if not v_inserted then
    select points into v_points from public.profiles where user_id = v_uid;
    return coalesce(v_points, 0);
  end if;

  update public.profiles
     set points = points + v_award,
         updated_at = now()
   where user_id = v_uid
  returning points into v_points;

  return coalesce(v_points, 0);
end;
$$;

/**
 * Staff credential lookup — service_role ONLY.
 *
 * The previous definition was executable by `anon`, so anyone holding the
 * public anon key could dump every staff password hash through
 * `POST /rest/v1/rpc/get_employee_by_username`. EXECUTE is revoked below and
 * only the server (`/api/employee/login`) may call it.
 */
create or replace function public.get_employee_by_username(p_username text)
returns table (
  id                uuid,
  username          text,
  password_hash     text,
  position          text,
  permission_level  text,
  is_active         boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select e.id, e.username, e.password_hash, e.position, e.permission_level, e.is_active
  from public.employees e
  where e.username = lower(trim(p_username))
  limit 1;
$$;

revoke all on function public.get_employee_by_username(text) from public;
revoke all on function public.get_employee_by_username(text) from anon, authenticated;
grant execute on function public.get_employee_by_username(text) to service_role;

revoke all on function public.complete_loyalty_task(text) from public;
revoke all on function public.complete_loyalty_task(text) from anon;
grant execute on function public.complete_loyalty_task(text) to authenticated;

grant execute on function public.is_admin() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- 5. Triggers
-- ---------------------------------------------------------------------

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

do $$
declare
  t text;
begin
  foreach t in array array['products', 'addons', 'combos', 'daily_offers', 'profiles', 'employees']
  loop
    execute format('drop trigger if exists trg_%s_updated_at on public.%I', t, t);
    execute format(
      'create trigger trg_%s_updated_at before update on public.%I for each row execute function public.handle_updated_at()',
      t, t
    );
  end loop;
end
$$;

drop trigger if exists trg_profiles_protect_points on public.profiles;
create trigger trg_profiles_protect_points
  before update on public.profiles
  for each row execute function public.protect_profile_points();

-- ---------------------------------------------------------------------
-- 6. Row Level Security
-- ---------------------------------------------------------------------

alter table public.products        enable row level security;
alter table public.addons          enable row level security;
alter table public.combos          enable row level security;
alter table public.combo_addons    enable row level security;
alter table public.daily_offers    enable row level security;
alter table public.profiles        enable row level security;
alter table public.loyalty_events  enable row level security;
alter table public.employees       enable row level security;
alter table public.admin_users     enable row level security;

-- Public (anonymous storefront) reads active menu items only.
drop policy if exists "menu_public_read" on public.products;
create policy "menu_public_read" on public.products
  for select to anon, authenticated using (is_active = true);

drop policy if exists "menu_public_read" on public.addons;
create policy "menu_public_read" on public.addons
  for select to anon, authenticated using (is_active = true);

drop policy if exists "menu_public_read" on public.combos;
create policy "menu_public_read" on public.combos
  for select to anon, authenticated using (is_active = true);

drop policy if exists "menu_public_read" on public.daily_offers;
create policy "menu_public_read" on public.daily_offers
  for select to anon, authenticated using (is_active = true);

drop policy if exists "combo_addons_public_read" on public.combo_addons;
create policy "combo_addons_public_read" on public.combo_addons
  for select to anon, authenticated using (true);

-- Admin full access (verified app_metadata role / allowlist).
drop policy if exists "menu_admin_write" on public.products;
create policy "menu_admin_write" on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "menu_admin_write" on public.addons;
create policy "menu_admin_write" on public.addons
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "menu_admin_write" on public.combos;
create policy "menu_admin_write" on public.combos
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "menu_admin_write" on public.daily_offers;
create policy "menu_admin_write" on public.daily_offers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "combo_addons_admin" on public.combo_addons;
create policy "combo_addons_admin" on public.combo_addons
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Profiles: owner-scoped; points locked by trigger.
drop policy if exists "profiles_own_row" on public.profiles;
drop policy if exists "profiles_own_select" on public.profiles;
create policy "profiles_own_select" on public.profiles
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "profiles_own_insert" on public.profiles;
create policy "profiles_own_insert" on public.profiles
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "profiles_own_update" on public.profiles;
create policy "profiles_own_update" on public.profiles
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "profiles_admin_read" on public.profiles;
create policy "profiles_admin_read" on public.profiles
  for select to authenticated using (public.is_admin());

-- Loyalty ledger: read your own history; writes only via the RPC.
drop policy if exists "loyalty_events_own_read" on public.loyalty_events;
create policy "loyalty_events_own_read" on public.loyalty_events
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "loyalty_events_admin_read" on public.loyalty_events;
create policy "loyalty_events_admin_read" on public.loyalty_events
  for select to authenticated using (public.is_admin());

-- Employees: admins may read; writes go through the service role only.
drop policy if exists "employees_admin_only" on public.employees;
drop policy if exists "employees_admin_read" on public.employees;
create policy "employees_admin_read" on public.employees
  for select to authenticated using (public.is_admin());

revoke insert, update, delete on public.employees from anon, authenticated;

-- Admin allowlist: service role only.
drop policy if exists "admin_users_admin_read" on public.admin_users;
create policy "admin_users_admin_read" on public.admin_users
  for select to authenticated using (public.is_admin());

revoke all on public.admin_users from anon, authenticated;
grant select on public.admin_users to service_role;
grant insert, update, delete on public.admin_users to service_role;

grant select on public.employees to authenticated;
grant select, insert, update, delete on public.employees to service_role;

-- ---------------------------------------------------------------------
-- 7. Storage
-- ---------------------------------------------------------------------
-- Buckets (create in Dashboard → Storage):
--   product-images : public ON, RLS ON
--   avatars        : public ON, RLS ON

drop policy if exists "product_images_admin_write" on storage.objects;
create policy "product_images_admin_write" on storage.objects
  for all to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'product-images');

-- Avatars: users own `<uid>/…` (fixed: the old policy referenced the invalid
-- relation `storage.object.name` and failed to apply).
drop policy if exists "avatars_user_prefix" on storage.objects;
create policy "avatars_user_prefix" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'avatars');

-- ---------------------------------------------------------------------
-- 8. Master Admin account
-- ---------------------------------------------------------------------
-- Create/reset it with the service-role script (preferred):
--
--   SUPABASE_URL=https://xxxx.supabase.co \
--   SUPABASE_SERVICE_ROLE_KEY=... \
--   node scripts/create-admin.mjs admin@baduma.lk --username baduma-admin
--
-- That script sets **app_metadata.role = 'admin'** (the value every policy and
-- the middleware read) and registers `admin_users` for username login.
-- Never set the role in user_metadata — customers can edit that.

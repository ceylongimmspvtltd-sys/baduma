-- =====================================================================
-- BADUMA · 2026-10-31 — Backend auth hardening migration (idempotent)
--
-- Apply to an EXISTING project:  SQL Editor → New query → paste → Run.
-- Safe to re-run.
--
-- Fixes, in order:
--   1. admin_users allowlist + username→email mapping table
--   2. public.is_admin() — authorisation from app_metadata, never user_metadata
--   3. RLS rewrite for menu / profiles / employees / admin_users / loyalty
--   4. staff RPC locked to service_role (it was leaking password hashes to anon)
--   5. points protected from client tampering + server-side award RPC
--   6. storage policy fixes (invalid `storage.object.name` reference)
--   7. profile backfill + role migration user_metadata → app_metadata
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------

create table if not exists public.admin_users (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  username       text not null unique check (username = lower(username) and length(username) between 3 and 40),
  email          text not null,
  display_name   text,
  is_active      boolean not null default true,
  last_login_at  timestamptz,
  created_at     timestamptz not null default now()
);

create table if not exists public.loyalty_events (
  user_id     uuid not null references auth.users(id) on delete cascade,
  task        text not null check (task in ('avatar', 'twofa', 'email', 'facebook', 'instagram')),
  points      integer not null check (points >= 0),
  created_at  timestamptz not null default now(),
  primary key (user_id, task)
);

alter table public.employees
  add column if not exists full_name text,
  add column if not exists contact text,
  add column if not exists updated_at timestamptz not null default now();

-- ---------------------------------------------------------------------
-- 2. Functions
-- ---------------------------------------------------------------------

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

-- CRITICAL: the previous definition was executable by `anon`.
revoke all on function public.get_employee_by_username(text) from public;
revoke all on function public.get_employee_by_username(text) from anon, authenticated;
grant execute on function public.get_employee_by_username(text) to service_role;

revoke all on function public.complete_loyalty_task(text) from public;
revoke all on function public.complete_loyalty_task(text) from anon;
grant execute on function public.complete_loyalty_task(text) to authenticated;

grant execute on function public.is_admin() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- 3. RLS
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

-- Menu: public read of *active* rows (the previous policies only allowed
-- `authenticated`, so anonymous visitors and the pre-login storefront could
-- not read the menu at all).
drop policy if exists "menu_read_authenticated" on public.products;
drop policy if exists "menu_public_read" on public.products;
drop policy if exists "menu_public_read" on public.addons;
drop policy if exists "menu_public_read" on public.combos;
drop policy if exists "menu_public_read" on public.daily_offers;
drop policy if exists "combo_addons_public_read" on public.combo_addons;
drop policy if exists "menu_read_authenticated" on public.addons;
drop policy if exists "menu_read_authenticated" on public.combos;
drop policy if exists "menu_read_authenticated" on public.daily_offers;

create policy "menu_public_read" on public.products
  for select to anon, authenticated using (is_active = true);
create policy "menu_public_read" on public.addons
  for select to anon, authenticated using (is_active = true);
create policy "menu_public_read" on public.combos
  for select to anon, authenticated using (is_active = true);
create policy "menu_public_read" on public.daily_offers
  for select to anon, authenticated using (is_active = true);
create policy "combo_addons_public_read" on public.combo_addons
  for select to anon, authenticated using (true);

-- Admin write policies: replace every `user_metadata`-based check.
drop policy if exists "menu_admin_write" on public.products;
drop policy if exists "menu_admin_write" on public.addons;
drop policy if exists "menu_admin_write" on public.combos;
drop policy if exists "menu_admin_write" on public.daily_offers;
drop policy if exists "combo_addons_admin" on public.combo_addons;

create policy "menu_admin_write" on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "menu_admin_write" on public.addons
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "menu_admin_write" on public.combos
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "menu_admin_write" on public.daily_offers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "combo_addons_admin" on public.combo_addons
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Profiles: owner-scoped, split per command, points locked by trigger.
drop policy if exists "profiles_own_row" on public.profiles;
drop policy if exists "profiles_own_select" on public.profiles;
drop policy if exists "profiles_own_insert" on public.profiles;
drop policy if exists "profiles_own_update" on public.profiles;
drop policy if exists "profiles_admin_read" on public.profiles;

create policy "profiles_own_select" on public.profiles
  for select to authenticated using (auth.uid() = user_id);
create policy "profiles_own_insert" on public.profiles
  for insert to authenticated with check (auth.uid() = user_id);
create policy "profiles_own_update" on public.profiles
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "profiles_admin_read" on public.profiles
  for select to authenticated using (public.is_admin());

-- Loyalty ledger.
drop policy if exists "loyalty_events_own_read" on public.loyalty_events;
drop policy if exists "loyalty_events_admin_read" on public.loyalty_events;
create policy "loyalty_events_own_read" on public.loyalty_events
  for select to authenticated using (auth.uid() = user_id);
create policy "loyalty_events_admin_read" on public.loyalty_events
  for select to authenticated using (public.is_admin());

-- Employees: read-only for admins, writes via service role.
drop policy if exists "employees_admin_only" on public.employees;
drop policy if exists "employees_admin_read" on public.employees;
create policy "employees_admin_read" on public.employees
  for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.employees from anon, authenticated;
grant select on public.employees to authenticated;
grant select, insert, update, delete on public.employees to service_role;

-- Admin allowlist: service role only.
drop policy if exists "admin_users_admin_read" on public.admin_users;
create policy "admin_users_admin_read" on public.admin_users
  for select to authenticated using (public.is_admin());
revoke all on public.admin_users from anon, authenticated;
grant select, insert, update, delete on public.admin_users to service_role;

-- ---------------------------------------------------------------------
-- 4. Triggers
-- ---------------------------------------------------------------------

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists trg_profiles_protect_points on public.profiles;
create trigger trg_profiles_protect_points
  before update on public.profiles
  for each row execute function public.protect_profile_points();

drop trigger if exists trg_employees_updated_at on public.employees;
create trigger trg_employees_updated_at
  before update on public.employees
  for each row execute function public.handle_updated_at();

-- ---------------------------------------------------------------------
-- 5. Storage policies
-- ---------------------------------------------------------------------

drop policy if exists "product_images_admin_write" on storage.objects;
create policy "product_images_admin_write" on storage.objects
  for all to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'product-images');

-- Old policy referenced the non-existent relation `storage.object.name`.
drop policy if exists "avatars_user_prefix" on storage.objects;
create policy "avatars_user_prefix" on storage.objects
  for all to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'avatars');

-- ---------------------------------------------------------------------
-- 6. Backfill
-- ---------------------------------------------------------------------

-- Profiles for users created before the trigger existed.
insert into public.profiles (user_id)
select u.id from auth.users u
on conflict (user_id) do nothing;

-- Promote any account that previously carried the role in user_metadata, then
-- strip the client-writable claim so it can never be trusted again.
do $$
begin
  update auth.users u
     set raw_app_meta_data = coalesce(u.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'admin')
   where u.raw_user_meta_data ->> 'role' = 'admin'
     and coalesce(u.raw_app_meta_data ->> 'role', '') <> 'admin';

  update auth.users u
     set raw_user_meta_data = u.raw_user_meta_data - 'role'
   where u.raw_user_meta_data ? 'role';
end
$$;

-- Register existing admins in the allowlist (username defaults to the local
-- part of the email; adjust afterwards via scripts/create-admin.mjs).
insert into public.admin_users (user_id, username, email, display_name)
select
  u.id,
  lower(split_part(u.email, '@', 1)),
  lower(u.email),
  coalesce(u.raw_user_meta_data ->> 'full_name', 'Master Admin')
from auth.users u
where u.raw_app_meta_data ->> 'role' = 'admin'
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 7. Verification (expect t / t / t)
-- ---------------------------------------------------------------------
-- select public.is_admin();
-- select proname, proacl from pg_proc where proname = 'get_employee_by_username';
-- select tablename, policyname from pg_policies where schemaname = 'public' order by 1,2;

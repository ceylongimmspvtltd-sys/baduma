-- =====================================================================
-- BADUMA · Phase 2 — Master Admin database schema & RLS policies
-- Run this in the Supabase SQL Editor.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tables
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
  combo_id  uuid not null references public.combos(id) on delete cascade primary key,
  addon_id  uuid not null references public.addons(id) on delete cascade,
  unique (combo_id, addon_id)
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

-- updated_at trigger
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_products_updated_at') then
    create trigger trg_products_updated_at before update on public.products for each row execute function public.handle_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_combos_updated_at') then
    create trigger trg_combos_updated_at before update on public.combos for each row execute function public.handle_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_addons_updated_at') then
    create trigger trg_addons_updated_at before update on public.addons for each row execute function public.handle_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_daily_offers_updated_at') then
    create trigger trg_daily_offers_updated_at before update on public.daily_offers for each row execute function public.handle_updated_at();
  end if;
end
$$;

-- ---------------------------------------------------------------------
-- 2. Row Level Security
-- ---------------------------------------------------------------------

alter table public.products       enable row level security;
alter table public.combos        enable row level security;
alter table public.combo_addons  enable row level security;
alter table public.addons        enable row level security;
alter table public.daily_offers  enable row level security;

-- Authenticated users can read the menu data.
drop policy if exists "menu_read_authenticated" on public.products;
create policy "menu_read_authenticated" on public.products
  for select to authenticated using (true);

drop policy if exists "menu_read_authenticated" on public.combos;
create policy "menu_read_authenticated" on public.combos
  for select to authenticated using (true);

drop policy if exists "menu_read_authenticated" on public.addons;
create policy "menu_read_authenticated" on public.addons
  for select to authenticated using (true);

drop policy if exists "menu_read_authenticated" on public.daily_offers;
create policy "menu_read_authenticated" on public.daily_offers
  for select to authenticated using (true);

-- Only users with the `admin` role claim may write menu data.
drop policy if exists "menu_admin_write" on public.products;
create policy "menu_admin_write" on public.products
  for all to authenticated
  using ((auth.jwt()::jsonb -> 'user_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt()::jsonb -> 'user_metadata' ->> 'role') = 'admin');

drop policy if exists "menu_admin_write" on public.combos;
create policy "menu_admin_write" on public.combos
  for all to authenticated
  using ((auth.jwt()::jsonb -> 'user_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt()::jsonb -> 'user_metadata' ->> 'role') = 'admin');

drop policy if exists "menu_admin_write" on public.addons;
create policy "menu_admin_write" on public.addons
  for all to authenticated
  using ((auth.jwt()::jsonb -> 'user_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt()::jsonb -> 'user_metadata' ->> 'role') = 'admin');

drop policy if exists "menu_admin_write" on public.daily_offers;
create policy "menu_admin_write" on public.daily_offers
  for all to authenticated
  using ((auth.jwt()::jsonb -> 'user_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt()::jsonb -> 'user_metadata' ->> 'role') = 'admin');

-- Combo <-> add-on link table: admin-only.
drop policy if exists "combo_addons_admin" on public.combo_addons;
create policy "combo_addons_admin" on public.combo_addons
  for all to authenticated
  using ((auth.jwt()::jsonb -> 'user_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt()::jsonb -> 'user_metadata' ->> 'role') = 'admin');

-- ---------------------------------------------------------------------
-- 3. Storage bucket for product images
-- ---------------------------------------------------------------------
-- Create the bucket in the Supabase Dashboard (Storage → New bucket):
--   name: product-images | public: ON | RLS: ON
-- Then apply this policy (adjust if your bucket name differs):

drop policy if exists "product_images_admin_write" on storage.objects;
create policy "product_images_admin_write" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'product-images'
    and (auth.jwt()::jsonb -> 'user_metadata' ->> 'role') = 'admin'
  )
  with check (
    bucket_id = 'product-images'
    and (auth.jwt()::jsonb -> 'user_metadata' ->> 'role') = 'admin'
  );

-- ---------------------------------------------------------------------
-- 4. Master Admin account
-- ---------------------------------------------------------------------
-- Create the admin account in the Supabase Auth panel (or via CLI), then
-- promote it to the `admin` role. The role claim is embedded in the JWT and
-- checked by the Next.js middleware + RLS policies.
--
--   supabase auth signup --email admin@baduma.sl --password 'STRONG-PASSWORD'
--
-- Then run:
update auth.users
set raw_user_meta_data = jsonb_set(
  raw_user_meta_data,
  '{role}',
  '"admin"',
  true
)
where email = 'admin@baduma.sl';

-- Re-login afterwards so the JWT claim refreshes (or use supabase.auth.admin
-- .updateUserById with the user id).

-- =====================================================================
-- BADUMA · Phase 3 — Customer Loyalty profiles & Employee RBAC accounts
-- =====================================================================

-- ---------------------------------------------------------------------
-- 6. Customer loyalty profiles
-- ---------------------------------------------------------------------

create table if not exists public.profiles (
  user_id             uuid primary key references auth.users(id) on delete cascade,
  points              integer not null default 0,
  avatar_url          text,
  two_factor_enabled  boolean not null default false,
  email_added         boolean not null default false,
  facebook_linked     boolean not null default false,
  instagram_linked    boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Members manage their own profile row.
drop policy if exists "profiles_own_row" on public.profiles;
create policy "profiles_own_row" on public.profiles
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Master Admin can read all profiles.
drop policy if exists "profiles_admin_read" on public.profiles;
create policy "profiles_admin_read" on public.profiles
  for select to authenticated
  using ((auth.jwt()::jsonb -> 'user_metadata' ->> 'role') = 'admin');

-- ---------------------------------------------------------------------
-- 7. Employee accounts (Manager / Kitchen / Driver — RBAC)
-- ---------------------------------------------------------------------

create table if not exists public.employees (
  id                uuid primary key default gen_random_uuid(),
  username          text not null unique,
  password_hash     text not null,
  position          text not null check (position in ('Manager', 'Kitchen', 'Driver')),
  permission_level  text not null check (permission_level in ('full', 'orders', 'delivery', 'viewer')),
  is_active         boolean not null default true,
  created_by        uuid,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.employees enable row level security;

-- Only the Master Admin (role claim) may read or modify employee accounts.
drop policy if exists "employees_admin_only" on public.employees;
create policy "employees_admin_only" on public.employees
  for all to authenticated
  using ((auth.jwt()::jsonb -> 'user_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt()::jsonb -> 'user_metadata' ->> 'role') = 'admin');

-- Employee credential verification (login API). Security definer bypasses RLS;
-- passwords are scrypt-hashed by the API route before insertion.
create or replace function public.get_employee_by_username(p_username text)
returns table(
  id uuid,
  username text,
  password_hash text,
  position text,
  permission_level text,
  is_active boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return query
    select e.id, e.username, e.password_hash, e.position, e.permission_level, e.is_active
    from public.employees e
    where e.username = p_username;
end;
$$;

-- ---------------------------------------------------------------------
-- 8. Avatar storage bucket
-- ---------------------------------------------------------------------
-- Create the bucket in the Supabase Dashboard (Storage → New bucket):
--   name: avatars | public: ON | RLS: ON
-- Then apply this policy:

drop policy if exists "avatars_user_prefix" on storage.objects;
create policy "avatars_user_prefix" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.object.name)::text like (auth.uid() || '%')
  )
  with check (
    bucket_id = 'avatars'
    and (storage.object.name)::text like (auth.uid() || '%')
  );

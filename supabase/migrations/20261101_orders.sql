-- =====================================================================
-- BADUMA · 2026-11-01 — Ordering pipeline (idempotent)
--
-- Adds `orders` + `order_items` with strict RLS:
--   * customers may READ only their own orders (auth.uid() = user_id)
--   * no client INSERT/UPDATE/DELETE policies at all — orders are created and
--     moved through their lifecycle by the server (service role) after the
--     caller has been authenticated and the price re-checked against
--     `public.products`
--   * staff/admin read the board through the service role too, so a stolen
--     customer JWT can never see someone else's delivery details
--
-- Safe to re-run.
-- =====================================================================

create table if not exists public.orders (
  id                uuid primary key default gen_random_uuid(),
  code              text not null unique,
  user_id           uuid references auth.users(id) on delete set null,
  customer_name     text not null,
  customer_phone    text not null,
  delivery_address  text not null,
  notes             text,
  payment_method    text not null default 'cash' check (payment_method in ('cash', 'card')),
  status            text not null default 'pending'
                    check (status in ('pending','accepted','preparing','out_for_delivery','delivered','cancelled')),
  subtotal          numeric(10, 2) not null default 0 check (subtotal >= 0),
  delivery_fee      numeric(10, 2) not null default 0 check (delivery_fee >= 0),
  total             numeric(10, 2) not null default 0 check (total >= 0),
  driver_id         uuid references public.employees(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists public.order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  product_id  uuid references public.products(id) on delete set null,
  name        text not null,
  -- snapshot of the product at purchase time (survives price/name edits)
  size        text not null check (size in ('normal', 'full')),
  unit_price  numeric(10, 2) not null check (unit_price >= 0),
  quantity    integer not null check (quantity between 1 and 50),
  line_total  numeric(10, 2) not null check (line_total >= 0),
  created_at  timestamptz not null default now()
);

create index if not exists orders_user_created_idx   on public.orders (user_id, created_at desc);
create index if not exists orders_status_created_idx on public.orders (status, created_at desc);
create index if not exists orders_driver_idx         on public.orders (driver_id);
create index if not exists order_items_order_idx     on public.order_items (order_id);

-- updated_at
drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
  before update on public.orders
  for each row execute function public.handle_updated_at();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------

alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

-- Customers read their own orders only.
drop policy if exists "orders_own_read" on public.orders;
create policy "orders_own_read" on public.orders
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "order_items_own_read" on public.order_items;
create policy "order_items_own_read" on public.order_items
  for select to authenticated using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and o.user_id = auth.uid()
    )
  );

-- Admins (app_metadata role / allowlist) may read everything.
drop policy if exists "orders_admin_read" on public.orders;
create policy "orders_admin_read" on public.orders
  for select to authenticated using (public.is_admin());

drop policy if exists "order_items_admin_read" on public.order_items;
create policy "order_items_admin_read" on public.order_items
  for select to authenticated using (public.is_admin());

-- No client writes: creation and status changes go through the API routes with
-- the service role (which bypasses RLS by design).
revoke insert, update, delete on public.orders from anon, authenticated;
revoke insert, update, delete on public.order_items from anon, authenticated;

grant select on public.orders to authenticated;
grant select on public.order_items to authenticated;
grant all on public.orders to service_role;
grant all on public.order_items to service_role;

-- ---------------------------------------------------------------------
-- Verify (expect 4 policies, and no INSERT/UPDATE for authenticated):
--   select tablename, policyname, cmd from pg_policies
--   where schemaname = 'public' and tablename in ('orders','order_items');
-- ---------------------------------------------------------------------

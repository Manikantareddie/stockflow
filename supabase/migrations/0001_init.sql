-- StockFlow initial schema, security, and RLS policies.
-- Safe to run once against a fresh Supabase project's SQL Editor.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 60),
  default_low_stock_threshold integer not null default 5
    check (default_low_stock_threshold >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  sku text not null,
  description text,
  quantity_on_hand integer not null default 0 check (quantity_on_hand >= 0),
  cost_price numeric(12, 2) check (cost_price is null or cost_price >= 0),
  selling_price numeric(12, 2) check (selling_price is null or selling_price >= 0),
  low_stock_threshold integer check (low_stock_threshold is null or low_stock_threshold >= 0),
  last_updated_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, sku)
);

create index if not exists products_org_idx on public.products (organization_id);
create index if not exists products_org_name_idx on public.products (organization_id, name);
create index if not exists profiles_org_idx on public.profiles (organization_id);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Current organization helper (SECURITY DEFINER bypasses RLS => no recursion)
-- ---------------------------------------------------------------------------
create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.profiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Signup automation: create organization + profile for each new auth user
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
  org_name text;
begin
  org_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'organization_name'), ''),
    'My Organization'
  );

  insert into public.organizations (name)
  values (left(org_name, 60))
  returning id into new_org_id;

  insert into public.profiles (id, organization_id, email)
  values (new.id, new_org_id, new.email);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Atomic stock adjustment (validates, blocks negative stock, sets audit fields)
-- ---------------------------------------------------------------------------
create or replace function public.adjust_stock(p_product_id uuid, p_delta integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_qty integer;
begin
  if p_delta = 0 then
    raise exception 'Adjustment must not be zero';
  end if;

  update public.products
     set quantity_on_hand = quantity_on_hand + p_delta,
         last_updated_by = auth.uid(),
         updated_at = now()
   where id = p_product_id
     and organization_id = public.current_organization_id()
     and quantity_on_hand + p_delta >= 0
  returning quantity_on_hand into new_qty;

  if new_qty is null then
    raise exception 'Product not found or adjustment would result in negative stock';
  end if;

  return new_qty;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.products enable row level security;

drop policy if exists "org members can view their organization" on public.organizations;
create policy "org members can view their organization"
on public.organizations for select
using (id = public.current_organization_id());

drop policy if exists "org members can update their organization" on public.organizations;
create policy "org members can update their organization"
on public.organizations for update
using (id = public.current_organization_id())
with check (id = public.current_organization_id());

drop policy if exists "users can view their own profile" on public.profiles;
create policy "users can view their own profile"
on public.profiles for select
using (id = auth.uid());

drop policy if exists "org members can view products" on public.products;
create policy "org members can view products"
on public.products for select
using (organization_id = public.current_organization_id());

drop policy if exists "org members can insert products" on public.products;
create policy "org members can insert products"
on public.products for insert
with check (organization_id = public.current_organization_id());

drop policy if exists "org members can update products" on public.products;
create policy "org members can update products"
on public.products for update
using (organization_id = public.current_organization_id())
with check (organization_id = public.current_organization_id());

drop policy if exists "org members can delete products" on public.products;
create policy "org members can delete products"
on public.products for delete
using (organization_id = public.current_organization_id());

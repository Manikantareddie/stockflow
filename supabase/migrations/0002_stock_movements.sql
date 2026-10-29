-- StockFlow: stock movement history.
-- Adds an append-only ledger of every quantity change and lets adjust_stock
-- persist the note the user typed. Safe to re-run.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  delta integer not null,
  quantity_after integer not null check (quantity_after >= 0),
  reason text not null default 'adjustment',
  note text,
  created_at timestamptz not null default now()
);

create index if not exists stock_movements_product_idx
  on public.stock_movements (product_id, created_at desc);
create index if not exists stock_movements_org_idx
  on public.stock_movements (organization_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Record every quantity change automatically.
-- adjust_stock passes its reason/note through transaction-local settings.
-- ---------------------------------------------------------------------------
create or replace function public.record_stock_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delta integer;
  v_reason text;
  v_note text;
begin
  v_note := nullif(btrim(coalesce(current_setting('stockflow.note', true), '')), '');

  if tg_op = 'INSERT' then
    v_delta := new.quantity_on_hand;
    if v_delta = 0 then
      return new;
    end if;
    v_reason := coalesce(current_setting('stockflow.reason', true), 'created');
  else
    v_delta := new.quantity_on_hand - old.quantity_on_hand;
    if v_delta = 0 then
      return new;
    end if;
    v_reason := coalesce(current_setting('stockflow.reason', true), 'edit');
  end if;

  insert into public.stock_movements (
    organization_id, product_id, user_id, delta, quantity_after, reason, note
  )
  values (
    new.organization_id,
    new.id,
    auth.uid(),
    v_delta,
    new.quantity_on_hand,
    coalesce(nullif(btrim(v_reason), ''), 'adjustment'),
    v_note
  );

  return new;
end;
$$;

drop trigger if exists products_record_stock_movement on public.products;
create trigger products_record_stock_movement
after insert or update of quantity_on_hand on public.products
for each row execute function public.record_stock_movement();

-- ---------------------------------------------------------------------------
-- Atomic stock adjustment (replaces the two-argument version)
-- ---------------------------------------------------------------------------
drop function if exists public.adjust_stock(uuid, integer);

create or replace function public.adjust_stock(
  p_product_id uuid,
  p_delta integer,
  p_note text default null
)
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

  perform set_config('stockflow.reason', 'adjustment', true);
  perform set_config('stockflow.note', coalesce(p_note, ''), true);

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
alter table public.stock_movements enable row level security;

drop policy if exists "org members can view stock movements" on public.stock_movements;
create policy "org members can view stock movements"
on public.stock_movements for select
using (organization_id = public.current_organization_id());

drop policy if exists "org members can insert stock movements" on public.stock_movements;
create policy "org members can insert stock movements"
on public.stock_movements for insert
with check (organization_id = public.current_organization_id());

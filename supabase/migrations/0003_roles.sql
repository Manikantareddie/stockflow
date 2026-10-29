-- StockFlow: roles, team membership, and invite codes.
-- Safe to re-run.

-- ---------------------------------------------------------------------------
-- Roles on profiles
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists role text not null default 'member';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_role_check') then
    alter table public.profiles
      add constraint profiles_role_check check (role in ('owner', 'member'));
  end if;
end $$;

-- The founding member of each organization becomes its owner.
update public.profiles p
   set role = 'owner'
 where p.role <> 'owner'
   and not exists (
     select 1 from public.profiles o
      where o.organization_id = p.organization_id
        and o.role = 'owner'
   );

-- ---------------------------------------------------------------------------
-- Invite codes: lets a new signup join an existing organization
-- ---------------------------------------------------------------------------
create table if not exists public.organization_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  code text not null unique,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  used_by uuid references auth.users (id) on delete set null,
  used_at timestamptz
);

create index if not exists organization_invites_org_idx
  on public.organization_invites (organization_id);

-- ---------------------------------------------------------------------------
-- Role helper (SECURITY DEFINER bypasses RLS => no recursion)
-- ---------------------------------------------------------------------------
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Signup automation: join via invite code, otherwise create a new organization
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
  invite_code text;
  invite record;
begin
  invite_code := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'invite_code', '')), '');

  if invite_code is not null then
    select * into invite
      from public.organization_invites
     where code = upper(invite_code)
       and used_by is null
       and (expires_at is null or expires_at > now())
     for update;

    if not found then
      raise exception 'Invalid or expired invite code';
    end if;

    insert into public.profiles (id, organization_id, email, role)
    values (new.id, invite.organization_id, new.email, invite.role);

    update public.organization_invites
       set used_by = new.id, used_at = now()
     where id = invite.id;

    return new;
  end if;

  org_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'organization_name'), ''),
    'My Organization'
  );

  insert into public.organizations (name)
  values (left(org_name, 60))
  returning id into new_org_id;

  insert into public.profiles (id, organization_id, email, role)
  values (new.id, new_org_id, new.email, 'owner');

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.organization_invites enable row level security;

drop policy if exists "users can view their own profile" on public.profiles;
drop policy if exists "org members can view org profiles" on public.profiles;
create policy "org members can view org profiles"
on public.profiles for select
using (
  id = auth.uid()
  or organization_id = public.current_organization_id()
);

drop policy if exists "owners can update org profiles" on public.profiles;
create policy "owners can update org profiles"
on public.profiles for update
using (
  organization_id = public.current_organization_id()
  and public.current_user_role() = 'owner'
)
with check (organization_id = public.current_organization_id());

drop policy if exists "owners can remove org profiles" on public.profiles;
create policy "owners can remove org profiles"
on public.profiles for delete
using (
  organization_id = public.current_organization_id()
  and public.current_user_role() = 'owner'
  and id <> auth.uid()
);

drop policy if exists "org members can update their organization" on public.organizations;
drop policy if exists "owners can update their organization" on public.organizations;
create policy "owners can update their organization"
on public.organizations for update
using (
  id = public.current_organization_id()
  and public.current_user_role() = 'owner'
)
with check (id = public.current_organization_id());

drop policy if exists "org members can delete products" on public.products;
drop policy if exists "owners can delete products" on public.products;
create policy "owners can delete products"
on public.products for delete
using (
  organization_id = public.current_organization_id()
  and public.current_user_role() = 'owner'
);

drop policy if exists "owners can view invites" on public.organization_invites;
create policy "owners can view invites"
on public.organization_invites for select
using (
  organization_id = public.current_organization_id()
  and public.current_user_role() = 'owner'
);

drop policy if exists "owners can create invites" on public.organization_invites;
create policy "owners can create invites"
on public.organization_invites for insert
with check (
  organization_id = public.current_organization_id()
  and public.current_user_role() = 'owner'
);

drop policy if exists "owners can revoke invites" on public.organization_invites;
create policy "owners can revoke invites"
on public.organization_invites for delete
using (
  organization_id = public.current_organization_id()
  and public.current_user_role() = 'owner'
);

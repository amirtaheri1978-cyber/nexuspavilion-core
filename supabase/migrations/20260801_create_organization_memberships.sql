begin;

create table if not exists public.organization_memberships (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references public.profiles(id)
    on delete cascade,

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  workspace_role text not null default 'member'
    check (
      workspace_role in (
        'owner',
        'admin',
        'member',
        'viewer'
      )
    ),

  membership_type text not null default 'employee'
    check (
      membership_type in (
        'founder',
        'employee',
        'external_consultant',
        'procurement_agent',
        'temporary_staff'
      )
    ),

  membership_status text not null default 'active'
    check (
      membership_status in (
        'pending',
        'active',
        'suspended',
        'revoked'
      )
    ),

  job_title text,
  job_function text,

  invited_by uuid
    references public.profiles(id)
    on delete set null,

  joined_at timestamp with time zone,
  role_changed_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint organization_memberships_user_company_key
    unique (user_id, company_id)
);

create index if not exists
  organization_memberships_user_id_idx
on public.organization_memberships(user_id);

create index if not exists
  organization_memberships_company_id_idx
on public.organization_memberships(company_id);

create index if not exists
  organization_memberships_active_company_idx
on public.organization_memberships(company_id, membership_status);

-- Backfill existing linked profiles.
-- Company creators become workspace owners regardless of the
-- legacy buyer/vendor value stored in profiles.role.
insert into public.organization_memberships (
  user_id,
  company_id,
  workspace_role,
  membership_type,
  membership_status,
  joined_at,
  role_changed_at
)
select
  p.id,
  p.company_id,
  case
    when c.user_id = p.id then 'owner'
    when lower(coalesce(p.role, '')) = 'admin' then 'admin'
    else 'member'
  end,
  case
    when c.user_id = p.id then 'founder'
    else 'employee'
  end,
  'active',
  coalesce(c.created_at, now()),
  now()
from public.profiles p
join public.companies c
  on c.id = p.company_id
where p.company_id is not null
on conflict (user_id, company_id) do nothing;

alter table public.organization_memberships
enable row level security;

-- Browser clients must not create, modify, or delete memberships.
revoke all
on table public.organization_memberships
from anon;

revoke insert, update, delete
on table public.organization_memberships
from authenticated;

-- Authenticated users may read only their own memberships.
grant select
on table public.organization_memberships
to authenticated;

drop policy if exists
  "Users can read own organization memberships"
on public.organization_memberships;

create policy
  "Users can read own organization memberships"
on public.organization_memberships
for select
to authenticated
using (
  user_id = auth.uid()
);

commit;
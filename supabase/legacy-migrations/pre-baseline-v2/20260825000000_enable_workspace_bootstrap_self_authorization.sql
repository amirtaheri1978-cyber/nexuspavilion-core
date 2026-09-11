begin;

-- Workspace bootstrap correction:
-- Authenticated clients must not be able to point profiles.company_id at an
-- arbitrary company. Direct profile writes stay limited to self-owned,
-- non-tenant fields used by login bootstrap. Company attachment and founder
-- membership are established together by one SECURITY DEFINER command that
-- derives the actor from auth.uid() and accepts only a company already owned
-- by that actor.

revoke insert, update, delete
on table public.profiles
from public, anon;

revoke insert (company_id)
on table public.profiles
from authenticated;

revoke update (company_id, "role")
on table public.profiles
from authenticated;

grant insert (id, email, "role")
on table public.profiles
to authenticated;

grant update (email)
on table public.profiles
to authenticated;

drop policy if exists "Authenticated users can insert own profile"
on public.profiles;

create policy "Authenticated users can insert own profile"
on public.profiles
for insert
to authenticated
with check (
  id = auth.uid()
  and company_id is null
);

drop policy if exists "Authenticated users can update own profile"
on public.profiles;

create policy "Authenticated users can update own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop function if exists public.bootstrap_owned_company_founder_membership(uuid);

create or replace function public.bootstrap_owned_company_workspace(
  p_company_id uuid,
  p_profile_role text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := auth.uid();
  actor_email text;
  owned_company_id uuid;
  existing_company_id uuid;
  membership_id uuid;
  joined_at timestamp with time zone := now();
begin
  if actor_user_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'AUTHENTICATION_REQUIRED'
    );
  end if;

  if p_company_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'COMPANY_NOT_OWNED'
    );
  end if;

  if p_profile_role is distinct from 'owner'
     and p_profile_role is distinct from 'vendor' then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_PROFILE_ROLE'
    );
  end if;

  select c.id
  into owned_company_id
  from public.companies as c
  where c.id = p_company_id
    and c.user_id = actor_user_id;

  if owned_company_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'COMPANY_NOT_OWNED'
    );
  end if;

  select p.company_id
  into existing_company_id
  from public.profiles as p
  where p.id = actor_user_id;

  if existing_company_id is not null
     and existing_company_id is distinct from owned_company_id then
    return jsonb_build_object(
      'success', false,
      'error_code', 'ALREADY_CONNECTED'
    );
  end if;

  actor_email := nullif(
    lower(trim(coalesce(auth.jwt() ->> 'email', ''))),
    ''
  );

  insert into public.profiles as existing_profile (
    id,
    email,
    "role",
    company_id
  )
  values (
    actor_user_id,
    actor_email,
    p_profile_role,
    owned_company_id
  )
  on conflict (id)
  do update set
    email = coalesce(excluded.email, existing_profile.email),
    "role" = excluded."role",
    company_id = excluded.company_id;

  insert into public.organization_memberships as existing_membership (
    user_id,
    company_id,
    workspace_role,
    membership_type,
    procurement_function,
    membership_status,
    joined_at,
    role_changed_at
  )
  values (
    actor_user_id,
    owned_company_id,
    'owner',
    'founder',
    'none',
    'active',
    joined_at,
    joined_at
  )
  on conflict (user_id, company_id)
  do update set
    workspace_role = 'owner',
    membership_type = 'founder',
    procurement_function = 'none',
    membership_status = 'active',
    joined_at = coalesce(
      existing_membership.joined_at,
      excluded.joined_at
    ),
    role_changed_at =
      case
        when existing_membership.workspace_role is distinct from 'owner'
          or existing_membership.membership_status is distinct from 'active'
        then excluded.role_changed_at
        else existing_membership.role_changed_at
      end,
    updated_at = now()
  returning existing_membership.id into membership_id;

  return jsonb_build_object(
    'success', true,
    'company_id', owned_company_id,
    'membership_id', membership_id
  );
end;
$$;

comment on function public.bootstrap_owned_company_workspace(uuid, text) is
  'Atomically links auth.uid() to an owned company and creates an active founder membership. Caller supplies only company id and a bounded profile role; user_id is never accepted. Rejects foreign companies.';

alter function public.bootstrap_owned_company_workspace(uuid, text)
  owner to postgres;

revoke all
on function public.bootstrap_owned_company_workspace(uuid, text)
from public;

revoke all
on function public.bootstrap_owned_company_workspace(uuid, text)
from anon;

grant execute
on function public.bootstrap_owned_company_workspace(uuid, text)
to authenticated, service_role;

commit;

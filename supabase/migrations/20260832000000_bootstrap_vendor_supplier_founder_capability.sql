begin;

-- Task 32C: derive founder procurement_function from a bounded account type.
-- Callers never supply procurement_function. NULL/omitted account type keeps
-- legacy 3-argument behavior (none). ON CONFLICT never overwrites an existing
-- procurement_function. No historical membership backfill.

drop function if exists public.bootstrap_owned_company_workspace(uuid, text);
drop function if exists public.bootstrap_owned_company_workspace(uuid, text, text);
drop function if exists public.bootstrap_owned_company_workspace(uuid, text, text, text);

create or replace function public.bootstrap_owned_company_workspace(
  p_company_id uuid,
  p_profile_role text,
  p_job_title text default null,
  p_account_type text default null
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
  normalized_job_title text;
  normalized_account_type text;
  derived_procurement_function text;
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

  normalized_account_type := nullif(btrim(coalesce(p_account_type, '')), '');

  if normalized_account_type is null then
    derived_procurement_function := 'none';
  elsif normalized_account_type = 'vendor_supplier' then
    derived_procurement_function := 'supplier';
  elsif normalized_account_type = 'buyer_owner'
     or normalized_account_type = 'consultant'
     or normalized_account_type = 'service_provider' then
    derived_procurement_function := 'none';
  else
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_ACCOUNT_TYPE',
      'error_message', 'The organization type is not supported.'
    );
  end if;

  normalized_job_title := nullif(btrim(coalesce(p_job_title, '')), '');

  if normalized_job_title is not null
     and char_length(normalized_job_title) > 120 then
    return jsonb_build_object(
      'success', false,
      'error_code', 'JOB_TITLE_TOO_LONG',
      'error_message', 'Job title must not exceed 120 characters.'
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
    job_title,
    joined_at,
    role_changed_at
  )
  values (
    actor_user_id,
    owned_company_id,
    'owner',
    'founder',
    derived_procurement_function,
    'active',
    normalized_job_title,
    joined_at,
    joined_at
  )
  on conflict (user_id, company_id)
  do update set
    workspace_role = 'owner',
    membership_type = 'founder',
    membership_status = 'active',
    job_title = coalesce(
      excluded.job_title,
      existing_membership.job_title
    ),
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

comment on function public.bootstrap_owned_company_workspace(uuid, text, text, text) is
  'Atomically links auth.uid() to an owned company and creates an active founder membership. Caller supplies company id, a bounded profile role, optional founder job title, and optional bounded account type. procurement_function is derived in SQL: vendor_supplier → supplier; buyer_owner, consultant, service_provider, or omitted/NULL → none. Unknown account types are rejected. Existing memberships keep their procurement_function on conflict. user_id is never accepted. Rejects foreign companies. Does not write profile names.';

alter function public.bootstrap_owned_company_workspace(uuid, text, text, text)
  owner to postgres;

revoke all
on function public.bootstrap_owned_company_workspace(uuid, text, text, text)
from public;

revoke all
on function public.bootstrap_owned_company_workspace(uuid, text, text, text)
from anon;

grant execute
on function public.bootstrap_owned_company_workspace(uuid, text, text, text)
to authenticated, service_role;

commit;

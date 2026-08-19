begin;

-- Task 22 B04-1: professional identity schema and authorization primitives.
-- Person names live on the caller's own profile. Workspace job title lives on
-- organization_memberships.job_title and is written only by SECURITY DEFINER
-- commands. Authenticated clients still cannot mutate membership rows directly
-- and still cannot attach profiles.company_id.

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text;

alter table public.profiles
  drop constraint if exists profiles_first_name_length_check;

alter table public.profiles
  add constraint profiles_first_name_length_check
  check (
    first_name is null
    or char_length(btrim(first_name)) between 1 and 80
  );

alter table public.profiles
  drop constraint if exists profiles_last_name_length_check;

alter table public.profiles
  add constraint profiles_last_name_length_check
  check (
    last_name is null
    or char_length(btrim(last_name)) between 1 and 80
  );

update public.organization_memberships
set job_title = null
where job_title is not null
  and char_length(btrim(job_title)) = 0;

alter table public.organization_memberships
  drop constraint if exists organization_memberships_job_title_length_check;

alter table public.organization_memberships
  add constraint organization_memberships_job_title_length_check
  check (
    job_title is null
    or char_length(btrim(job_title)) between 1 and 120
  );

revoke insert, update, delete
on table public.profiles
from public, anon;

revoke insert
on table public.profiles
from authenticated;

revoke update
on table public.profiles
from authenticated;

revoke insert (company_id)
on table public.profiles
from authenticated;

revoke update (id, company_id, "role")
on table public.profiles
from authenticated;

grant insert (id, email, "role", first_name, last_name)
on table public.profiles
to authenticated;

grant update (email, first_name, last_name)
on table public.profiles
to authenticated;

drop function if exists public.bootstrap_owned_company_workspace(uuid, text);
drop function if exists public.bootstrap_owned_company_workspace(uuid, text, text);

create or replace function public.bootstrap_owned_company_workspace(
  p_company_id uuid,
  p_profile_role text,
  p_job_title text default null
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
    'none',
    'active',
    normalized_job_title,
    joined_at,
    joined_at
  )
  on conflict (user_id, company_id)
  do update set
    workspace_role = 'owner',
    membership_type = 'founder',
    procurement_function = 'none',
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

comment on function public.bootstrap_owned_company_workspace(uuid, text, text) is
  'Atomically links auth.uid() to an owned company and creates an active founder membership. Caller supplies company id, a bounded profile role, and optional founder job title; user_id is never accepted. Rejects foreign companies. Does not write profile names.';

alter function public.bootstrap_owned_company_workspace(uuid, text, text)
  owner to postgres;

revoke all
on function public.bootstrap_owned_company_workspace(uuid, text, text)
from public;

revoke all
on function public.bootstrap_owned_company_workspace(uuid, text, text)
from anon;

grant execute
on function public.bootstrap_owned_company_workspace(uuid, text, text)
to authenticated, service_role;

drop function if exists public.accept_organization_invitation(text);
drop function if exists public.accept_organization_invitation(text, text);

create or replace function public.accept_organization_invitation(
  invitation_token text,
  p_job_title text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_user_id uuid;
  actor_email text;

  invitation_record public.invitations%rowtype;

  next_workspace_role text;
  next_procurement_function text;
  next_membership_type text;
  normalized_job_title text;

  accepted_timestamp timestamp with time zone := now();
begin
  actor_user_id := auth.uid();

  actor_email := lower(
    trim(
      coalesce(
        auth.jwt() ->> 'email',
        ''
      )
    )
  );

  if actor_user_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHENTICATED',
      'error_message', 'Authentication is required.'
    );
  end if;

  if nullif(trim(coalesce(invitation_token, '')), '') is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_TOKEN',
      'error_message', 'A valid invitation token is required.'
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

  select *
  into invitation_record
  from public.invitations
  where token = invitation_token
  for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVITATION_NOT_FOUND',
      'error_message', 'The invitation could not be found.'
    );
  end if;

  if invitation_record.status <> 'pending' then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVITATION_NOT_PENDING',
      'error_message', 'This invitation is no longer pending.'
    );
  end if;

  if (
    invitation_record.expires_at is not null
    and invitation_record.expires_at < accepted_timestamp
  ) then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVITATION_EXPIRED',
      'error_message', 'This invitation has expired.'
    );
  end if;

  if actor_email = '' then
    return jsonb_build_object(
      'success', false,
      'error_code', 'EMAIL_UNAVAILABLE',
      'error_message', 'The authenticated email address is unavailable.'
    );
  end if;

  if actor_email <> lower(trim(invitation_record.email)) then
    return jsonb_build_object(
      'success', false,
      'error_code', 'RECIPIENT_MISMATCH',
      'error_message', 'The authenticated account does not match the invited recipient.'
    );
  end if;

  case lower(trim(coalesce(invitation_record.role, '')))
    when 'admin' then
      next_workspace_role := 'admin';
      next_procurement_function := 'none';
      next_membership_type := 'employee';

    when 'buyer' then
      next_workspace_role := 'member';
      next_procurement_function := 'buyer';
      next_membership_type := 'procurement_agent';

    when 'vendor' then
      next_workspace_role := 'member';
      next_procurement_function := 'supplier';
      next_membership_type := 'external_consultant';

    else
      return jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_INVITATION_ROLE',
        'error_message', 'The invitation role is not supported.'
      );
  end case;

  /*
   * Temporary legacy compatibility.
   * The application still reads profiles.company_id and profiles.role
   * in procurement routes that have not yet migrated.
   * Person names are not written here.
   */
  insert into public.profiles (
    id,
    email,
    role,
    company_id
  )
  values (
    actor_user_id,
    actor_email,
    lower(trim(invitation_record.role)),
    invitation_record.company_id
  )
  on conflict (id)
  do update set
    email = excluded.email,
    role = excluded.role,
    company_id = excluded.company_id;

  /*
   * Authoritative organization membership.
   * Re-acceptance may reactivate a previously revoked membership,
   * but the invitation itself must still be pending.
   */
  insert into public.organization_memberships as existing_membership (
    user_id,
    company_id,
    workspace_role,
    membership_type,
    procurement_function,
    membership_status,
    job_title,
    invited_by,
    joined_at,
    role_changed_at,
    updated_at
  )
  values (
    actor_user_id,
    invitation_record.company_id,
    next_workspace_role,
    next_membership_type,
    next_procurement_function,
    'active',
    normalized_job_title,
    invitation_record.invited_by,
    accepted_timestamp,
    accepted_timestamp,
    accepted_timestamp
  )
  on conflict (user_id, company_id)
  do update set
    workspace_role = excluded.workspace_role,
    membership_type = excluded.membership_type,
    procurement_function = excluded.procurement_function,
    membership_status = 'active',
    job_title = coalesce(
      excluded.job_title,
      existing_membership.job_title
    ),
    invited_by = coalesce(
      excluded.invited_by,
      existing_membership.invited_by
    ),
    joined_at = coalesce(
      existing_membership.joined_at,
      excluded.joined_at
    ),
    role_changed_at =
      case
        when
          existing_membership.workspace_role
            is distinct from excluded.workspace_role
          or existing_membership.procurement_function
            is distinct from excluded.procurement_function
        then accepted_timestamp
        else existing_membership.role_changed_at
      end,
    updated_at = accepted_timestamp;

  update public.invitations
  set
    status = 'accepted',
    accepted_by = actor_user_id,
    accepted_at = accepted_timestamp
  where id = invitation_record.id;

  insert into public.notifications (
    title,
    message,
    type,
    is_read
  )
  values (
    'Invitation Accepted',
    actor_email
      || ' joined the company workspace as '
      || initcap(lower(trim(invitation_record.role)))
      || '.',
    'invitation',
    false
  );

  insert into public.audit_logs (
    action,
    entity_type,
    entity_id,
    user_id,
    company_id,
    metadata
  )
  values (
    'INVITATION_ACCEPTED',
    'invitation',
    invitation_record.id,
    actor_user_id,
    invitation_record.company_id,
    jsonb_build_object(
      'email', actor_email,
      'legacy_role', lower(trim(invitation_record.role)),
      'workspace_role', next_workspace_role,
      'procurement_function', next_procurement_function,
      'membership_type', next_membership_type,
      'accepted_at', accepted_timestamp
    )
  );

  return jsonb_build_object(
    'success', true,
    'company_id', invitation_record.company_id,
    'workspace_role', next_workspace_role,
    'procurement_function', next_procurement_function,
    'membership_status', 'active'
  );
end;
$$;

comment on function public.accept_organization_invitation(text, text) is
  'Accepts a pending organization invitation for auth.uid() after JWT email match. Optional job title is written only onto the accepted membership. Caller cannot supply company_id, user_id, workspace_role, or procurement_function.';

alter function public.accept_organization_invitation(text, text)
  owner to postgres;

revoke all
on function public.accept_organization_invitation(text, text)
from public;

revoke all
on function public.accept_organization_invitation(text, text)
from anon;

grant execute
on function public.accept_organization_invitation(text, text)
to authenticated;

drop function if exists public.update_own_workspace_job_title(text);

create or replace function public.update_own_workspace_job_title(
  p_job_title text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := auth.uid();
  active_membership_count integer := 0;
  target_membership_id uuid;
  target_company_id uuid;
  normalized_job_title text;
begin
  if actor_user_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHENTICATED',
      'error_message', 'Authentication is required.'
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

  select count(*)
  into active_membership_count
  from public.organization_memberships as om
  where om.user_id = actor_user_id
    and om.membership_status = 'active';

  if active_membership_count = 0 then
    return jsonb_build_object(
      'success', false,
      'error_code', 'NO_ACTIVE_MEMBERSHIP',
      'error_message', 'An active workspace membership is required.'
    );
  end if;

  if active_membership_count > 1 then
    return jsonb_build_object(
      'success', false,
      'error_code', 'AMBIGUOUS_WORKSPACE',
      'error_message', 'Job title cannot be updated while multiple active memberships exist.'
    );
  end if;

  update public.organization_memberships as om
  set
    job_title = normalized_job_title,
    updated_at = now()
  where om.user_id = actor_user_id
    and om.membership_status = 'active'
  returning om.id, om.company_id
  into target_membership_id, target_company_id;

  return jsonb_build_object(
    'success', true,
    'membership_id', target_membership_id,
    'company_id', target_company_id
  );
end;
$$;

comment on function public.update_own_workspace_job_title(text) is
  'Updates job_title on the authenticated actor''s unique active organization membership. Rejects the command when zero or multiple active memberships exist. Does not accept user_id or company_id and does not change role, type, status, or procurement function.';

alter function public.update_own_workspace_job_title(text)
  owner to postgres;

revoke all
on function public.update_own_workspace_job_title(text)
from public;

revoke all
on function public.update_own_workspace_job_title(text)
from anon;

grant execute
on function public.update_own_workspace_job_title(text)
to authenticated;

drop function if exists public.get_organization_members();

create or replace function public.get_organization_members()
returns table (
  membership_id uuid,
  user_id uuid,
  company_id uuid,

  email text,
  legacy_role text,
  profile_created_at timestamp with time zone,

  workspace_role text,
  procurement_function text,
  membership_type text,
  membership_status text,

  joined_at timestamp with time zone,
  role_changed_at timestamp with time zone,
  membership_created_at timestamp with time zone,
  membership_updated_at timestamp with time zone,

  first_name text,
  last_name text,
  job_title text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_user_id uuid;
  actor_company_id uuid;
begin
  actor_user_id := auth.uid();

  if actor_user_id is null then
    raise exception
      'Authentication is required.'
      using errcode = '42501';
  end if;

  /*
   * Resolve the authenticated user's active workspace.
   *
   * The current application supports one active company context
   * per user. When workspace switching is introduced, company_id
   * should become an explicit and validated function argument.
   */
  select om.company_id
  into actor_company_id
  from public.organization_memberships om
  where om.user_id = actor_user_id
    and om.membership_status = 'active'
  order by
    case om.workspace_role
      when 'owner' then 1
      when 'admin' then 2
      when 'member' then 3
      when 'viewer' then 4
      else 5
    end,
    om.created_at
  limit 1;

  if actor_company_id is null then
    raise exception
      'An active workspace membership is required.'
      using errcode = '42501';
  end if;

  /*
   * Return only the internal member information required by the
   * company workspace UI. Membership authority remains read-only;
   * mutations continue through dedicated protected RPC commands.
   */
  return query
  select
    om.id as membership_id,
    om.user_id,
    om.company_id,

    p.email,
    p.role as legacy_role,
    p.created_at as profile_created_at,

    om.workspace_role,
    om.procurement_function,
    om.membership_type,
    om.membership_status,

    om.joined_at,
    om.role_changed_at,
    om.created_at as membership_created_at,
    om.updated_at as membership_updated_at,

    p.first_name,
    p.last_name,
    om.job_title
  from public.organization_memberships om
  join public.profiles p
    on p.id = om.user_id
  where om.company_id = actor_company_id
    and om.membership_status = 'active'
  order by
    case om.workspace_role
      when 'owner' then 1
      when 'admin' then 2
      when 'member' then 3
      when 'viewer' then 4
      else 5
    end,
    lower(coalesce(p.email, '')),
    om.created_at;
end;
$$;

comment on function public.get_organization_members() is
  'Returns active members of the caller''s current workspace, including person names and membership job title. Does not grant direct cross-profile SELECT.';

alter function public.get_organization_members()
  owner to postgres;

revoke all
on function public.get_organization_members()
from public;

revoke all
on function public.get_organization_members()
from anon;

grant execute
on function public.get_organization_members()
to authenticated;

commit;

begin;

/*
 * Secure company workspace invitation access.
 *
 * Removes direct authenticated table access to public.invitations and
 * replaces it with least-privilege SECURITY DEFINER RPCs that derive
 * company scope from the caller's active organization membership.
 */

revoke all on table public.invitations from public;
revoke all on table public.invitations from anon;
revoke all on table public.invitations from authenticated;

create unique index if not exists invitations_pending_company_email_uidx
  on public.invitations (company_id, lower(btrim(email)))
  where status = 'pending';

create or replace function public.resolve_company_workspace_invitation_context(
  out resolved_company_id uuid,
  out resolved_workspace_role text,
  out resolution_error_code text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  actor_user_id uuid;
  actor_profile_company_id uuid;
  active_membership_count integer;
begin
  resolved_company_id := null;
  resolved_workspace_role := null;
  resolution_error_code := null;

  actor_user_id := auth.uid();

  if actor_user_id is null then
    resolution_error_code := 'UNAUTHENTICATED';
    return;
  end if;

  select p.company_id
  into actor_profile_company_id
  from public.profiles as p
  where p.id = actor_user_id;

  if actor_profile_company_id is not null then
    select
      om.company_id,
      om.workspace_role
    into
      resolved_company_id,
      resolved_workspace_role
    from public.organization_memberships as om
    where om.user_id = actor_user_id
      and om.company_id = actor_profile_company_id
      and om.membership_status = 'active';

    if resolved_company_id is null then
      resolution_error_code := 'ACTIVE_MEMBERSHIP_REQUIRED';
    end if;

    return;
  end if;

  select count(*)
  into active_membership_count
  from public.organization_memberships as om
  where om.user_id = actor_user_id
    and om.membership_status = 'active';

  if active_membership_count = 0 then
    resolution_error_code := 'ACTIVE_MEMBERSHIP_REQUIRED';
    return;
  end if;

  if active_membership_count > 1 then
    resolution_error_code := 'AMBIGUOUS_WORKSPACE_CONTEXT';
    return;
  end if;

  select
    om.company_id,
    om.workspace_role
  into
    resolved_company_id,
    resolved_workspace_role
  from public.organization_memberships as om
  where om.user_id = actor_user_id
    and om.membership_status = 'active';
end;
$$;

create or replace function public.get_company_workspace_invitations()
returns table (
  id uuid,
  company_id uuid,
  email text,
  role text,
  status text,
  token text,
  expires_at timestamp with time zone,
  created_at timestamp with time zone
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_company_id uuid;
  actor_workspace_role text;
  resolution_error text;
begin
  select
    resolved_company_id,
    resolved_workspace_role,
    resolution_error_code
  into
    actor_company_id,
    actor_workspace_role,
    resolution_error
  from public.resolve_company_workspace_invitation_context();

  if resolution_error = 'UNAUTHENTICATED' then
    raise exception
      'Authentication is required.'
      using errcode = '42501';
  end if;

  if resolution_error = 'ACTIVE_MEMBERSHIP_REQUIRED' then
    raise exception
      'An active workspace membership is required.'
      using errcode = '42501';
  end if;

  if resolution_error = 'AMBIGUOUS_WORKSPACE_CONTEXT' then
    raise exception
      'Multiple active workspace memberships require an explicit current company.'
      using errcode = '42501';
  end if;

  if actor_workspace_role not in ('owner', 'admin', 'member', 'viewer') then
    raise exception
      'Workspace invitation access is not permitted.'
      using errcode = '42501';
  end if;

  return query
  select
    i.id,
    i.company_id,
    i.email,
    i.role,
    i.status,
    case
      when actor_workspace_role in ('owner', 'admin') then i.token
      else null
    end as token,
    i.expires_at,
    i.created_at
  from public.invitations as i
  where i.company_id = actor_company_id
  order by i.created_at desc;
end;
$$;

create or replace function public.create_company_workspace_invitation(
  p_email text,
  p_role text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_user_id uuid;
  actor_company_id uuid;
  actor_workspace_role text;
  resolution_error text;

  normalized_email text;
  normalized_role text;

  created_invitation public.invitations%rowtype;
begin
  actor_user_id := auth.uid();

  if actor_user_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHENTICATED',
      'error_message', 'Authentication is required.'
    );
  end if;

  normalized_email := lower(btrim(coalesce(p_email, '')));

  if normalized_email = ''
     or normalized_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_EMAIL',
      'error_message', 'Please enter a valid email address.'
    );
  end if;

  normalized_role := lower(btrim(coalesce(p_role, '')));

  if normalized_role not in ('admin', 'buyer', 'vendor') then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_ROLE',
      'error_message', 'Invitation role must be admin, buyer, or vendor.'
    );
  end if;

  select
    resolved_company_id,
    resolved_workspace_role,
    resolution_error_code
  into
    actor_company_id,
    actor_workspace_role,
    resolution_error
  from public.resolve_company_workspace_invitation_context();

  if resolution_error is not null then
    return jsonb_build_object(
      'success', false,
      'error_code', resolution_error,
      'error_message',
      case resolution_error
        when 'UNAUTHENTICATED' then 'Authentication is required.'
        when 'ACTIVE_MEMBERSHIP_REQUIRED' then 'An active workspace membership is required.'
        when 'AMBIGUOUS_WORKSPACE_CONTEXT' then 'Multiple active workspace memberships require an explicit current company.'
        else 'Workspace access could not be verified.'
      end
    );
  end if;

  if actor_workspace_role not in ('owner', 'admin') then
    return jsonb_build_object(
      'success', false,
      'error_code', 'FORBIDDEN',
      'error_message', 'You do not have permission to invite company users.'
    );
  end if;

  if exists (
    select 1
    from public.profiles as p
    where lower(btrim(coalesce(p.email, ''))) = normalized_email
      and (
        p.company_id = actor_company_id
        or exists (
          select 1
          from public.organization_memberships as om
          where om.user_id = p.id
            and om.company_id = actor_company_id
            and om.membership_status in ('pending', 'active', 'suspended')
        )
      )
  ) then
    return jsonb_build_object(
      'success', false,
      'error_code', 'ALREADY_MEMBER',
      'error_message', 'This user is already a member of your company workspace.'
    );
  end if;

  if exists (
    select 1
    from public.invitations as i
    where i.company_id = actor_company_id
      and lower(btrim(i.email)) = normalized_email
      and i.status = 'pending'
  ) then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVITATION_ALREADY_PENDING',
      'error_message', 'A pending invitation already exists for this email.'
    );
  end if;

  insert into public.invitations (
    company_id,
    email,
    role,
    invited_by
  )
  values (
    actor_company_id,
    normalized_email,
    normalized_role,
    actor_user_id
  )
  returning *
  into created_invitation;

  return jsonb_build_object(
    'success', true,
    'invitation', jsonb_build_object(
      'id', created_invitation.id,
      'company_id', created_invitation.company_id,
      'email', created_invitation.email,
      'role', created_invitation.role,
      'status', created_invitation.status,
      'token', created_invitation.token,
      'expires_at', created_invitation.expires_at,
      'created_at', created_invitation.created_at
    )
  );
exception
  when unique_violation then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVITATION_ALREADY_PENDING',
      'error_message', 'A pending invitation already exists for this email.'
    );
  when others then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVITATION_CREATE_FAILED',
      'error_message', 'Failed to create invitation.'
    );
end;
$$;

create or replace function public.get_company_workspace_invitation_for_resend(
  p_invitation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_company_id uuid;
  actor_workspace_role text;
  resolution_error text;

  invitation_record public.invitations%rowtype;
begin
  if auth.uid() is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHENTICATED',
      'error_message', 'Authentication is required.'
    );
  end if;

  if p_invitation_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_INVITATION',
      'error_message', 'Invitation ID is required.'
    );
  end if;

  select
    resolved_company_id,
    resolved_workspace_role,
    resolution_error_code
  into
    actor_company_id,
    actor_workspace_role,
    resolution_error
  from public.resolve_company_workspace_invitation_context();

  if resolution_error is not null then
    return jsonb_build_object(
      'success', false,
      'error_code', resolution_error,
      'error_message',
      case resolution_error
        when 'UNAUTHENTICATED' then 'Authentication is required.'
        when 'ACTIVE_MEMBERSHIP_REQUIRED' then 'An active workspace membership is required.'
        when 'AMBIGUOUS_WORKSPACE_CONTEXT' then 'Multiple active workspace memberships require an explicit current company.'
        else 'Workspace access could not be verified.'
      end
    );
  end if;

  if actor_workspace_role not in ('owner', 'admin') then
    return jsonb_build_object(
      'success', false,
      'error_code', 'FORBIDDEN',
      'error_message', 'You do not have permission to manage invitations.'
    );
  end if;

  select *
  into invitation_record
  from public.invitations as i
  where i.id = p_invitation_id
    and i.company_id = actor_company_id;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVITATION_NOT_FOUND',
      'error_message', 'Invitation not found in your company workspace.'
    );
  end if;

  if invitation_record.status <> 'pending' then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVITATION_NOT_PENDING',
      'error_message', 'Only pending invitations can be resent.'
    );
  end if;

  if invitation_record.email is null
     or invitation_record.token is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVITATION_INCOMPLETE',
      'error_message', 'Invitation is missing required delivery details.'
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'invitation', jsonb_build_object(
      'id', invitation_record.id,
      'company_id', invitation_record.company_id,
      'email', invitation_record.email,
      'role', invitation_record.role,
      'status', invitation_record.status,
      'token', invitation_record.token,
      'expires_at', invitation_record.expires_at
    )
  );
end;
$$;

create or replace function public.revoke_company_workspace_invitation(
  p_invitation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_company_id uuid;
  actor_workspace_role text;
  resolution_error text;

  invitation_record public.invitations%rowtype;
begin
  if auth.uid() is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHENTICATED',
      'error_message', 'Authentication is required.'
    );
  end if;

  if p_invitation_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_INVITATION',
      'error_message', 'Invitation ID is required.'
    );
  end if;

  select
    resolved_company_id,
    resolved_workspace_role,
    resolution_error_code
  into
    actor_company_id,
    actor_workspace_role,
    resolution_error
  from public.resolve_company_workspace_invitation_context();

  if resolution_error is not null then
    return jsonb_build_object(
      'success', false,
      'error_code', resolution_error,
      'error_message',
      case resolution_error
        when 'UNAUTHENTICATED' then 'Authentication is required.'
        when 'ACTIVE_MEMBERSHIP_REQUIRED' then 'An active workspace membership is required.'
        when 'AMBIGUOUS_WORKSPACE_CONTEXT' then 'Multiple active workspace memberships require an explicit current company.'
        else 'Workspace access could not be verified.'
      end
    );
  end if;

  if actor_workspace_role not in ('owner', 'admin') then
    return jsonb_build_object(
      'success', false,
      'error_code', 'FORBIDDEN',
      'error_message', 'You do not have permission to manage invitations.'
    );
  end if;

  select *
  into invitation_record
  from public.invitations as i
  where i.id = p_invitation_id
    and i.company_id = actor_company_id
  for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVITATION_NOT_FOUND',
      'error_message', 'Invitation not found in your company workspace.'
    );
  end if;

  if invitation_record.status <> 'pending' then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVITATION_NOT_PENDING',
      'error_message', 'Only pending invitations can be revoked.'
    );
  end if;

  update public.invitations
  set status = 'revoked'
  where id = invitation_record.id
    and company_id = actor_company_id
    and status = 'pending';

  if not found then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVITATION_REVOKE_FAILED',
      'error_message', 'Failed to revoke invitation.'
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'invitation', jsonb_build_object(
      'id', invitation_record.id,
      'company_id', invitation_record.company_id,
      'email', invitation_record.email,
      'role', invitation_record.role,
      'status', 'revoked'
    )
  );
end;
$$;

comment on function public.resolve_company_workspace_invitation_context() is
  'Resolves the caller''s company workspace for invitation RPCs. Fails closed when profile.company_id is null and multiple active memberships exist.';

comment on function public.get_company_workspace_invitations() is
  'Returns workspace invitation metadata for the caller''s active company. Tokens are disclosed only to active owner/admin members.';

comment on function public.create_company_workspace_invitation(text, text) is
  'Creates a pending company workspace invitation for the caller''s active company.';

comment on function public.get_company_workspace_invitation_for_resend(uuid) is
  'Returns resend metadata for a pending invitation in the caller''s active company.';

comment on function public.revoke_company_workspace_invitation(uuid) is
  'Revokes a pending invitation in the caller''s active company.';

alter function public.resolve_company_workspace_invitation_context()
  owner to postgres;

alter function public.get_company_workspace_invitations()
  owner to postgres;

alter function public.create_company_workspace_invitation(text, text)
  owner to postgres;

alter function public.get_company_workspace_invitation_for_resend(uuid)
  owner to postgres;

alter function public.revoke_company_workspace_invitation(uuid)
  owner to postgres;

revoke all on function public.resolve_company_workspace_invitation_context()
from public;

revoke all on function public.resolve_company_workspace_invitation_context()
from anon;

revoke all on function public.get_company_workspace_invitations()
from public;

revoke all on function public.get_company_workspace_invitations()
from anon;

grant execute on function public.get_company_workspace_invitations()
to authenticated;

revoke all on function public.create_company_workspace_invitation(text, text)
from public;

revoke all on function public.create_company_workspace_invitation(text, text)
from anon;

grant execute on function public.create_company_workspace_invitation(text, text)
to authenticated;

revoke all on function public.get_company_workspace_invitation_for_resend(uuid)
from public;

revoke all on function public.get_company_workspace_invitation_for_resend(uuid)
from anon;

grant execute on function public.get_company_workspace_invitation_for_resend(uuid)
to authenticated;

revoke all on function public.revoke_company_workspace_invitation(uuid)
from public;

revoke all on function public.revoke_company_workspace_invitation(uuid)
from anon;

grant execute on function public.revoke_company_workspace_invitation(uuid)
to authenticated;

commit;

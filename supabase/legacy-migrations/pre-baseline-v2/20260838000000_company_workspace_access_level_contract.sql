begin;

/*
 * Company Workspace Access Level invitation contract.
 *
 * Transitional storage continues to use public.invitations.role.
 * New invitations accept only viewer | member | admin.
 * Acceptance also supports historical buyer | vendor values.
 *
 * This migration does not add a workspace_role column on invitations
 * and does not add a duplicate authority column.
 */

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

  if normalized_role not in ('viewer', 'member', 'admin') then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_ROLE',
      'error_message', 'Access Level must be viewer, member, or admin.'
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
  next_profile_role text;
  access_level_label text;
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
    when 'viewer' then
      next_workspace_role := 'viewer';
      next_procurement_function := 'none';
      next_membership_type := 'employee';
      next_profile_role := null;
      access_level_label := 'Read Only';

    when 'member' then
      next_workspace_role := 'member';
      next_procurement_function := 'none';
      next_membership_type := 'employee';
      next_profile_role := null;
      access_level_label := 'Standard';

    when 'admin' then
      next_workspace_role := 'admin';
      next_procurement_function := 'none';
      next_membership_type := 'employee';
      next_profile_role := 'admin';
      access_level_label := 'Administrator';

    when 'buyer' then
      next_workspace_role := 'member';
      next_procurement_function := 'buyer';
      next_membership_type := 'procurement_agent';
      next_profile_role := 'buyer';
      access_level_label := 'Standard';

    when 'vendor' then
      next_workspace_role := 'member';
      next_procurement_function := 'supplier';
      next_membership_type := 'external_consultant';
      next_profile_role := 'vendor';
      access_level_label := 'Standard';

    else
      return jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_INVITATION_ROLE',
        'error_message', 'The invitation Access Level is not supported.'
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
    next_profile_role,
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
    company_id,
    title,
    message,
    type,
    is_read
  )
  values (
    invitation_record.company_id,
    'Invitation Accepted',
    actor_email
      || ' joined the company workspace as '
      || access_level_label
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
      'access_level_label', access_level_label,
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

comment on function public.create_company_workspace_invitation(text, text) is
  'Creates a pending company workspace invitation for the caller''s active company. New invitations accept Access Level viewer, member, or admin only. Owner cannot be invited through this command.';

comment on function public.accept_organization_invitation(text, text) is
  'Accepts a pending organization invitation for auth.uid() after JWT email match. Optional job title is written only onto the accepted membership. Caller cannot supply company_id, user_id, workspace_role, or procurement_function. New Access Levels and historical buyer/vendor invitation.role values are supported.';

alter function public.create_company_workspace_invitation(text, text)
  owner to postgres;

alter function public.accept_organization_invitation(text, text)
  owner to postgres;

revoke all on function public.create_company_workspace_invitation(text, text)
from public;

revoke all on function public.create_company_workspace_invitation(text, text)
from anon;

grant execute on function public.create_company_workspace_invitation(text, text)
to authenticated;

revoke all
on function public.accept_organization_invitation(text, text)
from public;

revoke all
on function public.accept_organization_invitation(text, text)
from anon;

grant execute
on function public.accept_organization_invitation(text, text)
to authenticated;

commit;

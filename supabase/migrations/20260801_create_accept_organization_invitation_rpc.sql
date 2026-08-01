begin;

create or replace function public.accept_organization_invitation(
  invitation_token text
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

revoke all
on function public.accept_organization_invitation(text)
from public;

grant execute
on function public.accept_organization_invitation(text)
to authenticated;

commit;
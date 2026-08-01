begin;

create or replace function public.remove_organization_member(
  target_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_user_id uuid;

  actor_membership public.organization_memberships%rowtype;
  target_membership public.organization_memberships%rowtype;

  target_email text;
  removed_timestamp timestamp with time zone := now();
begin
  actor_user_id := auth.uid();

  if actor_user_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHENTICATED',
      'error_message', 'Authentication is required.'
    );
  end if;

  if target_user_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'MEMBER_NOT_FOUND',
      'error_message', 'A target workspace member is required.'
    );
  end if;

  /*
   * Resolve the authenticated actor's active membership.
   *
   * The current platform model allows one active company context
   * per user. If multi-workspace switching is introduced later,
   * company_id should become an explicit command argument.
   */
  select *
  into actor_membership
  from public.organization_memberships
  where user_id = actor_user_id
    and membership_status = 'active'
  limit 1;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error_code', 'FORBIDDEN',
      'error_message', 'An active workspace membership is required.'
    );
  end if;

  if actor_membership.workspace_role not in ('owner', 'admin') then
    return jsonb_build_object(
      'success', false,
      'error_code', 'FORBIDDEN',
      'error_message', 'You do not have permission to remove workspace members.'
    );
  end if;

  if target_user_id = actor_user_id then
    return jsonb_build_object(
      'success', false,
      'error_code', 'SELF_MUTATION_NOT_ALLOWED',
      'error_message', 'You cannot remove yourself from the workspace.'
    );
  end if;

  /*
   * Lock the target membership so concurrent role changes,
   * removals, or invitation reactivation cannot race this command.
   */
  select *
  into target_membership
  from public.organization_memberships
  where user_id = target_user_id
    and company_id = actor_membership.company_id
    and membership_status = 'active'
  for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error_code', 'MEMBER_NOT_FOUND',
      'error_message', 'The active workspace member could not be found.'
    );
  end if;

  /*
   * Owners are never removable through the generic member-removal
   * command. Ownership changes require a dedicated transfer flow.
   */
  if target_membership.workspace_role = 'owner' then
    return jsonb_build_object(
      'success', false,
      'error_code', 'OWNER_PROTECTED',
      'error_message', 'Workspace owners must be handled through the ownership transfer workflow.'
    );
  end if;

  select email
  into target_email
  from public.profiles
  where id = target_user_id;

  /*
   * Keep the historical membership row but revoke its access.
   *
   * This preserves auditability and allows a later invitation to
   * reactivate the same unique user/company membership.
   */
  update public.organization_memberships
  set
    membership_status = 'revoked',
    updated_at = removed_timestamp
  where id = target_membership.id;

  /*
   * Temporary legacy compatibility.
   *
   * Procurement and dashboard routes that have not migrated yet
   * treat profiles.company_id as the active workspace attachment.
   * The legacy role is intentionally preserved because it describes
   * the user's procurement function and is replaced on re-invitation.
   */
  update public.profiles
  set company_id = null
  where id = target_user_id
    and company_id = actor_membership.company_id;

  insert into public.audit_logs (
    action,
    entity_type,
    entity_id,
    user_id,
    company_id,
    metadata
  )
  values (
    'MEMBER_REMOVED',
    'organization_membership',
    target_membership.id,
    actor_user_id,
    actor_membership.company_id,
    jsonb_build_object(
      'target_user_id', target_user_id,
      'target_email', target_email,
      'previous_workspace_role',
        target_membership.workspace_role,
      'procurement_function',
        target_membership.procurement_function,
      'membership_type',
        target_membership.membership_type,
      'previous_membership_status',
        target_membership.membership_status,
      'new_membership_status', 'revoked',
      'removed_at', removed_timestamp
    )
  );

  return jsonb_build_object(
    'success', true,
    'target_user_id', target_user_id,
    'membership_status', 'revoked'
  );
end;
$$;

revoke all
on function public.remove_organization_member(uuid)
from public;

grant execute
on function public.remove_organization_member(uuid)
to authenticated;

commit;
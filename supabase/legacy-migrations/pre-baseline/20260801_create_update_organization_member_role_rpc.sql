begin;

create or replace function public.update_organization_member_role(
  target_user_id uuid,
  next_workspace_role text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_user_id uuid;
  actor_membership public.organization_memberships%rowtype;
  target_membership public.organization_memberships%rowtype;
begin
  actor_user_id := auth.uid();

  if actor_user_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHENTICATED',
      'error_message', 'Authentication is required.'
    );
  end if;

  if next_workspace_role not in ('admin', 'member', 'viewer') then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_ROLE',
      'error_message', 'The requested workspace role is invalid.'
    );
  end if;

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
      'error_message', 'You do not have permission to change workspace roles.'
    );
  end if;

  if target_user_id = actor_user_id then
    return jsonb_build_object(
      'success', false,
      'error_code', 'SELF_MUTATION_NOT_ALLOWED',
      'error_message', 'You cannot change your own workspace role.'
    );
  end if;

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
      'error_message', 'The workspace member could not be found.'
    );
  end if;

  if target_membership.workspace_role = 'owner' then
    return jsonb_build_object(
      'success', false,
      'error_code', 'OWNER_PROTECTED',
      'error_message', 'Owner roles must be changed through the ownership transfer workflow.'
    );
  end if;

  update public.organization_memberships
  set
    workspace_role = next_workspace_role,
    role_changed_at = now(),
    updated_at = now()
  where id = target_membership.id;

  insert into public.audit_logs (
    action,
    entity_type,
    entity_id,
    user_id,
    company_id,
    metadata
  )
  values (
    'MEMBER_WORKSPACE_ROLE_UPDATED',
    'organization_membership',
    target_membership.id,
    actor_user_id,
    actor_membership.company_id,
    jsonb_build_object(
      'target_user_id', target_user_id,
      'previous_workspace_role', target_membership.workspace_role,
      'new_workspace_role', next_workspace_role,
      'procurement_function', target_membership.procurement_function,
      'updated_at', now()
    )
  );

  return jsonb_build_object(
    'success', true
  );
end;
$$;

revoke all
on function public.update_organization_member_role(uuid, text)
from public;

grant execute
on function public.update_organization_member_role(uuid, text)
to authenticated;

commit;
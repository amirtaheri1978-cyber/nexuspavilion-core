begin;

create or replace function public.request_company_ownership_transfer(
  target_user_id uuid,
  previous_owner_next_role text default 'admin',
  transfer_reason text default null,
  expires_in_hours integer default 72
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_user_id uuid;
  actor_profile public.profiles%rowtype;
  actor_membership public.organization_memberships%rowtype;
  target_membership public.organization_memberships%rowtype;
  company_record public.companies%rowtype;
  normalized_next_role text;
  normalized_reason text;
  requested_timestamp timestamp with time zone := now();
  expiration_timestamp timestamp with time zone;
  expired_transfer_request public.ownership_transfer_requests%rowtype;
  transfer_request public.ownership_transfer_requests%rowtype;
begin
  actor_user_id := auth.uid();
  if actor_user_id is null then
    return jsonb_build_object('success', false, 'error_code', 'UNAUTHENTICATED', 'error_message', 'Authentication is required.');
  end if;
  if target_user_id is null then
    return jsonb_build_object('success', false, 'error_code', 'TARGET_NOT_FOUND', 'error_message', 'A proposed owner is required.');
  end if;
  if target_user_id = actor_user_id then
    return jsonb_build_object('success', false, 'error_code', 'SELF_TRANSFER_NOT_ALLOWED', 'error_message', 'Ownership cannot be transferred to the current owner.');
  end if;
  normalized_next_role := lower(trim(coalesce(previous_owner_next_role, '')));
  if normalized_next_role not in ('admin', 'member', 'viewer') then
    return jsonb_build_object('success', false, 'error_code', 'INVALID_NEXT_ROLE', 'error_message', 'The previous owner role must be admin, member, or viewer.');
  end if;
  if expires_in_hours is null or expires_in_hours < 1 or expires_in_hours > 168 then
    return jsonb_build_object('success', false, 'error_code', 'INVALID_EXPIRATION', 'error_message', 'Transfer expiration must be between 1 and 168 hours.');
  end if;
  normalized_reason := nullif(trim(coalesce(transfer_reason, '')), '');
  if normalized_reason is not null and length(normalized_reason) > 2000 then
    return jsonb_build_object('success', false, 'error_code', 'INVALID_TRANSFER_REASON', 'error_message', 'Transfer reason must not exceed 2000 characters.');
  end if;
  expiration_timestamp := requested_timestamp + make_interval(hours => expires_in_hours);
  select * into actor_profile from public.profiles where id = actor_user_id;
  if not found or actor_profile.company_id is null then
    return jsonb_build_object('success', false, 'error_code', 'OWNER_MEMBERSHIP_REQUIRED', 'error_message', 'An active owner workspace membership is required.');
  end if;
  select * into actor_membership from public.organization_memberships
  where user_id = actor_user_id and company_id = actor_profile.company_id
    and membership_status = 'active' and workspace_role = 'owner'
  for update;
  if not found then
    return jsonb_build_object('success', false, 'error_code', 'OWNER_MEMBERSHIP_REQUIRED', 'error_message', 'An active owner workspace membership is required.');
  end if;
  select * into company_record from public.companies
  where id = actor_membership.company_id for update;
  if not found then
    return jsonb_build_object('success', false, 'error_code', 'COMPANY_NOT_FOUND', 'error_message', 'The company could not be found.');
  end if;
  if company_record.user_id is distinct from actor_user_id then
    return jsonb_build_object('success', false, 'error_code', 'OWNER_STATE_INCONSISTENT', 'error_message', 'Canonical ownership and legacy ownership projections are inconsistent.');
  end if;
  select * into target_membership from public.organization_memberships
  where user_id = target_user_id and company_id = actor_membership.company_id
  for update;
  if not found then
    return jsonb_build_object('success', false, 'error_code', 'TARGET_NOT_FOUND', 'error_message', 'The proposed owner is not a member of this company.');
  end if;
  if target_membership.membership_status <> 'active' then
    return jsonb_build_object('success', false, 'error_code', 'TARGET_NOT_ACTIVE', 'error_message', 'The proposed owner must have an active workspace membership.');
  end if;
  if target_membership.workspace_role = 'owner' then
    return jsonb_build_object('success', false, 'error_code', 'TARGET_ALREADY_OWNER', 'error_message', 'The proposed owner already holds the owner role.');
  end if;
  for expired_transfer_request in
    update public.ownership_transfer_requests
    set status = 'expired', expired_at = requested_timestamp,
        updated_at = requested_timestamp,
        metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
          'expiration_detected_during', 'request',
          'expiration_detected_by', actor_user_id)
    where company_id = actor_membership.company_id
      and status = 'pending_acceptance'
      and expires_at <= requested_timestamp
    returning *
  loop
    insert into public.audit_logs (action, entity_type, entity_id, user_id, company_id, metadata)
    values (
      'OWNERSHIP_TRANSFER_EXPIRED', 'ownership_transfer_request',
      expired_transfer_request.id, actor_user_id, expired_transfer_request.company_id,
      jsonb_build_object(
        'transfer_request_id', expired_transfer_request.id,
        'from_user_id', expired_transfer_request.from_user_id,
        'to_user_id', expired_transfer_request.to_user_id,
        'requested_at', expired_transfer_request.requested_at,
        'expires_at', expired_transfer_request.expires_at,
        'expired_at', requested_timestamp,
        'expiration_detected_during', 'request')
    );
  end loop;
  if exists (
    select 1 from public.ownership_transfer_requests
    where company_id = actor_membership.company_id and status = 'pending_acceptance'
  ) then
    return jsonb_build_object('success', false, 'error_code', 'PENDING_TRANSFER_EXISTS', 'error_message', 'This company already has a pending ownership-transfer request.');
  end if;
  insert into public.ownership_transfer_requests (
    company_id, from_user_id, to_user_id, status, previous_owner_next_role,
    transfer_reason, requested_at, expires_at, created_at, updated_at
  ) values (
    actor_membership.company_id, actor_user_id, target_user_id, 'pending_acceptance',
    normalized_next_role, normalized_reason, requested_timestamp, expiration_timestamp,
    requested_timestamp, requested_timestamp
  ) returning * into transfer_request;
  insert into public.audit_logs (action, entity_type, entity_id, user_id, company_id, metadata)
  values (
    'OWNERSHIP_TRANSFER_REQUESTED', 'ownership_transfer_request', transfer_request.id,
    actor_user_id, actor_membership.company_id,
    jsonb_build_object(
      'from_user_id', actor_user_id, 'to_user_id', target_user_id,
      'previous_owner_next_role', normalized_next_role, 'transfer_reason', normalized_reason,
      'requested_at', requested_timestamp, 'expires_at', expiration_timestamp)
  );
  return jsonb_build_object(
    'success', true, 'transfer_request_id', transfer_request.id,
    'company_id', transfer_request.company_id, 'from_user_id', transfer_request.from_user_id,
    'to_user_id', transfer_request.to_user_id, 'status', transfer_request.status,
    'previous_owner_next_role', transfer_request.previous_owner_next_role,
    'requested_at', transfer_request.requested_at, 'expires_at', transfer_request.expires_at);
exception
  when unique_violation then
    return jsonb_build_object('success', false, 'error_code', 'PENDING_TRANSFER_EXISTS', 'error_message', 'This company already has a pending ownership-transfer request.');
  when others then
    raise log 'request_company_ownership_transfer failed for actor %, target %: %', actor_user_id, target_user_id, sqlerrm;
    return jsonb_build_object('success', false, 'error_code', 'REQUEST_CREATION_FAILED', 'error_message', 'The ownership-transfer request could not be created.');
end;
$$;

revoke all on function public.request_company_ownership_transfer(uuid, text, text, integer) from public;
grant execute on function public.request_company_ownership_transfer(uuid, text, text, integer) to authenticated;

commit;

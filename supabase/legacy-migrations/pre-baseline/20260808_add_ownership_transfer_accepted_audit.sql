begin;

-- ============================================================================
-- DEV-004 - Company Ownership Lifecycle
-- RFC-001 - Company Ownership Domain
--
-- Purpose:
-- Atomically accept and complete a pending voluntary ownership transfer.
--
-- Transaction guarantees:
-- - Only the intended recipient may accept the request.
-- - The request, company, and both membership rows are locked.
-- - The current owner remains authoritative until every validation succeeds.
-- - The previous owner is demoted before the recipient is promoted, preserving
--   the single-active-owner database invariant.
-- - Procurement function is never modified.
-- - companies.user_id remains synchronized during the compatibility period.
-- - Request completion and audit evidence are part of the same transaction.
-- - Any unhandled failure rolls back the entire ownership transition.
-- ============================================================================

create or replace function public.accept_company_ownership_transfer(
  p_transfer_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_user_id uuid;

  transfer_request public.ownership_transfer_requests%rowtype;
  company_record public.companies%rowtype;

  previous_owner_membership
    public.organization_memberships%rowtype;

  recipient_membership
    public.organization_memberships%rowtype;

  accepted_timestamp timestamp with time zone := now();
begin
  actor_user_id := auth.uid();

  ---------------------------------------------------------------------------
  -- Authentication and input validation
  ---------------------------------------------------------------------------

  if actor_user_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHENTICATED',
      'error_message', 'Authentication is required.'
    );
  end if;

  if p_transfer_request_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'REQUEST_ID_REQUIRED',
      'error_message', 'An ownership-transfer request ID is required.'
    );
  end if;

  ---------------------------------------------------------------------------
  -- Lock and load the transfer request
  ---------------------------------------------------------------------------

  select *
  into transfer_request
  from public.ownership_transfer_requests
  where id = p_transfer_request_id
  for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error_code', 'REQUEST_NOT_FOUND',
      'error_message',
        'The ownership-transfer request could not be found.'
    );
  end if;

  /*
   * Check recipient identity before returning lifecycle details.
   * This prevents unrelated authenticated users from inspecting the request.
   */
  if transfer_request.to_user_id <> actor_user_id then
    return jsonb_build_object(
      'success', false,
      'error_code', 'NOT_TRANSFER_RECIPIENT',
      'error_message',
        'Only the proposed owner may accept this ownership transfer.'
    );
  end if;

  ---------------------------------------------------------------------------
  -- Validate request lifecycle
  ---------------------------------------------------------------------------

  if transfer_request.status <> 'pending_acceptance' then
    return jsonb_build_object(
      'success', false,
      'error_code',
        case transfer_request.status
          when 'completed' then 'REQUEST_ALREADY_COMPLETED'
          when 'rejected' then 'REQUEST_REJECTED'
          when 'cancelled' then 'REQUEST_CANCELLED'
          when 'expired' then 'REQUEST_EXPIRED'
          else 'REQUEST_NOT_PENDING'
        end,
      'error_message',
        case transfer_request.status
          when 'completed'
            then 'This ownership-transfer request has already been completed.'
          when 'rejected'
            then 'This ownership-transfer request has been rejected.'
          when 'cancelled'
            then 'This ownership-transfer request has been cancelled.'
          when 'expired'
            then 'This ownership-transfer request has expired.'
          else
            'This ownership-transfer request is not pending acceptance.'
        end
    );
  end if;

  /*
   * Close a request that reached its expiration time before acceptance.
   * This lifecycle update is committed even though acceptance is rejected.
   */
  if transfer_request.expires_at <= accepted_timestamp then
    update public.ownership_transfer_requests
    set
      status = 'expired',
      expired_at = accepted_timestamp,
      updated_at = accepted_timestamp
    where id = transfer_request.id;

    insert into public.audit_logs (
      action,
      entity_type,
      entity_id,
      user_id,
      company_id,
      metadata
    )
    values (
      'OWNERSHIP_TRANSFER_EXPIRED',
      'ownership_transfer_request',
      transfer_request.id,
      actor_user_id,
      transfer_request.company_id,
      jsonb_build_object(
        'transfer_request_id', transfer_request.id,
        'from_user_id', transfer_request.from_user_id,
        'to_user_id', transfer_request.to_user_id,
        'requested_at', transfer_request.requested_at,
        'expires_at', transfer_request.expires_at,
        'expired_at', accepted_timestamp,
        'expiration_detected_during', 'acceptance'
      )
    );

    return jsonb_build_object(
      'success', false,
      'error_code', 'REQUEST_EXPIRED',
      'error_message',
        'This ownership-transfer request has expired.'
    );
  end if;

  ---------------------------------------------------------------------------
  -- Lock and validate the company compatibility projection
  ---------------------------------------------------------------------------

  select *
  into company_record
  from public.companies
  where id = transfer_request.company_id
  for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error_code', 'COMPANY_NOT_FOUND',
      'error_message',
        'The company associated with this transfer could not be found.'
    );
  end if;

  /*
   * During migration, companies.user_id must still identify the owner who
   * initiated the pending request.
   */
  if company_record.user_id is distinct from
     transfer_request.from_user_id then
    return jsonb_build_object(
      'success', false,
      'error_code', 'OWNER_STATE_INCONSISTENT',
      'error_message',
        'The current company owner no longer matches the transfer request.'
    );
  end if;

  ---------------------------------------------------------------------------
  -- Lock membership rows in deterministic order to reduce deadlock risk
  ---------------------------------------------------------------------------

  perform 1
  from public.organization_memberships
  where company_id = transfer_request.company_id
    and user_id in (
      transfer_request.from_user_id,
      transfer_request.to_user_id
    )
  order by user_id
  for update;

  ---------------------------------------------------------------------------
  -- Validate the current owner membership
  ---------------------------------------------------------------------------

  select *
  into previous_owner_membership
  from public.organization_memberships
  where company_id = transfer_request.company_id
    and user_id = transfer_request.from_user_id;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error_code', 'CURRENT_OWNER_MEMBERSHIP_NOT_FOUND',
      'error_message',
        'The current owner membership could not be found.'
    );
  end if;

  if previous_owner_membership.membership_status <> 'active'
     or previous_owner_membership.workspace_role <> 'owner' then
    return jsonb_build_object(
      'success', false,
      'error_code', 'OWNER_STATE_INCONSISTENT',
      'error_message',
        'The initiating owner no longer has an active owner membership.'
    );
  end if;

  ---------------------------------------------------------------------------
  -- Validate the recipient membership
  ---------------------------------------------------------------------------

  select *
  into recipient_membership
  from public.organization_memberships
  where company_id = transfer_request.company_id
    and user_id = transfer_request.to_user_id;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error_code', 'TARGET_NOT_FOUND',
      'error_message',
        'The proposed owner is not a member of this company.'
    );
  end if;

  if recipient_membership.membership_status <> 'active' then
    return jsonb_build_object(
      'success', false,
      'error_code', 'TARGET_NOT_ACTIVE',
      'error_message',
        'The proposed owner must have an active workspace membership.'
    );
  end if;

  if recipient_membership.workspace_role = 'owner' then
    return jsonb_build_object(
      'success', false,
      'error_code', 'TARGET_ALREADY_OWNER',
      'error_message',
        'The proposed owner already has the owner workspace role.'
    );
  end if;

  if transfer_request.previous_owner_next_role not in (
    'admin',
    'member',
    'viewer'
  ) then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_NEXT_ROLE',
      'error_message',
        'The previous owner post-transfer role is invalid.'
    );
  end if;

  ---------------------------------------------------------------------------
  -- Atomic ownership mutation
  --
  -- The previous owner must be demoted first. Promoting the recipient first
  -- would violate the partial unique index that permits only one active owner.
  ---------------------------------------------------------------------------

  update public.organization_memberships
  set
    workspace_role = transfer_request.previous_owner_next_role,
    role_changed_at = accepted_timestamp,
    updated_at = accepted_timestamp
  where id = previous_owner_membership.id;

  if not found then
    raise exception
      'Previous owner membership update affected no rows.';
  end if;

  update public.organization_memberships
  set
    workspace_role = 'owner',
    role_changed_at = accepted_timestamp,
    updated_at = accepted_timestamp
  where id = recipient_membership.id;

  if not found then
    raise exception
      'Recipient membership update affected no rows.';
  end if;

  /*
   * Preserve the temporary legacy ownership projection.
   */
  update public.companies
  set
    user_id = transfer_request.to_user_id
  where id = company_record.id
    and user_id = transfer_request.from_user_id;

  if not found then
    raise exception
      'Company ownership compatibility update affected no rows.';
  end if;

  ---------------------------------------------------------------------------
  -- Complete the transfer request
  ---------------------------------------------------------------------------

  update public.ownership_transfer_requests
  set
    status = 'completed',
    accepted_at = accepted_timestamp,
    completed_at = accepted_timestamp,
    updated_at = accepted_timestamp
  where id = transfer_request.id
    and status = 'pending_acceptance';

  if not found then
    raise exception
      'Ownership-transfer request completion affected no rows.';
  end if;

  ---------------------------------------------------------------------------
  -- Immutable audit evidence
  ---------------------------------------------------------------------------

  insert into public.audit_logs (
    action,
    entity_type,
    entity_id,
    user_id,
    company_id,
    metadata
  )
  values (
    'OWNERSHIP_TRANSFER_ACCEPTED',
    'ownership_transfer_request',
    transfer_request.id,
    actor_user_id,
    transfer_request.company_id,
    jsonb_build_object(
      'transfer_request_id', transfer_request.id,
      'company_id', transfer_request.company_id,
      'previous_owner_id', transfer_request.from_user_id,
      'new_owner_id', transfer_request.to_user_id,
      'accepted_at', accepted_timestamp
    )
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
    'OWNERSHIP_TRANSFER_COMPLETED',
    'ownership_transfer_request',
    transfer_request.id,
    actor_user_id,
    transfer_request.company_id,
    jsonb_build_object(
      'transfer_request_id', transfer_request.id,
      'company_id', transfer_request.company_id,
      'previous_owner_id', transfer_request.from_user_id,
      'new_owner_id', transfer_request.to_user_id,
      'previous_owner_membership_id',
        previous_owner_membership.id,
      'new_owner_membership_id',
        recipient_membership.id,
      'previous_owner_next_role',
        transfer_request.previous_owner_next_role,
      'previous_owner_procurement_function',
        previous_owner_membership.procurement_function,
      'new_owner_procurement_function',
        recipient_membership.procurement_function,
      'requested_at', transfer_request.requested_at,
      'accepted_at', accepted_timestamp,
      'completed_at', accepted_timestamp
    )
  );

  ---------------------------------------------------------------------------
  -- Success response
  ---------------------------------------------------------------------------

  return jsonb_build_object(
    'success', true,
    'status', 'completed',
    'transfer_request_id', transfer_request.id,
    'company_id', transfer_request.company_id,
    'previous_owner_id', transfer_request.from_user_id,
    'new_owner_id', transfer_request.to_user_id,
    'previous_owner_next_role',
      transfer_request.previous_owner_next_role,
    'accepted_at', accepted_timestamp,
    'completed_at', accepted_timestamp
  );

exception
  when unique_violation then
    raise log
      'accept_company_ownership_transfer unique violation for request %, actor %: %',
      p_transfer_request_id,
      actor_user_id,
      sqlerrm;

    return jsonb_build_object(
      'success', false,
      'error_code', 'OWNER_STATE_CONFLICT',
      'error_message',
        'Ownership changed concurrently. Please refresh and try again.'
    );

  when foreign_key_violation then
    raise log
      'accept_company_ownership_transfer foreign key violation for request %, actor %: %',
      p_transfer_request_id,
      actor_user_id,
      sqlerrm;

    return jsonb_build_object(
      'success', false,
      'error_code', 'OWNERSHIP_REFERENCE_INVALID',
      'error_message',
        'A required ownership record is no longer available.'
    );

  when check_violation then
    raise log
      'accept_company_ownership_transfer check violation for request %, actor %: %',
      p_transfer_request_id,
      actor_user_id,
      sqlerrm;

    return jsonb_build_object(
      'success', false,
      'error_code', 'OWNERSHIP_INVARIANT_VIOLATION',
      'error_message',
        'The ownership transfer violated a protected database invariant.'
    );

  when others then
    raise log
      'accept_company_ownership_transfer failed for request %, actor %: %',
      p_transfer_request_id,
      actor_user_id,
      sqlerrm;

    return jsonb_build_object(
      'success', false,
      'error_code', 'TRANSFER_ACCEPTANCE_FAILED',
      'error_message',
        'The ownership transfer could not be completed.'
    );
end;
$$;

comment on function public.accept_company_ownership_transfer(uuid)
is
  'DEV-004 / RFC-001: atomically accepts and completes a voluntary company ownership transfer.';

revoke all
on function public.accept_company_ownership_transfer(uuid)
from public;

grant execute
on function public.accept_company_ownership_transfer(uuid)
to authenticated;

commit;
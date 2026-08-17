begin;

-- ============================================================================
-- DEV-004 - Company Ownership Lifecycle
-- RFC-001 - Company Ownership Domain
--
-- Purpose:
-- Allow the intended recipient to reject a pending voluntary
-- company-ownership transfer request.
--
-- Architectural rules:
-- - Only the proposed owner may reject the request.
-- - Rejection never changes current ownership.
-- - Rejection never changes workspace membership roles.
-- - Rejection never changes procurement functions.
-- - Terminal requests cannot be replayed.
-- - Request mutation and audit evidence must be written atomically.
-- ============================================================================

create or replace function public.reject_company_ownership_transfer(
  p_transfer_request_id uuid,
  p_rejection_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_user_id uuid;

  transfer_request public.ownership_transfer_requests%rowtype;

  normalized_rejection_reason text;

  rejection_timestamp timestamp with time zone := now();
begin
  actor_user_id := auth.uid();

  ---------------------------------------------------------------------------
  -- Authentication
  ---------------------------------------------------------------------------

  if actor_user_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHENTICATED',
      'error_message', 'Authentication is required.'
    );
  end if;

  ---------------------------------------------------------------------------
  -- Input validation
  ---------------------------------------------------------------------------

  if p_transfer_request_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'REQUEST_ID_REQUIRED',
      'error_message',
        'An ownership-transfer request ID is required.'
    );
  end if;

  normalized_rejection_reason :=
    nullif(trim(coalesce(p_rejection_reason, '')), '');

  if normalized_rejection_reason is not null
     and length(normalized_rejection_reason) > 2000 then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_REJECTION_REASON',
      'error_message',
        'Rejection reason must not exceed 2000 characters.'
    );
  end if;

  ---------------------------------------------------------------------------
  -- Lock and load the transfer request
  --
  -- FOR UPDATE prevents concurrent acceptance, cancellation, expiration,
  -- or rejection from mutating the same request simultaneously.
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

  ---------------------------------------------------------------------------
  -- Authorization
  --
  -- Check recipient identity before returning detailed lifecycle information.
  -- This prevents unrelated authenticated users from inspecting the request.
  ---------------------------------------------------------------------------

  if transfer_request.to_user_id <> actor_user_id then
    return jsonb_build_object(
      'success', false,
      'error_code', 'NOT_TRANSFER_RECIPIENT',
      'error_message',
        'Only the proposed owner may reject this ownership transfer.'
    );
  end if;

  ---------------------------------------------------------------------------
  -- Request lifecycle validation
  ---------------------------------------------------------------------------

  if transfer_request.status <> 'pending_acceptance' then
    return jsonb_build_object(
      'success', false,
      'error_code',
        case transfer_request.status
          when 'completed' then 'REQUEST_ALREADY_COMPLETED'
          when 'rejected' then 'REQUEST_ALREADY_REJECTED'
          when 'cancelled' then 'REQUEST_CANCELLED'
          when 'expired' then 'REQUEST_EXPIRED'
          else 'REQUEST_NOT_PENDING'
        end,
      'error_message',
        case transfer_request.status
          when 'completed'
            then 'This ownership-transfer request has already been completed.'
          when 'rejected'
            then 'This ownership-transfer request has already been rejected.'
          when 'cancelled'
            then 'This ownership-transfer request has been cancelled.'
          when 'expired'
            then 'This ownership-transfer request has expired.'
          else
            'This ownership-transfer request is not pending acceptance.'
        end
    );
  end if;

  ---------------------------------------------------------------------------
  -- Runtime expiration validation
  --
  -- An expired request cannot be rejected as though it were still pending.
  -- Part 2 will close the request as expired and record corresponding audit
  -- evidence before returning REQUEST_EXPIRED.
  ---------------------------------------------------------------------------

  if transfer_request.expires_at <= rejection_timestamp then

    -- Part 2 continues here.
    update public.ownership_transfer_requests
    set
      status = 'expired',
      expired_at = rejection_timestamp,
      updated_at = rejection_timestamp,
      metadata =
        coalesce(metadata, '{}'::jsonb)
        || jsonb_build_object(
          'expiration_detected_during', 'rejection',
          'expiration_detected_by', actor_user_id
        )
    where id = transfer_request.id
      and status = 'pending_acceptance';

    if not found then
      raise exception
        'Expired ownership-transfer request update affected no rows.';
    end if;

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
        'expired_at', rejection_timestamp,
        'expiration_detected_during', 'rejection'
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
  -- Reject the pending request
  --
  -- Rejection is terminal. It does not mutate current ownership, workspace
  -- roles, procurement functions, or companies.user_id.
  ---------------------------------------------------------------------------

  update public.ownership_transfer_requests
  set
    status = 'rejected',
    rejected_at = rejection_timestamp,
    updated_at = rejection_timestamp,
    metadata =
      coalesce(metadata, '{}'::jsonb)
      || jsonb_build_object(
        'rejected_by', actor_user_id,
        'rejection_reason', normalized_rejection_reason
      )
  where id = transfer_request.id
    and status = 'pending_acceptance';

  if not found then
    raise exception
      'Ownership-transfer request rejection affected no rows.';
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
    'OWNERSHIP_TRANSFER_REJECTED',
    'ownership_transfer_request',
    transfer_request.id,
    actor_user_id,
    transfer_request.company_id,
    jsonb_build_object(
      'transfer_request_id', transfer_request.id,
      'company_id', transfer_request.company_id,
      'from_user_id', transfer_request.from_user_id,
      'to_user_id', transfer_request.to_user_id,
      'previous_owner_next_role',
        transfer_request.previous_owner_next_role,
      'rejection_reason', normalized_rejection_reason,
      'requested_at', transfer_request.requested_at,
      'expires_at', transfer_request.expires_at,
      'rejected_at', rejection_timestamp
    )
  );

  ---------------------------------------------------------------------------
  -- Success response
  ---------------------------------------------------------------------------

  return jsonb_build_object(
    'success', true,
    'status', 'rejected',
    'transfer_request_id', transfer_request.id,
    'company_id', transfer_request.company_id,
    'from_user_id', transfer_request.from_user_id,
    'to_user_id', transfer_request.to_user_id,
    'rejection_reason', normalized_rejection_reason,
    'rejected_at', rejection_timestamp
  );

  -- Part 3 continues here.
  exception
  when unique_violation then
    raise log
      'reject_company_ownership_transfer unique violation for request %, actor %: %',
      p_transfer_request_id,
      actor_user_id,
      sqlerrm;

    return jsonb_build_object(
      'success', false,
      'error_code', 'TRANSFER_STATE_CONFLICT',
      'error_message',
        'The ownership-transfer request changed concurrently. Please refresh and try again.'
    );

  when foreign_key_violation then
    raise log
      'reject_company_ownership_transfer foreign key violation for request %, actor %: %',
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
      'reject_company_ownership_transfer check violation for request %, actor %: %',
      p_transfer_request_id,
      actor_user_id,
      sqlerrm;

    return jsonb_build_object(
      'success', false,
      'error_code', 'OWNERSHIP_INVARIANT_VIOLATION',
      'error_message',
        'The rejection violated a protected database invariant.'
    );

  when others then
    raise log
      'reject_company_ownership_transfer failed for request %, actor %: %',
      p_transfer_request_id,
      actor_user_id,
      sqlerrm;

    return jsonb_build_object(
      'success', false,
      'error_code', 'TRANSFER_REJECTION_FAILED',
      'error_message',
        'The ownership-transfer request could not be rejected.'
    );
end;
$$;

comment on function public.reject_company_ownership_transfer(
  uuid,
  text
)
is
  'DEV-004 / RFC-001: allows the intended recipient to reject a pending voluntary ownership-transfer request.';

revoke all
on function public.reject_company_ownership_transfer(
  uuid,
  text
)
from public;

grant execute
on function public.reject_company_ownership_transfer(
  uuid,
  text
)
to authenticated;

commit;
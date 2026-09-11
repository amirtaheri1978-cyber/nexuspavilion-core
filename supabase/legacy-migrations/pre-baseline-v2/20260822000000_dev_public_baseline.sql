


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."accept_company_ownership_transfer"("p_transfer_request_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
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


ALTER FUNCTION "public"."accept_company_ownership_transfer"("p_transfer_request_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."accept_company_ownership_transfer"("p_transfer_request_id" "uuid") IS 'DEV-004 / RFC-001: atomically accepts and completes a voluntary company ownership transfer.';



CREATE OR REPLACE FUNCTION "public"."accept_organization_invitation"("invitation_token" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
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


ALTER FUNCTION "public"."accept_organization_invitation"("invitation_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."approve_representative_verification"("p_case_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user uuid := auth.uid();

  v_case public.representative_verification_cases%rowtype;
  v_assignment public.internal_reviewer_assignments%rowtype;
  v_company public.companies%rowtype;
  v_member public.organization_memberships%rowtype;
  v_current_owner_membership public.organization_memberships%rowtype;

  v_reason text;
  v_submitted_membership_found boolean := false;
begin
  ---------------------------------------------------------------------------
  -- Authentication
  ---------------------------------------------------------------------------

  if v_user is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'AUTHENTICATION_REQUIRED'
    );
  end if;


  ---------------------------------------------------------------------------
  -- Reviewer authorization
  ---------------------------------------------------------------------------

  select *
  into v_assignment
  from public.internal_reviewer_assignments
  where reviewer_user_id = v_user
    and capability = 'representative_verification.review'
    and status = 'active'
  for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error_code', 'REVIEWER_NOT_AUTHORIZED'
    );
  end if;


  ---------------------------------------------------------------------------
  -- Case lock and lifecycle
  ---------------------------------------------------------------------------

  select *
  into v_case
  from public.representative_verification_cases
  where id = p_case_id
  for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error_code', 'CASE_NOT_FOUND'
    );
  end if;

  if v_case.status = 'verified' then
    return jsonb_build_object(
      'success', true,
      'case_id', v_case.id,
      'status', 'verified',
      'idempotent', true
    );
  end if;

  if v_case.status = 'invalidated' then
    return jsonb_build_object(
      'success', false,
      'error_code', 'CASE_INVALIDATED'
    );
  end if;

  if v_case.status <> 'pending_review' then
    return jsonb_build_object(
      'success', false,
      'error_code', 'CASE_NOT_PENDING'
    );
  end if;


  ---------------------------------------------------------------------------
  -- Company lock and subject availability
  ---------------------------------------------------------------------------

  select *
  into v_company
  from public.companies
  where id = v_case.company_id
  for update;

  if not found
     or not exists (
       select 1
       from public.profiles
       where id = v_case.representative_user_id
     )
     or not exists (
       select 1
       from public.profiles
       where id = v_case.submitted_by_user_id
     ) then

    v_reason := 'SUBJECT_UNAVAILABLE';

  else
    -------------------------------------------------------------------------
    -- Lock submission-time membership plus current owner membership in
    -- deterministic user_id/id order.
    -------------------------------------------------------------------------

    perform 1
    from public.organization_memberships
    where id = v_case.submitted_owner_membership_id
       or (
         company_id = v_case.company_id
         and membership_status = 'active'
         and workspace_role = 'owner'
       )
    order by user_id, id
    for update;


    -------------------------------------------------------------------------
    -- Load captured submission-time owner membership.
    -------------------------------------------------------------------------

    select *
    into v_member
    from public.organization_memberships
    where id = v_case.submitted_owner_membership_id
    for update;

    v_submitted_membership_found := found;


    -------------------------------------------------------------------------
    -- Invalidation precedence
    --
    -- 1. Missing/stale/not owner-valid submission membership ->
    --    OWNER_MEMBERSHIP_INACTIVE
    -- 2. No current canonical owner -> SUBJECT_UNAVAILABLE
    -- 3. Current owner disagrees with companies.user_id ->
    --    OWNERSHIP_PROJECTION_MISMATCH
    -- 4. Current canonical owner is valid but differs from submission snapshot
    --    -> OWNER_CHANGED
    -------------------------------------------------------------------------

    if not v_submitted_membership_found
       or v_member.company_id
          is distinct from v_case.company_id
       or v_member.user_id
          is distinct from v_case.submitted_by_user_id
       or v_member.membership_status <> 'active'
       or v_member.workspace_role <> 'owner' then

      v_reason := 'OWNER_MEMBERSHIP_INACTIVE';
    else
      -----------------------------------------------------------------------
      -- Load the current canonical owner only after the captured membership
      -- has been validated, so it cannot override the required reason.
      -----------------------------------------------------------------------

      select *
      into v_current_owner_membership
      from public.organization_memberships
      where company_id = v_case.company_id
        and membership_status = 'active'
        and workspace_role = 'owner'
      for update;

      if not found then
        v_reason := 'SUBJECT_UNAVAILABLE';

      elsif v_current_owner_membership.user_id
            is distinct from v_company.user_id then

        v_reason := 'OWNERSHIP_PROJECTION_MISMATCH';

      elsif v_current_owner_membership.user_id
            is distinct from v_case.submitted_by_user_id
         or v_current_owner_membership.user_id
            is distinct from v_case.submitted_company_owner_user_id then

        v_reason := 'OWNER_CHANGED';
      end if;
    end if;
  end if;


  ---------------------------------------------------------------------------
  -- Lazy invalidation
  ---------------------------------------------------------------------------

  if v_reason is not null then
    update public.representative_verification_cases
    set
      status = 'invalidated',
      decided_at = now(),
      reviewed_by_user_id = null,
      rejection_reason_code = null,
      invalidation_reason_code = v_reason
    where id = v_case.id
      and status = 'pending_review';

    insert into public.audit_logs (
      action,
      entity_type,
      entity_id,
      user_id,
      company_id,
      metadata
    )
    values (
      'REPRESENTATIVE_VERIFICATION_INVALIDATED',
      'representative_verification_case',
      v_case.id,
      v_user,
      v_case.company_id,
      jsonb_build_object(
        'case_id', v_case.id,
        'representative_user_id', v_case.representative_user_id,
        'invalidation_reason', v_reason,
        'system_enforced', true
      )
    );

    return jsonb_build_object(
      'success', false,
      'error_code', 'CASE_INVALIDATED'
    );
  end if;


  ---------------------------------------------------------------------------
  -- Valid approval
  ---------------------------------------------------------------------------

  update public.representative_verification_cases
  set
    status = 'verified',
    reviewed_by_user_id = v_user,
    decided_at = now(),
    rejection_reason_code = null,
    invalidation_reason_code = null
  where id = v_case.id
    and status = 'pending_review';

  insert into public.audit_logs (
    action,
    entity_type,
    entity_id,
    user_id,
    company_id,
    metadata
  )
  values (
    'REPRESENTATIVE_VERIFIED',
    'representative_verification_case',
    v_case.id,
    v_user,
    v_case.company_id,
    jsonb_build_object(
      'case_id', v_case.id,
      'representative_user_id', v_case.representative_user_id,
      'status', 'verified'
    )
  );

  return jsonb_build_object(
    'success', true,
    'case_id', v_case.id,
    'status', 'verified'
  );
end;
$$;


ALTER FUNCTION "public"."approve_representative_verification"("p_case_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_has_supplier_rfq_access"("p_rfq_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
  v_email text;
begin
  if v_uid is null or p_rfq_id is null then
    return false;
  end if;

  -- Prefer the authenticated identity email, then the profile email.
  -- rfq_invites.email is stored as lower(btrim(email)).
  v_email := nullif(lower(btrim(coalesce(auth.jwt() ->> 'email', ''))), '');

  if v_email is null then
    select nullif(lower(btrim(p.email)), '')
      into v_email
    from public.profiles p
    where p.id = v_uid;
  end if;

  -- Explicit invitation under the existing email-normalized rfq_invites model.
  if v_email is not null and exists (
    select 1
    from public.rfq_invites i
    where i.rfq_id = p_rfq_id
      and i.email = v_email
      and i.status in ('sent', 'invited')
  ) then
    return true;
  end if;

  -- Existing participation: the caller already quoted this RFQ for an
  -- authorized supplier/consultant company.
  if exists (
    select 1
    from public.quotes q
    join public.organization_memberships om
      on om.company_id = q.company_id
     and om.user_id = v_uid
     and om.membership_status = 'active'
     and om.procurement_function in ('supplier', 'consultant')
    where q.rfq_id = p_rfq_id
  ) then
    return true;
  end if;

  return false;
end;
$$;


ALTER FUNCTION "public"."current_user_has_supplier_rfq_access"("p_rfq_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_user_has_supplier_rfq_access"("p_rfq_id" "uuid") IS 'Boolean-only helper for restricted RFQ SELECT / quote INSERT RLS. Returns true for an explicit rfq_invites email match or existing quote participation. SECURITY DEFINER so suppliers can be authorized without a direct rfq_invites SELECT grant.';



CREATE OR REPLACE FUNCTION "public"."enforce_rfq_award_authorization"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if new.awarded_quote_id is distinct from old.awarded_quote_id
    or new.awarded_at is distinct from old.awarded_at
    or (
      new.status is distinct from old.status
      and new.status = 'awarded'
    )
  then
    if auth.uid() is not null
      and coalesce(auth.role(), '') <> 'service_role'
      and not exists (
        select 1
        from public.organization_memberships om
        where om.user_id = auth.uid()
          and om.company_id = new.company_id
          and om.membership_status = 'active'
          and om.workspace_role in ('owner', 'admin')
      )
    then
      raise exception
        using
          errcode = '42501',
          message = 'Only active workspace owners or administrators may award an RFQ.';
    end if;

    if new.awarded_quote_id is not null
      and not exists (
        select 1
        from public.quotes q
        where q.id = new.awarded_quote_id
          and q.rfq_id = new.id
      )
    then
      raise exception
        using
          errcode = '23514',
          message = 'The awarded quote must belong to the RFQ being awarded.';
    end if;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."enforce_rfq_award_authorization"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_company_representative_verification_status"("p_company_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid := auth.uid();
  v_status text;
begin
  if v_user_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'AUTHENTICATION_REQUIRED',
      'error_message', 'Authentication is required.'
    );
  end if;

  with authorized_company as (
    select c.id
    from public.companies c
    where c.id = p_company_id
      and (
        (
          c.user_id = v_user_id
          and exists (
            select 1
            from public.organization_memberships om
            where om.company_id = c.id
              and om.user_id = v_user_id
              and om.membership_status = 'active'
              and om.workspace_role = 'owner'
          )
        )
        or exists (
          select 1
          from public.organization_memberships om
          where om.company_id = c.id
            and om.user_id = v_user_id
            and om.membership_status = 'active'
            and om.workspace_role = 'admin'
        )
      )
  ),
  current_case as (
    select rvc.status
    from public.representative_verification_cases rvc
    join authorized_company ac on ac.id = rvc.company_id
    order by
      case rvc.status
        when 'verified' then 1
        when 'pending_review' then 2
        when 'rejected' then 3
        when 'invalidated' then 3
      end,
      rvc.decided_at desc nulls last,
      rvc.id desc
    limit 1
  )
  select coalesce((select status from current_case), 'unverified')
  into v_status
  from authorized_company;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error_code', 'STATUS_NOT_AUTHORIZED',
      'error_message', 'Status is not authorized.'
    );
  end if;

  return jsonb_build_object('success', true, 'status', v_status);
end;
$$;


ALTER FUNCTION "public"."get_company_representative_verification_status"("p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_organization_members"() RETURNS TABLE("membership_id" "uuid", "user_id" "uuid", "company_id" "uuid", "email" "text", "legacy_role" "text", "profile_created_at" timestamp with time zone, "workspace_role" "text", "procurement_function" "text", "membership_type" "text", "membership_status" "text", "joined_at" timestamp with time zone, "role_changed_at" timestamp with time zone, "membership_created_at" timestamp with time zone, "membership_updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
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
    om.updated_at as membership_updated_at
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


ALTER FUNCTION "public"."get_organization_members"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_rfq_invitation_context"("p_token" "text") RETURNS TABLE("invite_id" "uuid", "invite_email" "text", "invite_status" "text", "rfq_id" "uuid", "rfq_title" "text", "rfq_slug" "text", "rfq_description" "text", "rfq_category" "text", "rfq_location" "text", "rfq_budget" "text", "rfq_deadline" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select
    i.id,
    i.email,
    i.status,
    r.id,
    r.title,
    r.slug,
    r.description,
    r.category,
    r.location,
    r.budget,
    r.deadline
  from public.rfq_invites i
  join public.rfqs r
    on r.id = i.rfq_id
  where p_token is not null
    and length(p_token) >= 32
    and i.token = p_token
    and i.status in ('sent', 'invited')
    and r.status = 'open'
  limit 1;
$$;


ALTER FUNCTION "public"."get_rfq_invitation_context"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reject_company_ownership_transfer"("p_transfer_request_id" "uuid", "p_rejection_reason" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
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


ALTER FUNCTION "public"."reject_company_ownership_transfer"("p_transfer_request_id" "uuid", "p_rejection_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."reject_company_ownership_transfer"("p_transfer_request_id" "uuid", "p_rejection_reason" "text") IS 'DEV-004 / RFC-001: allows the intended recipient to reject a pending voluntary ownership-transfer request.';



CREATE OR REPLACE FUNCTION "public"."reject_representative_verification"("p_case_id" "uuid", "p_rejection_reason_code" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user uuid := auth.uid();

  v_case public.representative_verification_cases%rowtype;
  v_assignment public.internal_reviewer_assignments%rowtype;
  v_company public.companies%rowtype;
  v_member public.organization_memberships%rowtype;
  v_current_owner_membership public.organization_memberships%rowtype;

  v_reason text;
  v_submitted_membership_found boolean := false;
begin
  ---------------------------------------------------------------------------
  -- Authentication
  ---------------------------------------------------------------------------

  if v_user is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'AUTHENTICATION_REQUIRED'
    );
  end if;


  ---------------------------------------------------------------------------
  -- Reviewer authorization
  ---------------------------------------------------------------------------

  select *
  into v_assignment
  from public.internal_reviewer_assignments
  where reviewer_user_id = v_user
    and capability = 'representative_verification.review'
    and status = 'active'
  for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error_code', 'REVIEWER_NOT_AUTHORIZED'
    );
  end if;


  ---------------------------------------------------------------------------
  -- Rejection-reason boundary
  ---------------------------------------------------------------------------

  if p_rejection_reason_code
     is distinct from 'REPRESENTATIVE_AUTHORITY_NOT_CONFIRMED' then

    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_REJECTION_REASON'
    );
  end if;


  ---------------------------------------------------------------------------
  -- Case lock and lifecycle
  ---------------------------------------------------------------------------

  select *
  into v_case
  from public.representative_verification_cases
  where id = p_case_id
  for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error_code', 'CASE_NOT_FOUND'
    );
  end if;

  if v_case.status = 'rejected' then
    if v_case.rejection_reason_code = p_rejection_reason_code then
      return jsonb_build_object(
        'success', true,
        'case_id', v_case.id,
        'status', 'rejected',
        'idempotent', true
      );
    end if;

    return jsonb_build_object(
      'success', false,
      'error_code', 'CASE_REJECTION_CONFLICT'
    );
  end if;

  if v_case.status = 'invalidated' then
    return jsonb_build_object(
      'success', false,
      'error_code', 'CASE_INVALIDATED'
    );
  end if;

  if v_case.status <> 'pending_review' then
    return jsonb_build_object(
      'success', false,
      'error_code', 'CASE_NOT_PENDING'
    );
  end if;


  ---------------------------------------------------------------------------
  -- Company lock and subject availability
  ---------------------------------------------------------------------------

  select *
  into v_company
  from public.companies
  where id = v_case.company_id
  for update;

  if not found
     or not exists (
       select 1
       from public.profiles
       where id = v_case.representative_user_id
     )
     or not exists (
       select 1
       from public.profiles
       where id = v_case.submitted_by_user_id
     ) then

    v_reason := 'SUBJECT_UNAVAILABLE';

  else
    -------------------------------------------------------------------------
    -- Lock submission-time membership plus current owner membership in
    -- deterministic user_id/id order.
    -------------------------------------------------------------------------

    perform 1
    from public.organization_memberships
    where id = v_case.submitted_owner_membership_id
       or (
         company_id = v_case.company_id
         and membership_status = 'active'
         and workspace_role = 'owner'
       )
    order by user_id, id
    for update;


    -------------------------------------------------------------------------
    -- Load captured submission-time owner membership.
    -------------------------------------------------------------------------

    select *
    into v_member
    from public.organization_memberships
    where id = v_case.submitted_owner_membership_id
    for update;

    v_submitted_membership_found := found;


    -------------------------------------------------------------------------
    -- Same invalidation precedence as approval.
    -------------------------------------------------------------------------

    if not v_submitted_membership_found
       or v_member.company_id
          is distinct from v_case.company_id
       or v_member.user_id
          is distinct from v_case.submitted_by_user_id
       or v_member.membership_status <> 'active'
       or v_member.workspace_role <> 'owner' then

      v_reason := 'OWNER_MEMBERSHIP_INACTIVE';
    else
      select *
      into v_current_owner_membership
      from public.organization_memberships
      where company_id = v_case.company_id
        and membership_status = 'active'
        and workspace_role = 'owner'
      for update;

      if not found then
        v_reason := 'SUBJECT_UNAVAILABLE';

      elsif v_current_owner_membership.user_id
            is distinct from v_company.user_id then

        v_reason := 'OWNERSHIP_PROJECTION_MISMATCH';

      elsif v_current_owner_membership.user_id
            is distinct from v_case.submitted_by_user_id
         or v_current_owner_membership.user_id
            is distinct from v_case.submitted_company_owner_user_id then

        v_reason := 'OWNER_CHANGED';
      end if;
    end if;
  end if;


  ---------------------------------------------------------------------------
  -- Lazy invalidation
  ---------------------------------------------------------------------------

  if v_reason is not null then
    update public.representative_verification_cases
    set
      status = 'invalidated',
      decided_at = now(),
      reviewed_by_user_id = null,
      rejection_reason_code = null,
      invalidation_reason_code = v_reason
    where id = v_case.id
      and status = 'pending_review';

    insert into public.audit_logs (
      action,
      entity_type,
      entity_id,
      user_id,
      company_id,
      metadata
    )
    values (
      'REPRESENTATIVE_VERIFICATION_INVALIDATED',
      'representative_verification_case',
      v_case.id,
      v_user,
      v_case.company_id,
      jsonb_build_object(
        'case_id', v_case.id,
        'representative_user_id', v_case.representative_user_id,
        'invalidation_reason', v_reason,
        'system_enforced', true
      )
    );

    return jsonb_build_object(
      'success', false,
      'error_code', 'CASE_INVALIDATED'
    );
  end if;


  ---------------------------------------------------------------------------
  -- Valid rejection
  ---------------------------------------------------------------------------

  update public.representative_verification_cases
  set
    status = 'rejected',
    reviewed_by_user_id = v_user,
    decided_at = now(),
    rejection_reason_code = 'REPRESENTATIVE_AUTHORITY_NOT_CONFIRMED',
    invalidation_reason_code = null
  where id = v_case.id
    and status = 'pending_review';

  insert into public.audit_logs (
    action,
    entity_type,
    entity_id,
    user_id,
    company_id,
    metadata
  )
  values (
    'REPRESENTATIVE_VERIFICATION_REJECTED',
    'representative_verification_case',
    v_case.id,
    v_user,
    v_case.company_id,
    jsonb_build_object(
      'case_id', v_case.id,
      'representative_user_id', v_case.representative_user_id,
      'rejection_reason_code',
        'REPRESENTATIVE_AUTHORITY_NOT_CONFIRMED',
      'status', 'rejected'
    )
  );

  return jsonb_build_object(
    'success', true,
    'case_id', v_case.id,
    'status', 'rejected'
  );
end;
$$;


ALTER FUNCTION "public"."reject_representative_verification"("p_case_id" "uuid", "p_rejection_reason_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."remove_organization_member"("target_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
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
      'previous_workspace_role', target_membership.workspace_role,
      'procurement_function', target_membership.procurement_function,
      'membership_type', target_membership.membership_type,
      'previous_membership_status', target_membership.membership_status,
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


ALTER FUNCTION "public"."remove_organization_member"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."request_company_ownership_transfer"("target_user_id" "uuid", "previous_owner_next_role" "text" DEFAULT 'admin'::"text", "transfer_reason" "text" DEFAULT NULL::"text", "expires_in_hours" integer DEFAULT 72) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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

  -- Non-locking preflight prevents unauthorized callers from locking a company.
  select * into actor_membership from public.organization_memberships
  where user_id = actor_user_id and company_id = actor_profile.company_id
    and membership_status = 'active' and workspace_role = 'owner';
  if not found then
    return jsonb_build_object('success', false, 'error_code', 'OWNER_MEMBERSHIP_REQUIRED', 'error_message', 'An active owner workspace membership is required.');
  end if;

  -- Shared ownership-state hierarchy: company, then memberships by user_id, id.
  select * into company_record from public.companies
  where id = actor_profile.company_id for update;
  if not found then
    return jsonb_build_object('success', false, 'error_code', 'COMPANY_NOT_FOUND', 'error_message', 'The company could not be found.');
  end if;
  perform 1 from public.organization_memberships
  where company_id = company_record.id and user_id in (actor_user_id, target_user_id)
  order by user_id, id
  for update;
  select * into actor_membership from public.organization_memberships
  where user_id = actor_user_id and company_id = company_record.id
    and membership_status = 'active' and workspace_role = 'owner';
  if not found then
    return jsonb_build_object('success', false, 'error_code', 'OWNER_MEMBERSHIP_REQUIRED', 'error_message', 'An active owner workspace membership is required.');
  end if;
  if company_record.user_id is distinct from actor_user_id then
    return jsonb_build_object('success', false, 'error_code', 'OWNER_STATE_INCONSISTENT', 'error_message', 'Canonical ownership and legacy ownership projections are inconsistent.');
  end if;
  select * into target_membership from public.organization_memberships
  where user_id = target_user_id and company_id = company_record.id;
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
    where company_id = company_record.id
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
    where company_id = company_record.id and status = 'pending_acceptance'
  ) then
    return jsonb_build_object('success', false, 'error_code', 'PENDING_TRANSFER_EXISTS', 'error_message', 'This company already has a pending ownership-transfer request.');
  end if;
  insert into public.ownership_transfer_requests (
    company_id, from_user_id, to_user_id, status, previous_owner_next_role,
    transfer_reason, requested_at, expires_at, created_at, updated_at
  ) values (
    company_record.id, actor_user_id, target_user_id, 'pending_acceptance',
    normalized_next_role, normalized_reason, requested_timestamp, expiration_timestamp,
    requested_timestamp, requested_timestamp
  ) returning * into transfer_request;
  insert into public.audit_logs (action, entity_type, entity_id, user_id, company_id, metadata)
  values (
    'OWNERSHIP_TRANSFER_REQUESTED', 'ownership_transfer_request', transfer_request.id,
    actor_user_id, company_record.id,
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


ALTER FUNCTION "public"."request_company_ownership_transfer"("target_user_id" "uuid", "previous_owner_next_role" "text", "transfer_reason" "text", "expires_in_hours" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_representative_verification"("p_company_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid := auth.uid(); v_profile public.profiles%rowtype;
  v_membership public.organization_memberships%rowtype; v_company public.companies%rowtype;
  v_case public.representative_verification_cases%rowtype; v_constraint_name text;
begin
  if v_user_id is null then return jsonb_build_object('success',false,'error_code','AUTHENTICATION_REQUIRED','error_message','Authentication is required.'); end if;
  select * into v_profile from public.profiles where id = v_user_id;
  if not found then return jsonb_build_object('success',false,'error_code','SUBMISSION_NOT_AUTHORIZED','error_message','Submission is not authorized.'); end if;

  -- Non-locking preflight prevents unauthorized callers from locking a company.
  select * into v_membership from public.organization_memberships where user_id=v_user_id and company_id=p_company_id and membership_status='active' and workspace_role='owner';
  if not found then return jsonb_build_object('success',false,'error_code','SUBMISSION_NOT_AUTHORIZED','error_message','An active canonical owner membership is required.'); end if;

  -- Shared ownership-state hierarchy: company, then memberships.
  select * into v_company from public.companies where id = p_company_id for update;
  if not found then return jsonb_build_object('success',false,'error_code','SUBMISSION_NOT_AUTHORIZED','error_message','Submission is not authorized.'); end if;
  select * into v_membership from public.organization_memberships where user_id=v_user_id and company_id=p_company_id and membership_status='active' and workspace_role='owner' for update;
  if not found then return jsonb_build_object('success',false,'error_code','SUBMISSION_NOT_AUTHORIZED','error_message','An active canonical owner membership is required.'); end if;
  if v_company.user_id is distinct from v_user_id then return jsonb_build_object('success',false,'error_code','OWNERSHIP_STATE_INCONSISTENT','error_message','Canonical ownership and company projection are inconsistent.'); end if;
  if exists (select 1 from public.representative_verification_cases where company_id=p_company_id and representative_user_id=v_user_id and status='verified') then return jsonb_build_object('success',false,'error_code','ALREADY_VERIFIED','error_message','The representative is already verified.'); end if;
  insert into public.representative_verification_cases(company_id,representative_user_id,submitted_by_user_id,submitted_owner_membership_id,submitted_company_owner_user_id,status,submitted_at)
  values(p_company_id,v_user_id,v_user_id,v_membership.id,v_company.user_id,'pending_review',now()) returning * into v_case;
  insert into public.audit_logs(action,entity_type,entity_id,user_id,company_id,metadata)
  values('REPRESENTATIVE_VERIFICATION_SUBMITTED','representative_verification_case',v_case.id,v_user_id,p_company_id,jsonb_build_object('case_id',v_case.id,'representative_user_id',v_user_id,'status','pending_review'));
  return jsonb_build_object('success',true,'case_id',v_case.id,'status','pending_review');
exception when unique_violation then
  get stacked diagnostics v_constraint_name = constraint_name;
  if v_constraint_name = 'representative_verification_cases_one_pending_per_subject' then
    return jsonb_build_object('success',false,'error_code','DUPLICATE_PENDING_CASE','error_message','A pending verification case already exists.');
  end if;
  return jsonb_build_object('success',false,'error_code','SUBMISSION_NOT_AUTHORIZED','error_message','The verification submission could not be completed.');
end; $$;


ALTER FUNCTION "public"."submit_representative_verification"("p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_organization_member_role"("target_user_id" "uuid", "next_workspace_role" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."update_organization_member_role"("target_user_id" "uuid", "next_workspace_role" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "action" "text",
    "entity_type" "text",
    "entity_id" "uuid",
    "user_id" "uuid",
    "company_id" "uuid",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."companies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text",
    "category" "text",
    "location" "text",
    "network_role" "text",
    "status" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "logo_url" "text",
    "workspace_status" "text" DEFAULT 'active'::"text" NOT NULL,
    CONSTRAINT "companies_workspace_status_check" CHECK (("workspace_status" = ANY (ARRAY['setup'::"text", 'active'::"text", 'restricted'::"text", 'suspended'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."companies" OWNER TO "postgres";


COMMENT ON COLUMN "public"."companies"."workspace_status" IS 'Operational lifecycle state of the company workspace. Separate from companies.status, which currently represents organization verification state.';



CREATE TABLE IF NOT EXISTS "public"."internal_reviewer_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reviewer_user_id" "uuid" NOT NULL,
    "capability" "text" DEFAULT 'representative_verification.review'::"text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "granted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "granted_by_user_id" "uuid",
    "revoked_at" timestamp with time zone,
    "revoked_by_user_id" "uuid",
    "reason_reference" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "internal_reviewer_assignments_capability_check" CHECK (("capability" = 'representative_verification.review'::"text")),
    CONSTRAINT "internal_reviewer_assignments_check" CHECK (((("status" = 'active'::"text") AND ("revoked_at" IS NULL) AND ("revoked_by_user_id" IS NULL)) OR (("status" = 'revoked'::"text") AND ("revoked_at" IS NOT NULL)))),
    CONSTRAINT "internal_reviewer_assignments_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'revoked'::"text"])))
);


ALTER TABLE "public"."internal_reviewer_assignments" OWNER TO "postgres";


COMMENT ON TABLE "public"."internal_reviewer_assignments" IS 'Platform-scoped internal reviewer capability assignments. Client roles have no access; future protected commands must check active assignment at decision time.';



COMMENT ON COLUMN "public"."internal_reviewer_assignments"."reason_reference" IS 'Optional non-sensitive grant or revocation reference. Never store credentials, tokens, contact data, or reviewer notes.';



CREATE TABLE IF NOT EXISTS "public"."invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" DEFAULT 'vendor'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "token" "text" DEFAULT "encode"("extensions"."gen_random_bytes"(32), 'hex'::"text") NOT NULL,
    "invited_by" "uuid",
    "accepted_by" "uuid",
    "accepted_at" timestamp with time zone,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text",
    "message" "text",
    "type" "text",
    "is_read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_memberships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "workspace_role" "text" DEFAULT 'member'::"text" NOT NULL,
    "membership_type" "text" DEFAULT 'employee'::"text" NOT NULL,
    "membership_status" "text" DEFAULT 'active'::"text" NOT NULL,
    "job_title" "text",
    "job_function" "text",
    "invited_by" "uuid",
    "joined_at" timestamp with time zone,
    "role_changed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "procurement_function" "text" DEFAULT 'none'::"text" NOT NULL,
    CONSTRAINT "organization_memberships_membership_status_check" CHECK (("membership_status" = ANY (ARRAY['pending'::"text", 'active'::"text", 'suspended'::"text", 'revoked'::"text"]))),
    CONSTRAINT "organization_memberships_membership_type_check" CHECK (("membership_type" = ANY (ARRAY['founder'::"text", 'employee'::"text", 'external_consultant'::"text", 'procurement_agent'::"text", 'temporary_staff'::"text"]))),
    CONSTRAINT "organization_memberships_procurement_function_check" CHECK (("procurement_function" = ANY (ARRAY['buyer'::"text", 'supplier'::"text", 'consultant'::"text", 'none'::"text"]))),
    CONSTRAINT "organization_memberships_workspace_role_check" CHECK (("workspace_role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'member'::"text", 'viewer'::"text"])))
);


ALTER TABLE "public"."organization_memberships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ownership_transfer_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "from_user_id" "uuid" NOT NULL,
    "to_user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending_acceptance'::"text" NOT NULL,
    "previous_owner_next_role" "text" DEFAULT 'admin'::"text" NOT NULL,
    "transfer_reason" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "requested_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "accepted_at" timestamp with time zone,
    "rejected_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    "expired_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ownership_transfer_acceptance_order_check" CHECK ((("accepted_at" IS NULL) OR ("accepted_at" >= "requested_at"))),
    CONSTRAINT "ownership_transfer_completion_order_check" CHECK ((("completed_at" IS NULL) OR (("accepted_at" IS NOT NULL) AND ("completed_at" >= "accepted_at")))),
    CONSTRAINT "ownership_transfer_different_users_check" CHECK (("from_user_id" <> "to_user_id")),
    CONSTRAINT "ownership_transfer_expiration_check" CHECK (("expires_at" > "requested_at")),
    CONSTRAINT "ownership_transfer_requests_previous_owner_next_role_check" CHECK (("previous_owner_next_role" = ANY (ARRAY['admin'::"text", 'member'::"text", 'viewer'::"text"]))),
    CONSTRAINT "ownership_transfer_requests_status_check" CHECK (("status" = ANY (ARRAY['pending_acceptance'::"text", 'rejected'::"text", 'cancelled'::"text", 'expired'::"text", 'completed'::"text"]))),
    CONSTRAINT "ownership_transfer_status_timestamps_check" CHECK (((("status" = 'pending_acceptance'::"text") AND ("accepted_at" IS NULL) AND ("rejected_at" IS NULL) AND ("cancelled_at" IS NULL) AND ("expired_at" IS NULL) AND ("completed_at" IS NULL)) OR (("status" = 'rejected'::"text") AND ("accepted_at" IS NULL) AND ("rejected_at" IS NOT NULL) AND ("cancelled_at" IS NULL) AND ("expired_at" IS NULL) AND ("completed_at" IS NULL)) OR (("status" = 'cancelled'::"text") AND ("accepted_at" IS NULL) AND ("rejected_at" IS NULL) AND ("cancelled_at" IS NOT NULL) AND ("expired_at" IS NULL) AND ("completed_at" IS NULL)) OR (("status" = 'expired'::"text") AND ("accepted_at" IS NULL) AND ("rejected_at" IS NULL) AND ("cancelled_at" IS NULL) AND ("expired_at" IS NOT NULL) AND ("completed_at" IS NULL)) OR (("status" = 'completed'::"text") AND ("accepted_at" IS NOT NULL) AND ("rejected_at" IS NULL) AND ("cancelled_at" IS NULL) AND ("expired_at" IS NULL) AND ("completed_at" IS NOT NULL)))),
    CONSTRAINT "ownership_transfer_terminal_time_check" CHECK (((("rejected_at" IS NULL) OR ("rejected_at" >= "requested_at")) AND (("cancelled_at" IS NULL) OR ("cancelled_at" >= "requested_at")) AND (("expired_at" IS NULL) OR ("expired_at" >= "requested_at"))))
);


ALTER TABLE "public"."ownership_transfer_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text",
    "role" "text" DEFAULT 'buyer'::"text",
    "company_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quotes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "rfq_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "amount" numeric,
    "timeline" "text",
    "message" "text",
    "status" "text" DEFAULT 'submitted'::"text" NOT NULL,
    "score" numeric,
    "decision" "text" DEFAULT 'pending'::"text" NOT NULL,
    "awarded_at" timestamp with time zone,
    "validity_days" integer DEFAULT 30 NOT NULL,
    CONSTRAINT "quotes_amount_check" CHECK ((("amount" IS NULL) OR ("amount" >= (0)::numeric))),
    CONSTRAINT "quotes_validity_days_check" CHECK (("validity_days" = ANY (ARRAY[30, 60, 90, 120])))
);


ALTER TABLE "public"."quotes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."representative_verification_cases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "representative_user_id" "uuid" NOT NULL,
    "submitted_by_user_id" "uuid" NOT NULL,
    "submitted_owner_membership_id" "uuid",
    "submitted_company_owner_user_id" "uuid",
    "status" "text" NOT NULL,
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reviewed_by_user_id" "uuid",
    "decided_at" timestamp with time zone,
    "rejection_reason_code" "text",
    "invalidation_reason_code" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "representative_verification_case_invalidation_reason_code_check" CHECK (("invalidation_reason_code" = ANY (ARRAY['OWNER_CHANGED'::"text", 'OWNER_MEMBERSHIP_INACTIVE'::"text", 'OWNERSHIP_PROJECTION_MISMATCH'::"text", 'SUBJECT_UNAVAILABLE'::"text"]))),
    CONSTRAINT "representative_verification_cases_check" CHECK (((("status" = 'pending_review'::"text") AND ("decided_at" IS NULL) AND ("reviewed_by_user_id" IS NULL) AND ("rejection_reason_code" IS NULL) AND ("invalidation_reason_code" IS NULL)) OR (("status" = 'verified'::"text") AND ("decided_at" IS NOT NULL) AND ("reviewed_by_user_id" IS NOT NULL) AND ("rejection_reason_code" IS NULL) AND ("invalidation_reason_code" IS NULL)) OR (("status" = 'rejected'::"text") AND ("decided_at" IS NOT NULL) AND ("reviewed_by_user_id" IS NOT NULL) AND ("rejection_reason_code" IS NOT NULL) AND ("invalidation_reason_code" IS NULL)) OR (("status" = 'invalidated'::"text") AND ("decided_at" IS NOT NULL) AND ("rejection_reason_code" IS NULL) AND ("invalidation_reason_code" IS NOT NULL)))),
    CONSTRAINT "representative_verification_cases_rejection_reason_code_check" CHECK (("rejection_reason_code" = 'REPRESENTATIVE_AUTHORITY_NOT_CONFIRMED'::"text")),
    CONSTRAINT "representative_verification_cases_status_check" CHECK (("status" = ANY (ARRAY['pending_review'::"text", 'verified'::"text", 'rejected'::"text", 'invalidated'::"text"])))
);


ALTER TABLE "public"."representative_verification_cases" OWNER TO "postgres";


COMMENT ON TABLE "public"."representative_verification_cases" IS 'Section 4 metadata-only persistence. Lifecycle writes and audits belong to future protected commands.';



CREATE TABLE IF NOT EXISTS "public"."rfq_ai_reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rfq_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "created_by" "uuid",
    "readiness_score" integer DEFAULT 0 NOT NULL,
    "risk_level" "text" DEFAULT 'medium'::"text" NOT NULL,
    "executive_summary" "text",
    "missing_items" "text",
    "recommendations" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "rfq_ai_reviews_readiness_score_check" CHECK ((("readiness_score" >= 0) AND ("readiness_score" <= 100))),
    CONSTRAINT "rfq_ai_reviews_risk_level_check" CHECK (("risk_level" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'critical'::"text"])))
);


ALTER TABLE "public"."rfq_ai_reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rfq_invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rfq_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "token" "text" NOT NULL,
    "status" "text" DEFAULT 'sent'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "rfq_invites_email_normalized_check" CHECK (("email" = "lower"("btrim"("email")))),
    CONSTRAINT "rfq_invites_token_length_check" CHECK (("length"("token") >= 32))
);


ALTER TABLE "public"."rfq_invites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rfqs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "title" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "category" "text",
    "location" "text",
    "budget" "text",
    "deadline" "text" NOT NULL,
    "status" "text" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "awarded_quote_id" "uuid",
    "awarded_at" timestamp with time zone,
    "procurement_scope" "text" DEFAULT 'subcontractor'::"text" NOT NULL,
    "sourcing_method" "text" DEFAULT 'invited'::"text" NOT NULL,
    "contract_framework" "text" DEFAULT 'project_specific'::"text" NOT NULL,
    "project_name" "text",
    "owner_client" "text",
    "internal_project_id" "text",
    "rfi_deadline" timestamp with time zone,
    "mobilization_date" "date",
    "substantial_completion_date" "date",
    "bid_model" "text" DEFAULT 'lump_sum'::"text",
    "nda_required" boolean DEFAULT false NOT NULL,
    "performance_bond_required" boolean DEFAULT false NOT NULL,
    "bid_bond_required" boolean DEFAULT false NOT NULL,
    "insurance_required" boolean DEFAULT false NOT NULL,
    "insurance_notes" "text",
    "safety_requirements" "text",
    "prequalification_notes" "text",
    "advanced_controls_enabled" boolean DEFAULT false NOT NULL,
    "deadline_timezone" "text" DEFAULT 'America/Toronto'::"text",
    "rfi_deadline_timezone" "text" DEFAULT 'America/Toronto'::"text",
    CONSTRAINT "rfqs_contract_framework_check" CHECK (("contract_framework" = ANY (ARRAY['project_specific'::"text", 'framework'::"text"]))),
    CONSTRAINT "rfqs_procurement_scope_check" CHECK (("procurement_scope" = ANY (ARRAY['material'::"text", 'subcontractor'::"text", 'equipment'::"text", 'professional_service'::"text"]))),
    CONSTRAINT "rfqs_sourcing_method_check" CHECK (("sourcing_method" = ANY (ARRAY['open'::"text", 'invited'::"text", 'sealed_bid'::"text"])))
);


ALTER TABLE "public"."rfqs" OWNER TO "postgres";


ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."internal_reviewer_assignments"
    ADD CONSTRAINT "internal_reviewer_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_memberships"
    ADD CONSTRAINT "organization_memberships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_memberships"
    ADD CONSTRAINT "organization_memberships_user_company_key" UNIQUE ("user_id", "company_id");



ALTER TABLE ONLY "public"."ownership_transfer_requests"
    ADD CONSTRAINT "ownership_transfer_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_rfq_company_key" UNIQUE ("rfq_id", "company_id");



ALTER TABLE ONLY "public"."representative_verification_cases"
    ADD CONSTRAINT "representative_verification_cases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rfq_ai_reviews"
    ADD CONSTRAINT "rfq_ai_reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rfq_invites"
    ADD CONSTRAINT "rfq_invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rfq_invites"
    ADD CONSTRAINT "rfq_invites_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."rfqs"
    ADD CONSTRAINT "rfqs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rfqs"
    ADD CONSTRAINT "rfqs_slug_key" UNIQUE ("slug");



CREATE UNIQUE INDEX "internal_reviewer_assignments_one_active_capability" ON "public"."internal_reviewer_assignments" USING "btree" ("reviewer_user_id", "capability") WHERE ("status" = 'active'::"text");



CREATE INDEX "organization_memberships_active_company_idx" ON "public"."organization_memberships" USING "btree" ("company_id", "membership_status");



CREATE INDEX "organization_memberships_company_id_idx" ON "public"."organization_memberships" USING "btree" ("company_id");



CREATE UNIQUE INDEX "organization_memberships_one_active_owner_per_company" ON "public"."organization_memberships" USING "btree" ("company_id") WHERE (("workspace_role" = 'owner'::"text") AND ("membership_status" = 'active'::"text"));



CREATE INDEX "organization_memberships_user_id_idx" ON "public"."organization_memberships" USING "btree" ("user_id");



CREATE INDEX "ownership_transfer_requests_company_history_idx" ON "public"."ownership_transfer_requests" USING "btree" ("company_id", "created_at" DESC);



CREATE UNIQUE INDEX "ownership_transfer_requests_one_pending_per_company" ON "public"."ownership_transfer_requests" USING "btree" ("company_id") WHERE ("status" = 'pending_acceptance'::"text");



CREATE INDEX "ownership_transfer_requests_recipient_pending_idx" ON "public"."ownership_transfer_requests" USING "btree" ("to_user_id", "expires_at") WHERE ("status" = 'pending_acceptance'::"text");



CREATE INDEX "ownership_transfer_requests_sender_history_idx" ON "public"."ownership_transfer_requests" USING "btree" ("from_user_id", "created_at" DESC);



CREATE INDEX "quotes_company_id_idx" ON "public"."quotes" USING "btree" ("company_id");



CREATE INDEX "quotes_rfq_id_idx" ON "public"."quotes" USING "btree" ("rfq_id");



CREATE UNIQUE INDEX "representative_verification_cases_one_pending_per_subject" ON "public"."representative_verification_cases" USING "btree" ("company_id", "representative_user_id") WHERE ("status" = 'pending_review'::"text");



CREATE INDEX "rfq_ai_reviews_rfq_id_idx" ON "public"."rfq_ai_reviews" USING "btree" ("rfq_id");



CREATE UNIQUE INDEX "rfq_invites_rfq_email_key" ON "public"."rfq_invites" USING "btree" ("rfq_id", "lower"("email"));



CREATE INDEX "rfq_invites_rfq_id_idx" ON "public"."rfq_invites" USING "btree" ("rfq_id");



CREATE INDEX "rfqs_company_id_idx" ON "public"."rfqs" USING "btree" ("company_id");



CREATE INDEX "rfqs_status_deadline_idx" ON "public"."rfqs" USING "btree" ("status", "deadline");



CREATE OR REPLACE TRIGGER "enforce_rfq_award_authorization_trigger" BEFORE UPDATE ON "public"."rfqs" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_rfq_award_authorization"();



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."internal_reviewer_assignments"
    ADD CONSTRAINT "internal_reviewer_assignments_granted_by_user_id_fkey" FOREIGN KEY ("granted_by_user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."internal_reviewer_assignments"
    ADD CONSTRAINT "internal_reviewer_assignments_reviewer_user_id_fkey" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."internal_reviewer_assignments"
    ADD CONSTRAINT "internal_reviewer_assignments_revoked_by_user_id_fkey" FOREIGN KEY ("revoked_by_user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_accepted_by_fkey" FOREIGN KEY ("accepted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."organization_memberships"
    ADD CONSTRAINT "organization_memberships_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_memberships"
    ADD CONSTRAINT "organization_memberships_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."organization_memberships"
    ADD CONSTRAINT "organization_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ownership_transfer_requests"
    ADD CONSTRAINT "ownership_transfer_requests_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ownership_transfer_requests"
    ADD CONSTRAINT "ownership_transfer_requests_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."ownership_transfer_requests"
    ADD CONSTRAINT "ownership_transfer_requests_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_rfq_id_fkey" FOREIGN KEY ("rfq_id") REFERENCES "public"."rfqs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."representative_verification_cases"
    ADD CONSTRAINT "representative_verification_c_submitted_company_owner_user_fkey" FOREIGN KEY ("submitted_company_owner_user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."representative_verification_cases"
    ADD CONSTRAINT "representative_verification_c_submitted_owner_membership_i_fkey" FOREIGN KEY ("submitted_owner_membership_id") REFERENCES "public"."organization_memberships"("id");



ALTER TABLE ONLY "public"."representative_verification_cases"
    ADD CONSTRAINT "representative_verification_cases_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."representative_verification_cases"
    ADD CONSTRAINT "representative_verification_cases_representative_user_id_fkey" FOREIGN KEY ("representative_user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."representative_verification_cases"
    ADD CONSTRAINT "representative_verification_cases_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."representative_verification_cases"
    ADD CONSTRAINT "representative_verification_cases_submitted_by_user_id_fkey" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."rfq_ai_reviews"
    ADD CONSTRAINT "rfq_ai_reviews_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rfq_ai_reviews"
    ADD CONSTRAINT "rfq_ai_reviews_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."rfq_ai_reviews"
    ADD CONSTRAINT "rfq_ai_reviews_rfq_id_fkey" FOREIGN KEY ("rfq_id") REFERENCES "public"."rfqs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rfq_invites"
    ADD CONSTRAINT "rfq_invites_rfq_id_fkey" FOREIGN KEY ("rfq_id") REFERENCES "public"."rfqs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rfqs"
    ADD CONSTRAINT "rfqs_awarded_quote_id_fkey" FOREIGN KEY ("awarded_quote_id") REFERENCES "public"."quotes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."rfqs"
    ADD CONSTRAINT "rfqs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."rfqs"
    ADD CONSTRAINT "rfqs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



CREATE POLICY "Authenticated users can create own company" ON "public"."companies" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() IS NOT NULL) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Authenticated users can read own profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Authenticated users can read permitted RFQs" ON "public"."rfqs" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."organization_memberships" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."company_id" = "rfqs"."company_id") AND ("om"."membership_status" = 'active'::"text")))) OR (("status" = 'open'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."organization_memberships" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."membership_status" = 'active'::"text") AND ("om"."procurement_function" = ANY (ARRAY['supplier'::"text", 'consultant'::"text"]))))) AND (("sourcing_method" = 'open'::"text") OR "public"."current_user_has_supplier_rfq_access"("id")))));



CREATE POLICY "Buyer members can create company RFQ AI reviews" ON "public"."rfq_ai_reviews" FOR INSERT TO "authenticated" WITH CHECK ((("created_by" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."organization_memberships" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."company_id" = "rfq_ai_reviews"."company_id") AND ("om"."membership_status" = 'active'::"text") AND (("om"."workspace_role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) OR ("om"."procurement_function" = 'buyer'::"text"))))) AND (EXISTS ( SELECT 1
   FROM "public"."rfqs" "r"
  WHERE (("r"."id" = "rfq_ai_reviews"."rfq_id") AND ("r"."company_id" = "rfq_ai_reviews"."company_id"))))));



CREATE POLICY "Buyer members can create company RFQ invitations" ON "public"."rfq_invites" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."rfqs" "r"
     JOIN "public"."organization_memberships" "om" ON (("om"."company_id" = "r"."company_id")))
  WHERE (("r"."id" = "rfq_invites"."rfq_id") AND ("r"."status" = 'open'::"text") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."membership_status" = 'active'::"text") AND (("om"."workspace_role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) OR ("om"."procurement_function" = 'buyer'::"text"))))));



CREATE POLICY "Buyer members can create company RFQs" ON "public"."rfqs" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."organization_memberships" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."company_id" = "rfqs"."company_id") AND ("om"."membership_status" = 'active'::"text") AND (("om"."workspace_role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) OR ("om"."procurement_function" = 'buyer'::"text")))))));



CREATE POLICY "Buyer members can read company RFQ AI reviews" ON "public"."rfq_ai_reviews" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_memberships" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."company_id" = "rfq_ai_reviews"."company_id") AND ("om"."membership_status" = 'active'::"text") AND (("om"."workspace_role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) OR ("om"."procurement_function" = 'buyer'::"text"))))));



CREATE POLICY "Buyer members can read company RFQ invitations" ON "public"."rfq_invites" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."rfqs" "r"
     JOIN "public"."organization_memberships" "om" ON (("om"."company_id" = "r"."company_id")))
  WHERE (("r"."id" = "rfq_invites"."rfq_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."membership_status" = 'active'::"text") AND (("om"."workspace_role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) OR ("om"."procurement_function" = 'buyer'::"text"))))));



CREATE POLICY "Buyer members can update company RFQs" ON "public"."rfqs" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_memberships" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."company_id" = "rfqs"."company_id") AND ("om"."membership_status" = 'active'::"text") AND (("om"."workspace_role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) OR ("om"."procurement_function" = 'buyer'::"text")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."organization_memberships" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."company_id" = "rfqs"."company_id") AND ("om"."membership_status" = 'active'::"text") AND (("om"."workspace_role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) OR ("om"."procurement_function" = 'buyer'::"text"))))));



CREATE POLICY "Company members can read permitted quotes" ON "public"."quotes" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."organization_memberships" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."company_id" = "quotes"."company_id") AND ("om"."membership_status" = 'active'::"text")))) OR (EXISTS ( SELECT 1
   FROM ("public"."rfqs" "r"
     JOIN "public"."organization_memberships" "om" ON (("om"."company_id" = "r"."company_id")))
  WHERE (("r"."id" = "quotes"."rfq_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."membership_status" = 'active'::"text") AND (("om"."workspace_role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) OR ("om"."procurement_function" = 'buyer'::"text")))))));



CREATE POLICY "Company owners and admins can delete company" ON "public"."companies" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_memberships" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."company_id" = "companies"."id") AND ("om"."membership_status" = 'active'::"text") AND ("om"."workspace_role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Company owners and admins can update company" ON "public"."companies" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_memberships" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."company_id" = "companies"."id") AND ("om"."membership_status" = 'active'::"text") AND ("om"."workspace_role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."organization_memberships" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."company_id" = "companies"."id") AND ("om"."membership_status" = 'active'::"text") AND ("om"."workspace_role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Public can read companies" ON "public"."companies" FOR SELECT USING (true);



CREATE POLICY "Supplier members can submit company quotes" ON "public"."quotes" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."organization_memberships" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."company_id" = "quotes"."company_id") AND ("om"."membership_status" = 'active'::"text") AND ("om"."procurement_function" = 'supplier'::"text")))) AND (EXISTS ( SELECT 1
   FROM "public"."rfqs" "r"
  WHERE (("r"."id" = "quotes"."rfq_id") AND ("r"."status" = 'open'::"text") AND ("r"."company_id" <> "quotes"."company_id") AND (("r"."sourcing_method" = 'open'::"text") OR "public"."current_user_has_supplier_rfq_access"("quotes"."rfq_id")))))));



CREATE POLICY "Transfer participants can read ownership transfer requests" ON "public"."ownership_transfer_requests" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "from_user_id") OR ("auth"."uid"() = "to_user_id")));



CREATE POLICY "Users can read own organization memberships" ON "public"."organization_memberships" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Workspace administrators can delete company RFQs" ON "public"."rfqs" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_memberships" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."company_id" = "rfqs"."company_id") AND ("om"."membership_status" = 'active'::"text") AND ("om"."workspace_role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Workspace administrators can update RFQ quote decisions" ON "public"."quotes" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."rfqs" "r"
     JOIN "public"."organization_memberships" "om" ON (("om"."company_id" = "r"."company_id")))
  WHERE (("r"."id" = "quotes"."rfq_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."membership_status" = 'active'::"text") AND ("om"."workspace_role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."rfqs" "r"
     JOIN "public"."organization_memberships" "om" ON (("om"."company_id" = "r"."company_id")))
  WHERE (("r"."id" = "quotes"."rfq_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."membership_status" = 'active'::"text") AND ("om"."workspace_role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



ALTER TABLE "public"."companies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."internal_reviewer_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_memberships" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ownership_transfer_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quotes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."representative_verification_cases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rfq_ai_reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rfq_invites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rfqs" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."accept_company_ownership_transfer"("p_transfer_request_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."accept_company_ownership_transfer"("p_transfer_request_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."accept_organization_invitation"("invitation_token" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."accept_organization_invitation"("invitation_token" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."approve_representative_verification"("p_case_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."approve_representative_verification"("p_case_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."current_user_has_supplier_rfq_access"("p_rfq_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_user_has_supplier_rfq_access"("p_rfq_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."enforce_rfq_award_authorization"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."get_company_representative_verification_status"("p_company_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_company_representative_verification_status"("p_company_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_organization_members"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_organization_members"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_rfq_invitation_context"("p_token" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_rfq_invitation_context"("p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_rfq_invitation_context"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_rfq_invitation_context"("p_token" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."reject_company_ownership_transfer"("p_transfer_request_id" "uuid", "p_rejection_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reject_company_ownership_transfer"("p_transfer_request_id" "uuid", "p_rejection_reason" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."reject_representative_verification"("p_case_id" "uuid", "p_rejection_reason_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reject_representative_verification"("p_case_id" "uuid", "p_rejection_reason_code" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."remove_organization_member"("target_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."remove_organization_member"("target_user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."request_company_ownership_transfer"("target_user_id" "uuid", "previous_owner_next_role" "text", "transfer_reason" "text", "expires_in_hours" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."request_company_ownership_transfer"("target_user_id" "uuid", "previous_owner_next_role" "text", "transfer_reason" "text", "expires_in_hours" integer) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."submit_representative_verification"("p_company_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."submit_representative_verification"("p_company_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."update_organization_member_role"("target_user_id" "uuid", "next_workspace_role" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_organization_member_role"("target_user_id" "uuid", "next_workspace_role" "text") TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."audit_logs" TO "service_role";



GRANT SELECT ON TABLE "public"."companies" TO "anon";
GRANT SELECT,INSERT,DELETE ON TABLE "public"."companies" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."companies" TO "service_role";



GRANT UPDATE("name") ON TABLE "public"."companies" TO "authenticated";



GRANT UPDATE("category") ON TABLE "public"."companies" TO "authenticated";



GRANT UPDATE("location") ON TABLE "public"."companies" TO "authenticated";



GRANT UPDATE("network_role") ON TABLE "public"."companies" TO "authenticated";



GRANT UPDATE("logo_url") ON TABLE "public"."companies" TO "authenticated";



GRANT ALL ON TABLE "public"."internal_reviewer_assignments" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."invitations" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."notifications" TO "service_role";



GRANT SELECT ON TABLE "public"."organization_memberships" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."organization_memberships" TO "service_role";



GRANT ALL ON TABLE "public"."ownership_transfer_requests" TO "service_role";
GRANT SELECT ON TABLE "public"."ownership_transfer_requests" TO "authenticated";



GRANT SELECT ON TABLE "public"."profiles" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."quotes" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."quotes" TO "authenticated";



GRANT ALL ON TABLE "public"."representative_verification_cases" TO "service_role";



GRANT ALL ON TABLE "public"."rfq_ai_reviews" TO "service_role";
GRANT SELECT,INSERT ON TABLE "public"."rfq_ai_reviews" TO "authenticated";



GRANT ALL ON TABLE "public"."rfq_invites" TO "service_role";
GRANT SELECT,INSERT ON TABLE "public"."rfq_invites" TO "authenticated";



GRANT ALL ON TABLE "public"."rfqs" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."rfqs" TO "authenticated";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "service_role";








-- Re-baseline hardening:
-- Fresh Supabase stacks grant REFERENCES/TRIGGER/TRUNCATE to client roles
-- during table creation. Revoke them so replayed baseline matches Dev.

revoke references, trigger, truncate
on table
  public.audit_logs,
  public.companies,
  public.internal_reviewer_assignments,
  public.invitations,
  public.notifications,
  public.organization_memberships,
  public.ownership_transfer_requests,
  public.profiles,
  public.quotes,
  public.representative_verification_cases,
  public.rfq_ai_reviews,
  public.rfq_invites,
  public.rfqs
from anon;

revoke references, trigger, truncate
on table
  public.audit_logs,
  public.companies,
  public.internal_reviewer_assignments,
  public.invitations,
  public.notifications,
  public.organization_memberships,
  public.ownership_transfer_requests,
  public.profiles,
  public.quotes,
  public.representative_verification_cases,
  public.rfq_ai_reviews,
  public.rfq_invites,
  public.rfqs
from authenticated;

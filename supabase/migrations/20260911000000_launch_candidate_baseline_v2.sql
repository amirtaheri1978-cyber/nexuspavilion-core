-- Nexus Pavilion — Canonical Launch-Candidate Baseline V2
-- Task 15-03 / Phase 15 Migration discipline
--
-- Active migration identity: 20260911000000_launch_candidate_baseline_v2
-- Represents final intended database state through historical
-- 20260909090225 (archived under supabase/legacy-migrations/pre-baseline-v2/).
--
-- Content model:
--   1) Final PUBLIC schema captured from active-dev schema-only dump
--      SHA-256 02CFAB9CE8281E59E29B089B7E642B8D7E7782FFCF93E55BFEA35322FBF8240D
--   2) Curated Storage bucket + policy contracts (rfq-attachments,
--      company-documents, Company-logos)
--
-- Does NOT include:
--   - business/user row data
--   - historical backfills
--   - pg_get_functiondef text surgery / historical function MD5 guards
--
-- DO NOT push this baseline SQL to linked active-dev.
-- Active-dev already embodies this schema; remote ledger normalization
-- is a later metadata-only gate if separately authorized.
--
-- No custom Auth schema DDL. No application CREATE EXTENSION.
-- No publication/realtime customization.

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



CREATE OR REPLACE FUNCTION "public"."accept_organization_invitation"("invitation_token" "text", "p_job_title" "text" DEFAULT NULL::"text") RETURNS "jsonb"
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


ALTER FUNCTION "public"."accept_organization_invitation"("invitation_token" "text", "p_job_title" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."accept_organization_invitation"("invitation_token" "text", "p_job_title" "text") IS 'Accepts a pending organization invitation for auth.uid() after JWT email match. Optional job title is written only onto the accepted membership. Caller cannot supply company_id, user_id, workspace_role, or procurement_function. New Access Levels and historical buyer/vendor invitation.role values are supported.';



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


CREATE OR REPLACE FUNCTION "public"."archive_company_workspace"("p_company_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  actor_user_id uuid := auth.uid();
  actor_email text := nullif(lower(btrim(coalesce(auth.jwt() ->> 'email', ''))), '');
  company_row public.companies%rowtype;
  actor_workspace_role text;
  actor_membership_type text;
begin
  if actor_user_id is null then
    return jsonb_build_object('success',false,'error_code','UNAUTHENTICATED','error_message','Authentication is required.');
  end if;
  if p_company_id is null then
    return jsonb_build_object('success',false,'error_code','WORKSPACE_NOT_FOUND','error_message','Company workspace was not found.');
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_company_id::text, 71046));
  select c.* into company_row from public.companies as c where c.id = p_company_id for update;
  if not found then
    return jsonb_build_object('success',false,'error_code','WORKSPACE_NOT_FOUND','error_message','Company workspace was not found.');
  end if;
  select om.workspace_role, om.membership_type
  into actor_workspace_role, actor_membership_type
  from public.organization_memberships as om
  where om.user_id = actor_user_id and om.company_id = p_company_id and om.membership_status = 'active'
  for update;
  if not found or actor_workspace_role <> 'owner' then
    return jsonb_build_object('success',false,'error_code','FORBIDDEN','error_message','Only the active workspace owner can archive this company workspace.');
  end if;
  if company_row.workspace_status <> 'active' then
    return jsonb_build_object('success',false,'error_code','INVALID_WORKSPACE_STATE','error_message','Only an active company workspace can be archived.');
  end if;
  if exists (select 1 from public.ownership_transfer_requests as otr where otr.company_id = p_company_id and otr.status = 'pending_acceptance') then
    return jsonb_build_object('success',false,'error_code','OWNERSHIP_TRANSFER_PENDING','error_message','Resolve the pending ownership transfer before archiving this workspace.');
  end if;
  update public.companies set workspace_status = 'archived' where id = p_company_id;
  update public.organization_memberships set membership_status = 'archived' where company_id = p_company_id and membership_status = 'active';
  insert into public.audit_logs(action,entity_type,entity_id,user_id,company_id,metadata)
  values ('COMPANY_ARCHIVED','company',p_company_id,actor_user_id,p_company_id,
    jsonb_build_object('company_name',company_row.name,'previous_workspace_status',company_row.workspace_status,'workspace_status','archived','archived_by',jsonb_build_object('id',actor_user_id,'email',actor_email,'workspace_role',actor_workspace_role,'membership_type',actor_membership_type),'archived_at',now()));
  return jsonb_build_object('success',true,'workspace_status','archived');
end;
$$;


ALTER FUNCTION "public"."archive_company_workspace"("p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."award_rfq_quote"("p_quote_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  actor_user_id uuid := auth.uid();
  actor_company_id uuid;
  membership_role text;
  company_status text;
  company_workspace_status text;
  selected_quote public.quotes%rowtype;
  rfq_row public.rfqs%rowtype;
  parsed_deadline timestamptz;
  v_awarded_at timestamptz := now();
begin
  if actor_user_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'AUTHENTICATION_REQUIRED',
      'error_message', 'Unauthorized.'
    );
  end if;

  if p_quote_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'QUOTE_ID_REQUIRED',
      'error_message', 'Quote ID is required.'
    );
  end if;

  select p.company_id
  into actor_company_id
  from public.profiles p
  where p.id = actor_user_id;

  if actor_company_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'COMPANY_PROFILE_REQUIRED',
      'error_message', 'Company profile is required to award contracts.'
    );
  end if;

  -- Tenant-bounded: missing quotes and foreign-company quotes are indistinguishable.
  select q.*
  into selected_quote
  from public.quotes q
  join public.rfqs r
    on r.id = q.rfq_id
  where q.id = p_quote_id
    and r.company_id = actor_company_id;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error_code', 'QUOTE_NOT_FOUND',
      'error_message', 'Quote not found.'
    );
  end if;

  select r.*
  into rfq_row
  from public.rfqs r
  where r.id = selected_quote.rfq_id
  for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error_code', 'RFQ_NOT_FOUND',
      'error_message', 'RFQ not found.'
    );
  end if;

  perform 1
  from public.quotes q
  where q.rfq_id = rfq_row.id
  order by q.id
  for update;

  select q.*
  into selected_quote
  from public.quotes q
  where q.id = p_quote_id
    and q.rfq_id = rfq_row.id;

  if rfq_row.company_id is distinct from actor_company_id then
    return jsonb_build_object(
      'success', false,
      'error_code', 'NOT_RFQ_COMPANY',
      'error_message', 'You can only award RFQs owned by your company.'
    );
  end if;

  select om.workspace_role
  into membership_role
  from public.organization_memberships om
  where om.user_id = actor_user_id
    and om.company_id = rfq_row.company_id
    and om.membership_status = 'active'
    and om.workspace_role in ('owner', 'admin');

  select c.status, c.workspace_status
  into company_status, company_workspace_status
  from public.companies c
  where c.id = rfq_row.company_id;

  if membership_role is null
     or company_workspace_status is distinct from 'active'
     or company_status is distinct from 'verified'
  then
    return jsonb_build_object(
      'success', false,
      'error_code', 'AWARD_NOT_PERMITTED',
      'error_message', 'Your organization is not permitted to award contracts.'
    );
  end if;

  if rfq_row.status = 'awarded'
     or rfq_row.awarded_quote_id is not null
     or rfq_row.awarded_at is not null
  then
    return jsonb_build_object(
      'success', false,
      'error_code', 'RFQ_ALREADY_AWARDED',
      'error_message', 'This RFQ has already been awarded.'
    );
  end if;

  if selected_quote.decision = 'awarded' then
    return jsonb_build_object(
      'success', false,
      'error_code', 'QUOTE_ALREADY_AWARDED',
      'error_message', 'This quote has already been awarded.'
    );
  end if;

  if selected_quote.decision = 'rejected' then
    return jsonb_build_object(
      'success', false,
      'error_code', 'QUOTE_INELIGIBLE',
      'error_message', 'Rejected quotes cannot be awarded.'
    );
  end if;

  if selected_quote.company_id is not null
     and selected_quote.company_id = rfq_row.company_id
  then
    return jsonb_build_object(
      'success', false,
      'error_code', 'SELF_AWARD_NOT_ALLOWED',
      'error_message', 'Your company cannot award its own quote.'
    );
  end if;

  parsed_deadline := public.parse_rfq_deadline_timestamptz(rfq_row.deadline);

  if not (
    (
      coalesce(rfq_row.sourcing_method, 'invited') = 'open'
      and coalesce(rfq_row.contract_framework, 'project_specific') <> 'framework'
    )
    or (
      parsed_deadline is not null
      and parsed_deadline < now()
    )
  ) then
    return jsonb_build_object(
      'success', false,
      'error_code', 'AWARD_NOT_PERMITTED',
      'error_message', 'Commercial evaluation remains locked until the RFQ deadline.'
    );
  end if;

  update public.rfqs
  set
    status = 'awarded',
    awarded_quote_id = selected_quote.id,
    awarded_at = v_awarded_at
  where id = rfq_row.id
    and awarded_quote_id is null
    and awarded_at is null
    and status is distinct from 'awarded'
  returning * into rfq_row;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error_code', 'RFQ_ALREADY_AWARDED',
      'error_message', 'This RFQ has already been awarded.'
    );
  end if;

  update public.quotes
  set decision = 'rejected'
  where rfq_id = rfq_row.id
    and id is distinct from selected_quote.id
    and decision is distinct from 'awarded';

  update public.quotes
  set
    decision = 'awarded',
    awarded_at = v_awarded_at
  where id = selected_quote.id
    and decision is distinct from 'awarded'
  returning * into selected_quote;

  if not found then
    raise exception
      using
        errcode = '23514',
        message = 'Failed to award the selected quote.';
  end if;

  perform public.record_rfq_award_workspace_activity(
    selected_quote.id,
    actor_user_id,
    membership_role
  );

  return jsonb_build_object(
    'success', true,
    'awarded_quote', to_jsonb(selected_quote),
    'rfq', to_jsonb(rfq_row)
  );
exception
  when unique_violation then
    return jsonb_build_object(
      'success', false,
      'error_code', 'RFQ_ALREADY_AWARDED',
      'error_message', 'This RFQ has already been awarded.'
    );
end;
$$;


ALTER FUNCTION "public"."award_rfq_quote"("p_quote_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."award_rfq_quote"("p_quote_id" "uuid") IS 'Atomically awards one quote on its RFQ and writes owner CONTRACT_AWARDED plus supplier CONTRACT_AWARD_RECEIVED activity. Actor is auth.uid(); caller cannot supply company_id. Locks the RFQ row, rejects competing quotes, and writes RFQ and quote terminal state in one transaction. Blind invited/sealed/framework RFQs cannot be awarded until a valid parsed deadline is strictly in the past.';



CREATE OR REPLACE FUNCTION "public"."bootstrap_owned_company_workspace"("p_company_id" "uuid", "p_profile_role" "text", "p_job_title" "text" DEFAULT NULL::"text", "p_account_type" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  actor_user_id uuid := auth.uid();
  actor_email text;
  owned_company_id uuid;
  existing_company_id uuid;
  membership_id uuid;
  joined_at timestamp with time zone := now();
  normalized_job_title text;
  normalized_account_type text;
  derived_procurement_function text;
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

  normalized_account_type := nullif(btrim(coalesce(p_account_type, '')), '');

  if normalized_account_type is null then
    derived_procurement_function := 'none';
  elsif normalized_account_type = 'vendor_supplier' then
    derived_procurement_function := 'supplier';
  elsif normalized_account_type = 'buyer_owner'
     or normalized_account_type = 'consultant'
     or normalized_account_type = 'service_provider' then
    derived_procurement_function := 'none';
  else
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_ACCOUNT_TYPE',
      'error_message', 'The organization type is not supported.'
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
    derived_procurement_function,
    'active',
    normalized_job_title,
    joined_at,
    joined_at
  )
  on conflict (user_id, company_id)
  do update set
    workspace_role = 'owner',
    membership_type = 'founder',
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


ALTER FUNCTION "public"."bootstrap_owned_company_workspace"("p_company_id" "uuid", "p_profile_role" "text", "p_job_title" "text", "p_account_type" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."bootstrap_owned_company_workspace"("p_company_id" "uuid", "p_profile_role" "text", "p_job_title" "text", "p_account_type" "text") IS 'Atomically links auth.uid() to an owned company and creates an active founder membership. Caller supplies company id, a bounded profile role, optional founder job title, and optional bounded account type. procurement_function is derived in SQL: vendor_supplier → supplier; buyer_owner, consultant, service_provider, or omitted/NULL → none. Unknown account types are rejected. Existing memberships keep their procurement_function on conflict. user_id is never accepted. Rejects foreign companies. Does not write profile names.';



CREATE OR REPLACE FUNCTION "public"."count_rfq_quote_submissions"("p_rfq_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  actor_user_id uuid := auth.uid();
  submission_count integer := 0;
begin
  if actor_user_id is null or p_rfq_id is null then
    return 0;
  end if;

  if not exists (
    select 1
    from public.rfqs r
    join public.organization_memberships om
      on om.company_id = r.company_id
    where r.id = p_rfq_id
      and om.user_id = actor_user_id
      and om.membership_status = 'active'
      and (
        om.workspace_role in ('owner', 'admin')
        or om.procurement_function = 'buyer'
      )
  ) then
    return 0;
  end if;

  select count(*)::integer
    into submission_count
  from public.quotes q
  where q.rfq_id = p_rfq_id;

  return coalesce(submission_count, 0);
end;
$$;


ALTER FUNCTION "public"."count_rfq_quote_submissions"("p_rfq_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."count_rfq_quote_submissions"("p_rfq_id" "uuid") IS 'Integer-only helper for issuer participation counts before commercial unlock. Authorizes the caller as an active owner/admin/buyer of the issuing RFQ company, then returns COUNT(*) of quotes for that RFQ. Unauthorized or missing RFQs return 0. Never returns quote rows, quote ids, supplier identity, or commercial columns.';



CREATE OR REPLACE FUNCTION "public"."create_company_document"("p_company_id" "uuid", "p_document_id" "uuid", "p_document_type" "text", "p_title" "text", "p_file_name" "text", "p_file_path" "text", "p_file_type" "text", "p_file_size" bigint, "p_issued_on" "date", "p_expires_on" "date") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $_$
declare
  actor_user_id uuid;
  actor_workspace_role text;
  normalized_title text;
  normalized_file_name text;
  document_count integer;
begin
  actor_user_id := auth.uid();

  if actor_user_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHENTICATED',
      'error_message', 'Authentication is required.'
    );
  end if;

  if p_company_id is null
    or not exists (
      select 1
      from public.companies as c
      where c.id = p_company_id
    )
  then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_COMPANY',
      'error_message', 'Company not found.'
    );
  end if;

  select om.workspace_role
    into actor_workspace_role
  from public.organization_memberships as om
  where om.user_id = actor_user_id
    and om.company_id = p_company_id
    and om.membership_status = 'active';

  if actor_workspace_role is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'FORBIDDEN',
      'error_message', 'An active workspace membership is required.'
    );
  end if;

  if actor_workspace_role not in ('owner', 'admin') then
    return jsonb_build_object(
      'success', false,
      'error_code', 'FORBIDDEN',
      'error_message', 'Only owners and administrators can manage company documents.'
    );
  end if;

  if p_document_id is null
    or p_document_type is null
    or p_title is null
    or p_file_name is null
    or p_file_path is null
    or p_file_type is null
    or p_file_size is null
  then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_PAYLOAD',
      'error_message', 'A complete document payload is required.'
    );
  end if;

  if p_document_type not in (
    'insurance',
    'workers_compensation',
    'safety',
    'qualification',
    'other'
  ) then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_DOCUMENT_TYPE',
      'error_message', 'Document type is not supported.'
    );
  end if;

  normalized_title := btrim(regexp_replace(p_title, '\s+', ' ', 'g'));

  if normalized_title = '' or char_length(normalized_title) > 160 then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_TITLE',
      'error_message', 'Document title must be non-empty and 160 characters or fewer.'
    );
  end if;

  normalized_file_name := btrim(regexp_replace(p_file_name, '\s+', ' ', 'g'));

  if normalized_file_name = '' or char_length(normalized_file_name) > 255 then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_FILE_NAME',
      'error_message', 'File name must be non-empty and 255 characters or fewer.'
    );
  end if;

  if p_file_path <> btrim(p_file_path)
    or position('..' in p_file_path) > 0
    or position('\' in p_file_path) > 0
    or position('//' in p_file_path) > 0
    or p_file_path !~ (
      '^' || p_company_id::text || '/' || p_document_id::text
      || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|jpg|jpeg|png|webp)$'
    )
  then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_FILE_PATH',
      'error_message', 'File path is invalid.'
    );
  end if;

  if p_file_type not in (
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ) then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_FILE_TYPE',
      'error_message', 'File type is not allowed.'
    );
  end if;

  if (
    (p_file_type = 'application/pdf' and lower(normalized_file_name) !~ '\.pdf$')
    or (p_file_type = 'image/jpeg' and lower(normalized_file_name) !~ '\.(jpg|jpeg)$')
    or (p_file_type = 'image/png' and lower(normalized_file_name) !~ '\.png$')
    or (p_file_type = 'image/webp' and lower(normalized_file_name) !~ '\.webp$')
  ) then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_FILE_TYPE',
      'error_message', 'File type and extension do not match.'
    );
  end if;

  if (
    (p_file_type = 'application/pdf' and p_file_path !~ '\.pdf$')
    or (p_file_type = 'image/jpeg' and p_file_path !~ '\.(jpg|jpeg)$')
    or (p_file_type = 'image/png' and p_file_path !~ '\.png$')
    or (p_file_type = 'image/webp' and p_file_path !~ '\.webp$')
  ) then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_FILE_TYPE',
      'error_message', 'File type and extension do not match.'
    );
  end if;

  if p_file_size <= 0 or p_file_size > 10485760 then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_FILE_SIZE',
      'error_message', 'File size must be greater than 0 and at most 10 MB.'
    );
  end if;

  if p_issued_on is not null
    and p_expires_on is not null
    and p_expires_on < p_issued_on
  then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_DOCUMENT_DATE',
      'error_message', 'Expiry date must be on or after the issued date.'
    );
  end if;

  if exists (
    select 1
    from public.company_documents as existing
    where existing.id = p_document_id
  ) then
    return jsonb_build_object(
      'success', false,
      'error_code', 'DOCUMENT_EXISTS',
      'error_message', 'Document already exists.'
    );
  end if;

  if not exists (
    select 1
    from storage.objects as so
    where so.bucket_id = 'company-documents'
      and so.name = p_file_path
  ) then
    return jsonb_build_object(
      'success', false,
      'error_code', 'OBJECT_NOT_FOUND',
      'error_message', 'Storage object was not found.'
    );
  end if;

  if not exists (
    select 1
    from storage.objects as so
    where so.bucket_id = 'company-documents'
      and so.name = p_file_path
      and so.metadata ? 'mimetype'
      and nullif(btrim(so.metadata->>'mimetype'), '') is not null
      and so.metadata->>'mimetype' = p_file_type
      and so.metadata ? 'size'
      and nullif(btrim(so.metadata->>'size'), '') is not null
      and so.metadata->>'size' ~ '^[0-9]+$'
      and (so.metadata->>'size')::bigint = p_file_size
  ) then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_STORAGE_OBJECT',
      'error_message', 'Storage object metadata does not match the document.'
    );
  end if;

  insert into public.company_documents (
    id,
    company_id,
    document_type,
    title,
    file_name,
    file_path,
    file_type,
    file_size,
    issued_on,
    expires_on,
    uploaded_by
  )
  values (
    p_document_id,
    p_company_id,
    p_document_type,
    normalized_title,
    normalized_file_name,
    p_file_path,
    p_file_type,
    p_file_size,
    p_issued_on,
    p_expires_on,
    actor_user_id
  );

  select count(*)
    into document_count
  from public.company_documents
  where company_id = p_company_id;

  insert into public.audit_logs (
    action,
    entity_type,
    entity_id,
    user_id,
    company_id,
    metadata
  )
  values (
    'COMPANY_DOCUMENT_UPLOADED',
    'company',
    p_company_id,
    actor_user_id,
    p_company_id,
    jsonb_build_object(
      'document_id', p_document_id,
      'document_type', p_document_type,
      'file_type', p_file_type,
      'file_size', p_file_size,
      'document_count', document_count,
      'updated_by', jsonb_build_object(
        'id', actor_user_id,
        'workspace_role', actor_workspace_role
      ),
      'updated_at', now()
    )
  );

  return jsonb_build_object(
    'success', true,
    'company_id', p_company_id,
    'document_id', p_document_id,
    'document_count', document_count,
    'audited', true
  );
end;
$_$;


ALTER FUNCTION "public"."create_company_document"("p_company_id" "uuid", "p_document_id" "uuid", "p_document_type" "text", "p_title" "text", "p_file_name" "text", "p_file_path" "text", "p_file_type" "text", "p_file_size" bigint, "p_issued_on" "date", "p_expires_on" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_company_document"("p_company_id" "uuid", "p_document_id" "uuid", "p_document_type" "text", "p_title" "text", "p_file_name" "text", "p_file_path" "text", "p_file_type" "text", "p_file_size" bigint, "p_issued_on" "date", "p_expires_on" "date") IS 'Finalizes a previously uploaded company document object and emits COMPANY_DOCUMENT_UPLOADED. Owner/admin only.';



CREATE OR REPLACE FUNCTION "public"."create_company_workspace_invitation"("p_email" "text", "p_role" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $_$
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
$_$;


ALTER FUNCTION "public"."create_company_workspace_invitation"("p_email" "text", "p_role" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_company_workspace_invitation"("p_email" "text", "p_role" "text") IS 'Creates a pending company workspace invitation for the caller''s active company. New invitations accept Access Level viewer, member, or admin only. Owner cannot be invited through this command.';



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
  -- Access is bound to the authenticated email, not an invitation URL.
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
  -- authorized active company membership.
  if exists (
    select 1
    from public.quotes q
    join public.organization_memberships om
      on om.company_id = q.company_id
     and om.user_id = v_uid
     and om.membership_status in ('active', 'archived')
    where q.rfq_id = p_rfq_id
  ) then
    return true;
  end if;

  return false;
end;
$$;


ALTER FUNCTION "public"."current_user_has_supplier_rfq_access"("p_rfq_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_user_has_supplier_rfq_access"("p_rfq_id" "uuid") IS 'Boolean-only helper for restricted RFQ SELECT / quote INSERT RLS. Returns true for an explicit rfq_invites email match or existing quote participation by an active company membership. SECURITY DEFINER so respondents can be authorized without a direct rfq_invites SELECT grant.';



CREATE OR REPLACE FUNCTION "public"."delete_company_document"("p_company_id" "uuid", "p_document_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  actor_user_id uuid;
  actor_workspace_role text;
  current_document public.company_documents%rowtype;
  document_count integer;
begin
  actor_user_id := auth.uid();

  if actor_user_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHENTICATED',
      'error_message', 'Authentication is required.'
    );
  end if;

  if p_company_id is null
    or not exists (
      select 1
      from public.companies as c
      where c.id = p_company_id
    )
  then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_COMPANY',
      'error_message', 'Company not found.'
    );
  end if;

  select om.workspace_role
    into actor_workspace_role
  from public.organization_memberships as om
  where om.user_id = actor_user_id
    and om.company_id = p_company_id
    and om.membership_status = 'active';

  if actor_workspace_role is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'FORBIDDEN',
      'error_message', 'An active workspace membership is required.'
    );
  end if;

  if actor_workspace_role not in ('owner', 'admin') then
    return jsonb_build_object(
      'success', false,
      'error_code', 'FORBIDDEN',
      'error_message', 'Only owners and administrators can manage company documents.'
    );
  end if;

  select *
    into current_document
  from public.company_documents
  where id = p_document_id
    and company_id = p_company_id;

  if current_document.id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'DOCUMENT_NOT_FOUND',
      'error_message', 'Document not found.'
    );
  end if;

  delete from public.company_documents
  where id = p_document_id
    and company_id = p_company_id;

  select count(*)
    into document_count
  from public.company_documents
  where company_id = p_company_id;

  insert into public.audit_logs (
    action,
    entity_type,
    entity_id,
    user_id,
    company_id,
    metadata
  )
  values (
    'COMPANY_DOCUMENT_DELETED',
    'company',
    p_company_id,
    actor_user_id,
    p_company_id,
    jsonb_build_object(
      'document_id', p_document_id,
      'document_type', current_document.document_type,
      'file_type', current_document.file_type,
      'file_size', current_document.file_size,
      'document_count', document_count,
      'updated_by', jsonb_build_object(
        'id', actor_user_id,
        'workspace_role', actor_workspace_role
      ),
      'updated_at', now()
    )
  );

  return jsonb_build_object(
    'success', true,
    'company_id', p_company_id,
    'document_id', p_document_id,
    'old_file_path', current_document.file_path,
    'document_count', document_count,
    'audited', true
  );
end;
$$;


ALTER FUNCTION "public"."delete_company_document"("p_company_id" "uuid", "p_document_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."delete_company_document"("p_company_id" "uuid", "p_document_id" "uuid") IS 'Deletes company document metadata and emits COMPANY_DOCUMENT_DELETED. Owner/admin only.';



CREATE OR REPLACE FUNCTION "public"."enforce_company_governance_update_integrity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $_$
declare
  actor_user_id uuid := auth.uid();
  actor_email text := nullif(
    lower(btrim(coalesce(auth.jwt() ->> 'email', ''))),
    ''
  );
  actor_workspace_role text;
  actor_membership_type text;

  profile_changed boolean :=
    old.name is distinct from new.name
    or old.category is distinct from new.category
    or old.location is distinct from new.location
    or old.network_role is distinct from new.network_role;

  logo_changed boolean :=
    old.logo_url is distinct from new.logo_url;

  jwt_issuer text;
  project_origin text;
  expected_logo_prefix text;
  logo_path text;
begin
  if not profile_changed and not logo_changed then
    return new;
  end if;

  if actor_user_id is not null then
    select
      om.workspace_role,
      om.membership_type
    into
      actor_workspace_role,
      actor_membership_type
    from public.organization_memberships as om
    where om.user_id = actor_user_id
      and om.company_id = new.id
      and om.membership_status = 'active'
      and om.workspace_role in ('owner', 'admin')
    limit 1;

    if not found then
      raise exception
        using
          errcode = '42501',
          message =
            'An active owner or administrator workspace membership is required.';
    end if;
  end if;

  if logo_changed and new.logo_url is not null then
    if position('?' in new.logo_url) > 0
       or position('#' in new.logo_url) > 0
    then
      raise exception
        using
          errcode = '22023',
          message = 'Company logo URL must not contain a query or fragment.';
    end if;

    logo_path := split_part(
      new.logo_url,
      '/storage/v1/object/public/Company-logos/',
      2
    );

    if logo_path = ''
       or logo_path !~ (
         '^' || new.id::text
         || '/branding/'
         || '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
         || '\.(jpg|jpeg|png|webp)$'
       )
    then
      raise exception
        using
          errcode = '22023',
          message = 'Company logo path is invalid.';
    end if;

    if actor_user_id is not null then
      jwt_issuer := coalesce(auth.jwt() ->> 'iss', '');
      project_origin := regexp_replace(
        jwt_issuer,
        '/auth/v1/?$',
        ''
      );

      if project_origin = '' then
        raise exception
          using
            errcode = '42501',
            message = 'Authenticated project origin is unavailable.';
      end if;

      expected_logo_prefix :=
        project_origin
        || '/storage/v1/object/public/Company-logos/';

      if new.logo_url <> (expected_logo_prefix || logo_path) then
        raise exception
          using
            errcode = '22023',
            message = 'Company logo URL origin or object path is invalid.';
      end if;
    end if;

    if not exists (
      select 1
      from storage.objects as so
      where so.bucket_id = 'Company-logos'
        and so.name = logo_path
        and so.metadata ? 'mimetype'
        and so.metadata ->> 'mimetype' in (
          'image/jpeg',
          'image/png',
          'image/webp'
        )
        and so.metadata ? 'size'
        and nullif(btrim(so.metadata ->> 'size'), '') is not null
        and so.metadata ->> 'size' ~ '^[0-9]+$'
        and (so.metadata ->> 'size')::bigint > 0
        and (so.metadata ->> 'size')::bigint <= 5242880
    ) then
      raise exception
        using
          errcode = '22023',
          message =
            'Company logo Storage object is missing or invalid.';
    end if;
  end if;

  if profile_changed then
    insert into public.audit_logs (
      action,
      entity_type,
      entity_id,
      user_id,
      company_id,
      metadata
    )
    values (
      'COMPANY_UPDATED',
      'company',
      new.id,
      actor_user_id,
      new.id,
      jsonb_build_object(
        'previous',
        jsonb_build_object(
          'id', old.id,
          'name', old.name,
          'category', old.category,
          'location', old.location,
          'network_role', old.network_role
        ),
        'updated',
        jsonb_build_object(
          'name', new.name,
          'category', new.category,
          'location', new.location,
          'network_role', new.network_role
        ),
        'updated_by',
        case
          when actor_user_id is null then
            jsonb_build_object(
              'id', null,
              'email', null,
              'actor_type', 'trusted_system'
            )
          else
            jsonb_build_object(
              'id', actor_user_id,
              'email', actor_email,
              'workspace_role', actor_workspace_role,
              'membership_type', actor_membership_type
            )
        end,
        'updated_at', now()
      )
    );

    insert into public.notifications (
      title,
      message,
      type,
      is_read,
      company_id
    )
    values (
      'Company Profile Updated',
      new.name || ' workspace profile was updated.',
      'company',
      false,
      new.id
    );
  end if;

  if logo_changed then
    insert into public.audit_logs (
      action,
      entity_type,
      entity_id,
      user_id,
      company_id,
      metadata
    )
    values (
      'COMPANY_LOGO_UPDATED',
      'company',
      new.id,
      actor_user_id,
      new.id,
      jsonb_build_object(
        'previous_logo_url', old.logo_url,
        'new_logo_url', new.logo_url,
        'updated_by',
        case
          when actor_user_id is null then
            jsonb_build_object(
              'id', null,
              'email', null,
              'actor_type', 'trusted_system'
            )
          else
            jsonb_build_object(
              'id', actor_user_id,
              'email', actor_email,
              'workspace_role', actor_workspace_role,
              'membership_type', actor_membership_type
            )
        end,
        'updated_at', now()
      )
    );
  end if;

  return new;
end;
$_$;


ALTER FUNCTION "public"."enforce_company_governance_update_integrity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_company_workspace_membership_lifecycle"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  target_company_id uuid := new.company_id;
  target_workspace_status text;
begin
  if target_company_id is null then return new; end if;
  if not pg_try_advisory_xact_lock(hashtextextended(target_company_id::text, 71046)) then
    raise exception using errcode = '55P03', message = 'Company workspace lifecycle transition is in progress. Retry the membership change.';
  end if;
  if new.membership_status = 'active' then
    select c.workspace_status into target_workspace_status
    from public.companies as c where c.id = target_company_id;
    if target_workspace_status = 'archived' then
      raise exception using errcode = '42501', message = 'Archived company workspaces cannot activate memberships.';
    end if;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."enforce_company_workspace_membership_lifecycle"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_quote_award_integrity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  rfq_awarded_quote_id uuid;
begin
  if tg_op = 'UPDATE'
     and old.decision = 'awarded'
     and new.decision is distinct from 'awarded'
  then
    raise exception
      using
        errcode = '23514',
        message = 'An awarded quote cannot change decision.';
  end if;

  if new.decision = 'awarded'
     and (
       tg_op = 'INSERT'
       or old.decision is distinct from 'awarded'
     )
  then
    select r.awarded_quote_id
    into rfq_awarded_quote_id
    from public.rfqs r
    where r.id = new.rfq_id;

    if rfq_awarded_quote_id is distinct from new.id then
      raise exception
        using
          errcode = '23514',
          message = 'A quote can be awarded only when it is the RFQ awarded_quote_id.';
    end if;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."enforce_quote_award_integrity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_rfq_addendum_acknowledgement_integrity"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare v_rfq_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication is required'; end if;
  select a.rfq_id into v_rfq_id from public.rfq_addenda a where a.id=new.addendum_id;
  if v_rfq_id is null then raise exception 'Addendum not found'; end if;
  new.rfq_id:=v_rfq_id; new.acknowledged_by:=auth.uid(); new.acknowledged_at:=now(); return new;
end;$$;


ALTER FUNCTION "public"."enforce_rfq_addendum_acknowledgement_integrity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_rfq_addendum_insert_integrity"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare v_company_id uuid; v_next_number integer;
begin
  if auth.uid() is null then raise exception 'Authentication is required'; end if;
  if nullif(btrim(coalesce(new.title,'')),'') is null then raise exception 'Addendum title is required'; end if;
  select r.company_id into v_company_id from public.rfqs r where r.id=new.rfq_id for update;
  if v_company_id is null then raise exception 'RFQ not found'; end if;
  select coalesce(max(a.addendum_number),0)+1 into v_next_number from public.rfq_addenda a where a.rfq_id=new.rfq_id;
  new.company_id:=v_company_id; new.created_by:=auth.uid(); new.created_at:=now(); new.addendum_number:=v_next_number; return new;
end;$$;


ALTER FUNCTION "public"."enforce_rfq_addendum_insert_integrity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_rfq_attachment_insert_integrity"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare v_company_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication is required'; end if;
  if nullif(btrim(coalesce(new.file_name,'')),'') is null then raise exception 'Attachment file name is required'; end if;
  if nullif(btrim(coalesce(new.file_path,'')),'') is null then raise exception 'Attachment file path is required'; end if;
  select r.company_id into v_company_id from public.rfqs r where r.id=new.rfq_id;
  if v_company_id is null then raise exception 'RFQ not found'; end if;
  new.company_id:=v_company_id; new.uploaded_by:=auth.uid(); new.created_at:=now(); return new;
end;$$;


ALTER FUNCTION "public"."enforce_rfq_attachment_insert_integrity"() OWNER TO "postgres";


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

    if old.awarded_quote_id is not null
      and new.awarded_quote_id is distinct from old.awarded_quote_id
    then
      raise exception
        using
          errcode = '23514',
          message = 'An awarded RFQ cannot replace its awarded quote.';
    end if;

    if old.status = 'awarded'
      and new.status is distinct from 'awarded'
    then
      raise exception
        using
          errcode = '23514',
          message = 'An awarded RFQ cannot leave the awarded status.';
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


CREATE OR REPLACE FUNCTION "public"."enforce_rfq_award_terminal_consistency"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  awarded_quote_decision text;
  awarded_quote_rfq_id uuid;
begin
  if new.status = 'awarded'
     and new.awarded_quote_id is null
  then
    raise exception
      using
        errcode = '23514',
        message = 'An awarded RFQ must reference an awarded quote.';
  end if;

  if new.awarded_quote_id is not null then
    select q.decision, q.rfq_id
    into awarded_quote_decision, awarded_quote_rfq_id
    from public.quotes q
    where q.id = new.awarded_quote_id;

    if awarded_quote_rfq_id is distinct from new.id
      or awarded_quote_decision is distinct from 'awarded'
      or new.status is distinct from 'awarded'
      or new.awarded_at is null
    then
      raise exception
        using
          errcode = '23514',
          message = 'RFQ award fields must match a quote awarded on the same RFQ.';
    end if;
  end if;

  return null;
end;
$$;


ALTER FUNCTION "public"."enforce_rfq_award_terminal_consistency"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_rfq_rfi_insert_integrity"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  if auth.uid() is null then raise exception 'Authentication is required'; end if;
  if nullif(btrim(coalesce(new.question,'')),'') is null then raise exception 'RFI question is required'; end if;
  new.submitted_by:=auth.uid(); new.status:='open'; new.response_text:=null; new.responded_by:=null; new.responded_at:=null; new.created_at:=now(); new.updated_at:=now(); return new;
end;$$;


ALTER FUNCTION "public"."enforce_rfq_rfi_insert_integrity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_rfq_rfi_response_integrity"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  if new.id is distinct from old.id or new.rfq_id is distinct from old.rfq_id or new.respondent_company_id is distinct from old.respondent_company_id or new.submitted_by is distinct from old.submitted_by or new.question is distinct from old.question or new.created_at is distinct from old.created_at then raise exception 'RFI core fields are immutable after creation'; end if;
  if old.status='answered' then raise exception 'Answered RFIs cannot be modified'; end if;
  if old.status<>'open' then raise exception 'Only open RFIs can receive a response'; end if;
  if nullif(btrim(coalesce(new.response_text,'')),'') is null then raise exception 'RFI response text is required'; end if;
  new.status:='answered'; new.responded_by:=auth.uid(); new.responded_at:=now(); new.updated_at:=now(); return new;
end;$$;


ALTER FUNCTION "public"."enforce_rfq_rfi_response_integrity"() OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."get_company_workspace_invitation_for_resend"("p_invitation_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
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


ALTER FUNCTION "public"."get_company_workspace_invitation_for_resend"("p_invitation_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_company_workspace_invitation_for_resend"("p_invitation_id" "uuid") IS 'Returns resend metadata for a pending invitation in the caller''s active company.';



CREATE OR REPLACE FUNCTION "public"."get_company_workspace_invitations"() RETURNS TABLE("id" "uuid", "company_id" "uuid", "email" "text", "role" "text", "status" "text", "token" "text", "expires_at" timestamp with time zone, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
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


ALTER FUNCTION "public"."get_company_workspace_invitations"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_company_workspace_invitations"() IS 'Returns workspace invitation metadata for the caller''s active company. Tokens are disclosed only to active owner/admin members.';



CREATE OR REPLACE FUNCTION "public"."get_organization_invitation_context"("p_token" "text") RETURNS TABLE("invite_email" "text", "invite_role" "text", "invite_status" "text", "invite_expires_at" timestamp with time zone, "company_name" "text", "company_category" "text", "company_location" "text", "company_logo_url" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select
    i.email,
    i.role,
    i.status,
    i.expires_at,
    c.name,
    c.category,
    c.location,
    c.logo_url
  from public.invitations as i
  join public.companies as c
    on c.id = i.company_id
  where p_token is not null
    and length(btrim(p_token)) >= 32
    and i.token = btrim(p_token)
    and i.status = 'pending'
    and i.expires_at >= now()
  limit 1;
$$;


ALTER FUNCTION "public"."get_organization_invitation_context"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_organization_members"() RETURNS TABLE("membership_id" "uuid", "user_id" "uuid", "company_id" "uuid", "email" "text", "legacy_role" "text", "profile_created_at" timestamp with time zone, "workspace_role" "text", "procurement_function" "text", "membership_type" "text", "membership_status" "text", "joined_at" timestamp with time zone, "role_changed_at" timestamp with time zone, "membership_created_at" timestamp with time zone, "membership_updated_at" timestamp with time zone, "first_name" "text", "last_name" "text", "job_title" "text")
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


ALTER FUNCTION "public"."get_organization_members"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_organization_members"() IS 'Returns active members of the caller''s current workspace, including person names and membership job title. Does not grant direct cross-profile SELECT.';



CREATE OR REPLACE FUNCTION "public"."get_organization_members"("p_company_id" "uuid") RETURNS TABLE("membership_id" "uuid", "user_id" "uuid", "company_id" "uuid", "email" "text", "legacy_role" "text", "profile_created_at" timestamp with time zone, "workspace_role" "text", "procurement_function" "text", "membership_type" "text", "membership_status" "text", "joined_at" timestamp with time zone, "role_changed_at" timestamp with time zone, "membership_created_at" timestamp with time zone, "membership_updated_at" timestamp with time zone, "first_name" "text", "last_name" "text", "job_title" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  actor_user_id uuid := auth.uid();
  actor_membership_status text;
begin
  if actor_user_id is null then raise exception 'Authentication is required.' using errcode = '42501'; end if;
  if p_company_id is null then raise exception 'A company workspace is required.' using errcode = '42501'; end if;
  select om.membership_status into actor_membership_status
  from public.organization_memberships as om
  where om.user_id = actor_user_id and om.company_id = p_company_id and om.membership_status in ('active','archived')
  limit 1;
  if actor_membership_status is null then raise exception 'An active or archived workspace membership is required.' using errcode = '42501'; end if;
  return query
  select om.id,om.user_id,om.company_id,p.email,p.role,p.created_at,om.workspace_role,om.procurement_function,om.membership_type,om.membership_status,om.joined_at,om.role_changed_at,om.created_at,om.updated_at,p.first_name,p.last_name,om.job_title
  from public.organization_memberships as om
  join public.profiles as p on p.id = om.user_id
  where om.company_id = p_company_id and om.membership_status = actor_membership_status
  order by case om.workspace_role when 'owner' then 1 when 'admin' then 2 when 'member' then 3 when 'viewer' then 4 else 5 end,
    lower(coalesce(p.email,'')),om.created_at;
end;
$$;


ALTER FUNCTION "public"."get_organization_members"("p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_rfq_invitation_context"("p_token" "text") RETURNS TABLE("invite_id" "uuid", "invite_email" "text", "invite_status" "text", "rfq_id" "uuid", "rfq_title" "text", "rfq_slug" "text", "rfq_description" "text", "rfq_category" "text", "rfq_location" "text", "rfq_budget" "text", "rfq_deadline" "text", "rfq_deadline_timezone" "text")
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
    r.deadline,
    r.deadline_timezone
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


CREATE OR REPLACE FUNCTION "public"."parse_rfq_deadline_timestamptz"("p_deadline" "text") RETURNS timestamp with time zone
    LANGUAGE "plpgsql" STABLE PARALLEL SAFE
    SET "search_path" TO ''
    AS $$
declare
  normalized text;
  parsed timestamptz;
begin
  -- SECURITY INVOKER by default. Parses text only; does not read or write
  -- table data. Null, blank, and invalid values return null so callers
  -- fail closed.
  normalized := nullif(trim(p_deadline), '');
  if normalized is null then
    return null;
  end if;

  begin
    parsed := normalized::timestamptz;
  exception
    when invalid_datetime_format
      or datetime_field_overflow
      or invalid_text_representation
    then
      return null;
  end;

  return parsed;
end;
$$;


ALTER FUNCTION "public"."parse_rfq_deadline_timestamptz"("p_deadline" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."parse_rfq_deadline_timestamptz"("p_deadline" "text") IS 'Fail-closed parser for public.rfqs.deadline (text). Returns timestamptz for a valid timestamp, otherwise null. Null, blank, malformed, and overflow values do not unlock commercial evaluation.';



CREATE OR REPLACE FUNCTION "public"."reactivate_company_workspace"("p_company_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  actor_user_id uuid := auth.uid();
  actor_email text := nullif(lower(btrim(coalesce(auth.jwt() ->> 'email', ''))), '');
  company_row public.companies%rowtype;
  actor_workspace_role text;
  actor_membership_type text;
begin
  if actor_user_id is null then
    return jsonb_build_object('success',false,'error_code','UNAUTHENTICATED','error_message','Authentication is required.');
  end if;
  if p_company_id is null then
    return jsonb_build_object('success',false,'error_code','WORKSPACE_NOT_FOUND','error_message','Company workspace was not found.');
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_company_id::text, 71046));
  select c.* into company_row from public.companies as c where c.id = p_company_id for update;
  if not found then
    return jsonb_build_object('success',false,'error_code','WORKSPACE_NOT_FOUND','error_message','Company workspace was not found.');
  end if;
  select om.workspace_role, om.membership_type
  into actor_workspace_role, actor_membership_type
  from public.organization_memberships as om
  where om.user_id = actor_user_id and om.company_id = p_company_id and om.membership_status = 'archived'
  for update;
  if not found or actor_workspace_role <> 'owner' then
    return jsonb_build_object('success',false,'error_code','FORBIDDEN','error_message','Only the archived workspace owner can reactivate this company workspace.');
  end if;
  if company_row.workspace_status <> 'archived' then
    return jsonb_build_object('success',false,'error_code','INVALID_WORKSPACE_STATE','error_message','Only an archived company workspace can be reactivated.');
  end if;
  update public.companies set workspace_status = 'active' where id = p_company_id;
  update public.organization_memberships set membership_status = 'active' where company_id = p_company_id and membership_status = 'archived';
  insert into public.audit_logs(action,entity_type,entity_id,user_id,company_id,metadata)
  values ('COMPANY_REACTIVATED','company',p_company_id,actor_user_id,p_company_id,
    jsonb_build_object('company_name',company_row.name,'previous_workspace_status',company_row.workspace_status,'workspace_status','active','reactivated_by',jsonb_build_object('id',actor_user_id,'email',actor_email,'workspace_role',actor_workspace_role,'membership_type',actor_membership_type),'reactivated_at',now()));
  return jsonb_build_object('success',true,'workspace_status','active');
end;
$$;


ALTER FUNCTION "public"."reactivate_company_workspace"("p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_procurement_activity"("p_activity_kind" "text", "p_entity_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  actor_user_id uuid := auth.uid();
  activity_kind text := lower(btrim(coalesce(p_activity_kind, '')));
  rfq_row public.rfqs%rowtype;
  quote_row public.quotes%rowtype;
  invite_row public.rfq_invites%rowtype;
  rfi_row public.rfq_rfis%rowtype;
  addendum_row public.rfq_addenda%rowtype;
  acknowledgement_row public.rfq_addendum_acknowledgements%rowtype;
  buyer_company_id uuid;
  issuer_company_id uuid;
  respondent_company_id uuid;
  scope_label text;
  notification_title text;
  notification_message text;
  notification_type text;
  audit_action text;
  audit_entity_type text;
  audit_company_id uuid;
  notification_company_id uuid;
  notification_source_rfq_id uuid;
  existing_audit_id uuid;
  written_audit_id uuid;
  written_notification_id uuid;
begin
  if actor_user_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'AUTHENTICATION_REQUIRED',
      'error_message', 'Authentication is required.'
    );
  end if;

  if p_entity_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'ENTITY_ID_REQUIRED',
      'error_message', 'Entity ID is required.'
    );
  end if;

  if activity_kind not in (
    'rfq_created',
    'quote_submitted',
    'rfq_invitation_sent',
    'rfi_submitted',
    'rfi_responded',
    'addendum_published',
    'addendum_acknowledged'
  ) then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_ACTIVITY_KIND',
      'error_message', 'Unsupported procurement activity.'
    );
  end if;

  -- -----------------------------------------------------------------------
  -- rfq_created (unchanged contract)
  -- -----------------------------------------------------------------------
  if activity_kind = 'rfq_created' then
    select r.*
    into rfq_row
    from public.rfqs r
    where r.id = p_entity_id
      and r.user_id = actor_user_id
      and exists (
        select 1
        from public.organization_memberships om
        where om.user_id = actor_user_id
          and om.company_id = r.company_id
          and om.membership_status = 'active'
          and (
            om.workspace_role in ('owner', 'admin')
            or om.procurement_function = 'buyer'
          )
      );

    if not found then
      return jsonb_build_object(
        'success', false,
        'error_code', 'ENTITY_NOT_FOUND',
        'error_message', 'RFQ not found.'
      );
    end if;

    select a.id
    into existing_audit_id
    from public.audit_logs a
    where a.action = 'RFQ_CREATED'
      and a.entity_id = rfq_row.id
    order by a.created_at
    limit 1;

    if existing_audit_id is not null then
      return jsonb_build_object(
        'success', true,
        'activity_kind', activity_kind,
        'idempotent', true,
        'audit_id', existing_audit_id
      );
    end if;

    scope_label := case rfq_row.procurement_scope
      when 'material' then 'Material / Product RFQ'
      when 'equipment' then 'Equipment Rental RFQ'
      when 'professional_service' then 'Professional Service RFQ'
      else 'Subcontractor / Trade RFQ'
    end;

    notification_source_rfq_id := rfq_row.id;
    notification_message := coalesce(rfq_row.title, 'Untitled RFQ')
      || ' procurement opportunity has been published as a '
      || scope_label
      || '.';

    insert into public.audit_logs (
      action,
      entity_type,
      entity_id,
      user_id,
      company_id,
      metadata
    )
    values (
      'RFQ_CREATED',
      'rfq',
      rfq_row.id,
      actor_user_id,
      rfq_row.company_id,
      jsonb_build_object(
        'title', rfq_row.title,
        'budget', rfq_row.budget,
        'category', rfq_row.category,
        'location', rfq_row.location,
        'slug', rfq_row.slug,
        'deadline', rfq_row.deadline,
        'procurement_scope', rfq_row.procurement_scope,
        'sourcing_method', rfq_row.sourcing_method,
        'contract_framework', rfq_row.contract_framework,
        'bid_model', rfq_row.bid_model
      )
    )
    returning id into written_audit_id;

    insert into public.notifications (
      title,
      message,
      type,
      is_read,
      company_id,
      source_rfq_id
    )
    values (
      'RFQ Created',
      notification_message,
      'rfq',
      false,
      rfq_row.company_id,
      notification_source_rfq_id
    )
    returning id into written_notification_id;

    return jsonb_build_object(
      'success', true,
      'activity_kind', activity_kind,
      'audit_id', written_audit_id,
      'notification_id', written_notification_id
    );
  end if;

  -- -----------------------------------------------------------------------
  -- quote_submitted (unchanged contract; buyer notification audience only)
  -- -----------------------------------------------------------------------
  if activity_kind = 'quote_submitted' then
    select q.*
    into quote_row
    from public.quotes q
    where q.id = p_entity_id
      and q.user_id = actor_user_id
      and exists (
        select 1
        from public.organization_memberships om
        where om.user_id = actor_user_id
          and om.company_id = q.company_id
          and om.membership_status = 'active'
      );

    if not found then
      return jsonb_build_object(
        'success', false,
        'error_code', 'ENTITY_NOT_FOUND',
        'error_message', 'Quote not found.'
      );
    end if;

    select r.company_id, r.title
    into buyer_company_id, notification_message
    from public.rfqs r
    where r.id = quote_row.rfq_id;

    if buyer_company_id is null then
      return jsonb_build_object(
        'success', false,
        'error_code', 'ENTITY_NOT_FOUND',
        'error_message', 'Quote not found.'
      );
    end if;

    notification_source_rfq_id := quote_row.rfq_id;

    select a.id
    into existing_audit_id
    from public.audit_logs a
    where a.action = 'QUOTE_SUBMITTED'
      and a.entity_id = quote_row.id
    order by a.created_at
    limit 1;

    if existing_audit_id is not null then
      return jsonb_build_object(
        'success', true,
        'activity_kind', activity_kind,
        'idempotent', true,
        'audit_id', existing_audit_id
      );
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
      'QUOTE_SUBMITTED',
      'quote',
      quote_row.id,
      actor_user_id,
      quote_row.company_id,
      jsonb_build_object(
        'rfq_id', quote_row.rfq_id,
        'amount', quote_row.amount,
        'timeline', quote_row.timeline,
        'validity_days', quote_row.validity_days
      )
    )
    returning id into written_audit_id;

    insert into public.notifications (
      title,
      message,
      type,
      is_read,
      company_id,
      source_rfq_id
    )
    values (
      'Quote Submitted',
      'A new quote was submitted for '
        || coalesce(notification_message, 'this RFQ')
        || '.',
      'quote',
      false,
      buyer_company_id,
      notification_source_rfq_id
    )
    returning id into written_notification_id;

    return jsonb_build_object(
      'success', true,
      'activity_kind', activity_kind,
      'audit_id', written_audit_id,
      'notification_id', written_notification_id
    );
  end if;

  -- -----------------------------------------------------------------------
  -- rfq_invitation_sent
  -- -----------------------------------------------------------------------
  if activity_kind = 'rfq_invitation_sent' then
    select i.*
    into invite_row
    from public.rfq_invites i
    where i.id = p_entity_id;

    if not found then
      return jsonb_build_object(
        'success', false,
        'error_code', 'ENTITY_NOT_FOUND',
        'error_message', 'RFQ invitation not found.'
      );
    end if;

    select r.*
    into rfq_row
    from public.rfqs r
    where r.id = invite_row.rfq_id
      and exists (
        select 1
        from public.organization_memberships om
        where om.user_id = actor_user_id
          and om.company_id = r.company_id
          and om.membership_status = 'active'
          and (
            om.workspace_role in ('owner', 'admin')
            or om.procurement_function = 'buyer'
          )
      );

    if not found then
      return jsonb_build_object(
        'success', false,
        'error_code', 'ENTITY_NOT_FOUND',
        'error_message', 'RFQ invitation not found.'
      );
    end if;

    notification_source_rfq_id := rfq_row.id;
    audit_action := 'RFQ_INVITATION_SENT';
    audit_entity_type := 'rfq_invite';
    audit_company_id := rfq_row.company_id;
    notification_company_id := rfq_row.company_id;
    notification_type := 'invitation';
    notification_title := 'Supplier Invited';
    notification_message := invite_row.email
      || ' was invited to quote on '
      || coalesce(rfq_row.title, 'this RFQ')
      || '.';

    select a.id
    into existing_audit_id
    from public.audit_logs a
    where a.action = audit_action
      and a.entity_id = invite_row.id
    order by a.created_at
    limit 1;

    if existing_audit_id is not null then
      return jsonb_build_object(
        'success', true,
        'activity_kind', activity_kind,
        'idempotent', true,
        'audit_id', existing_audit_id
      );
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
      audit_action,
      audit_entity_type,
      invite_row.id,
      actor_user_id,
      audit_company_id,
      jsonb_build_object(
        'rfq_id', rfq_row.id,
        'rfq_title', rfq_row.title,
        'supplier_email', invite_row.email,
        'invite_status', invite_row.status
      )
    )
    returning id into written_audit_id;

    insert into public.notifications (
      title,
      message,
      type,
      is_read,
      company_id,
      source_rfq_id
    )
    values (
      notification_title,
      notification_message,
      notification_type,
      false,
      notification_company_id,
      notification_source_rfq_id
    )
    returning id into written_notification_id;

    return jsonb_build_object(
      'success', true,
      'activity_kind', activity_kind,
      'audit_id', written_audit_id,
      'notification_id', written_notification_id
    );
  end if;

  -- -----------------------------------------------------------------------
  -- rfi_submitted
  -- -----------------------------------------------------------------------
  if activity_kind = 'rfi_submitted' then
    select rfi.*
    into rfi_row
    from public.rfq_rfis rfi
    where rfi.id = p_entity_id
      and rfi.submitted_by = actor_user_id
      and exists (
        select 1
        from public.organization_memberships om
        where om.user_id = actor_user_id
          and om.company_id = rfi.respondent_company_id
          and om.membership_status = 'active'
      );

    if not found then
      return jsonb_build_object(
        'success', false,
        'error_code', 'ENTITY_NOT_FOUND',
        'error_message', 'RFI not found.'
      );
    end if;

    select r.*
    into rfq_row
    from public.rfqs r
    where r.id = rfi_row.rfq_id;

    if not found or rfq_row.company_id is null then
      return jsonb_build_object(
        'success', false,
        'error_code', 'ENTITY_NOT_FOUND',
        'error_message', 'RFI not found.'
      );
    end if;

    notification_source_rfq_id := rfi_row.rfq_id;
    audit_action := 'RFI_SUBMITTED';
    audit_entity_type := 'rfq_rfi';
    audit_company_id := rfi_row.respondent_company_id;
    notification_company_id := rfq_row.company_id;
    notification_type := 'rfi';
    notification_title := 'RFI Submitted';
    notification_message := 'A private RFI was submitted on '
      || coalesce(rfq_row.title, 'this RFQ')
      || '.';

    select a.id
    into existing_audit_id
    from public.audit_logs a
    where a.action = audit_action
      and a.entity_id = rfi_row.id
    order by a.created_at
    limit 1;

    if existing_audit_id is not null then
      return jsonb_build_object(
        'success', true,
        'activity_kind', activity_kind,
        'idempotent', true,
        'audit_id', existing_audit_id
      );
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
      audit_action,
      audit_entity_type,
      rfi_row.id,
      actor_user_id,
      audit_company_id,
      jsonb_build_object(
        'rfq_id', rfi_row.rfq_id,
        'respondent_company_id', rfi_row.respondent_company_id,
        'status', rfi_row.status
      )
    )
    returning id into written_audit_id;

    insert into public.notifications (
      title,
      message,
      type,
      is_read,
      company_id,
      source_rfq_id
    )
    values (
      notification_title,
      notification_message,
      notification_type,
      false,
      notification_company_id,
      notification_source_rfq_id
    )
    returning id into written_notification_id;

    return jsonb_build_object(
      'success', true,
      'activity_kind', activity_kind,
      'audit_id', written_audit_id,
      'notification_id', written_notification_id
    );
  end if;

  -- -----------------------------------------------------------------------
  -- rfi_responded
  -- -----------------------------------------------------------------------
  if activity_kind = 'rfi_responded' then
    select rfi.*
    into rfi_row
    from public.rfq_rfis rfi
    where rfi.id = p_entity_id
      and rfi.status = 'answered'
      and rfi.responded_by = actor_user_id;

    if not found then
      return jsonb_build_object(
        'success', false,
        'error_code', 'ENTITY_NOT_FOUND',
        'error_message', 'RFI response not found.'
      );
    end if;

    select r.*
    into rfq_row
    from public.rfqs r
    where r.id = rfi_row.rfq_id
      and exists (
        select 1
        from public.organization_memberships om
        where om.user_id = actor_user_id
          and om.company_id = r.company_id
          and om.membership_status = 'active'
          and (
            om.workspace_role in ('owner', 'admin')
            or om.procurement_function = 'buyer'
          )
      );

    if not found then
      return jsonb_build_object(
        'success', false,
        'error_code', 'ENTITY_NOT_FOUND',
        'error_message', 'RFI response not found.'
      );
    end if;

    if rfi_row.respondent_company_id is null then
      return jsonb_build_object(
        'success', false,
        'error_code', 'ENTITY_NOT_FOUND',
        'error_message', 'RFI response not found.'
      );
    end if;

    notification_source_rfq_id := rfi_row.rfq_id;
    audit_action := 'RFI_RESPONDED';
    audit_entity_type := 'rfq_rfi';
    audit_company_id := rfq_row.company_id;
    notification_company_id := rfi_row.respondent_company_id;
    notification_type := 'rfi_response';
    notification_title := 'RFI Answered';
    notification_message := 'An issuer response was posted for your RFI on '
      || coalesce(rfq_row.title, 'this RFQ')
      || '.';

    select a.id
    into existing_audit_id
    from public.audit_logs a
    where a.action = audit_action
      and a.entity_id = rfi_row.id
    order by a.created_at
    limit 1;

    if existing_audit_id is not null then
      return jsonb_build_object(
        'success', true,
        'activity_kind', activity_kind,
        'idempotent', true,
        'audit_id', existing_audit_id
      );
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
      audit_action,
      audit_entity_type,
      rfi_row.id,
      actor_user_id,
      audit_company_id,
      jsonb_build_object(
        'rfq_id', rfi_row.rfq_id,
        'respondent_company_id', rfi_row.respondent_company_id,
        'status', rfi_row.status
      )
    )
    returning id into written_audit_id;

    insert into public.notifications (
      title,
      message,
      type,
      is_read,
      company_id,
      source_rfq_id
    )
    values (
      notification_title,
      notification_message,
      notification_type,
      false,
      notification_company_id,
      notification_source_rfq_id
    )
    returning id into written_notification_id;

    return jsonb_build_object(
      'success', true,
      'activity_kind', activity_kind,
      'audit_id', written_audit_id,
      'notification_id', written_notification_id
    );
  end if;

  -- -----------------------------------------------------------------------
  -- addendum_published
  -- -----------------------------------------------------------------------
  if activity_kind = 'addendum_published' then
    select a.*
    into addendum_row
    from public.rfq_addenda a
    where a.id = p_entity_id
      and a.created_by = actor_user_id;

    if not found then
      return jsonb_build_object(
        'success', false,
        'error_code', 'ENTITY_NOT_FOUND',
        'error_message', 'Addendum not found.'
      );
    end if;

    select r.*
    into rfq_row
    from public.rfqs r
    where r.id = addendum_row.rfq_id
      and exists (
        select 1
        from public.organization_memberships om
        where om.user_id = actor_user_id
          and om.company_id = r.company_id
          and om.membership_status = 'active'
          and (
            om.workspace_role in ('owner', 'admin')
            or om.procurement_function = 'buyer'
          )
      );

    if not found then
      return jsonb_build_object(
        'success', false,
        'error_code', 'ENTITY_NOT_FOUND',
        'error_message', 'Addendum not found.'
      );
    end if;

    notification_source_rfq_id := addendum_row.rfq_id;
    issuer_company_id := rfq_row.company_id;
    audit_action := 'ADDENDUM_PUBLISHED';
    audit_entity_type := 'rfq_addendum';
    audit_company_id := issuer_company_id;
    notification_company_id := issuer_company_id;
    notification_type := 'addendum';
    notification_title := 'Addendum Published';
    notification_message := 'Addendum '
      || addendum_row.addendum_number::text
      || ' ('
      || coalesce(addendum_row.title, 'Untitled')
      || ') was published on '
      || coalesce(rfq_row.title, 'this RFQ')
      || '.';

    select a.id
    into existing_audit_id
    from public.audit_logs a
    where a.action = audit_action
      and a.entity_id = addendum_row.id
    order by a.created_at
    limit 1;

    if existing_audit_id is not null then
      return jsonb_build_object(
        'success', true,
        'activity_kind', activity_kind,
        'idempotent', true,
        'audit_id', existing_audit_id
      );
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
      audit_action,
      audit_entity_type,
      addendum_row.id,
      actor_user_id,
      audit_company_id,
      jsonb_build_object(
        'rfq_id', addendum_row.rfq_id,
        'addendum_number', addendum_row.addendum_number,
        'title', addendum_row.title,
        'requires_acknowledgement', addendum_row.requires_acknowledgement
      )
    )
    returning id into written_audit_id;

    insert into public.notifications (
      title,
      message,
      type,
      is_read,
      company_id,
      source_rfq_id
    )
    values (
      notification_title,
      notification_message,
      notification_type,
      false,
      notification_company_id,
      notification_source_rfq_id
    )
    returning id into written_notification_id;

    -- Established respondent fanout: S1 quotes + S2 RFIs + S3 prior
    -- acknowledgements. DISTINCT company_id, issuer excluded. No invite
    -- email→profile bridge and no open-market broadcast.
    for respondent_company_id in
      select distinct established.company_id
      from (
        select q.company_id
        from public.quotes q
        where q.rfq_id = addendum_row.rfq_id
          and q.company_id is not null
          and q.company_id <> issuer_company_id
        union
        select rfi.respondent_company_id
        from public.rfq_rfis rfi
        where rfi.rfq_id = addendum_row.rfq_id
          and rfi.respondent_company_id is not null
          and rfi.respondent_company_id <> issuer_company_id
        union
        select ack.company_id
        from public.rfq_addendum_acknowledgements ack
        where ack.rfq_id = addendum_row.rfq_id
          and ack.company_id is not null
          and ack.company_id <> issuer_company_id
      ) as established(company_id)
    loop
      if addendum_row.requires_acknowledgement = true
        and rfq_row.status = 'open' then
        notification_type := 'addendum_action_required';
        notification_title := 'Addendum Acknowledgement Required';
        notification_message := 'Addendum '
          || addendum_row.addendum_number::text
          || ' ('
          || coalesce(addendum_row.title, 'Untitled')
          || ') was published on '
          || coalesce(rfq_row.title, 'this RFQ')
          || '. Acknowledgement is required before quote submission.';
      else
        notification_type := 'addendum';
        notification_title := 'Addendum Published';
        notification_message := 'Addendum '
          || addendum_row.addendum_number::text
          || ' ('
          || coalesce(addendum_row.title, 'Untitled')
          || ') was published on '
          || coalesce(rfq_row.title, 'this RFQ')
          || '.';
      end if;

      insert into public.notifications (
        title,
        message,
        type,
        is_read,
        company_id,
        source_rfq_id
      )
      values (
        notification_title,
        notification_message,
        notification_type,
        false,
        respondent_company_id,
        notification_source_rfq_id
      );
    end loop;

    return jsonb_build_object(
      'success', true,
      'activity_kind', activity_kind,
      'audit_id', written_audit_id,
      'notification_id', written_notification_id
    );
  end if;

  -- -----------------------------------------------------------------------
  -- addendum_acknowledged
  -- -----------------------------------------------------------------------
  if activity_kind = 'addendum_acknowledged' then
    select ack.*
    into acknowledgement_row
    from public.rfq_addendum_acknowledgements ack
    where ack.id = p_entity_id
      and ack.acknowledged_by = actor_user_id
      and exists (
        select 1
        from public.organization_memberships om
        where om.user_id = actor_user_id
          and om.company_id = ack.company_id
          and om.membership_status = 'active'
      );

    if not found then
      return jsonb_build_object(
        'success', false,
        'error_code', 'ENTITY_NOT_FOUND',
        'error_message', 'Addendum acknowledgement not found.'
      );
    end if;

    select r.*
    into rfq_row
    from public.rfqs r
    where r.id = acknowledgement_row.rfq_id;

    if not found or rfq_row.company_id is null then
      return jsonb_build_object(
        'success', false,
        'error_code', 'ENTITY_NOT_FOUND',
        'error_message', 'Addendum acknowledgement not found.'
      );
    end if;

    notification_source_rfq_id := acknowledgement_row.rfq_id;
    audit_action := 'ADDENDUM_ACKNOWLEDGED';
    audit_entity_type := 'rfq_addendum_acknowledgement';
    audit_company_id := acknowledgement_row.company_id;
    notification_company_id := rfq_row.company_id;
    notification_type := 'addendum_acknowledgement';
    notification_title := 'Addendum Acknowledged';
    notification_message := 'A required addendum was acknowledged on '
      || coalesce(rfq_row.title, 'this RFQ')
      || '.';

    select a.id
    into existing_audit_id
    from public.audit_logs a
    where a.action = audit_action
      and a.entity_id = acknowledgement_row.id
    order by a.created_at
    limit 1;

    if existing_audit_id is not null then
      return jsonb_build_object(
        'success', true,
        'activity_kind', activity_kind,
        'idempotent', true,
        'audit_id', existing_audit_id
      );
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
      audit_action,
      audit_entity_type,
      acknowledgement_row.id,
      actor_user_id,
      audit_company_id,
      jsonb_build_object(
        'rfq_id', acknowledgement_row.rfq_id,
        'addendum_id', acknowledgement_row.addendum_id,
        'respondent_company_id', acknowledgement_row.company_id
      )
    )
    returning id into written_audit_id;

    insert into public.notifications (
      title,
      message,
      type,
      is_read,
      company_id,
      source_rfq_id
    )
    values (
      notification_title,
      notification_message,
      notification_type,
      false,
      notification_company_id,
      notification_source_rfq_id
    )
    returning id into written_notification_id;

    return jsonb_build_object(
      'success', true,
      'activity_kind', activity_kind,
      'audit_id', written_audit_id,
      'notification_id', written_notification_id
    );
  end if;

  return jsonb_build_object(
    'success', false,
    'error_code', 'INVALID_ACTIVITY_KIND',
    'error_message', 'Unsupported procurement activity.'
  );
end;
$$;


ALTER FUNCTION "public"."record_procurement_activity"("p_activity_kind" "text", "p_entity_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."record_procurement_activity"("p_activity_kind" "text", "p_entity_id" "uuid") IS 'Records allowlisted procurement activity. Actor is auth.uid(). Caller cannot supply company_id, action, title, message, or metadata. Supports rfq_created, quote_submitted, rfq_invitation_sent, rfi_submitted, rfi_responded, addendum_published, and addendum_acknowledged. quote_submitted notification audience remains the buyer RFQ company only. addendum_published fans out to established respondent companies from quotes, rfq_rfis, and prior addendum acknowledgements (issuer excluded); required open Addenda use notification.type addendum_action_required.';



CREATE OR REPLACE FUNCTION "public"."record_rfq_award_workspace_activity"("p_quote_id" "uuid", "p_actor_user_id" "uuid", "p_actor_workspace_role" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
declare
  awarded_quote public.quotes%rowtype;
  rfq_row public.rfqs%rowtype;
  amount_label text;
  owner_audit_exists boolean;
  supplier_audit_exists boolean;
begin
  if p_quote_id is null or p_actor_user_id is null then
    return;
  end if;

  select q.*
  into awarded_quote
  from public.quotes q
  where q.id = p_quote_id
    and q.decision = 'awarded';

  if not found then
    return;
  end if;

  select r.*
  into rfq_row
  from public.rfqs r
  where r.id = awarded_quote.rfq_id
    and r.awarded_quote_id = awarded_quote.id;

  if not found then
    return;
  end if;

  amount_label := '$' || trim(
    to_char(
      round(coalesce(awarded_quote.amount, 0)::numeric, 0),
      'FM999,999,999,990'
    )
  );

  select exists (
    select 1
    from public.audit_logs a
    where a.action = 'CONTRACT_AWARDED'
      and a.entity_type = 'quote'
      and a.entity_id = awarded_quote.id
      and a.company_id = rfq_row.company_id
  )
  into owner_audit_exists;

  if not owner_audit_exists then
    insert into public.audit_logs (
      action,
      entity_type,
      entity_id,
      user_id,
      company_id,
      metadata
    )
    values (
      'CONTRACT_AWARDED',
      'quote',
      awarded_quote.id,
      p_actor_user_id,
      rfq_row.company_id,
      jsonb_build_object(
        'rfq_id', rfq_row.id,
        'rfq_slug', rfq_row.slug,
        'rfq_title', rfq_row.title,
        'awarded_amount', awarded_quote.amount,
        'awarded_quote_id', awarded_quote.id,
        'awarded_company_id', awarded_quote.company_id,
        'awarded_user_id', awarded_quote.user_id,
        'awarded_by_workspace_role', p_actor_workspace_role,
        'awarded_at', awarded_quote.awarded_at
      )
    );

    insert into public.notifications (
      title,
      message,
      type,
      is_read,
      company_id,
      source_rfq_id
    )
    values (
      'Contract Awarded',
      coalesce(rfq_row.title, 'Project')
        || ' procurement contract has been awarded at '
        || amount_label
        || '.',
      'award',
      false,
      rfq_row.company_id,
      rfq_row.id
    );
  end if;

  if awarded_quote.company_id is null then
    return;
  end if;

  select exists (
    select 1
    from public.audit_logs a
    where a.action = 'CONTRACT_AWARD_RECEIVED'
      and a.entity_type = 'quote'
      and a.entity_id = awarded_quote.id
      and a.company_id = awarded_quote.company_id
  )
  into supplier_audit_exists;

  if supplier_audit_exists then
    return;
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
    'CONTRACT_AWARD_RECEIVED',
    'quote',
    awarded_quote.id,
    p_actor_user_id,
    awarded_quote.company_id,
    jsonb_build_object(
      'rfq_id', rfq_row.id,
      'rfq_slug', rfq_row.slug,
      'rfq_title', rfq_row.title,
      'awarded_amount', awarded_quote.amount,
      'awarded_quote_id', awarded_quote.id,
      'buyer_company_id', rfq_row.company_id,
      'recipient_company_id', awarded_quote.company_id,
      'recipient_user_id', awarded_quote.user_id,
      'awarded_at', awarded_quote.awarded_at
    )
  );

  insert into public.notifications (
    title,
    message,
    type,
    is_read,
    company_id,
    source_rfq_id
  )
  values (
    'Contract Awarded',
    coalesce(rfq_row.title, 'Project')
      || ' contract award was received at '
      || amount_label
      || '.',
    'award',
    false,
    awarded_quote.company_id,
    rfq_row.id
  );
end;
$_$;


ALTER FUNCTION "public"."record_rfq_award_workspace_activity"("p_quote_id" "uuid", "p_actor_user_id" "uuid", "p_actor_workspace_role" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."record_rfq_award_workspace_activity"("p_quote_id" "uuid", "p_actor_user_id" "uuid", "p_actor_workspace_role" "text") IS 'Internal award activity writer. Derives buyer and supplier company_id from the awarded quote/RFQ. Callers cannot choose a destination company. Not granted to authenticated clients.';



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


CREATE OR REPLACE FUNCTION "public"."replace_company_capabilities"("p_company_id" "uuid", "p_capabilities" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  actor_user_id uuid;
  actor_workspace_role text;
  capability_key text;
  capability_labels jsonb;
  capability_element jsonb;
  capability_label text;
  normalized_label text;
  normalized_labels text[] := array[]::text[];
  seen_labels text[] := array[]::text[];
  insert_sort_order integer;
  inserted_count integer := 0;
begin
  actor_user_id := auth.uid();

  if actor_user_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHENTICATED',
      'error_message', 'Authentication is required.'
    );
  end if;

  if p_company_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_COMPANY',
      'error_message', 'A company workspace is required.'
    );
  end if;

  if p_capabilities is null or jsonb_typeof(p_capabilities) <> 'object' then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_PAYLOAD',
      'error_message', 'Capabilities payload must be an object.'
    );
  end if;

  select om.workspace_role
  into actor_workspace_role
  from public.organization_memberships as om
  where om.user_id = actor_user_id
    and om.company_id = p_company_id
    and om.membership_status = 'active'
  limit 1;

  if actor_workspace_role is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'FORBIDDEN',
      'error_message', 'An active workspace membership is required.'
    );
  end if;

  if actor_workspace_role not in ('owner', 'admin') then
    return jsonb_build_object(
      'success', false,
      'error_code', 'FORBIDDEN',
      'error_message', 'Only workspace owners and administrators can update company capabilities.'
    );
  end if;

  for capability_key in
    select jsonb_object_keys(p_capabilities)
  loop
    if capability_key not in ('trade', 'service', 'product', 'region') then
      return jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_CAPABILITY_TYPE',
        'error_message', 'Capability type must be trade, service, product, or region.'
      );
    end if;

    capability_labels := p_capabilities -> capability_key;

    if jsonb_typeof(capability_labels) <> 'array' then
      return jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_CAPABILITY_GROUP',
        'error_message', format('Capability group %s must be an array.', capability_key)
      );
    end if;

    if jsonb_array_length(capability_labels) > 40 then
      return jsonb_build_object(
        'success', false,
        'error_code', 'CAPABILITY_LIMIT_EXCEEDED',
        'error_message', format('Capability group %s exceeds the maximum of 40 entries.', capability_key)
      );
    end if;

    normalized_labels := array[]::text[];
    seen_labels := array[]::text[];

    for capability_element in
      select value
      from jsonb_array_elements(capability_labels) as entries(value)
    loop
      if jsonb_typeof(capability_element) <> 'string' then
        return jsonb_build_object(
          'success', false,
          'error_code', 'INVALID_CAPABILITY_LABEL',
          'error_message', 'Capability labels must be strings.'
        );
      end if;

      capability_label := capability_element #>> '{}';
      normalized_label := regexp_replace(btrim(coalesce(capability_label, '')), '\s+', ' ', 'g');

      if normalized_label = '' then
        return jsonb_build_object(
          'success', false,
          'error_code', 'INVALID_CAPABILITY_LABEL',
          'error_message', 'Capability labels must be non-empty.'
        );
      end if;

      if char_length(normalized_label) > 120 then
        return jsonb_build_object(
          'success', false,
          'error_code', 'INVALID_CAPABILITY_LABEL',
          'error_message', 'Capability labels must be 120 characters or fewer.'
        );
      end if;

      if lower(normalized_label) = any(seen_labels) then
        return jsonb_build_object(
          'success', false,
          'error_code', 'DUPLICATE_CAPABILITY_LABEL',
          'error_message', format('Duplicate capability label detected in %s.', capability_key)
        );
      end if;

      seen_labels := array_append(seen_labels, lower(normalized_label));
      normalized_labels := array_append(normalized_labels, normalized_label);
    end loop;
  end loop;

  delete from public.company_capabilities
  where company_id = p_company_id;

  for capability_key in
    select unnest(array['trade', 'service', 'product', 'region']::text[])
  loop
    capability_labels := coalesce(p_capabilities -> capability_key, '[]'::jsonb);
    insert_sort_order := 0;

    for capability_element in
      select value
      from jsonb_array_elements(capability_labels) as entries(value)
    loop
      if jsonb_typeof(capability_element) <> 'string' then
        return jsonb_build_object(
          'success', false,
          'error_code', 'INVALID_CAPABILITY_LABEL',
          'error_message', 'Capability labels must be strings.'
        );
      end if;

      capability_label := capability_element #>> '{}';
      normalized_label := regexp_replace(btrim(coalesce(capability_label, '')), '\s+', ' ', 'g');

      insert into public.company_capabilities (
        company_id,
        capability_type,
        label,
        sort_order
      )
      values (
        p_company_id,
        capability_key,
        normalized_label,
        insert_sort_order
      );

      insert_sort_order := insert_sort_order + 1;
      inserted_count := inserted_count + 1;
    end loop;
  end loop;

  return jsonb_build_object(
    'success', true,
    'company_id', p_company_id,
    'capability_count', inserted_count
  );
end;
$$;


ALTER FUNCTION "public"."replace_company_capabilities"("p_company_id" "uuid", "p_capabilities" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."replace_company_capabilities"("p_company_id" "uuid", "p_capabilities" "jsonb") IS 'Atomically replaces all capability tags for a company. Owner/admin only.';



CREATE OR REPLACE FUNCTION "public"."replace_company_compliance"("p_company_id" "uuid", "p_compliance" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $_$
declare
  actor_user_id uuid;
  actor_workspace_role text;
  compliance_key text;
  compliance_field text;
  compliance_items jsonb;
  compliance_item jsonb;
  normalized_name text;
  normalized_provider text;
  normalized_effective_on date;
  normalized_expires_on date;
  dedupe_key text;
  seen_keys text[] := array[]::text[];
  insert_sort_order integer;
  inserted_count integer := 0;
  counts_by_type jsonb := jsonb_build_object(
    'insurance', 0,
    'workers_compensation', 0,
    'safety', 0
  );
begin
  actor_user_id := auth.uid();

  if actor_user_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHENTICATED',
      'error_message', 'Authentication is required.'
    );
  end if;

  if p_company_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_COMPANY',
      'error_message', 'A company workspace is required.'
    );
  end if;

  select om.workspace_role
  into actor_workspace_role
  from public.organization_memberships as om
  where om.user_id = actor_user_id
    and om.company_id = p_company_id
    and om.membership_status = 'active'
  limit 1;

  if actor_workspace_role is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'FORBIDDEN',
      'error_message', 'An active workspace membership is required.'
    );
  end if;

  if actor_workspace_role not in ('owner', 'admin') then
    return jsonb_build_object(
      'success', false,
      'error_code', 'FORBIDDEN',
      'error_message', 'Only workspace owners and administrators can update company compliance.'
    );
  end if;

  if p_compliance is null or jsonb_typeof(p_compliance) <> 'object' then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_PAYLOAD',
      'error_message', 'Compliance payload must be an object.'
    );
  end if;

  for compliance_key in
    select jsonb_object_keys(p_compliance)
  loop
    if compliance_key not in ('insurance', 'workers_compensation', 'safety') then
      return jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_COMPLIANCE_TYPE',
        'error_message', 'Compliance type must be insurance, workers_compensation, or safety.'
      );
    end if;

    compliance_items := p_compliance -> compliance_key;

    if jsonb_typeof(compliance_items) <> 'array' then
      return jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_COMPLIANCE_GROUP',
        'error_message', format('Compliance group %s must be an array.', compliance_key)
      );
    end if;

    if jsonb_array_length(compliance_items) > 40 then
      return jsonb_build_object(
        'success', false,
        'error_code', 'COMPLIANCE_LIMIT_EXCEEDED',
        'error_message', format('Compliance group %s exceeds the maximum of 40 entries.', compliance_key)
      );
    end if;

    seen_keys := array[]::text[];

    for compliance_item in
      select value
      from jsonb_array_elements(compliance_items) as entries(value)
    loop
      if jsonb_typeof(compliance_item) <> 'object' then
        return jsonb_build_object(
          'success', false,
          'error_code', 'INVALID_COMPLIANCE_ITEM',
          'error_message', 'Each compliance record must be an object.'
        );
      end if;

      for compliance_field in
        select jsonb_object_keys(compliance_item)
      loop
        if compliance_field not in ('name','provider','effective_on','expires_on') then
          return jsonb_build_object(
            'success', false,
            'error_code', 'INVALID_COMPLIANCE_FIELD',
            'error_message', 'Compliance record contains an unsupported field.'
          );
        end if;
      end loop;

      if not (compliance_item ? 'name')
        or jsonb_typeof(compliance_item -> 'name') is distinct from 'string' then
        return jsonb_build_object(
          'success', false,
          'error_code', 'INVALID_COMPLIANCE_NAME',
          'error_message', 'Compliance name must be a string.'
        );
      end if;

      normalized_name := btrim(regexp_replace(compliance_item ->> 'name', '\s+', ' ', 'g'));

      if normalized_name = '' then
        return jsonb_build_object(
          'success', false,
          'error_code', 'INVALID_COMPLIANCE_NAME',
          'error_message', 'Compliance name must be non-empty.'
        );
      end if;

      if char_length(normalized_name) > 160 then
        return jsonb_build_object(
          'success', false,
          'error_code', 'INVALID_COMPLIANCE_NAME',
          'error_message', 'Compliance name must be 160 characters or fewer.'
        );
      end if;

      if compliance_item ? 'provider' then
        if jsonb_typeof(compliance_item -> 'provider') = 'null' then
          normalized_provider := null;
        elsif jsonb_typeof(compliance_item -> 'provider') <> 'string' then
          return jsonb_build_object(
            'success', false,
            'error_code', 'INVALID_COMPLIANCE_PROVIDER',
            'error_message', 'Compliance provider must be a string or null.'
          );
        else
          normalized_provider := btrim(regexp_replace(compliance_item ->> 'provider', '\s+', ' ', 'g'));

          if normalized_provider = '' then
            normalized_provider := null;
          elsif char_length(normalized_provider) > 160 then
            return jsonb_build_object(
              'success', false,
              'error_code', 'INVALID_COMPLIANCE_PROVIDER',
              'error_message', 'Compliance provider must be 160 characters or fewer.'
            );
          end if;
        end if;
      else
        normalized_provider := null;
      end if;

      if compliance_item ? 'effective_on' then
        if jsonb_typeof(compliance_item -> 'effective_on') = 'null' then
          normalized_effective_on := null;
        elsif jsonb_typeof(compliance_item -> 'effective_on') <> 'string' then
          return jsonb_build_object(
            'success', false,
            'error_code', 'INVALID_COMPLIANCE_DATE',
            'error_message', 'Effective date must be an ISO date string or null.'
          );
        else
          if (compliance_item ->> 'effective_on') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
            return jsonb_build_object(
              'success', false,
              'error_code', 'INVALID_COMPLIANCE_DATE',
              'error_message', 'Effective date must use YYYY-MM-DD format.'
            );
          end if;

          begin
            normalized_effective_on := (compliance_item ->> 'effective_on')::date;
          exception
            when others then
              return jsonb_build_object(
                'success', false,
                'error_code', 'INVALID_COMPLIANCE_DATE',
                'error_message', 'Effective date must be a valid calendar date.'
              );
          end;
        end if;
      else
        normalized_effective_on := null;
      end if;

      if compliance_item ? 'expires_on' then
        if jsonb_typeof(compliance_item -> 'expires_on') = 'null' then
          normalized_expires_on := null;
        elsif jsonb_typeof(compliance_item -> 'expires_on') <> 'string' then
          return jsonb_build_object(
            'success', false,
            'error_code', 'INVALID_COMPLIANCE_DATE',
            'error_message', 'Expiry date must be an ISO date string or null.'
          );
        else
          if (compliance_item ->> 'expires_on') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
            return jsonb_build_object(
              'success', false,
              'error_code', 'INVALID_COMPLIANCE_DATE',
              'error_message', 'Expiry date must use YYYY-MM-DD format.'
            );
          end if;

          begin
            normalized_expires_on := (compliance_item ->> 'expires_on')::date;
          exception
            when others then
              return jsonb_build_object(
                'success', false,
                'error_code', 'INVALID_COMPLIANCE_DATE',
                'error_message', 'Expiry date must be a valid calendar date.'
              );
          end;
        end if;
      else
        normalized_expires_on := null;
      end if;

      if normalized_effective_on is not null
        and normalized_expires_on is not null
        and normalized_expires_on < normalized_effective_on then
        return jsonb_build_object(
          'success', false,
          'error_code', 'INVALID_COMPLIANCE_DATE',
          'error_message', 'Expiry date must be on or after the effective date.'
        );
      end if;

      dedupe_key := jsonb_build_array(
        compliance_key,
        lower(normalized_name),
        lower(coalesce(normalized_provider, ''))
      )::text;

      if dedupe_key = any(seen_keys) then
        return jsonb_build_object(
          'success', false,
          'error_code', 'DUPLICATE_COMPLIANCE',
          'error_message', format('Duplicate compliance record detected in %s.', compliance_key)
        );
      end if;

      seen_keys := array_append(seen_keys, dedupe_key);
    end loop;
  end loop;

  delete from public.company_compliance
  where company_id = p_company_id;

  for compliance_key in
    select unnest(array['insurance', 'workers_compensation', 'safety']::text[])
  loop
    compliance_items := coalesce(p_compliance -> compliance_key, '[]'::jsonb);
    insert_sort_order := 0;

    for compliance_item in
      select value
      from jsonb_array_elements(compliance_items) as entries(value)
    loop
      normalized_name := btrim(regexp_replace(compliance_item ->> 'name', '\s+', ' ', 'g'));

      if compliance_item ? 'provider'
        and jsonb_typeof(compliance_item -> 'provider') = 'string' then
        normalized_provider := nullif(
          btrim(regexp_replace(compliance_item ->> 'provider', '\s+', ' ', 'g')),
          ''
        );
      else
        normalized_provider := null;
      end if;

      if compliance_item ? 'effective_on'
        and jsonb_typeof(compliance_item -> 'effective_on') = 'string' then
        normalized_effective_on := (compliance_item ->> 'effective_on')::date;
      else
        normalized_effective_on := null;
      end if;

      if compliance_item ? 'expires_on'
        and jsonb_typeof(compliance_item -> 'expires_on') = 'string' then
        normalized_expires_on := (compliance_item ->> 'expires_on')::date;
      else
        normalized_expires_on := null;
      end if;

      insert into public.company_compliance (
        company_id, compliance_type, name, provider, effective_on, expires_on, sort_order
      ) values (
        p_company_id, compliance_key, normalized_name, normalized_provider,
        normalized_effective_on, normalized_expires_on, insert_sort_order
      );

      insert_sort_order := insert_sort_order + 1;
      inserted_count := inserted_count + 1;
    end loop;

    counts_by_type := jsonb_set(
      counts_by_type,
      array[compliance_key],
      to_jsonb(insert_sort_order)
    );
  end loop;

  insert into public.audit_logs (
    action, entity_type, entity_id, user_id, company_id, metadata
  ) values (
    'COMPANY_COMPLIANCE_UPDATED',
    'company',
    p_company_id,
    actor_user_id,
    p_company_id,
    jsonb_build_object(
      'compliance_count', inserted_count,
      'counts_by_type', counts_by_type,
      'updated_by', jsonb_build_object(
        'id', actor_user_id,
        'workspace_role', actor_workspace_role
      ),
      'updated_at', to_char(
        now() at time zone 'utc',
        'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
      )
    )
  );

  return jsonb_build_object(
    'success', true,
    'company_id', p_company_id,
    'compliance_count', inserted_count,
    'counts_by_type', counts_by_type,
    'audited', true
  );
end;
$_$;


ALTER FUNCTION "public"."replace_company_compliance"("p_company_id" "uuid", "p_compliance" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."replace_company_compliance"("p_company_id" "uuid", "p_compliance" "jsonb") IS 'Atomically replaces all compliance records for a company and emits the COMPANY_COMPLIANCE_UPDATED audit event in the same transaction. Owner/admin only.';



CREATE OR REPLACE FUNCTION "public"."replace_company_qualifications"("p_company_id" "uuid", "p_qualifications" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $_$
declare
  actor_user_id uuid;
  actor_workspace_role text;
  qualification_key text;
  qualification_field text;
  qualification_items jsonb;
  qualification_item jsonb;
  normalized_name text;
  normalized_issuer text;
  normalized_identifier text;
  normalized_issued_on date;
  normalized_expires_on date;
  normalized_is_public boolean;
  dedupe_key text;
  seen_keys text[] := array[]::text[];
  insert_sort_order integer;
  inserted_count integer := 0;
  public_count integer := 0;
  counts_by_type jsonb := jsonb_build_object(
    'license', 0,
    'certification', 0,
    'accreditation', 0,
    'registration', 0
  );
begin
  actor_user_id := auth.uid();

  if actor_user_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHENTICATED',
      'error_message', 'Authentication is required.'
    );
  end if;

  if p_company_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_COMPANY',
      'error_message', 'A company workspace is required.'
    );
  end if;

  select om.workspace_role
  into actor_workspace_role
  from public.organization_memberships as om
  where om.user_id = actor_user_id
    and om.company_id = p_company_id
    and om.membership_status = 'active'
  limit 1;

  if actor_workspace_role is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'FORBIDDEN',
      'error_message', 'An active workspace membership is required.'
    );
  end if;

  if actor_workspace_role not in ('owner', 'admin') then
    return jsonb_build_object(
      'success', false,
      'error_code', 'FORBIDDEN',
      'error_message', 'Only workspace owners and administrators can update company qualifications.'
    );
  end if;

  -- Payload validation begins only after owner/admin authority is established so
  -- that a direct RPC caller cannot probe payload shape without write authority.
  if p_qualifications is null or jsonb_typeof(p_qualifications) <> 'object' then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_PAYLOAD',
      'error_message', 'Qualifications payload must be an object.'
    );
  end if;

  for qualification_key in
    select jsonb_object_keys(p_qualifications)
  loop
    if qualification_key not in ('license', 'certification', 'accreditation', 'registration') then
      return jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_QUALIFICATION_TYPE',
        'error_message', 'Qualification type must be license, certification, accreditation, or registration.'
      );
    end if;

    qualification_items := p_qualifications -> qualification_key;

    if jsonb_typeof(qualification_items) <> 'array' then
      return jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_QUALIFICATION_GROUP',
        'error_message', format('Qualification group %s must be an array.', qualification_key)
      );
    end if;

    if jsonb_array_length(qualification_items) > 40 then
      return jsonb_build_object(
        'success', false,
        'error_code', 'QUALIFICATION_LIMIT_EXCEEDED',
        'error_message', format('Qualification group %s exceeds the maximum of 40 entries.', qualification_key)
      );
    end if;

    seen_keys := array[]::text[];

    for qualification_item in
      select value
      from jsonb_array_elements(qualification_items) as entries(value)
    loop
      if jsonb_typeof(qualification_item) <> 'object' then
        return jsonb_build_object(
          'success', false,
          'error_code', 'INVALID_QUALIFICATION_ITEM',
          'error_message', 'Each qualification must be an object.'
        );
      end if;

      for qualification_field in
        select jsonb_object_keys(qualification_item)
      loop
        if qualification_field not in (
          'name',
          'issuer',
          'credential_identifier',
          'issued_on',
          'expires_on',
          'is_public'
        ) then
          return jsonb_build_object(
            'success', false,
            'error_code', 'INVALID_QUALIFICATION_FIELD',
            'error_message', 'Qualification contains an unsupported field.'
          );
        end if;
      end loop;

      if not (qualification_item ? 'name')
        or jsonb_typeof(qualification_item -> 'name') is distinct from 'string' then
        return jsonb_build_object(
          'success', false,
          'error_code', 'INVALID_QUALIFICATION_NAME',
          'error_message', 'Qualification name must be a string.'
        );
      end if;

      normalized_name := btrim(
        regexp_replace(qualification_item ->> 'name', '\s+', ' ', 'g')
      );

      if normalized_name = '' then
        return jsonb_build_object(
          'success', false,
          'error_code', 'INVALID_QUALIFICATION_NAME',
          'error_message', 'Qualification name must be non-empty.'
        );
      end if;

      if char_length(normalized_name) > 160 then
        return jsonb_build_object(
          'success', false,
          'error_code', 'INVALID_QUALIFICATION_NAME',
          'error_message', 'Qualification name must be 160 characters or fewer.'
        );
      end if;

      if qualification_item ? 'issuer' then
        if jsonb_typeof(qualification_item -> 'issuer') = 'null' then
          normalized_issuer := null;
        elsif jsonb_typeof(qualification_item -> 'issuer') <> 'string' then
          return jsonb_build_object(
            'success', false,
            'error_code', 'INVALID_QUALIFICATION_ISSUER',
            'error_message', 'Qualification issuer must be a string or null.'
          );
        else
          normalized_issuer := btrim(
            regexp_replace(qualification_item ->> 'issuer', '\s+', ' ', 'g')
          );

          if normalized_issuer = '' then
            normalized_issuer := null;
          elsif char_length(normalized_issuer) > 160 then
            return jsonb_build_object(
              'success', false,
              'error_code', 'INVALID_QUALIFICATION_ISSUER',
              'error_message', 'Qualification issuer must be 160 characters or fewer.'
            );
          end if;
        end if;
      else
        normalized_issuer := null;
      end if;

      if qualification_item ? 'credential_identifier' then
        if jsonb_typeof(qualification_item -> 'credential_identifier') = 'null' then
          normalized_identifier := null;
        elsif jsonb_typeof(qualification_item -> 'credential_identifier') <> 'string' then
          return jsonb_build_object(
            'success', false,
            'error_code', 'INVALID_QUALIFICATION_IDENTIFIER',
            'error_message', 'Credential identifier must be a string or null.'
          );
        else
          normalized_identifier := btrim(
            regexp_replace(
              qualification_item ->> 'credential_identifier',
              '\s+',
              ' ',
              'g'
            )
          );

          if normalized_identifier = '' then
            normalized_identifier := null;
          elsif char_length(normalized_identifier) > 120 then
            return jsonb_build_object(
              'success', false,
              'error_code', 'INVALID_QUALIFICATION_IDENTIFIER',
              'error_message', 'Credential identifier must be 120 characters or fewer.'
            );
          end if;
        end if;
      else
        normalized_identifier := null;
      end if;

      if qualification_item ? 'issued_on' then
        if jsonb_typeof(qualification_item -> 'issued_on') = 'null' then
          normalized_issued_on := null;
        elsif jsonb_typeof(qualification_item -> 'issued_on') <> 'string' then
          return jsonb_build_object(
            'success', false,
            'error_code', 'INVALID_QUALIFICATION_DATE',
            'error_message', 'Issued date must be an ISO date string or null.'
          );
        else
          if (qualification_item ->> 'issued_on') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
            return jsonb_build_object(
              'success', false,
              'error_code', 'INVALID_QUALIFICATION_DATE',
              'error_message', 'Issued date must use YYYY-MM-DD format.'
            );
          end if;

          begin
            normalized_issued_on := (qualification_item ->> 'issued_on')::date;
          exception
            when others then
              return jsonb_build_object(
                'success', false,
                'error_code', 'INVALID_QUALIFICATION_DATE',
                'error_message', 'Issued date must be a valid calendar date.'
              );
          end;
        end if;
      else
        normalized_issued_on := null;
      end if;

      if qualification_item ? 'expires_on' then
        if jsonb_typeof(qualification_item -> 'expires_on') = 'null' then
          normalized_expires_on := null;
        elsif jsonb_typeof(qualification_item -> 'expires_on') <> 'string' then
          return jsonb_build_object(
            'success', false,
            'error_code', 'INVALID_QUALIFICATION_DATE',
            'error_message', 'Expiry date must be an ISO date string or null.'
          );
        else
          if (qualification_item ->> 'expires_on') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
            return jsonb_build_object(
              'success', false,
              'error_code', 'INVALID_QUALIFICATION_DATE',
              'error_message', 'Expiry date must use YYYY-MM-DD format.'
            );
          end if;

          begin
            normalized_expires_on := (qualification_item ->> 'expires_on')::date;
          exception
            when others then
              return jsonb_build_object(
                'success', false,
                'error_code', 'INVALID_QUALIFICATION_DATE',
                'error_message', 'Expiry date must be a valid calendar date.'
              );
          end;
        end if;
      else
        normalized_expires_on := null;
      end if;

      if normalized_issued_on is not null
        and normalized_expires_on is not null
        and normalized_expires_on < normalized_issued_on then
        return jsonb_build_object(
          'success', false,
          'error_code', 'INVALID_QUALIFICATION_DATE',
          'error_message', 'Expiry date must be on or after the issued date.'
        );
      end if;

      if not (qualification_item ? 'is_public') then
        return jsonb_build_object(
          'success', false,
          'error_code', 'INVALID_QUALIFICATION_VISIBILITY',
          'error_message', 'Qualification visibility must be provided as a boolean.'
        );
      end if;

      if jsonb_typeof(qualification_item -> 'is_public') <> 'boolean' then
        return jsonb_build_object(
          'success', false,
          'error_code', 'INVALID_QUALIFICATION_VISIBILITY',
          'error_message', 'Qualification visibility must be a boolean.'
        );
      end if;

      normalized_is_public := (qualification_item ->> 'is_public')::boolean;

      dedupe_key := jsonb_build_array(
        qualification_key,
        lower(normalized_name),
        lower(coalesce(normalized_issuer, '')),
        lower(coalesce(normalized_identifier, ''))
      )::text;

      if dedupe_key = any(seen_keys) then
        return jsonb_build_object(
          'success', false,
          'error_code', 'DUPLICATE_QUALIFICATION',
          'error_message', format('Duplicate qualification detected in %s.', qualification_key)
        );
      end if;

      seen_keys := array_append(seen_keys, dedupe_key);
    end loop;
  end loop;

  delete from public.company_qualifications
  where company_id = p_company_id;

  for qualification_key in
    select unnest(array['license', 'certification', 'accreditation', 'registration']::text[])
  loop
    qualification_items := coalesce(p_qualifications -> qualification_key, '[]'::jsonb);
    insert_sort_order := 0;
    seen_keys := array[]::text[];

    for qualification_item in
      select value
      from jsonb_array_elements(qualification_items) as entries(value)
    loop
      normalized_name := btrim(
        regexp_replace(qualification_item ->> 'name', '\s+', ' ', 'g')
      );

      if qualification_item ? 'issuer'
        and jsonb_typeof(qualification_item -> 'issuer') = 'string' then
        normalized_issuer := nullif(
          btrim(regexp_replace(qualification_item ->> 'issuer', '\s+', ' ', 'g')),
          ''
        );
      else
        normalized_issuer := null;
      end if;

      if qualification_item ? 'credential_identifier'
        and jsonb_typeof(qualification_item -> 'credential_identifier') = 'string' then
        normalized_identifier := nullif(
          btrim(
            regexp_replace(
              qualification_item ->> 'credential_identifier',
              '\s+',
              ' ',
              'g'
            )
          ),
          ''
        );
      else
        normalized_identifier := null;
      end if;

      if qualification_item ? 'issued_on'
        and jsonb_typeof(qualification_item -> 'issued_on') = 'string' then
        normalized_issued_on := (qualification_item ->> 'issued_on')::date;
      else
        normalized_issued_on := null;
      end if;

      if qualification_item ? 'expires_on'
        and jsonb_typeof(qualification_item -> 'expires_on') = 'string' then
        normalized_expires_on := (qualification_item ->> 'expires_on')::date;
      else
        normalized_expires_on := null;
      end if;

      normalized_is_public := coalesce((qualification_item ->> 'is_public')::boolean, false);

      insert into public.company_qualifications (
        company_id,
        qualification_type,
        name,
        issuer,
        credential_identifier,
        issued_on,
        expires_on,
        is_public,
        sort_order
      )
      values (
        p_company_id,
        qualification_key,
        normalized_name,
        normalized_issuer,
        normalized_identifier,
        normalized_issued_on,
        normalized_expires_on,
        normalized_is_public,
        insert_sort_order
      );

      insert_sort_order := insert_sort_order + 1;
      inserted_count := inserted_count + 1;

      if normalized_is_public then
        public_count := public_count + 1;
      end if;
    end loop;

    counts_by_type := jsonb_set(
      counts_by_type,
      array[qualification_key],
      to_jsonb(insert_sort_order)
    );
  end loop;

  -- Audit is emitted by the authoritative write primitive inside the same
  -- transaction, so a replacement cannot commit without its audit event.
  insert into public.audit_logs (
    action,
    entity_type,
    entity_id,
    user_id,
    company_id,
    metadata
  )
  values (
    'COMPANY_QUALIFICATIONS_UPDATED',
    'company',
    p_company_id,
    actor_user_id,
    p_company_id,
    jsonb_build_object(
      'qualification_count', inserted_count,
      'public_count', public_count,
      'counts_by_type', counts_by_type,
      'updated_by', jsonb_build_object(
        'id', actor_user_id,
        'workspace_role', actor_workspace_role
      ),
      'updated_at', to_char(
        now() at time zone 'utc',
        'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
      )
    )
  );

  return jsonb_build_object(
    'success', true,
    'company_id', p_company_id,
    'qualification_count', inserted_count,
    'public_count', public_count,
    'counts_by_type', counts_by_type,
    'audited', true
  );
end;
$_$;


ALTER FUNCTION "public"."replace_company_qualifications"("p_company_id" "uuid", "p_qualifications" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."replace_company_qualifications"("p_company_id" "uuid", "p_qualifications" "jsonb") IS 'Atomically replaces all qualification records for a company and emits the COMPANY_QUALIFICATIONS_UPDATED audit event in the same transaction. Owner/admin only.';



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


CREATE OR REPLACE FUNCTION "public"."resolve_company_workspace_invitation_context"(OUT "resolved_company_id" "uuid", OUT "resolved_workspace_role" "text", OUT "resolution_error_code" "text") RETURNS "record"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
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


ALTER FUNCTION "public"."resolve_company_workspace_invitation_context"(OUT "resolved_company_id" "uuid", OUT "resolved_workspace_role" "text", OUT "resolution_error_code" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."resolve_company_workspace_invitation_context"(OUT "resolved_company_id" "uuid", OUT "resolved_workspace_role" "text", OUT "resolution_error_code" "text") IS 'Resolves the caller''s company workspace for invitation RPCs. Fails closed when profile.company_id is null and multiple active memberships exist.';



CREATE OR REPLACE FUNCTION "public"."resolve_rfi_response_notification_recipient"("p_rfi_id" "uuid") RETURNS TABLE("email" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'Unauthorized';
  end if;

  if p_rfi_id is null then
    return;
  end if;

  return query
  select nullif(lower(btrim(p.email)), '')::text
  from public.rfq_rfis as rfi
  join public.rfqs as r
    on r.id = rfi.rfq_id
  join public.organization_memberships as om
    on om.company_id = r.company_id
   and om.user_id = v_uid
   and om.membership_status = 'active'
   and (
     om.workspace_role in ('owner', 'admin')
     or om.procurement_function = 'buyer'
   )
  join public.profiles as p
    on p.id = rfi.submitted_by
  where rfi.id = p_rfi_id
    and rfi.status = 'answered'
    and rfi.responded_by = v_uid
  limit 1;
end;
$$;


ALTER FUNCTION "public"."resolve_rfi_response_notification_recipient"("p_rfi_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."resolve_rfi_response_notification_recipient"("p_rfi_id" "uuid") IS 'Purpose-bound SECURITY DEFINER helper for private RFI response notification. Returns only the original submitter email after verifying the caller answered the RFI and is an active issuing-company owner/admin or buyer. Does not accept caller-supplied user IDs, company IDs, or email addresses.';



CREATE OR REPLACE FUNCTION "public"."resolve_rfq_addendum_notification_recipients"("p_addendum_id" "uuid") RETURNS TABLE("email" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'Unauthorized';
  end if;

  if p_addendum_id is null then
    return;
  end if;

  return query
  with verified as (
    select
      a.id as addendum_id,
      a.rfq_id,
      r.company_id as issuer_company_id
    from public.rfq_addenda as a
    join public.rfqs as r
      on r.id = a.rfq_id
    join public.organization_memberships as om
      on om.company_id = r.company_id
     and om.user_id = v_uid
     and om.membership_status = 'active'
     and (
       om.workspace_role in ('owner', 'admin')
       or om.procurement_function = 'buyer'
     )
    where a.id = p_addendum_id
      and a.created_by = v_uid
  ),
  invite_emails as (
    select nullif(lower(btrim(i.email)), '') as email
    from verified as v
    join public.rfq_invites as i
      on i.rfq_id = v.rfq_id
    where i.status in ('sent', 'invited')
  ),
  participant_companies as (
    select distinct established.company_id
    from (
      select q.company_id
      from verified as v
      join public.quotes as q
        on q.rfq_id = v.rfq_id
      where q.company_id is not null
        and q.company_id <> v.issuer_company_id
      union
      select rfi.respondent_company_id
      from verified as v
      join public.rfq_rfis as rfi
        on rfi.rfq_id = v.rfq_id
      where rfi.respondent_company_id is not null
        and rfi.respondent_company_id <> v.issuer_company_id
      union
      select ack.company_id
      from verified as v
      join public.rfq_addendum_acknowledgements as ack
        on ack.rfq_id = v.rfq_id
      where ack.company_id is not null
        and ack.company_id <> v.issuer_company_id
    ) as established(company_id)
  ),
  member_emails as (
    select nullif(lower(btrim(p.email)), '') as email
    from participant_companies as pc
    join public.organization_memberships as om
      on om.company_id = pc.company_id
     and om.membership_status = 'active'
    join public.profiles as p
      on p.id = om.user_id
  ),
  issuer_emails as (
    select nullif(lower(btrim(p.email)), '') as email
    from verified as v
    join public.organization_memberships as om
      on om.company_id = v.issuer_company_id
     and om.membership_status = 'active'
    join public.profiles as p
      on p.id = om.user_id
  ),
  candidates as (
    select ie.email
    from invite_emails as ie
    where ie.email is not null
    union
    select me.email
    from member_emails as me
    where me.email is not null
  )
  select c.email::text
  from candidates as c
  where c.email is not null
    and not exists (
      select 1
      from issuer_emails as xe
      where xe.email = c.email
    );
end;
$$;


ALTER FUNCTION "public"."resolve_rfq_addendum_notification_recipients"("p_addendum_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."resolve_rfq_addendum_notification_recipients"("p_addendum_id" "uuid") IS 'Purpose-bound SECURITY DEFINER helper for RFQ Addendum email notification. Returns DISTINCT normalized emails for established respondents: invite emails (sent/invited), and active membership profile emails for quote, RFI, and prior acknowledgement participant companies. Requires the caller published the Addendum and is an active issuing-company owner/admin or buyer. Excludes issuer-company active member emails. Does not accept caller-supplied user IDs, company IDs, or email addresses and does not broadcast to open-market viewers.';



CREATE OR REPLACE FUNCTION "public"."resolve_rfq_award_notification_recipient"("p_quote_id" "uuid") RETURNS TABLE("email" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'Unauthorized';
  end if;

  if p_quote_id is null then
    return;
  end if;

  return query
  select nullif(lower(btrim(p.email)), '')::text
  from public.quotes as q
  join public.rfqs as r
    on r.id = q.rfq_id
   and r.awarded_quote_id = q.id
   and r.status = 'awarded'
  join public.companies as issuer_company
    on issuer_company.id = r.company_id
   and issuer_company.status = 'verified'
   and issuer_company.workspace_status = 'active'
  join public.organization_memberships as issuer_om
    on issuer_om.company_id = r.company_id
   and issuer_om.user_id = v_uid
   and issuer_om.membership_status = 'active'
   and issuer_om.workspace_role in ('owner', 'admin')
  join public.organization_memberships as supplier_om
    on supplier_om.company_id = q.company_id
   and supplier_om.user_id = q.user_id
   and supplier_om.membership_status = 'active'
  join public.profiles as p
    on p.id = q.user_id
  where q.id = p_quote_id
    and q.decision = 'awarded'
    and q.user_id is not null
    and q.company_id is not null
    and q.company_id <> r.company_id
  limit 1;
end;
$$;


ALTER FUNCTION "public"."resolve_rfq_award_notification_recipient"("p_quote_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."resolve_rfq_award_notification_recipient"("p_quote_id" "uuid") IS 'Purpose-bound SECURITY DEFINER helper for Contract Award Supplier email notification. Returns only the awarded Quote submitter email after verifying the Quote is the RFQ awarded Quote, the RFQ is awarded, the Supplier company differs from the issuing company, the issuing company is verified with an active workspace, the caller is an active issuing-company owner/admin, and the submitter holds an active membership on the awarded Supplier company. Does not accept caller-supplied user IDs, company IDs, or email addresses and does not provide generic profile/email lookup.';



CREATE OR REPLACE FUNCTION "public"."revoke_company_workspace_invitation"("p_invitation_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
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


ALTER FUNCTION "public"."revoke_company_workspace_invitation"("p_invitation_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."revoke_company_workspace_invitation"("p_invitation_id" "uuid") IS 'Revokes a pending invitation in the caller''s active company.';



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


CREATE OR REPLACE FUNCTION "public"."update_company_document"("p_company_id" "uuid", "p_document_id" "uuid", "p_document_type" "text", "p_title" "text", "p_file_name" "text", "p_file_path" "text", "p_file_type" "text", "p_file_size" bigint, "p_issued_on" "date", "p_expires_on" "date") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $_$
declare
  actor_user_id uuid;
  actor_workspace_role text;
  current_document public.company_documents%rowtype;
  normalized_title text;
  normalized_file_name text;
  next_file_name text;
  next_file_path text;
  next_file_type text;
  next_file_size bigint;
  old_file_path text;
  document_count integer;
  is_replacement boolean;
begin
  actor_user_id := auth.uid();

  if actor_user_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHENTICATED',
      'error_message', 'Authentication is required.'
    );
  end if;

  if p_company_id is null
    or not exists (
      select 1
      from public.companies as c
      where c.id = p_company_id
    )
  then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_COMPANY',
      'error_message', 'Company not found.'
    );
  end if;

  select om.workspace_role
    into actor_workspace_role
  from public.organization_memberships as om
  where om.user_id = actor_user_id
    and om.company_id = p_company_id
    and om.membership_status = 'active';

  if actor_workspace_role is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'FORBIDDEN',
      'error_message', 'An active workspace membership is required.'
    );
  end if;

  if actor_workspace_role not in ('owner', 'admin') then
    return jsonb_build_object(
      'success', false,
      'error_code', 'FORBIDDEN',
      'error_message', 'Only owners and administrators can manage company documents.'
    );
  end if;

  select *
    into current_document
  from public.company_documents
  where id = p_document_id
    and company_id = p_company_id;

  if current_document.id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'DOCUMENT_NOT_FOUND',
      'error_message', 'Document not found.'
    );
  end if;

  if p_document_type is null or p_title is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_PAYLOAD',
      'error_message', 'A complete document payload is required.'
    );
  end if;

  if p_document_type not in (
    'insurance',
    'workers_compensation',
    'safety',
    'qualification',
    'other'
  ) then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_DOCUMENT_TYPE',
      'error_message', 'Document type is not supported.'
    );
  end if;

  normalized_title := btrim(regexp_replace(p_title, '\s+', ' ', 'g'));

  if normalized_title = '' or char_length(normalized_title) > 160 then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_TITLE',
      'error_message', 'Document title must be non-empty and 160 characters or fewer.'
    );
  end if;

  if p_issued_on is not null
    and p_expires_on is not null
    and p_expires_on < p_issued_on
  then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_DOCUMENT_DATE',
      'error_message', 'Expiry date must be on or after the issued date.'
    );
  end if;

  is_replacement := p_file_path is not null and p_file_path is distinct from current_document.file_path;

  if is_replacement then
    normalized_file_name := btrim(regexp_replace(coalesce(p_file_name, ''), '\s+', ' ', 'g'));

    if normalized_file_name = '' or char_length(normalized_file_name) > 255 then
      return jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_FILE_NAME',
        'error_message', 'File name must be non-empty and 255 characters or fewer.'
      );
    end if;

    if p_file_path <> btrim(p_file_path)
      or position('..' in p_file_path) > 0
      or position('\' in p_file_path) > 0
      or position('//' in p_file_path) > 0
      or p_file_path !~ (
        '^' || p_company_id::text || '/' || p_document_id::text
        || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|jpg|jpeg|png|webp)$'
      )
    then
      return jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_FILE_PATH',
        'error_message', 'File path is invalid.'
      );
    end if;

    if p_file_type not in (
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp'
    ) then
      return jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_FILE_TYPE',
        'error_message', 'File type is not allowed.'
      );
    end if;

    if (
      (p_file_type = 'application/pdf' and lower(normalized_file_name) !~ '\.pdf$')
      or (p_file_type = 'image/jpeg' and lower(normalized_file_name) !~ '\.(jpg|jpeg)$')
      or (p_file_type = 'image/png' and lower(normalized_file_name) !~ '\.png$')
      or (p_file_type = 'image/webp' and lower(normalized_file_name) !~ '\.webp$')
    ) then
      return jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_FILE_TYPE',
        'error_message', 'File type and extension do not match.'
      );
    end if;

    if (
      (p_file_type = 'application/pdf' and p_file_path !~ '\.pdf$')
      or (p_file_type = 'image/jpeg' and p_file_path !~ '\.(jpg|jpeg)$')
      or (p_file_type = 'image/png' and p_file_path !~ '\.png$')
      or (p_file_type = 'image/webp' and p_file_path !~ '\.webp$')
    ) then
      return jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_FILE_TYPE',
        'error_message', 'File type and extension do not match.'
      );
    end if;

    if p_file_size is null or p_file_size <= 0 or p_file_size > 10485760 then
      return jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_FILE_SIZE',
        'error_message', 'File size must be greater than 0 and at most 10 MB.'
      );
    end if;

    if not exists (
      select 1
      from storage.objects as so
      where so.bucket_id = 'company-documents'
        and so.name = p_file_path
    ) then
      return jsonb_build_object(
        'success', false,
        'error_code', 'OBJECT_NOT_FOUND',
        'error_message', 'Storage object was not found.'
      );
    end if;

    if not exists (
      select 1
      from storage.objects as so
      where so.bucket_id = 'company-documents'
        and so.name = p_file_path
        and so.metadata ? 'mimetype'
        and nullif(btrim(so.metadata->>'mimetype'), '') is not null
        and so.metadata->>'mimetype' = p_file_type
        and so.metadata ? 'size'
        and nullif(btrim(so.metadata->>'size'), '') is not null
        and so.metadata->>'size' ~ '^[0-9]+$'
        and (so.metadata->>'size')::bigint = p_file_size
    ) then
      return jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_STORAGE_OBJECT',
        'error_message', 'Storage object metadata does not match the document.'
      );
    end if;

    next_file_name := normalized_file_name;
    next_file_path := p_file_path;
    next_file_type := p_file_type;
    next_file_size := p_file_size;
    old_file_path := current_document.file_path;
  else
    next_file_name := current_document.file_name;
    next_file_path := current_document.file_path;
    next_file_type := current_document.file_type;
    next_file_size := current_document.file_size;
    old_file_path := null;
  end if;

  update public.company_documents
  set
    document_type = p_document_type,
    title = normalized_title,
    file_name = next_file_name,
    file_path = next_file_path,
    file_type = next_file_type,
    file_size = next_file_size,
    issued_on = p_issued_on,
    expires_on = p_expires_on,
    updated_at = now()
  where id = p_document_id
    and company_id = p_company_id;

  select count(*)
    into document_count
  from public.company_documents
  where company_id = p_company_id;

  insert into public.audit_logs (
    action,
    entity_type,
    entity_id,
    user_id,
    company_id,
    metadata
  )
  values (
    'COMPANY_DOCUMENT_UPDATED',
    'company',
    p_company_id,
    actor_user_id,
    p_company_id,
    jsonb_build_object(
      'document_id', p_document_id,
      'document_type', p_document_type,
      'file_type', next_file_type,
      'file_size', next_file_size,
      'document_count', document_count,
      'updated_by', jsonb_build_object(
        'id', actor_user_id,
        'workspace_role', actor_workspace_role
      ),
      'updated_at', now()
    )
  );

  return jsonb_build_object(
    'success', true,
    'company_id', p_company_id,
    'document_id', p_document_id,
    'old_file_path', old_file_path,
    'document_count', document_count,
    'audited', true
  );
end;
$_$;


ALTER FUNCTION "public"."update_company_document"("p_company_id" "uuid", "p_document_id" "uuid", "p_document_type" "text", "p_title" "text", "p_file_name" "text", "p_file_path" "text", "p_file_type" "text", "p_file_size" bigint, "p_issued_on" "date", "p_expires_on" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_company_document"("p_company_id" "uuid", "p_document_id" "uuid", "p_document_type" "text", "p_title" "text", "p_file_name" "text", "p_file_path" "text", "p_file_type" "text", "p_file_size" bigint, "p_issued_on" "date", "p_expires_on" "date") IS 'Updates company document metadata or replacement file metadata and emits COMPANY_DOCUMENT_UPDATED. Owner/admin only.';



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


CREATE OR REPLACE FUNCTION "public"."update_own_workspace_job_title"("p_job_title" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."update_own_workspace_job_title"("p_job_title" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_own_workspace_job_title"("p_job_title" "text") IS 'Updates job_title on the authenticated actor''s unique active organization membership. Rejects the command when zero or multiple active memberships exist. Does not accept user_id or company_id and does not change role, type, status, or procurement function.';


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



CREATE TABLE IF NOT EXISTS "public"."company_capabilities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "capability_type" "text" NOT NULL,
    "label" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "company_capabilities_label_length_check" CHECK (("char_length"("label") <= 120)),
    CONSTRAINT "company_capabilities_label_not_blank_check" CHECK (("char_length"("btrim"("label")) > 0)),
    CONSTRAINT "company_capabilities_sort_order_check" CHECK (("sort_order" >= 0)),
    CONSTRAINT "company_capabilities_type_check" CHECK (("capability_type" = ANY (ARRAY['trade'::"text", 'service'::"text", 'product'::"text", 'region'::"text"])))
);


ALTER TABLE "public"."company_capabilities" OWNER TO "postgres";


COMMENT ON TABLE "public"."company_capabilities" IS 'Company-neutral capability tags grouped by trade, service, product, and region.';



CREATE TABLE IF NOT EXISTS "public"."company_compliance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "compliance_type" "text" NOT NULL,
    "name" "text" NOT NULL,
    "provider" "text",
    "effective_on" "date",
    "expires_on" "date",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "company_compliance_date_order_check" CHECK ((("expires_on" IS NULL) OR ("effective_on" IS NULL) OR ("expires_on" >= "effective_on"))),
    CONSTRAINT "company_compliance_name_length_check" CHECK (("char_length"("name") <= 160)),
    CONSTRAINT "company_compliance_name_not_blank_check" CHECK (("char_length"("btrim"("name")) > 0)),
    CONSTRAINT "company_compliance_provider_length_check" CHECK ((("provider" IS NULL) OR ("char_length"("provider") <= 160))),
    CONSTRAINT "company_compliance_sort_order_check" CHECK (("sort_order" >= 0)),
    CONSTRAINT "company_compliance_type_check" CHECK (("compliance_type" = ANY (ARRAY['insurance'::"text", 'workers_compensation'::"text", 'safety'::"text"])))
);


ALTER TABLE "public"."company_compliance" OWNER TO "postgres";


COMMENT ON TABLE "public"."company_compliance" IS 'Company-owned, self-declared insurance, workers compensation, and safety standing. Internal only: no public projection and no anon access.';



CREATE OR REPLACE VIEW "public"."company_directory" WITH ("security_invoker"='false') AS
 SELECT "id",
    "name",
    "slug",
    "category",
    "location",
    "network_role",
    "logo_url",
    "status",
    "created_at"
   FROM "public"."companies"
  WHERE ("workspace_status" <> 'archived'::"text");


ALTER VIEW "public"."company_directory" OWNER TO "postgres";


COMMENT ON VIEW "public"."company_directory" IS 'Public company directory surface. Exposes only intentional directory columns; does not include user_id or workspace_status.';



CREATE TABLE IF NOT EXISTS "public"."company_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "document_type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_path" "text" NOT NULL,
    "file_type" "text" NOT NULL,
    "file_size" bigint NOT NULL,
    "issued_on" "date",
    "expires_on" "date",
    "uploaded_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "company_documents_date_order_check" CHECK ((("expires_on" IS NULL) OR ("issued_on" IS NULL) OR ("expires_on" >= "issued_on"))),
    CONSTRAINT "company_documents_file_name_length_check" CHECK (("char_length"("file_name") <= 255)),
    CONSTRAINT "company_documents_file_name_not_blank_check" CHECK (("char_length"("btrim"("file_name")) > 0)),
    CONSTRAINT "company_documents_file_path_not_blank_check" CHECK (("char_length"("btrim"("file_path")) > 0)),
    CONSTRAINT "company_documents_file_size_check" CHECK ((("file_size" > 0) AND ("file_size" <= 10485760))),
    CONSTRAINT "company_documents_file_type_check" CHECK (("file_type" = ANY (ARRAY['application/pdf'::"text", 'image/jpeg'::"text", 'image/png'::"text", 'image/webp'::"text"]))),
    CONSTRAINT "company_documents_title_length_check" CHECK (("char_length"("title") <= 160)),
    CONSTRAINT "company_documents_title_not_blank_check" CHECK (("char_length"("btrim"("title")) > 0)),
    CONSTRAINT "company_documents_type_check" CHECK (("document_type" = ANY (ARRAY['insurance'::"text", 'workers_compensation'::"text", 'safety'::"text", 'qualification'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."company_documents" OWNER TO "postgres";


COMMENT ON TABLE "public"."company_documents" IS 'Company-owned internal governance evidence files. Facts remain in qualifications and compliance.';



CREATE TABLE IF NOT EXISTS "public"."company_qualifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "qualification_type" "text" NOT NULL,
    "name" "text" NOT NULL,
    "issuer" "text",
    "credential_identifier" "text",
    "issued_on" "date",
    "expires_on" "date",
    "is_public" boolean DEFAULT false NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "company_qualifications_credential_identifier_length_check" CHECK ((("credential_identifier" IS NULL) OR ("char_length"("credential_identifier") <= 120))),
    CONSTRAINT "company_qualifications_date_order_check" CHECK ((("expires_on" IS NULL) OR ("issued_on" IS NULL) OR ("expires_on" >= "issued_on"))),
    CONSTRAINT "company_qualifications_issuer_length_check" CHECK ((("issuer" IS NULL) OR ("char_length"("issuer") <= 160))),
    CONSTRAINT "company_qualifications_name_length_check" CHECK (("char_length"("name") <= 160)),
    CONSTRAINT "company_qualifications_name_not_blank_check" CHECK (("char_length"("btrim"("name")) > 0)),
    CONSTRAINT "company_qualifications_sort_order_check" CHECK (("sort_order" >= 0)),
    CONSTRAINT "company_qualifications_type_check" CHECK (("qualification_type" = ANY (ARRAY['license'::"text", 'certification'::"text", 'accreditation'::"text", 'registration'::"text"])))
);


ALTER TABLE "public"."company_qualifications" OWNER TO "postgres";


COMMENT ON TABLE "public"."company_qualifications" IS 'Company-owned licenses, certifications, accreditations, and registrations.';



CREATE OR REPLACE VIEW "public"."company_qualifications_public" WITH ("security_invoker"='false') AS
 SELECT "id",
    "company_id",
    "qualification_type",
    "name",
    "issuer",
    "issued_on",
    "expires_on",
    "sort_order"
   FROM "public"."company_qualifications" "cq"
  WHERE (("is_public" = true) AND (EXISTS ( SELECT 1
           FROM "public"."company_directory" "cd"
          WHERE (("cd"."id" = "cq"."company_id") AND ("lower"("btrim"(COALESCE("cd"."status", ''::"text"))) = ANY (ARRAY['approved'::"text", 'verified'::"text"]))))));


ALTER VIEW "public"."company_qualifications_public" OWNER TO "postgres";


COMMENT ON VIEW "public"."company_qualifications_public" IS 'Public-safe qualification projection. Excludes credential_identifier and private fields.';



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
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "company_id" "uuid",
    "source_rfq_id" "uuid"
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


COMMENT ON COLUMN "public"."notifications"."source_rfq_id" IS 'Canonical nullable RFQ source projection for Activity Center traceability.';



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
    CONSTRAINT "organization_memberships_job_title_length_check" CHECK ((("job_title" IS NULL) OR (("char_length"("btrim"("job_title")) >= 1) AND ("char_length"("btrim"("job_title")) <= 120)))),
    CONSTRAINT "organization_memberships_membership_status_check" CHECK (("membership_status" = ANY (ARRAY['pending'::"text", 'active'::"text", 'archived'::"text", 'suspended'::"text", 'revoked'::"text"]))),
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
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "first_name" "text",
    "last_name" "text",
    CONSTRAINT "profiles_first_name_length_check" CHECK ((("first_name" IS NULL) OR (("char_length"("btrim"("first_name")) >= 1) AND ("char_length"("btrim"("first_name")) <= 80)))),
    CONSTRAINT "profiles_last_name_length_check" CHECK ((("last_name" IS NULL) OR (("char_length"("btrim"("last_name")) >= 1) AND ("char_length"("btrim"("last_name")) <= 80))))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "created_by" "uuid",
    "name" "text" NOT NULL,
    "project_code" "text",
    "owner_client" "text",
    "location" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "projects_location_length_check" CHECK ((("location" IS NULL) OR ("char_length"("location") <= 180))),
    CONSTRAINT "projects_name_length_check" CHECK (("char_length"("name") <= 180)),
    CONSTRAINT "projects_name_not_blank_check" CHECK (("char_length"("btrim"("name")) > 0)),
    CONSTRAINT "projects_owner_client_length_check" CHECK ((("owner_client" IS NULL) OR ("char_length"("owner_client") <= 180))),
    CONSTRAINT "projects_project_code_length_check" CHECK ((("project_code" IS NULL) OR ("char_length"("project_code") <= 80))),
    CONSTRAINT "projects_project_code_not_blank_check" CHECK ((("project_code" IS NULL) OR ("char_length"("btrim"("project_code")) > 0)))
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


COMMENT ON TABLE "public"."projects" IS 'Company-owned Project Portfolio records independent from RFQ containers.';



COMMENT ON COLUMN "public"."projects"."created_by" IS 'Authenticated creator when user-created; null is permitted for deterministic migration-created records.';



COMMENT ON COLUMN "public"."projects"."project_code" IS 'Optional company-internal project identifier. Unique within a company when present.';



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



CREATE TABLE IF NOT EXISTS "public"."rfq_addenda" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rfq_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "addendum_number" integer NOT NULL,
    "affected_documents" "text",
    "requires_acknowledgement" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "rfq_addenda_number_positive" CHECK (("addendum_number" > 0)),
    CONSTRAINT "rfq_addenda_title_not_blank" CHECK (("btrim"("title") <> ''::"text"))
);


ALTER TABLE "public"."rfq_addenda" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rfq_addendum_acknowledgements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rfq_id" "uuid" NOT NULL,
    "addendum_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "acknowledged_by" "uuid" NOT NULL,
    "acknowledged_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."rfq_addendum_acknowledgements" OWNER TO "postgres";


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


CREATE TABLE IF NOT EXISTS "public"."rfq_attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rfq_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "uploaded_by" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_path" "text" NOT NULL,
    "file_type" "text",
    "file_size" bigint DEFAULT 0 NOT NULL,
    "attachment_type" "text" DEFAULT 'supporting'::"text" NOT NULL,
    "revision_label" "text" DEFAULT 'Rev 0'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "rfq_attachments_file_name_not_blank" CHECK (("btrim"("file_name") <> ''::"text")),
    CONSTRAINT "rfq_attachments_file_path_not_blank" CHECK (("btrim"("file_path") <> ''::"text")),
    CONSTRAINT "rfq_attachments_file_size_nonnegative" CHECK (("file_size" >= 0)),
    CONSTRAINT "rfq_attachments_type_check" CHECK (("attachment_type" = ANY (ARRAY['drawing'::"text", 'specification'::"text", 'boq'::"text", 'photo'::"text", 'addenda'::"text", 'supporting'::"text"])))
);


ALTER TABLE "public"."rfq_attachments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rfq_document_requirements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rfq_id" "uuid" NOT NULL,
    "attachment_type" "text" NOT NULL,
    "created_by" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "rfq_document_requirements_attachment_type_check" CHECK (("attachment_type" = ANY (ARRAY['drawing'::"text", 'specification'::"text", 'boq'::"text", 'photo'::"text", 'addenda'::"text", 'supporting'::"text"])))
);


ALTER TABLE "public"."rfq_document_requirements" OWNER TO "postgres";


COMMENT ON TABLE "public"."rfq_document_requirements" IS 'Issuer-declared current-state RFQ procurement-package required attachment categories. A row means the attachment category is declared required for that RFQ. Coverage is evaluated separately against current governed rfq_attachments. This table does not assert document content validity, contractual compliance, revision supersession, or immutable historical package state.';



COMMENT ON COLUMN "public"."rfq_document_requirements"."attachment_type" IS 'Required RFQ package attachment category. Must match the governed rfq_attachments attachment_type taxonomy exactly.';



COMMENT ON COLUMN "public"."rfq_document_requirements"."created_by" IS 'Authenticated actor who declared the requirement. Authenticated clients cannot supply this column directly.';



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


CREATE TABLE IF NOT EXISTS "public"."rfq_rfis" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rfq_id" "uuid" NOT NULL,
    "respondent_company_id" "uuid" NOT NULL,
    "submitted_by" "uuid" NOT NULL,
    "question" "text" NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "response_text" "text",
    "responded_by" "uuid",
    "responded_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "rfq_rfis_question_length" CHECK (("char_length"("question") <= 8000)),
    CONSTRAINT "rfq_rfis_question_not_blank" CHECK (("btrim"("question") <> ''::"text")),
    CONSTRAINT "rfq_rfis_response_length" CHECK ((("response_text" IS NULL) OR ("char_length"("response_text") <= 16000))),
    CONSTRAINT "rfq_rfis_state_consistency" CHECK (((("status" = 'open'::"text") AND ("response_text" IS NULL) AND ("responded_by" IS NULL) AND ("responded_at" IS NULL)) OR (("status" = 'answered'::"text") AND ("response_text" IS NOT NULL) AND ("btrim"("response_text") <> ''::"text") AND ("responded_by" IS NOT NULL) AND ("responded_at" IS NOT NULL)))),
    CONSTRAINT "rfq_rfis_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'answered'::"text"])))
);


ALTER TABLE "public"."rfq_rfis" OWNER TO "postgres";


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



ALTER TABLE ONLY "public"."company_capabilities"
    ADD CONSTRAINT "company_capabilities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_compliance"
    ADD CONSTRAINT "company_compliance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_documents"
    ADD CONSTRAINT "company_documents_file_path_unique" UNIQUE ("file_path");



ALTER TABLE ONLY "public"."company_documents"
    ADD CONSTRAINT "company_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_qualifications"
    ADD CONSTRAINT "company_qualifications_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_rfq_company_key" UNIQUE ("rfq_id", "company_id");



ALTER TABLE ONLY "public"."representative_verification_cases"
    ADD CONSTRAINT "representative_verification_cases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rfq_addenda"
    ADD CONSTRAINT "rfq_addenda_id_rfq_unique" UNIQUE ("id", "rfq_id");



ALTER TABLE ONLY "public"."rfq_addenda"
    ADD CONSTRAINT "rfq_addenda_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rfq_addenda"
    ADD CONSTRAINT "rfq_addenda_rfq_number_unique" UNIQUE ("rfq_id", "addendum_number");



ALTER TABLE ONLY "public"."rfq_addendum_acknowledgements"
    ADD CONSTRAINT "rfq_addendum_acknowledgements_addendum_company_unique" UNIQUE ("addendum_id", "company_id");



ALTER TABLE ONLY "public"."rfq_addendum_acknowledgements"
    ADD CONSTRAINT "rfq_addendum_acknowledgements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rfq_ai_reviews"
    ADD CONSTRAINT "rfq_ai_reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rfq_attachments"
    ADD CONSTRAINT "rfq_attachments_file_path_unique" UNIQUE ("file_path");



ALTER TABLE ONLY "public"."rfq_attachments"
    ADD CONSTRAINT "rfq_attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rfq_document_requirements"
    ADD CONSTRAINT "rfq_document_requirements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rfq_document_requirements"
    ADD CONSTRAINT "rfq_document_requirements_rfq_attachment_type_unique" UNIQUE ("rfq_id", "attachment_type");



ALTER TABLE ONLY "public"."rfq_invites"
    ADD CONSTRAINT "rfq_invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rfq_invites"
    ADD CONSTRAINT "rfq_invites_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."rfq_rfis"
    ADD CONSTRAINT "rfq_rfis_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rfqs"
    ADD CONSTRAINT "rfqs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rfqs"
    ADD CONSTRAINT "rfqs_slug_key" UNIQUE ("slug");



CREATE UNIQUE INDEX "company_capabilities_company_type_label_unique_idx" ON "public"."company_capabilities" USING "btree" ("company_id", "capability_type", "lower"("btrim"("label")));



CREATE INDEX "company_capabilities_company_type_sort_idx" ON "public"."company_capabilities" USING "btree" ("company_id", "capability_type", "sort_order", "id");



CREATE UNIQUE INDEX "company_compliance_company_type_dedupe_idx" ON "public"."company_compliance" USING "btree" ("company_id", "compliance_type", "lower"("btrim"("name")), COALESCE("lower"("btrim"("provider")), ''::"text"));



CREATE INDEX "company_compliance_company_type_sort_idx" ON "public"."company_compliance" USING "btree" ("company_id", "compliance_type", "sort_order", "id");



CREATE INDEX "company_documents_company_created_idx" ON "public"."company_documents" USING "btree" ("company_id", "created_at" DESC, "id");



CREATE UNIQUE INDEX "company_qualifications_company_type_dedupe_idx" ON "public"."company_qualifications" USING "btree" ("company_id", "qualification_type", "lower"("btrim"("name")), COALESCE("lower"("btrim"("issuer")), ''::"text"), COALESCE("lower"("btrim"("credential_identifier")), ''::"text"));



CREATE INDEX "company_qualifications_company_type_sort_idx" ON "public"."company_qualifications" USING "btree" ("company_id", "qualification_type", "sort_order", "id");



CREATE UNIQUE INDEX "internal_reviewer_assignments_one_active_capability" ON "public"."internal_reviewer_assignments" USING "btree" ("reviewer_user_id", "capability") WHERE ("status" = 'active'::"text");



CREATE UNIQUE INDEX "invitations_pending_company_email_uidx" ON "public"."invitations" USING "btree" ("company_id", "lower"("btrim"("email"))) WHERE ("status" = 'pending'::"text");



CREATE INDEX "notifications_company_id_idx" ON "public"."notifications" USING "btree" ("company_id");



CREATE INDEX "notifications_source_rfq_id_idx" ON "public"."notifications" USING "btree" ("source_rfq_id");



CREATE INDEX "organization_memberships_active_company_idx" ON "public"."organization_memberships" USING "btree" ("company_id", "membership_status");



CREATE INDEX "organization_memberships_company_id_idx" ON "public"."organization_memberships" USING "btree" ("company_id");



CREATE UNIQUE INDEX "organization_memberships_one_active_owner_per_company" ON "public"."organization_memberships" USING "btree" ("company_id") WHERE (("workspace_role" = 'owner'::"text") AND ("membership_status" = 'active'::"text"));



CREATE INDEX "organization_memberships_user_id_idx" ON "public"."organization_memberships" USING "btree" ("user_id");



CREATE INDEX "ownership_transfer_requests_company_history_idx" ON "public"."ownership_transfer_requests" USING "btree" ("company_id", "created_at" DESC);



CREATE UNIQUE INDEX "ownership_transfer_requests_one_pending_per_company" ON "public"."ownership_transfer_requests" USING "btree" ("company_id") WHERE ("status" = 'pending_acceptance'::"text");



CREATE INDEX "ownership_transfer_requests_recipient_pending_idx" ON "public"."ownership_transfer_requests" USING "btree" ("to_user_id", "expires_at") WHERE ("status" = 'pending_acceptance'::"text");



CREATE INDEX "ownership_transfer_requests_sender_history_idx" ON "public"."ownership_transfer_requests" USING "btree" ("from_user_id", "created_at" DESC);



CREATE UNIQUE INDEX "projects_company_project_code_unique_idx" ON "public"."projects" USING "btree" ("company_id", "lower"("regexp_replace"("btrim"("project_code"), '\s+'::"text", ' '::"text", 'g'::"text"))) WHERE (("project_code" IS NOT NULL) AND ("char_length"("btrim"("project_code")) > 0));



CREATE INDEX "projects_company_recency_idx" ON "public"."projects" USING "btree" ("company_id", "updated_at" DESC, "created_at" DESC, "id");



CREATE INDEX "quotes_company_id_idx" ON "public"."quotes" USING "btree" ("company_id");



CREATE UNIQUE INDEX "quotes_one_awarded_decision_per_rfq" ON "public"."quotes" USING "btree" ("rfq_id") WHERE ("decision" = 'awarded'::"text");



CREATE INDEX "quotes_rfq_id_idx" ON "public"."quotes" USING "btree" ("rfq_id");



CREATE UNIQUE INDEX "representative_verification_cases_one_pending_per_subject" ON "public"."representative_verification_cases" USING "btree" ("company_id", "representative_user_id") WHERE ("status" = 'pending_review'::"text");



CREATE INDEX "rfq_addenda_rfq_id_created_at_idx" ON "public"."rfq_addenda" USING "btree" ("rfq_id", "created_at");



CREATE INDEX "rfq_addenda_rfq_id_idx" ON "public"."rfq_addenda" USING "btree" ("rfq_id");



CREATE INDEX "rfq_addendum_acknowledgements_company_id_idx" ON "public"."rfq_addendum_acknowledgements" USING "btree" ("company_id");



CREATE INDEX "rfq_addendum_acknowledgements_rfq_id_idx" ON "public"."rfq_addendum_acknowledgements" USING "btree" ("rfq_id");



CREATE INDEX "rfq_ai_reviews_rfq_id_idx" ON "public"."rfq_ai_reviews" USING "btree" ("rfq_id");



CREATE INDEX "rfq_attachments_rfq_id_idx" ON "public"."rfq_attachments" USING "btree" ("rfq_id");



CREATE INDEX "rfq_document_requirements_created_by_idx" ON "public"."rfq_document_requirements" USING "btree" ("created_by");



CREATE UNIQUE INDEX "rfq_invites_rfq_email_key" ON "public"."rfq_invites" USING "btree" ("rfq_id", "lower"("email"));



CREATE INDEX "rfq_invites_rfq_id_idx" ON "public"."rfq_invites" USING "btree" ("rfq_id");



CREATE INDEX "rfq_rfis_open_status_idx" ON "public"."rfq_rfis" USING "btree" ("rfq_id", "status") WHERE ("status" = 'open'::"text");



CREATE INDEX "rfq_rfis_respondent_company_id_idx" ON "public"."rfq_rfis" USING "btree" ("respondent_company_id");



CREATE INDEX "rfq_rfis_rfq_id_created_at_idx" ON "public"."rfq_rfis" USING "btree" ("rfq_id", "created_at");



CREATE INDEX "rfq_rfis_rfq_id_idx" ON "public"."rfq_rfis" USING "btree" ("rfq_id");



CREATE INDEX "rfqs_company_id_idx" ON "public"."rfqs" USING "btree" ("company_id");



CREATE INDEX "rfqs_status_deadline_idx" ON "public"."rfqs" USING "btree" ("status", "deadline");



CREATE OR REPLACE TRIGGER "enforce_company_governance_update_integrity" BEFORE UPDATE OF "name", "category", "location", "network_role", "logo_url" ON "public"."companies" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_company_governance_update_integrity"();



CREATE OR REPLACE TRIGGER "enforce_company_workspace_membership_lifecycle" BEFORE INSERT OR UPDATE OF "membership_status", "company_id" ON "public"."organization_memberships" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_company_workspace_membership_lifecycle"();



CREATE OR REPLACE TRIGGER "enforce_quote_award_integrity_trigger" BEFORE INSERT OR UPDATE ON "public"."quotes" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_quote_award_integrity"();



CREATE OR REPLACE TRIGGER "enforce_rfq_addendum_acknowledgement_integrity_trigger" BEFORE INSERT ON "public"."rfq_addendum_acknowledgements" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_rfq_addendum_acknowledgement_integrity"();



CREATE OR REPLACE TRIGGER "enforce_rfq_addendum_insert_integrity_trigger" BEFORE INSERT ON "public"."rfq_addenda" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_rfq_addendum_insert_integrity"();



CREATE OR REPLACE TRIGGER "enforce_rfq_attachment_insert_integrity_trigger" BEFORE INSERT ON "public"."rfq_attachments" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_rfq_attachment_insert_integrity"();



CREATE OR REPLACE TRIGGER "enforce_rfq_award_authorization_trigger" BEFORE UPDATE ON "public"."rfqs" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_rfq_award_authorization"();



CREATE CONSTRAINT TRIGGER "enforce_rfq_award_terminal_consistency_trigger" AFTER INSERT OR UPDATE ON "public"."rfqs" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "public"."enforce_rfq_award_terminal_consistency"();



CREATE OR REPLACE TRIGGER "enforce_rfq_rfi_insert_integrity_trigger" BEFORE INSERT ON "public"."rfq_rfis" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_rfq_rfi_insert_integrity"();



CREATE OR REPLACE TRIGGER "enforce_rfq_rfi_response_integrity_trigger" BEFORE UPDATE ON "public"."rfq_rfis" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_rfq_rfi_response_integrity"();



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."company_capabilities"
    ADD CONSTRAINT "company_capabilities_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_compliance"
    ADD CONSTRAINT "company_compliance_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_documents"
    ADD CONSTRAINT "company_documents_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_documents"
    ADD CONSTRAINT "company_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."company_qualifications"
    ADD CONSTRAINT "company_qualifications_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



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



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_source_rfq_id_fkey" FOREIGN KEY ("source_rfq_id") REFERENCES "public"."rfqs"("id") ON DELETE SET NULL;



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



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



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



ALTER TABLE ONLY "public"."rfq_addenda"
    ADD CONSTRAINT "rfq_addenda_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."rfq_addenda"
    ADD CONSTRAINT "rfq_addenda_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."rfq_addenda"
    ADD CONSTRAINT "rfq_addenda_rfq_id_fkey" FOREIGN KEY ("rfq_id") REFERENCES "public"."rfqs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rfq_addendum_acknowledgements"
    ADD CONSTRAINT "rfq_addendum_acknowledgements_acknowledged_by_fkey" FOREIGN KEY ("acknowledged_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."rfq_addendum_acknowledgements"
    ADD CONSTRAINT "rfq_addendum_acknowledgements_addendum_rfq_fkey" FOREIGN KEY ("addendum_id", "rfq_id") REFERENCES "public"."rfq_addenda"("id", "rfq_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rfq_addendum_acknowledgements"
    ADD CONSTRAINT "rfq_addendum_acknowledgements_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."rfq_addendum_acknowledgements"
    ADD CONSTRAINT "rfq_addendum_acknowledgements_rfq_id_fkey" FOREIGN KEY ("rfq_id") REFERENCES "public"."rfqs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rfq_ai_reviews"
    ADD CONSTRAINT "rfq_ai_reviews_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rfq_ai_reviews"
    ADD CONSTRAINT "rfq_ai_reviews_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."rfq_ai_reviews"
    ADD CONSTRAINT "rfq_ai_reviews_rfq_id_fkey" FOREIGN KEY ("rfq_id") REFERENCES "public"."rfqs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rfq_attachments"
    ADD CONSTRAINT "rfq_attachments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."rfq_attachments"
    ADD CONSTRAINT "rfq_attachments_rfq_id_fkey" FOREIGN KEY ("rfq_id") REFERENCES "public"."rfqs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rfq_attachments"
    ADD CONSTRAINT "rfq_attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."rfq_document_requirements"
    ADD CONSTRAINT "rfq_document_requirements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."rfq_document_requirements"
    ADD CONSTRAINT "rfq_document_requirements_rfq_id_fkey" FOREIGN KEY ("rfq_id") REFERENCES "public"."rfqs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rfq_invites"
    ADD CONSTRAINT "rfq_invites_rfq_id_fkey" FOREIGN KEY ("rfq_id") REFERENCES "public"."rfqs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rfq_rfis"
    ADD CONSTRAINT "rfq_rfis_responded_by_fkey" FOREIGN KEY ("responded_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."rfq_rfis"
    ADD CONSTRAINT "rfq_rfis_respondent_company_id_fkey" FOREIGN KEY ("respondent_company_id") REFERENCES "public"."companies"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."rfq_rfis"
    ADD CONSTRAINT "rfq_rfis_rfq_id_fkey" FOREIGN KEY ("rfq_id") REFERENCES "public"."rfqs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rfq_rfis"
    ADD CONSTRAINT "rfq_rfis_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."rfqs"
    ADD CONSTRAINT "rfqs_awarded_quote_id_fkey" FOREIGN KEY ("awarded_quote_id") REFERENCES "public"."quotes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."rfqs"
    ADD CONSTRAINT "rfqs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."rfqs"
    ADD CONSTRAINT "rfqs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



CREATE POLICY "Authenticated users can create own company" ON "public"."companies" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() IS NOT NULL) AND ("user_id" = "auth"."uid"()) AND ("workspace_status" = 'active'::"text")));



CREATE POLICY "Authenticated users can insert own profile" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK ((("id" = "auth"."uid"()) AND ("company_id" IS NULL)));



CREATE POLICY "Authenticated users can read created or member companies" ON "public"."companies" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."organization_memberships" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."company_id" = "companies"."id") AND ("om"."membership_status" = ANY (ARRAY['active'::"text", 'archived'::"text"])))))));



CREATE POLICY "Authenticated users can read own profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Authenticated users can read permitted RFQs" ON "public"."rfqs" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."organization_memberships" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."company_id" = "rfqs"."company_id") AND ("om"."membership_status" = ANY (ARRAY['active'::"text", 'archived'::"text"]))))) OR ((EXISTS ( SELECT 1
   FROM "public"."organization_memberships" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."membership_status" = ANY (ARRAY['active'::"text", 'archived'::"text"]))))) AND ((("status" = 'open'::"text") AND ("sourcing_method" = 'open'::"text")) OR (("status" <> 'draft'::"text") AND "public"."current_user_has_supplier_rfq_access"("id"))))));



CREATE POLICY "Authenticated users can update own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



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
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."company_id" = "rfq_ai_reviews"."company_id") AND ("om"."membership_status" = ANY (ARRAY['active'::"text", 'archived'::"text"])) AND (("om"."workspace_role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) OR ("om"."procurement_function" = 'buyer'::"text"))))));



CREATE POLICY "Buyer members can read company RFQ invitations" ON "public"."rfq_invites" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."rfqs" "r"
     JOIN "public"."organization_memberships" "om" ON (("om"."company_id" = "r"."company_id")))
  WHERE (("r"."id" = "rfq_invites"."rfq_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."membership_status" = ANY (ARRAY['active'::"text", 'archived'::"text"])) AND (("om"."workspace_role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) OR ("om"."procurement_function" = 'buyer'::"text"))))));



CREATE POLICY "Buyer members can update company RFQs" ON "public"."rfqs" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_memberships" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."company_id" = "rfqs"."company_id") AND ("om"."membership_status" = 'active'::"text") AND (("om"."workspace_role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) OR ("om"."procurement_function" = 'buyer'::"text")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."organization_memberships" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."company_id" = "rfqs"."company_id") AND ("om"."membership_status" = 'active'::"text") AND (("om"."workspace_role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) OR ("om"."procurement_function" = 'buyer'::"text"))))));



CREATE POLICY "Company members can read company audit logs" ON "public"."audit_logs" FOR SELECT TO "authenticated" USING ((("company_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."organization_memberships" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."company_id" = "audit_logs"."company_id") AND ("om"."membership_status" = ANY (ARRAY['active'::"text", 'archived'::"text"])))))));



CREATE POLICY "Company members can read company notifications" ON "public"."notifications" FOR SELECT TO "authenticated" USING ((("company_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."organization_memberships" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."company_id" = "notifications"."company_id") AND ("om"."membership_status" = ANY (ARRAY['active'::"text", 'archived'::"text"])))))));



CREATE POLICY "Company members can read own company quotes" ON "public"."quotes" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_memberships" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."company_id" = "quotes"."company_id") AND ("om"."membership_status" = ANY (ARRAY['active'::"text", 'archived'::"text"]))))));



CREATE POLICY "Company owners and admins can update company" ON "public"."companies" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_memberships" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."company_id" = "companies"."id") AND ("om"."membership_status" = 'active'::"text") AND ("om"."workspace_role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."organization_memberships" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."company_id" = "companies"."id") AND ("om"."membership_status" = 'active'::"text") AND ("om"."workspace_role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Issuer procurement users can answer open RFQ RFIs" ON "public"."rfq_rfis" FOR UPDATE TO "authenticated" USING ((("status" = 'open'::"text") AND (EXISTS ( SELECT 1
   FROM ("public"."rfqs" "r"
     JOIN "public"."organization_memberships" "om" ON (("om"."company_id" = "r"."company_id")))
  WHERE (("r"."id" = "rfq_rfis"."rfq_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."membership_status" = 'active'::"text") AND (("om"."workspace_role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) OR ("om"."procurement_function" = 'buyer'::"text"))))))) WITH CHECK ((("status" = 'answered'::"text") AND ("responded_by" = "auth"."uid"()) AND ("responded_at" IS NOT NULL) AND (NULLIF("btrim"(COALESCE("response_text", ''::"text")), ''::"text") IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM ("public"."rfqs" "r"
     JOIN "public"."organization_memberships" "om" ON (("om"."company_id" = "r"."company_id")))
  WHERE (("r"."id" = "rfq_rfis"."rfq_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."membership_status" = 'active'::"text") AND (("om"."workspace_role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) OR ("om"."procurement_function" = 'buyer'::"text")))))));



CREATE POLICY "Issuer procurement users can create addenda" ON "public"."rfq_addenda" FOR INSERT TO "authenticated" WITH CHECK ((("created_by" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."rfqs" "r"
  WHERE (("r"."id" = "rfq_addenda"."rfq_id") AND ("r"."company_id" = "rfq_addenda"."company_id")))) AND (EXISTS ( SELECT 1
   FROM "public"."organization_memberships" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."company_id" = "rfq_addenda"."company_id") AND ("om"."membership_status" = 'active'::"text") AND (("om"."workspace_role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) OR ("om"."procurement_function" = 'buyer'::"text")))))));



CREATE POLICY "Issuer procurement users can declare document requirements" ON "public"."rfq_document_requirements" FOR INSERT TO "authenticated" WITH CHECK ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM ("public"."rfqs" "r"
     JOIN "public"."organization_memberships" "om" ON (("om"."company_id" = "r"."company_id")))
  WHERE (("r"."id" = "rfq_document_requirements"."rfq_id") AND ("om"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("om"."membership_status" = 'active'::"text") AND (("om"."workspace_role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) OR ("om"."procurement_function" = 'buyer'::"text")))))));



CREATE POLICY "Issuer procurement users can delete attachments" ON "public"."rfq_attachments" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."rfqs" "r"
     JOIN "public"."organization_memberships" "om" ON (("om"."company_id" = "r"."company_id")))
  WHERE (("r"."id" = "rfq_attachments"."rfq_id") AND ("r"."company_id" = "rfq_attachments"."company_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."membership_status" = 'active'::"text") AND (("om"."workspace_role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) OR ("om"."procurement_function" = 'buyer'::"text"))))));



CREATE POLICY "Issuer procurement users can read RFQ RFIs" ON "public"."rfq_rfis" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."rfqs" "r"
     JOIN "public"."organization_memberships" "om" ON (("om"."company_id" = "r"."company_id")))
  WHERE (("r"."id" = "rfq_rfis"."rfq_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."membership_status" = ANY (ARRAY['active'::"text", 'archived'::"text"])) AND (("om"."workspace_role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) OR ("om"."procurement_function" = 'buyer'::"text"))))));



CREATE POLICY "Issuer procurement users can read addendum acknowledgements" ON "public"."rfq_addendum_acknowledgements" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."rfqs" "r"
     JOIN "public"."organization_memberships" "om" ON (("om"."company_id" = "r"."company_id")))
  WHERE (("r"."id" = "rfq_addendum_acknowledgements"."rfq_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."membership_status" = ANY (ARRAY['active'::"text", 'archived'::"text"])) AND (("om"."workspace_role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) OR ("om"."procurement_function" = 'buyer'::"text"))))));



CREATE POLICY "Issuer procurement users can remove document requirements" ON "public"."rfq_document_requirements" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."rfqs" "r"
     JOIN "public"."organization_memberships" "om" ON (("om"."company_id" = "r"."company_id")))
  WHERE (("r"."id" = "rfq_document_requirements"."rfq_id") AND ("om"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("om"."membership_status" = 'active'::"text") AND (("om"."workspace_role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) OR ("om"."procurement_function" = 'buyer'::"text"))))));



CREATE POLICY "Issuer procurement users can upload attachments" ON "public"."rfq_attachments" FOR INSERT TO "authenticated" WITH CHECK ((("uploaded_by" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."rfqs" "r"
  WHERE (("r"."id" = "rfq_attachments"."rfq_id") AND ("r"."company_id" = "rfq_attachments"."company_id")))) AND (EXISTS ( SELECT 1
   FROM "public"."organization_memberships" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."company_id" = "rfq_attachments"."company_id") AND ("om"."membership_status" = 'active'::"text") AND (("om"."workspace_role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) OR ("om"."procurement_function" = 'buyer'::"text")))))));



CREATE POLICY "Issuing buyers can read quotes after commercial unlock" ON "public"."quotes" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."rfqs" "r"
     JOIN "public"."organization_memberships" "om" ON (("om"."company_id" = "r"."company_id")))
  WHERE (("r"."id" = "quotes"."rfq_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."membership_status" = ANY (ARRAY['active'::"text", 'archived'::"text"])) AND (("om"."workspace_role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) OR ("om"."procurement_function" = 'buyer'::"text")) AND (((COALESCE("r"."sourcing_method", 'invited'::"text") = 'open'::"text") AND (COALESCE("r"."contract_framework", 'project_specific'::"text") <> 'framework'::"text")) OR (("public"."parse_rfq_deadline_timestamptz"("r"."deadline") IS NOT NULL) AND ("public"."parse_rfq_deadline_timestamptz"("r"."deadline") < "now"())))))));



CREATE POLICY "RFQ participants can read addenda" ON "public"."rfq_addenda" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."rfqs" "r"
  WHERE (("r"."id" = "rfq_addenda"."rfq_id") AND ((EXISTS ( SELECT 1
           FROM "public"."organization_memberships" "om"
          WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."company_id" = "r"."company_id") AND ("om"."membership_status" = ANY (ARRAY['active'::"text", 'archived'::"text"]))))) OR ((EXISTS ( SELECT 1
           FROM "public"."organization_memberships" "om"
          WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."membership_status" = ANY (ARRAY['active'::"text", 'archived'::"text"]))))) AND ((("r"."status" = 'open'::"text") AND ("r"."sourcing_method" = 'open'::"text")) OR (("r"."status" <> 'draft'::"text") AND "public"."current_user_has_supplier_rfq_access"("r"."id")))))))));



CREATE POLICY "RFQ participants can read attachments" ON "public"."rfq_attachments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."rfqs" "r"
  WHERE (("r"."id" = "rfq_attachments"."rfq_id") AND ((EXISTS ( SELECT 1
           FROM "public"."organization_memberships" "om"
          WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."company_id" = "r"."company_id") AND ("om"."membership_status" = ANY (ARRAY['active'::"text", 'archived'::"text"]))))) OR ((EXISTS ( SELECT 1
           FROM "public"."organization_memberships" "om"
          WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."membership_status" = ANY (ARRAY['active'::"text", 'archived'::"text"]))))) AND ((("r"."status" = 'open'::"text") AND ("r"."sourcing_method" = 'open'::"text")) OR (("r"."status" <> 'draft'::"text") AND "public"."current_user_has_supplier_rfq_access"("r"."id")))))))));



CREATE POLICY "RFQ participants can read document requirements" ON "public"."rfq_document_requirements" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."rfqs" "r"
  WHERE ("r"."id" = "rfq_document_requirements"."rfq_id"))));



CREATE POLICY "Respondent companies can acknowledge required addenda" ON "public"."rfq_addendum_acknowledgements" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."organization_memberships" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."company_id" = "rfq_addendum_acknowledgements"."company_id") AND ("om"."membership_status" = 'active'::"text")))) AND (EXISTS ( SELECT 1
   FROM "public"."rfqs" "r"
  WHERE (("r"."id" = "rfq_addendum_acknowledgements"."rfq_id") AND ("r"."status" = 'open'::"text") AND ("r"."awarded_quote_id" IS NULL) AND ("r"."awarded_at" IS NULL) AND ("public"."parse_rfq_deadline_timestamptz"("r"."deadline") IS NOT NULL) AND ("now"() <= "public"."parse_rfq_deadline_timestamptz"("r"."deadline")) AND ("r"."company_id" <> "rfq_addendum_acknowledgements"."company_id") AND (("r"."sourcing_method" = 'open'::"text") OR "public"."current_user_has_supplier_rfq_access"("r"."id"))))) AND (EXISTS ( SELECT 1
   FROM "public"."rfq_addenda" "a"
  WHERE (("a"."id" = "rfq_addendum_acknowledgements"."addendum_id") AND ("a"."rfq_id" = "rfq_addendum_acknowledgements"."rfq_id") AND ("a"."requires_acknowledgement" = true))))));



CREATE POLICY "Respondent companies can read own RFQ RFIs" ON "public"."rfq_rfis" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."organization_memberships" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."company_id" = "rfq_rfis"."respondent_company_id") AND ("om"."membership_status" = ANY (ARRAY['active'::"text", 'archived'::"text"]))))) AND (EXISTS ( SELECT 1
   FROM "public"."rfqs" "r"
  WHERE (("r"."id" = "rfq_rfis"."rfq_id") AND ("r"."company_id" <> "rfq_rfis"."respondent_company_id") AND (("r"."sourcing_method" = 'open'::"text") OR "public"."current_user_has_supplier_rfq_access"("r"."id")))))));



CREATE POLICY "Respondent companies can read own addendum acknowledgements" ON "public"."rfq_addendum_acknowledgements" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."organization_memberships" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."company_id" = "rfq_addendum_acknowledgements"."company_id") AND ("om"."membership_status" = ANY (ARRAY['active'::"text", 'archived'::"text"]))))) AND (EXISTS ( SELECT 1
   FROM "public"."rfqs" "r"
  WHERE (("r"."id" = "rfq_addendum_acknowledgements"."rfq_id") AND ("r"."company_id" <> "rfq_addendum_acknowledgements"."company_id") AND (("r"."sourcing_method" = 'open'::"text") OR "public"."current_user_has_supplier_rfq_access"("r"."id")))))));



CREATE POLICY "Respondent companies can submit RFQ RFIs" ON "public"."rfq_rfis" FOR INSERT TO "authenticated" WITH CHECK ((("submitted_by" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."organization_memberships" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."company_id" = "rfq_rfis"."respondent_company_id") AND ("om"."membership_status" = 'active'::"text")))) AND (EXISTS ( SELECT 1
   FROM "public"."rfqs" "r"
  WHERE (("r"."id" = "rfq_rfis"."rfq_id") AND ("r"."status" = 'open'::"text") AND ("r"."company_id" <> "rfq_rfis"."respondent_company_id") AND (("r"."sourcing_method" = 'open'::"text") OR "public"."current_user_has_supplier_rfq_access"("r"."id")) AND (COALESCE("r"."rfi_deadline", "public"."parse_rfq_deadline_timestamptz"("r"."deadline")) IS NOT NULL) AND ("now"() <= COALESCE("r"."rfi_deadline", "public"."parse_rfq_deadline_timestamptz"("r"."deadline")))))) AND ("btrim"("question") <> ''::"text")));



CREATE POLICY "Supplier members can submit company quotes" ON "public"."quotes" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."organization_memberships" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."company_id" = "quotes"."company_id") AND ("om"."membership_status" = 'active'::"text")))) AND (EXISTS ( SELECT 1
   FROM "public"."rfqs" "r"
  WHERE (("r"."id" = "quotes"."rfq_id") AND ("r"."status" = 'open'::"text") AND ("r"."company_id" <> "quotes"."company_id") AND (("r"."sourcing_method" = 'open'::"text") OR "public"."current_user_has_supplier_rfq_access"("quotes"."rfq_id")) AND ("public"."parse_rfq_deadline_timestamptz"("r"."deadline") IS NOT NULL) AND ("now"() <= "public"."parse_rfq_deadline_timestamptz"("r"."deadline"))))) AND (NOT (EXISTS ( SELECT 1
   FROM "public"."rfq_addenda" "a"
  WHERE (("a"."rfq_id" = "quotes"."rfq_id") AND ("a"."requires_acknowledgement" = true) AND (NOT (EXISTS ( SELECT 1
           FROM "public"."rfq_addendum_acknowledgements" "ack"
          WHERE (("ack"."addendum_id" = "a"."id") AND ("ack"."company_id" = "quotes"."company_id")))))))))));



CREATE POLICY "Transfer participants can read ownership transfer requests" ON "public"."ownership_transfer_requests" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "from_user_id") OR ("auth"."uid"() = "to_user_id")));



CREATE POLICY "Users can read own organization memberships" ON "public"."organization_memberships" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Workspace administrators can delete company RFQs" ON "public"."rfqs" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_memberships" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."company_id" = "rfqs"."company_id") AND ("om"."membership_status" = 'active'::"text") AND ("om"."workspace_role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Workspace administrators can update RFQ quote decisions" ON "public"."quotes" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."rfqs" "r"
     JOIN "public"."organization_memberships" "om" ON (("om"."company_id" = "r"."company_id")))
  WHERE (("r"."id" = "quotes"."rfq_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."membership_status" = 'active'::"text") AND ("om"."workspace_role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) AND (((COALESCE("r"."sourcing_method", 'invited'::"text") = 'open'::"text") AND (COALESCE("r"."contract_framework", 'project_specific'::"text") <> 'framework'::"text")) OR (("public"."parse_rfq_deadline_timestamptz"("r"."deadline") IS NOT NULL) AND ("public"."parse_rfq_deadline_timestamptz"("r"."deadline") < "now"()))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."rfqs" "r"
     JOIN "public"."organization_memberships" "om" ON (("om"."company_id" = "r"."company_id")))
  WHERE (("r"."id" = "quotes"."rfq_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."membership_status" = 'active'::"text") AND ("om"."workspace_role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) AND (((COALESCE("r"."sourcing_method", 'invited'::"text") = 'open'::"text") AND (COALESCE("r"."contract_framework", 'project_specific'::"text") <> 'framework'::"text")) OR (("public"."parse_rfq_deadline_timestamptz"("r"."deadline") IS NOT NULL) AND ("public"."parse_rfq_deadline_timestamptz"("r"."deadline") < "now"())))))));



ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."companies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_capabilities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "company_capabilities_select_active_member" ON "public"."company_capabilities" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_memberships" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."company_id" = "company_capabilities"."company_id") AND ("om"."membership_status" = ANY (ARRAY['active'::"text", 'archived'::"text"]))))));



CREATE POLICY "company_capabilities_select_public_company" ON "public"."company_capabilities" FOR SELECT TO "authenticated", "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."company_directory" "cd"
  WHERE (("cd"."id" = "company_capabilities"."company_id") AND ("lower"("btrim"(COALESCE("cd"."status", ''::"text"))) = ANY (ARRAY['approved'::"text", 'verified'::"text"]))))));



ALTER TABLE "public"."company_compliance" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "company_compliance_select_active_member" ON "public"."company_compliance" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_memberships" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."company_id" = "company_compliance"."company_id") AND ("om"."membership_status" = ANY (ARRAY['active'::"text", 'archived'::"text"]))))));



ALTER TABLE "public"."company_documents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "company_documents_select_active_member" ON "public"."company_documents" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_memberships" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."company_id" = "company_documents"."company_id") AND ("om"."membership_status" = ANY (ARRAY['active'::"text", 'archived'::"text"]))))));



ALTER TABLE "public"."company_qualifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "company_qualifications_select_active_member" ON "public"."company_qualifications" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_memberships" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."company_id" = "company_qualifications"."company_id") AND ("om"."membership_status" = ANY (ARRAY['active'::"text", 'archived'::"text"]))))));



ALTER TABLE "public"."internal_reviewer_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_memberships" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ownership_transfer_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "projects_insert_company_manager" ON "public"."projects" FOR INSERT TO "authenticated" WITH CHECK ((("created_by" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."organization_memberships" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."company_id" = "projects"."company_id") AND ("om"."membership_status" = 'active'::"text") AND ("om"."workspace_role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])))))));



CREATE POLICY "projects_select_active_company_member" ON "public"."projects" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."organization_memberships" "om"
  WHERE (("om"."user_id" = "auth"."uid"()) AND ("om"."company_id" = "projects"."company_id") AND ("om"."membership_status" = 'active'::"text")))));



ALTER TABLE "public"."quotes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."representative_verification_cases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rfq_addenda" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rfq_addendum_acknowledgements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rfq_ai_reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rfq_attachments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rfq_document_requirements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rfq_invites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rfq_rfis" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rfqs" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."accept_company_ownership_transfer"("p_transfer_request_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."accept_company_ownership_transfer"("p_transfer_request_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."accept_organization_invitation"("invitation_token" "text", "p_job_title" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."accept_organization_invitation"("invitation_token" "text", "p_job_title" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."approve_representative_verification"("p_case_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."approve_representative_verification"("p_case_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."archive_company_workspace"("p_company_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."archive_company_workspace"("p_company_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."award_rfq_quote"("p_quote_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."award_rfq_quote"("p_quote_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."award_rfq_quote"("p_quote_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."bootstrap_owned_company_workspace"("p_company_id" "uuid", "p_profile_role" "text", "p_job_title" "text", "p_account_type" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."bootstrap_owned_company_workspace"("p_company_id" "uuid", "p_profile_role" "text", "p_job_title" "text", "p_account_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."bootstrap_owned_company_workspace"("p_company_id" "uuid", "p_profile_role" "text", "p_job_title" "text", "p_account_type" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."count_rfq_quote_submissions"("p_rfq_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."count_rfq_quote_submissions"("p_rfq_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."create_company_document"("p_company_id" "uuid", "p_document_id" "uuid", "p_document_type" "text", "p_title" "text", "p_file_name" "text", "p_file_path" "text", "p_file_type" "text", "p_file_size" bigint, "p_issued_on" "date", "p_expires_on" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_company_document"("p_company_id" "uuid", "p_document_id" "uuid", "p_document_type" "text", "p_title" "text", "p_file_name" "text", "p_file_path" "text", "p_file_type" "text", "p_file_size" bigint, "p_issued_on" "date", "p_expires_on" "date") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."create_company_workspace_invitation"("p_email" "text", "p_role" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_company_workspace_invitation"("p_email" "text", "p_role" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."current_user_has_supplier_rfq_access"("p_rfq_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_user_has_supplier_rfq_access"("p_rfq_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."delete_company_document"("p_company_id" "uuid", "p_document_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_company_document"("p_company_id" "uuid", "p_document_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."enforce_company_governance_update_integrity"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."enforce_company_workspace_membership_lifecycle"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."enforce_rfq_addendum_acknowledgement_integrity"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."enforce_rfq_addendum_insert_integrity"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."enforce_rfq_attachment_insert_integrity"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."enforce_rfq_award_authorization"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."enforce_rfq_rfi_insert_integrity"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."enforce_rfq_rfi_response_integrity"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."get_company_representative_verification_status"("p_company_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_company_representative_verification_status"("p_company_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_company_workspace_invitation_for_resend"("p_invitation_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_company_workspace_invitation_for_resend"("p_invitation_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_company_workspace_invitations"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_company_workspace_invitations"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_organization_invitation_context"("p_token" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_organization_invitation_context"("p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_organization_invitation_context"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_organization_invitation_context"("p_token" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_organization_members"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_organization_members"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_organization_members"("p_company_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_organization_members"("p_company_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_rfq_invitation_context"("p_token" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_rfq_invitation_context"("p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_rfq_invitation_context"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_rfq_invitation_context"("p_token" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."parse_rfq_deadline_timestamptz"("p_deadline" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."parse_rfq_deadline_timestamptz"("p_deadline" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."reactivate_company_workspace"("p_company_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reactivate_company_workspace"("p_company_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."record_procurement_activity"("p_activity_kind" "text", "p_entity_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."record_procurement_activity"("p_activity_kind" "text", "p_entity_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."record_rfq_award_workspace_activity"("p_quote_id" "uuid", "p_actor_user_id" "uuid", "p_actor_workspace_role" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."reject_company_ownership_transfer"("p_transfer_request_id" "uuid", "p_rejection_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reject_company_ownership_transfer"("p_transfer_request_id" "uuid", "p_rejection_reason" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."reject_representative_verification"("p_case_id" "uuid", "p_rejection_reason_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reject_representative_verification"("p_case_id" "uuid", "p_rejection_reason_code" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."remove_organization_member"("target_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."remove_organization_member"("target_user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."replace_company_capabilities"("p_company_id" "uuid", "p_capabilities" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."replace_company_capabilities"("p_company_id" "uuid", "p_capabilities" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."replace_company_compliance"("p_company_id" "uuid", "p_compliance" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."replace_company_compliance"("p_company_id" "uuid", "p_compliance" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."replace_company_qualifications"("p_company_id" "uuid", "p_qualifications" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."replace_company_qualifications"("p_company_id" "uuid", "p_qualifications" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."request_company_ownership_transfer"("target_user_id" "uuid", "previous_owner_next_role" "text", "transfer_reason" "text", "expires_in_hours" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."request_company_ownership_transfer"("target_user_id" "uuid", "previous_owner_next_role" "text", "transfer_reason" "text", "expires_in_hours" integer) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."resolve_company_workspace_invitation_context"(OUT "resolved_company_id" "uuid", OUT "resolved_workspace_role" "text", OUT "resolution_error_code" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."resolve_rfi_response_notification_recipient"("p_rfi_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."resolve_rfi_response_notification_recipient"("p_rfi_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."resolve_rfq_addendum_notification_recipients"("p_addendum_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."resolve_rfq_addendum_notification_recipients"("p_addendum_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."resolve_rfq_award_notification_recipient"("p_quote_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."resolve_rfq_award_notification_recipient"("p_quote_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."revoke_company_workspace_invitation"("p_invitation_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."revoke_company_workspace_invitation"("p_invitation_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."submit_representative_verification"("p_company_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."submit_representative_verification"("p_company_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."update_company_document"("p_company_id" "uuid", "p_document_id" "uuid", "p_document_type" "text", "p_title" "text", "p_file_name" "text", "p_file_path" "text", "p_file_type" "text", "p_file_size" bigint, "p_issued_on" "date", "p_expires_on" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_company_document"("p_company_id" "uuid", "p_document_id" "uuid", "p_document_type" "text", "p_title" "text", "p_file_name" "text", "p_file_path" "text", "p_file_type" "text", "p_file_size" bigint, "p_issued_on" "date", "p_expires_on" "date") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."update_organization_member_role"("target_user_id" "uuid", "next_workspace_role" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_organization_member_role"("target_user_id" "uuid", "next_workspace_role" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."update_own_workspace_job_title"("p_job_title" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_own_workspace_job_title"("p_job_title" "text") TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."audit_logs" TO "service_role";
GRANT SELECT ON TABLE "public"."audit_logs" TO "authenticated";



GRANT SELECT,INSERT ON TABLE "public"."companies" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."companies" TO "service_role";



GRANT UPDATE("name") ON TABLE "public"."companies" TO "authenticated";



GRANT UPDATE("category") ON TABLE "public"."companies" TO "authenticated";



GRANT UPDATE("location") ON TABLE "public"."companies" TO "authenticated";



GRANT UPDATE("network_role") ON TABLE "public"."companies" TO "authenticated";



GRANT UPDATE("logo_url") ON TABLE "public"."companies" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."company_capabilities" TO "service_role";
GRANT SELECT ON TABLE "public"."company_capabilities" TO "anon";
GRANT SELECT ON TABLE "public"."company_capabilities" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."company_compliance" TO "service_role";
GRANT SELECT ON TABLE "public"."company_compliance" TO "authenticated";



GRANT SELECT ON TABLE "public"."company_directory" TO "anon";
GRANT SELECT ON TABLE "public"."company_directory" TO "authenticated";
GRANT SELECT ON TABLE "public"."company_directory" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."company_documents" TO "service_role";
GRANT SELECT ON TABLE "public"."company_documents" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."company_qualifications" TO "service_role";
GRANT SELECT ON TABLE "public"."company_qualifications" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."company_qualifications_public" TO "service_role";
GRANT SELECT ON TABLE "public"."company_qualifications_public" TO "anon";
GRANT SELECT ON TABLE "public"."company_qualifications_public" TO "authenticated";



GRANT ALL ON TABLE "public"."internal_reviewer_assignments" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."invitations" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."notifications" TO "service_role";
GRANT SELECT ON TABLE "public"."notifications" TO "authenticated";



GRANT SELECT ON TABLE "public"."organization_memberships" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."organization_memberships" TO "service_role";



GRANT ALL ON TABLE "public"."ownership_transfer_requests" TO "service_role";
GRANT SELECT ON TABLE "public"."ownership_transfer_requests" TO "authenticated";



GRANT SELECT ON TABLE "public"."profiles" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."profiles" TO "service_role";



GRANT INSERT("id") ON TABLE "public"."profiles" TO "authenticated";



GRANT INSERT("email"),UPDATE("email") ON TABLE "public"."profiles" TO "authenticated";



GRANT INSERT("role") ON TABLE "public"."profiles" TO "authenticated";



GRANT INSERT("first_name"),UPDATE("first_name") ON TABLE "public"."profiles" TO "authenticated";



GRANT INSERT("last_name"),UPDATE("last_name") ON TABLE "public"."profiles" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."projects" TO "service_role";
GRANT SELECT,INSERT ON TABLE "public"."projects" TO "authenticated";



GRANT ALL ON TABLE "public"."quotes" TO "service_role";
GRANT SELECT,INSERT ON TABLE "public"."quotes" TO "authenticated";



GRANT UPDATE("decision") ON TABLE "public"."quotes" TO "authenticated";



GRANT ALL ON TABLE "public"."representative_verification_cases" TO "service_role";



GRANT ALL ON TABLE "public"."rfq_addenda" TO "service_role";
GRANT SELECT ON TABLE "public"."rfq_addenda" TO "authenticated";



GRANT INSERT("rfq_id") ON TABLE "public"."rfq_addenda" TO "authenticated";



GRANT INSERT("title") ON TABLE "public"."rfq_addenda" TO "authenticated";



GRANT INSERT("description") ON TABLE "public"."rfq_addenda" TO "authenticated";



GRANT INSERT("affected_documents") ON TABLE "public"."rfq_addenda" TO "authenticated";



GRANT INSERT("requires_acknowledgement") ON TABLE "public"."rfq_addenda" TO "authenticated";



GRANT ALL ON TABLE "public"."rfq_addendum_acknowledgements" TO "service_role";
GRANT SELECT ON TABLE "public"."rfq_addendum_acknowledgements" TO "authenticated";



GRANT INSERT("addendum_id") ON TABLE "public"."rfq_addendum_acknowledgements" TO "authenticated";



GRANT INSERT("company_id") ON TABLE "public"."rfq_addendum_acknowledgements" TO "authenticated";



GRANT ALL ON TABLE "public"."rfq_ai_reviews" TO "service_role";
GRANT SELECT,INSERT ON TABLE "public"."rfq_ai_reviews" TO "authenticated";



GRANT ALL ON TABLE "public"."rfq_attachments" TO "service_role";
GRANT SELECT,DELETE ON TABLE "public"."rfq_attachments" TO "authenticated";



GRANT INSERT("rfq_id") ON TABLE "public"."rfq_attachments" TO "authenticated";



GRANT INSERT("file_name") ON TABLE "public"."rfq_attachments" TO "authenticated";



GRANT INSERT("file_path") ON TABLE "public"."rfq_attachments" TO "authenticated";



GRANT INSERT("file_type") ON TABLE "public"."rfq_attachments" TO "authenticated";



GRANT INSERT("file_size") ON TABLE "public"."rfq_attachments" TO "authenticated";



GRANT INSERT("attachment_type") ON TABLE "public"."rfq_attachments" TO "authenticated";



GRANT INSERT("revision_label") ON TABLE "public"."rfq_attachments" TO "authenticated";



GRANT ALL ON TABLE "public"."rfq_document_requirements" TO "service_role";
GRANT SELECT,DELETE ON TABLE "public"."rfq_document_requirements" TO "authenticated";



GRANT INSERT("rfq_id") ON TABLE "public"."rfq_document_requirements" TO "authenticated";



GRANT INSERT("attachment_type") ON TABLE "public"."rfq_document_requirements" TO "authenticated";



GRANT ALL ON TABLE "public"."rfq_invites" TO "service_role";
GRANT SELECT,INSERT ON TABLE "public"."rfq_invites" TO "authenticated";



GRANT ALL ON TABLE "public"."rfq_rfis" TO "service_role";
GRANT SELECT ON TABLE "public"."rfq_rfis" TO "authenticated";



GRANT INSERT("rfq_id") ON TABLE "public"."rfq_rfis" TO "authenticated";



GRANT INSERT("respondent_company_id") ON TABLE "public"."rfq_rfis" TO "authenticated";



GRANT INSERT("question") ON TABLE "public"."rfq_rfis" TO "authenticated";



GRANT UPDATE("response_text") ON TABLE "public"."rfq_rfis" TO "authenticated";



GRANT ALL ON TABLE "public"."rfqs" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."rfqs" TO "authenticated";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "service_role";

-- =============================================================================
-- Storage contracts (final state) — sources: historical 34/42/43/45/46 +
-- verified active-dev bucket metadata.
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('rfq-attachments', 'rfq-attachments', false)
on conflict (id) do update
set public = false;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'company-documents',
  'company-documents',
  false,
  10485760,
  array[
    'application/pdf'::text,
    'image/jpeg'::text,
    'image/png'::text,
    'image/webp'::text
  ]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array[
    'application/pdf'::text,
    'image/jpeg'::text,
    'image/png'::text,
    'image/webp'::text
  ];

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'Company-logos',
  'Company-logos',
  true,
  5242880,
  array[
    'image/jpeg'::text,
    'image/png'::text,
    'image/webp'::text
  ]
)
on conflict (id) do update
set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array[
    'image/jpeg'::text,
    'image/png'::text,
    'image/webp'::text
  ];

-- rfq-attachments (3)

drop policy if exists "RFQ participants can read rfq-attachments objects"
  on storage.objects;
drop policy if exists "Issuer procurement users can upload rfq-attachments objects"
  on storage.objects;
drop policy if exists "Issuer procurement users can delete rfq-attachments objects"
  on storage.objects;

create policy "RFQ participants can read rfq-attachments objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'rfq-attachments'
  and exists (
    select 1
    from public.rfqs r
    where r.id::text = (storage.foldername(name))[2]
      and r.company_id::text = (storage.foldername(name))[1]
      and (
        exists (
          select 1
          from public.organization_memberships om
          where om.user_id = auth.uid()
            and om.company_id = r.company_id
            and om.membership_status = 'active'
        )
        or (
          exists (
            select 1
            from public.organization_memberships om
            where om.user_id = auth.uid()
              and om.membership_status = 'active'
          )
          and (
            (
              r.status = 'open'
              and r.sourcing_method = 'open'
            )
            or (
              r.status <> 'draft'
              and public.current_user_has_supplier_rfq_access(r.id)
            )
          )
        )
      )
  )
);

create policy "Issuer procurement users can upload rfq-attachments objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'rfq-attachments'
  and (storage.foldername(name))[3] = any (
    array[
      'drawing'::text,
      'specification'::text,
      'boq'::text,
      'photo'::text,
      'addenda'::text,
      'supporting'::text
    ]
  )
  and exists (
    select 1
    from public.rfqs r
    join public.organization_memberships om
      on om.company_id = r.company_id
    where r.id::text = (storage.foldername(name))[2]
      and r.company_id::text = (storage.foldername(name))[1]
      and om.user_id = auth.uid()
      and om.membership_status = 'active'
      and (
        om.workspace_role in ('owner', 'admin')
        or om.procurement_function = 'buyer'
      )
  )
);

create policy "Issuer procurement users can delete rfq-attachments objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'rfq-attachments'
  and exists (
    select 1
    from public.rfqs r
    join public.organization_memberships om
      on om.company_id = r.company_id
    where r.id::text = (storage.foldername(name))[2]
      and r.company_id::text = (storage.foldername(name))[1]
      and om.user_id = auth.uid()
      and om.membership_status = 'active'
      and (
        om.workspace_role in ('owner', 'admin')
        or om.procurement_function = 'buyer'
      )
  )
);

-- company-documents (4) — member read USING includes archived membership (final)

drop policy if exists "Company members can read company-documents objects"
  on storage.objects;
drop policy if exists "Company owners and admins can read company-documents cleanup objects"
  on storage.objects;
drop policy if exists "Company owners and admins can upload company-documents objects"
  on storage.objects;
drop policy if exists "Company owners and admins can delete company-documents objects"
  on storage.objects;

create policy "Company members can read company-documents objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'company-documents'
  and exists (
    select 1
    from public.organization_memberships as om
    where om.user_id = auth.uid()
      and om.company_id::text = (storage.foldername(name))[1]
      and om.membership_status = ANY (ARRAY['active'::text, 'archived'::text])
  )
  and exists (
    select 1
    from public.company_documents as cd
    where cd.company_id::text = (storage.foldername(name))[1]
      and cd.file_path = name
  )
);

create policy "Company owners and admins can read company-documents cleanup objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'company-documents'
  and exists (
    select 1
    from public.organization_memberships as om
    where om.user_id = auth.uid()
      and om.company_id::text = (storage.foldername(name))[1]
      and om.membership_status = 'active'
      and om.workspace_role in ('owner', 'admin')
  )
);

create policy "Company owners and admins can upload company-documents objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'company-documents'
  and exists (
    select 1
    from public.organization_memberships as om
    where om.user_id = auth.uid()
      and om.company_id::text = (storage.foldername(name))[1]
      and om.membership_status = 'active'
      and om.workspace_role in ('owner', 'admin')
  )
);

create policy "Company owners and admins can delete company-documents objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'company-documents'
  and exists (
    select 1
    from public.organization_memberships as om
    where om.user_id = auth.uid()
      and om.company_id::text = (storage.foldername(name))[1]
      and om.membership_status = 'active'
      and om.workspace_role in ('owner', 'admin')
  )
);

-- Company-logos (3) — DELETE uses validated truncated policy name

drop policy if exists
  "Company owners and admins can read Company-logos objects"
on storage.objects;

drop policy if exists
  "Company owners and admins can upload Company-logos objects"
on storage.objects;

drop policy if exists
  "Company owners and admins can delete unbound Company-logos obje"
on storage.objects;

drop policy if exists
  "Company owners and admins can delete unbound Company-logos objects"
on storage.objects;

create policy
  "Company owners and admins can read Company-logos objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'Company-logos'
  and (storage.foldername(name))[2] = 'branding'
  and name ~ (
    '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
    || '/branding/'
    || '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
    || '\.(jpg|jpeg|png|webp)$'
  )
  and exists (
    select 1
    from public.organization_memberships as om
    where om.user_id = auth.uid()
      and om.company_id::text = (storage.foldername(name))[1]
      and om.membership_status = 'active'
      and om.workspace_role in ('owner', 'admin')
  )
);

create policy
  "Company owners and admins can upload Company-logos objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'Company-logos'
  and (storage.foldername(name))[2] = 'branding'
  and name ~ (
    '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
    || '/branding/'
    || '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
    || '\.(jpg|jpeg|png|webp)$'
  )
  and exists (
    select 1
    from public.organization_memberships as om
    where om.user_id = auth.uid()
      and om.company_id::text = (storage.foldername(name))[1]
      and om.membership_status = 'active'
      and om.workspace_role in ('owner', 'admin')
  )
);

create policy
  "Company owners and admins can delete unbound Company-logos obje"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'Company-logos'
  and (storage.foldername(name))[2] = 'branding'
  and name ~ (
    '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
    || '/branding/'
    || '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
    || '\.(jpg|jpeg|png|webp)$'
  )
  and exists (
    select 1
    from public.organization_memberships as om
    where om.user_id = auth.uid()
      and om.company_id::text = (storage.foldername(storage.objects.name))[1]
      and om.membership_status = 'active'
      and om.workspace_role in ('owner', 'admin')
  )
  and not exists (
    select 1
    from public.companies as c
    where c.id::text = (storage.foldername(storage.objects.name))[1]
      and c.logo_url is not null
      and c.logo_url like (
        '%/storage/v1/object/public/Company-logos/' || storage.objects.name
      )
  )
);


-- Re-baseline hardening:
-- Fresh Supabase stacks may grant REFERENCES/TRIGGER/TRUNCATE to client roles
-- during table creation. Revoke them so replayed baseline matches Dev.

revoke references, trigger, truncate
on table
  public.audit_logs,
  public.companies,
  public.company_capabilities,
  public.company_compliance,
  public.company_documents,
  public.company_qualifications,
  public.internal_reviewer_assignments,
  public.invitations,
  public.notifications,
  public.organization_memberships,
  public.ownership_transfer_requests,
  public.profiles,
  public.projects,
  public.quotes,
  public.representative_verification_cases,
  public.rfq_addenda,
  public.rfq_addendum_acknowledgements,
  public.rfq_ai_reviews,
  public.rfq_attachments,
  public.rfq_document_requirements,
  public.rfq_invites,
  public.rfq_rfis,
  public.rfqs
from anon;

revoke references, trigger, truncate
on table
  public.audit_logs,
  public.companies,
  public.company_capabilities,
  public.company_compliance,
  public.company_documents,
  public.company_qualifications,
  public.internal_reviewer_assignments,
  public.invitations,
  public.notifications,
  public.organization_memberships,
  public.ownership_transfer_requests,
  public.profiles,
  public.projects,
  public.quotes,
  public.representative_verification_cases,
  public.rfq_addenda,
  public.rfq_addendum_acknowledgements,
  public.rfq_ai_reviews,
  public.rfq_attachments,
  public.rfq_document_requirements,
  public.rfq_invites,
  public.rfq_rfis,
  public.rfqs
from authenticated;

-- Canonical Baseline V2: preserve the validated active-dev ACL for public views.
-- company_directory is read-only for anon, authenticated, and service_role.
REVOKE REFERENCES, TRIGGER, TRUNCATE, MAINTAIN
ON TABLE public.company_directory
FROM anon, authenticated, service_role;

-- company_qualifications_public is read-only for client roles.
-- service_role intentionally retains its administrative table privileges.
REVOKE REFERENCES, TRIGGER, TRUNCATE, MAINTAIN
ON TABLE public.company_qualifications_public
FROM anon, authenticated;

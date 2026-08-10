begin;

-- ============================================================================
-- Section 4 reconciliation:
-- Representative Verification lazy-invalidation precedence
--
-- Purpose:
-- - Preserve the existing reviewer/case/company/membership lock hierarchy.
-- - Make OWNER_CHANGED reachable after a legitimate ownership transfer.
-- - Keep OWNERSHIP_PROJECTION_MISMATCH distinct.
-- - Keep OWNER_MEMBERSHIP_INACTIVE for stale submission-time membership when
--   canonical ownership itself has not changed.
-- - Do not modify ownership-transfer behavior or ownership state.
-- ============================================================================


-- ============================================================================
-- APPROVE REPRESENTATIVE VERIFICATION
-- ============================================================================

create or replace function public.approve_representative_verification(
  p_case_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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
    -- Load current canonical owner membership.
    -------------------------------------------------------------------------

    select *
    into v_current_owner_membership
    from public.organization_memberships
    where company_id = v_case.company_id
      and membership_status = 'active'
      and workspace_role = 'owner'
    for update;


    -------------------------------------------------------------------------
    -- Invalidation precedence
    --
    -- 1. No current canonical owner -> SUBJECT_UNAVAILABLE
    -- 2. Current owner disagrees with companies.user_id ->
    --    OWNERSHIP_PROJECTION_MISMATCH
    -- 3. Current canonical owner is valid but differs from submission snapshot
    --    -> OWNER_CHANGED
    -- 4. Ownership has not changed, but submission-time membership itself is
    --    missing/stale/not owner-valid -> OWNER_MEMBERSHIP_INACTIVE
    -------------------------------------------------------------------------

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

    elsif not v_submitted_membership_found
       or v_member.company_id
          is distinct from v_case.company_id
       or v_member.user_id
          is distinct from v_case.submitted_by_user_id
       or v_member.membership_status <> 'active'
       or v_member.workspace_role <> 'owner' then

      v_reason := 'OWNER_MEMBERSHIP_INACTIVE';
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

revoke all
on function public.approve_representative_verification(uuid)
from public;

revoke all
on function public.approve_representative_verification(uuid)
from anon;

grant execute
on function public.approve_representative_verification(uuid)
to authenticated;


-- ============================================================================
-- REJECT REPRESENTATIVE VERIFICATION
-- ============================================================================

create or replace function public.reject_representative_verification(
  p_case_id uuid,
  p_rejection_reason_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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
    -- Load current canonical owner membership.
    -------------------------------------------------------------------------

    select *
    into v_current_owner_membership
    from public.organization_memberships
    where company_id = v_case.company_id
      and membership_status = 'active'
      and workspace_role = 'owner'
    for update;


    -------------------------------------------------------------------------
    -- Same invalidation precedence as approval.
    -------------------------------------------------------------------------

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

    elsif not v_submitted_membership_found
       or v_member.company_id
          is distinct from v_case.company_id
       or v_member.user_id
          is distinct from v_case.submitted_by_user_id
       or v_member.membership_status <> 'active'
       or v_member.workspace_role <> 'owner' then

      v_reason := 'OWNER_MEMBERSHIP_INACTIVE';
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

revoke all
on function public.reject_representative_verification(uuid, text)
from public;

revoke all
on function public.reject_representative_verification(uuid, text)
from anon;

grant execute
on function public.reject_representative_verification(uuid, text)
to authenticated;


commit;
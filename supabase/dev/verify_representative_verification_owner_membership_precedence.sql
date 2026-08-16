begin;

-- Nexus Pavilion Dev only.
-- Runtime verification for Representative Verification invalidation precedence.
-- This script:
--   1) verifies installed approve/reject RPC structure using ordered strpos checks,
--   2) creates a transaction-local reviewer auth context,
--   3) temporarily suspends two captured owner memberships,
--   4) verifies approve/reject both invalidate with OWNER_MEMBERSHIP_INACTIVE,
--   5) verifies exactly one invalidation audit row per case,
--   6) rolls everything back.
--
-- No persistent fixture changes are intended.

do $verification$
declare
  v_reviewer uuid;
  v_approve_case uuid;
  v_reject_case uuid;
  v_approve_membership uuid;
  v_reject_membership uuid;

  v_result jsonb;
  v_definition text;
  v_normalized_definition text;

  v_captured_membership_load_position integer;
  v_captured_found_position integer;
  v_membership_validation_position integer;
  v_membership_inactive_position integer;
  v_current_owner_load_position integer;

  v_audit_count bigint;
begin
  ---------------------------------------------------------------------------
  -- 1. Verify installed APPROVE definition precedence using ordered positions
  ---------------------------------------------------------------------------
  select pg_get_functiondef(
    'public.approve_representative_verification(uuid)'::regprocedure
  )
  into v_definition;

  v_normalized_definition := regexp_replace(
    v_definition,
    '[[:space:]]+',
    ' ',
    'g'
  );

  v_captured_membership_load_position :=
    strpos(v_normalized_definition, 'into v_member');

  v_captured_found_position :=
    strpos(
      v_normalized_definition,
      'v_submitted_membership_found := found'
    );

  v_membership_validation_position :=
    strpos(
      v_normalized_definition,
      'if not v_submitted_membership_found'
    );

  v_membership_inactive_position :=
    strpos(
      v_normalized_definition,
      'v_reason := ''OWNER_MEMBERSHIP_INACTIVE'''
    );

  v_current_owner_load_position :=
    strpos(
      v_normalized_definition,
      'into v_current_owner_membership'
    );

  if not (
    v_captured_membership_load_position > 0
    and v_captured_found_position > v_captured_membership_load_position
    and v_membership_validation_position > v_captured_found_position
    and v_membership_inactive_position > v_membership_validation_position
    and v_current_owner_load_position > v_membership_inactive_position
  ) then
    raise exception
      'APPROVE_DEFINITION_PRECEDENCE_INVALID: member=% found=% validation=% inactive=% current_owner=%',
      v_captured_membership_load_position,
      v_captured_found_position,
      v_membership_validation_position,
      v_membership_inactive_position,
      v_current_owner_load_position;
  end if;

  ---------------------------------------------------------------------------
  -- 2. Verify installed REJECT definition precedence using ordered positions
  ---------------------------------------------------------------------------
  select pg_get_functiondef(
    'public.reject_representative_verification(uuid,text)'::regprocedure
  )
  into v_definition;

  v_normalized_definition := regexp_replace(
    v_definition,
    '[[:space:]]+',
    ' ',
    'g'
  );

  v_captured_membership_load_position :=
    strpos(v_normalized_definition, 'into v_member');

  v_captured_found_position :=
    strpos(
      v_normalized_definition,
      'v_submitted_membership_found := found'
    );

  v_membership_validation_position :=
    strpos(
      v_normalized_definition,
      'if not v_submitted_membership_found'
    );

  v_membership_inactive_position :=
    strpos(
      v_normalized_definition,
      'v_reason := ''OWNER_MEMBERSHIP_INACTIVE'''
    );

  v_current_owner_load_position :=
    strpos(
      v_normalized_definition,
      'into v_current_owner_membership'
    );

  if not (
    v_captured_membership_load_position > 0
    and v_captured_found_position > v_captured_membership_load_position
    and v_membership_validation_position > v_captured_found_position
    and v_membership_inactive_position > v_membership_validation_position
    and v_current_owner_load_position > v_membership_inactive_position
  ) then
    raise exception
      'REJECT_DEFINITION_PRECEDENCE_INVALID: member=% found=% validation=% inactive=% current_owner=%',
      v_captured_membership_load_position,
      v_captured_found_position,
      v_membership_validation_position,
      v_membership_inactive_position,
      v_current_owner_load_position;
  end if;

  ---------------------------------------------------------------------------
  -- 3. Resolve one active reviewer
  ---------------------------------------------------------------------------
  select reviewer_user_id
  into v_reviewer
  from public.internal_reviewer_assignments
  where capability = 'representative_verification.review'
    and status = 'active'
  order by reviewer_user_id
  limit 1;

  if v_reviewer is null then
    raise exception
      'DEV_FIXTURE_MISSING: no active representative-verification reviewer';
  end if;

  ---------------------------------------------------------------------------
  -- 4. Resolve two eligible pending cases and their captured owner memberships
  ---------------------------------------------------------------------------
  with eligible as (
    select
      c.id as case_id,
      c.submitted_owner_membership_id as membership_id,
      row_number() over (order by c.id) as ordinal
    from public.representative_verification_cases c
    join public.companies company_record
      on company_record.id = c.company_id
    join public.profiles representative_profile
      on representative_profile.id = c.representative_user_id
    join public.profiles submitter_profile
      on submitter_profile.id = c.submitted_by_user_id
    join public.organization_memberships captured
      on captured.id = c.submitted_owner_membership_id
     and captured.company_id = c.company_id
     and captured.user_id = c.submitted_by_user_id
     and captured.membership_status = 'active'
     and captured.workspace_role = 'owner'
    where c.status = 'pending_review'
      and company_record.user_id = captured.user_id
      and not exists (
        select 1
        from public.audit_logs a
        where a.entity_id = c.id
          and a.action = 'REPRESENTATIVE_VERIFICATION_INVALIDATED'
      )
  )
  select
    (array_agg(case_id order by ordinal))[1],
    (array_agg(case_id order by ordinal))[2],
    (array_agg(membership_id order by ordinal))[1],
    (array_agg(membership_id order by ordinal))[2]
  into
    v_approve_case,
    v_reject_case,
    v_approve_membership,
    v_reject_membership
  from eligible
  where ordinal <= 2;

  if v_approve_case is null or v_reject_case is null then
    raise exception
      'DEV_FIXTURE_MISSING: two distinct eligible pending cases are required';
  end if;

  ---------------------------------------------------------------------------
  -- 5. Set transaction-local reviewer identity for auth.uid()
  ---------------------------------------------------------------------------
  perform set_config(
    'request.jwt.claim.sub',
    v_reviewer::text,
    true
  );

  ---------------------------------------------------------------------------
  -- 6. Suspend the two captured memberships inside this transaction
  ---------------------------------------------------------------------------
  update public.organization_memberships
  set membership_status = 'suspended'
  where id in (
    v_approve_membership,
    v_reject_membership
  );

  ---------------------------------------------------------------------------
  -- 7. Ensure no active canonical owner remains for those case companies
  ---------------------------------------------------------------------------
  if exists (
    select 1
    from public.organization_memberships m
    join public.representative_verification_cases c
      on c.company_id = m.company_id
    where c.id in (
      v_approve_case,
      v_reject_case
    )
      and m.membership_status = 'active'
      and m.workspace_role = 'owner'
  ) then
    raise exception
      'FIXTURE_SETUP_FAILED: active canonical owner remains';
  end if;

  ---------------------------------------------------------------------------
  -- 8. APPROVE path must lazy-invalidate with OWNER_MEMBERSHIP_INACTIVE
  ---------------------------------------------------------------------------
  v_result :=
    public.approve_representative_verification(
      v_approve_case
    );

  if v_result <>
     jsonb_build_object(
       'success', false,
       'error_code', 'CASE_INVALIDATED'
     ) then
    raise exception
      'APPROVE_RESULT_INVALID: %',
      v_result;
  end if;

  if not exists (
    select 1
    from public.representative_verification_cases
    where id = v_approve_case
      and status = 'invalidated'
      and invalidation_reason_code = 'OWNER_MEMBERSHIP_INACTIVE'
      and reviewed_by_user_id is null
      and rejection_reason_code is null
  ) then
    raise exception
      'APPROVE_CASE_STATE_INVALID';
  end if;

  select count(*)
  into v_audit_count
  from public.audit_logs
  where entity_id = v_approve_case
    and action = 'REPRESENTATIVE_VERIFICATION_INVALIDATED';

  if v_audit_count <> 1 then
    raise exception
      'APPROVE_AUDIT_COUNT_INVALID: %',
      v_audit_count;
  end if;

  ---------------------------------------------------------------------------
  -- 9. REJECT path must lazy-invalidate with OWNER_MEMBERSHIP_INACTIVE
  ---------------------------------------------------------------------------
  v_result :=
    public.reject_representative_verification(
      v_reject_case,
      'REPRESENTATIVE_AUTHORITY_NOT_CONFIRMED'
    );

  if v_result <>
     jsonb_build_object(
       'success', false,
       'error_code', 'CASE_INVALIDATED'
     ) then
    raise exception
      'REJECT_RESULT_INVALID: %',
      v_result;
  end if;

  if not exists (
    select 1
    from public.representative_verification_cases
    where id = v_reject_case
      and status = 'invalidated'
      and invalidation_reason_code = 'OWNER_MEMBERSHIP_INACTIVE'
      and reviewed_by_user_id is null
      and rejection_reason_code is null
  ) then
    raise exception
      'REJECT_CASE_STATE_INVALID';
  end if;

  select count(*)
  into v_audit_count
  from public.audit_logs
  where entity_id = v_reject_case
    and action = 'REPRESENTATIVE_VERIFICATION_INVALIDATED';

  if v_audit_count <> 1 then
    raise exception
      'REJECT_AUDIT_COUNT_INVALID: %',
      v_audit_count;
  end if;

  ---------------------------------------------------------------------------
  -- 10. Final PASS notice
  ---------------------------------------------------------------------------
  raise notice
    'PASS: installed approve/reject precedence and runtime invalidation behavior verified; transaction will roll back';
end
$verification$;

rollback;
\set ON_ERROR_STOP on

begin;

-- Development only. All fixture mutations and decision writes are rolled back.
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
  v_precedence_block_pattern constant text := $pattern$
    select [*] into v_member
    from public[.]organization_memberships
    where id = v_case[.]submitted_owner_membership_id
    for update;
    v_submitted_membership_found := found;
    if not v_submitted_membership_found
       or v_member[.]company_id is distinct from v_case[.]company_id
       or v_member[.]user_id is distinct from v_case[.]submitted_by_user_id
       or v_member[.]membership_status <> 'active'
       or v_member[.]workspace_role <> 'owner' then
      v_reason := 'OWNER_MEMBERSHIP_INACTIVE';
    else
      select [*] into v_current_owner_membership
      from public[.]organization_memberships
      where company_id = v_case[.]company_id
        and membership_status = 'active'
        and workspace_role = 'owner'
      for update;
      if not found then
        v_reason := 'SUBJECT_UNAVAILABLE';
      elsif v_current_owner_membership[.]user_id
            is distinct from v_company[.]user_id then
        v_reason := 'OWNERSHIP_PROJECTION_MISMATCH';
      elsif v_current_owner_membership[.]user_id
            is distinct from v_case[.]submitted_by_user_id
         or v_current_owner_membership[.]user_id
            is distinct from v_case[.]submitted_company_owner_user_id then
        v_reason := 'OWNER_CHANGED';
      end if;
    end if;
  $pattern$;
  v_audit_count bigint;
begin
  select reviewer_user_id
  into v_reviewer
  from public.internal_reviewer_assignments
  where capability = 'representative_verification.review'
    and status = 'active'
  order by reviewer_user_id
  limit 1;

  if v_reviewer is null then
    raise exception 'DEV_FIXTURE_MISSING: no active representative-verification reviewer';
  end if;

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
    max(case when ordinal = 1 then case_id end),
    max(case when ordinal = 2 then case_id end),
    max(case when ordinal = 1 then membership_id end),
    max(case when ordinal = 2 then membership_id end)
  into
    v_approve_case,
    v_reject_case,
    v_approve_membership,
    v_reject_membership
  from eligible
  where ordinal <= 2;

  if v_approve_case is null or v_reject_case is null then
    raise exception 'DEV_FIXTURE_MISSING: two distinct eligible pending cases are required';
  end if;

  -- Match one contiguous control-flow block, including the inner current-owner
  -- decision and both closing END IF statements. This proves that the current
  -- owner lookup belongs to the captured-membership validation ELSE branch.
  select pg_get_functiondef(
    'public.approve_representative_verification(uuid)'::regprocedure
  ) into v_definition;
  v_normalized_definition := regexp_replace(
    v_definition,
    '[[:space:]]+',
    ' ',
    'g'
  );
  if v_normalized_definition !~ regexp_replace(
    v_precedence_block_pattern,
    '[[:space:]]+',
    ' ',
    'g'
  ) then
    raise exception 'APPROVE_DEFINITION_PRECEDENCE_INVALID';
  end if;

  select pg_get_functiondef(
    'public.reject_representative_verification(uuid,text)'::regprocedure
  ) into v_definition;
  v_normalized_definition := regexp_replace(
    v_definition,
    '[[:space:]]+',
    ' ',
    'g'
  );
  if v_normalized_definition !~ regexp_replace(
    v_precedence_block_pattern,
    '[[:space:]]+',
    ' ',
    'g'
  ) then
    raise exception 'REJECT_DEFINITION_PRECEDENCE_INVALID';
  end if;

  -- Supabase auth.uid() reads this transaction-local JWT claim.
  perform set_config('request.jwt.claim.sub', v_reviewer::text, true);

  update public.organization_memberships
  set membership_status = 'suspended'
  where id in (v_approve_membership, v_reject_membership);

  if exists (
    select 1
    from public.organization_memberships m
    join public.representative_verification_cases c on c.company_id = m.company_id
    where c.id in (v_approve_case, v_reject_case)
      and m.membership_status = 'active'
      and m.workspace_role = 'owner'
  ) then
    raise exception 'FIXTURE_SETUP_FAILED: active canonical owner remains';
  end if;

  v_result := public.approve_representative_verification(v_approve_case);
  if v_result <> jsonb_build_object('success', false, 'error_code', 'CASE_INVALIDATED') then
    raise exception 'APPROVE_RESULT_INVALID: %', v_result;
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
    raise exception 'APPROVE_CASE_STATE_INVALID';
  end if;

  select count(*) into v_audit_count
  from public.audit_logs
  where entity_id = v_approve_case
    and action = 'REPRESENTATIVE_VERIFICATION_INVALIDATED';
  if v_audit_count <> 1 then
    raise exception 'APPROVE_AUDIT_COUNT_INVALID: %', v_audit_count;
  end if;

  v_result := public.reject_representative_verification(
    v_reject_case,
    'REPRESENTATIVE_AUTHORITY_NOT_CONFIRMED'
  );
  if v_result <> jsonb_build_object('success', false, 'error_code', 'CASE_INVALIDATED') then
    raise exception 'REJECT_RESULT_INVALID: %', v_result;
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
    raise exception 'REJECT_CASE_STATE_INVALID';
  end if;

  select count(*) into v_audit_count
  from public.audit_logs
  where entity_id = v_reject_case
    and action = 'REPRESENTATIVE_VERIFICATION_INVALIDATED';
  if v_audit_count <> 1 then
    raise exception 'REJECT_AUDIT_COUNT_INVALID: %', v_audit_count;
  end if;

  raise notice 'PASS: approve and reject precedence verified; transaction will roll back';
end
$verification$;

rollback;

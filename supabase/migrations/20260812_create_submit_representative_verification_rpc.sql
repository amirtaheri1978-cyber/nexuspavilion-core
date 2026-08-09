begin;

create or replace function public.submit_representative_verification(p_company_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid(); v_profile public.profiles%rowtype;
  v_membership public.organization_memberships%rowtype; v_company public.companies%rowtype;
  v_case public.representative_verification_cases%rowtype; v_constraint_name text;
begin
  if v_user_id is null then return jsonb_build_object('success',false,'error_code','AUTHENTICATION_REQUIRED','error_message','Authentication is required.'); end if;
  select * into v_profile from public.profiles where id = v_user_id;
  if not found then return jsonb_build_object('success',false,'error_code','SUBMISSION_NOT_AUTHORIZED','error_message','Submission is not authorized.'); end if;
  select * into v_membership from public.organization_memberships where user_id=v_user_id and company_id=p_company_id and membership_status='active' and workspace_role='owner' for update;
  if not found then return jsonb_build_object('success',false,'error_code','SUBMISSION_NOT_AUTHORIZED','error_message','An active canonical owner membership is required.'); end if;
  select * into v_company from public.companies where id = p_company_id for update;
  if not found then return jsonb_build_object('success',false,'error_code','SUBMISSION_NOT_AUTHORIZED','error_message','Submission is not authorized.'); end if;
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

revoke all on function public.submit_representative_verification(uuid) from public;
revoke all on function public.submit_representative_verification(uuid) from anon;
grant execute on function public.submit_representative_verification(uuid) to authenticated;

commit;

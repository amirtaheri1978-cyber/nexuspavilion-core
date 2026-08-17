begin;

create or replace function public.get_company_representative_verification_status(
  p_company_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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

revoke all on function public.get_company_representative_verification_status(uuid) from public;
revoke all on function public.get_company_representative_verification_status(uuid) from anon;
grant execute on function public.get_company_representative_verification_status(uuid) to authenticated;

commit;

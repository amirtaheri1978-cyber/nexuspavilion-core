begin;

-- Task 29: persist owner CONTRACT_AWARDED and supplier CONTRACT_AWARD_RECEIVED
-- activity in the same transaction as award_rfq_quote.
-- Authenticated clients still have SELECT-only on audit_logs/notifications.
-- Callers cannot supply a destination company_id. Supplier company is derived
-- from the awarded quote. Do not re-apply 20260828000000 or 20260829000000.

create or replace function public.record_rfq_award_workspace_activity(
  p_quote_id uuid,
  p_actor_user_id uuid,
  p_actor_workspace_role text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
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
      company_id
    )
    values (
      'Contract Awarded',
      coalesce(rfq_row.title, 'Project')
        || ' procurement contract has been awarded at '
        || amount_label
        || '.',
      'award',
      false,
      rfq_row.company_id
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
    company_id
  )
  values (
    'Contract Awarded',
    coalesce(rfq_row.title, 'Project')
      || ' contract award was received at '
      || amount_label
      || '.',
    'award',
    false,
    awarded_quote.company_id
  );
end;
$$;

comment on function public.record_rfq_award_workspace_activity(uuid, uuid, text) is
  'Internal award activity writer. Derives buyer and supplier company_id from the awarded quote/RFQ. Callers cannot choose a destination company. Not granted to authenticated clients.';

alter function public.record_rfq_award_workspace_activity(uuid, uuid, text)
  owner to postgres;

revoke all
on function public.record_rfq_award_workspace_activity(uuid, uuid, text)
from public;

revoke all
on function public.record_rfq_award_workspace_activity(uuid, uuid, text)
from anon;

revoke all
on function public.record_rfq_award_workspace_activity(uuid, uuid, text)
from authenticated;

create or replace function public.award_rfq_quote(p_quote_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
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

comment on function public.award_rfq_quote(uuid) is
  'Atomically awards one quote on its RFQ and writes owner CONTRACT_AWARDED plus supplier CONTRACT_AWARD_RECEIVED activity. Actor is auth.uid(); caller cannot supply company_id. Locks the RFQ row, rejects competing quotes, and writes RFQ and quote terminal state in one transaction. Blind invited/sealed/framework RFQs cannot be awarded until a valid parsed deadline is strictly in the past.';

alter function public.award_rfq_quote(uuid)
  owner to postgres;

revoke all
on function public.award_rfq_quote(uuid)
from public;

revoke all
on function public.award_rfq_quote(uuid)
from anon;

grant execute
on function public.award_rfq_quote(uuid)
to authenticated, service_role;

-- Repair already-awarded quotes that never received workspace activity
-- because client INSERT on audit_logs/notifications is denied after 280.
insert into public.audit_logs (
  action,
  entity_type,
  entity_id,
  user_id,
  company_id,
  metadata
)
select
  'CONTRACT_AWARDED',
  'quote',
  q.id,
  coalesce(r.user_id, q.user_id),
  r.company_id,
  jsonb_build_object(
    'rfq_id', r.id,
    'rfq_slug', r.slug,
    'rfq_title', r.title,
    'awarded_amount', q.amount,
    'awarded_quote_id', q.id,
    'awarded_company_id', q.company_id,
    'awarded_user_id', q.user_id,
    'awarded_at', q.awarded_at,
    'backfilled', true
  )
from public.quotes q
join public.rfqs r
  on r.id = q.rfq_id
 and r.awarded_quote_id = q.id
where q.decision = 'awarded'
  and r.company_id is not null
  and not exists (
    select 1
    from public.audit_logs a
    where a.action = 'CONTRACT_AWARDED'
      and a.entity_type = 'quote'
      and a.entity_id = q.id
      and a.company_id = r.company_id
  );

insert into public.notifications (
  title,
  message,
  type,
  is_read,
  company_id
)
select
  'Contract Awarded',
  coalesce(r.title, 'Project')
    || ' procurement contract has been awarded at $'
    || trim(to_char(round(coalesce(q.amount, 0)::numeric, 0), 'FM999,999,999,990'))
    || '.',
  'award',
  false,
  r.company_id
from public.quotes q
join public.rfqs r
  on r.id = q.rfq_id
 and r.awarded_quote_id = q.id
where q.decision = 'awarded'
  and r.company_id is not null
  and not exists (
    select 1
    from public.notifications n
    where n.company_id = r.company_id
      and n.type = 'award'
      and n.title = 'Contract Awarded'
      and n.message like coalesce(r.title, 'Project') || '%'
  );

insert into public.audit_logs (
  action,
  entity_type,
  entity_id,
  user_id,
  company_id,
  metadata
)
select
  'CONTRACT_AWARD_RECEIVED',
  'quote',
  q.id,
  coalesce(r.user_id, q.user_id),
  q.company_id,
  jsonb_build_object(
    'rfq_id', r.id,
    'rfq_slug', r.slug,
    'rfq_title', r.title,
    'awarded_amount', q.amount,
    'awarded_quote_id', q.id,
    'buyer_company_id', r.company_id,
    'recipient_company_id', q.company_id,
    'recipient_user_id', q.user_id,
    'awarded_at', q.awarded_at,
    'backfilled', true
  )
from public.quotes q
join public.rfqs r
  on r.id = q.rfq_id
 and r.awarded_quote_id = q.id
where q.decision = 'awarded'
  and q.company_id is not null
  and q.company_id is distinct from r.company_id
  and not exists (
    select 1
    from public.audit_logs a
    where a.action = 'CONTRACT_AWARD_RECEIVED'
      and a.entity_type = 'quote'
      and a.entity_id = q.id
      and a.company_id = q.company_id
  );

insert into public.notifications (
  title,
  message,
  type,
  is_read,
  company_id
)
select
  'Contract Awarded',
  coalesce(r.title, 'Project')
    || ' contract award was received at $'
    || trim(to_char(round(coalesce(q.amount, 0)::numeric, 0), 'FM999,999,999,990'))
    || '.',
  'award',
  false,
  q.company_id
from public.quotes q
join public.rfqs r
  on r.id = q.rfq_id
 and r.awarded_quote_id = q.id
where q.decision = 'awarded'
  and q.company_id is not null
  and q.company_id is distinct from r.company_id
  and not exists (
    select 1
    from public.notifications n
    where n.company_id = q.company_id
      and n.type = 'award'
      and n.title = 'Contract Awarded'
      and n.message like coalesce(r.title, 'Project') || '%'
  );

commit;

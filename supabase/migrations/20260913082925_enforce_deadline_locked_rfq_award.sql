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
  candidate_rfq_id uuid;
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

  select om.workspace_role
  into membership_role
  from public.organization_memberships om
  where om.user_id = actor_user_id
    and om.company_id = actor_company_id
    and om.membership_status = 'active'
    and om.workspace_role in ('owner', 'admin');

  select c.status, c.workspace_status
  into company_status, company_workspace_status
  from public.companies c
  where c.id = actor_company_id;

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

  -- Keep missing, foreign, pre-opening, rejected, self-issued, and
  -- addendum-ineligible quote identifiers indistinguishable.
  select r.id
  into candidate_rfq_id
  from public.quotes q
  join public.rfqs r
    on r.id = q.rfq_id
  where q.id = p_quote_id
    and r.company_id = actor_company_id
    and public.parse_rfq_deadline_timestamptz(r.deadline) is not null
    and public.parse_rfq_deadline_timestamptz(r.deadline) < now()
    and q.company_id is distinct from r.company_id
    and q.decision is distinct from 'rejected'
    and not exists (
      select 1
      from public.rfq_addenda a
      where a.rfq_id = r.id
        and a.requires_acknowledgement = true
        and not exists (
          select 1
          from public.rfq_addendum_acknowledgements ack
          where ack.rfq_id = r.id
            and ack.addendum_id = a.id
            and ack.company_id = q.company_id
        )
    );

  if candidate_rfq_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'AWARD_NOT_PERMITTED',
      'error_message', 'Award is not permitted.'
    );
  end if;

  select r.*
  into rfq_row
  from public.rfqs r
  where r.id = candidate_rfq_id
    and r.company_id = actor_company_id
  for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error_code', 'AWARD_NOT_PERMITTED',
      'error_message', 'Award is not permitted.'
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

  parsed_deadline := public.parse_rfq_deadline_timestamptz(rfq_row.deadline);

  if selected_quote.id is null
     or not (
       parsed_deadline is not null
       and parsed_deadline < now()
     )
     or selected_quote.company_id is not distinct from rfq_row.company_id
     or selected_quote.decision is not distinct from 'rejected'
     or exists (
       select 1
       from public.rfq_addenda a
       where a.rfq_id = rfq_row.id
         and a.requires_acknowledgement = true
         and not exists (
           select 1
           from public.rfq_addendum_acknowledgements ack
           where ack.rfq_id = rfq_row.id
             and ack.addendum_id = a.id
             and ack.company_id = selected_quote.company_id
         )
     )
  then
    return jsonb_build_object(
      'success', false,
      'error_code', 'AWARD_NOT_PERMITTED',
      'error_message', 'Award is not permitted.'
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

create or replace function public.enforce_rfq_award_authorization()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parsed_deadline timestamptz;
  selected_quote_company_id uuid;
  selected_quote_decision text;
begin
  if new.awarded_quote_id is distinct from old.awarded_quote_id
    or new.awarded_at is distinct from old.awarded_at
    or (
      new.status is distinct from old.status
      and (new.status = 'awarded' or old.status = 'awarded')
    )
  then
    if new.company_id is distinct from old.company_id then
      raise exception
        using
          errcode = '23514',
          message = 'The issuing company cannot change during an RFQ award mutation.';
    end if;

    if new.deadline is distinct from old.deadline then
      raise exception
        using
          errcode = '23514',
          message = 'The RFQ deadline cannot change during an award mutation.';
    end if;

    if auth.uid() is null
      or not exists (
        select 1
        from public.organization_memberships om
        join public.companies c
          on c.id = om.company_id
        where om.user_id = auth.uid()
          and om.company_id = new.company_id
          and om.membership_status = 'active'
          and om.workspace_role in ('owner', 'admin')
          and c.workspace_status = 'active'
          and c.status = 'verified'
      )
    then
      raise exception
        using
          errcode = '42501',
          message = 'Only active workspace owners or administrators of a verified issuing company may award an RFQ.';
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

    parsed_deadline := public.parse_rfq_deadline_timestamptz(new.deadline);

    if not (
      parsed_deadline is not null
      and parsed_deadline < now()
    ) then
      raise exception
        using
          errcode = '42501',
          message = 'RFQ award is locked until after a valid submission deadline.';
    end if;

    select q.company_id, q.decision
    into selected_quote_company_id, selected_quote_decision
    from public.quotes q
    where q.id = new.awarded_quote_id
      and q.rfq_id = new.id;

    if not found then
      raise exception
        using
          errcode = '23514',
          message = 'The awarded quote must belong to the RFQ being awarded.';
    end if;

    if selected_quote_company_id is not distinct from new.company_id then
      raise exception
        using
          errcode = '23514',
          message = 'An issuing company cannot award its own quote.';
    end if;

    if selected_quote_decision is not distinct from 'rejected' then
      raise exception
        using
          errcode = '23514',
          message = 'A rejected quote cannot be awarded.';
    end if;

    if exists (
      select 1
      from public.rfq_addenda a
      where a.rfq_id = new.id
        and a.requires_acknowledgement = true
        and not exists (
          select 1
          from public.rfq_addendum_acknowledgements ack
          where ack.rfq_id = new.id
            and ack.addendum_id = a.id
            and ack.company_id = selected_quote_company_id
        )
    )
    then
      raise exception
        using
          errcode = '42501',
          message = 'The selected supplier must acknowledge every required RFQ addendum before award.';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.enforce_rfq_award_terminal_consistency()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  awarded_quote_decision text;
  awarded_quote_rfq_id uuid;
  awarded_quote_awarded_at timestamptz;
begin
  if new.status = 'awarded'
     or new.awarded_quote_id is not null
     or new.awarded_at is not null
  then
    if new.status is distinct from 'awarded'
       or new.awarded_quote_id is null
       or new.awarded_at is null
    then
      raise exception
        using
          errcode = '23514',
          message = 'RFQ award status, awarded quote, and awarded timestamp must be set together.';
    end if;

    select q.decision, q.rfq_id, q.awarded_at
    into awarded_quote_decision, awarded_quote_rfq_id, awarded_quote_awarded_at
    from public.quotes q
    where q.id = new.awarded_quote_id;

    if not found
      or awarded_quote_rfq_id is distinct from new.id
      or awarded_quote_decision is distinct from 'awarded'
      or awarded_quote_awarded_at is distinct from new.awarded_at
    then
      raise exception
        using
          errcode = '23514',
          message = 'RFQ award fields must match a quote awarded on the same RFQ at the same timestamp.';
    end if;
  end if;

  return null;
end;
$$;

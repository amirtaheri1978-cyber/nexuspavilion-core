begin;

-- Task 20: atomic single-award integrity.
-- One SECURITY DEFINER command awards an RFQ. Partial unique index and
-- triggers remain the backstop so authenticated table UPDATE cannot create a
-- second winner or pointer/decision disagreement.

create unique index if not exists quotes_one_awarded_decision_per_rfq
  on public.quotes (rfq_id)
  where decision = 'awarded';

create or replace function public.enforce_rfq_award_authorization()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
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

create or replace function public.enforce_quote_award_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
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

drop trigger if exists enforce_quote_award_integrity_trigger on public.quotes;

create trigger enforce_quote_award_integrity_trigger
  before insert or update on public.quotes
  for each row
  execute function public.enforce_quote_award_integrity();

create or replace function public.enforce_rfq_award_terminal_consistency()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
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

drop trigger if exists enforce_rfq_award_terminal_consistency_trigger on public.rfqs;

create constraint trigger enforce_rfq_award_terminal_consistency_trigger
  after insert or update on public.rfqs
  deferrable initially deferred
  for each row
  execute function public.enforce_rfq_award_terminal_consistency();

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
  'Atomically awards one quote on its RFQ. Actor is auth.uid(); caller cannot supply company_id. Locks the RFQ row, rejects competing quotes, and writes RFQ and quote terminal state in one transaction.';

alter function public.award_rfq_quote(uuid) owner to postgres;

revoke all
on function public.award_rfq_quote(uuid)
from public;

revoke all
on function public.award_rfq_quote(uuid)
from anon;

grant execute
on function public.award_rfq_quote(uuid)
to authenticated, service_role;

commit;

begin;

-- Task 28: backend-enforced blind-bidding confidentiality and integrity.
-- Issuing buyers must not SELECT or UPDATE quote rows until commercial
-- evaluation is unlocked. award_rfq_quote is SECURITY DEFINER and therefore
-- receives the same unlock check in-function. Supplier members retain
-- own-company quote SELECT at all times. Before unlock, authorized issuers
-- may receive an integer submission count only. Authenticated table-level
-- UPDATE on public.quotes is revoked; the only remaining authenticated
-- column grant is UPDATE(decision). public.rfqs.deadline is text, so
-- commercial-unlock comparisons parse it fail-closed: null, blank, and
-- unparseable values stay locked. This migration does not rewrite
-- historical baseline or award-integrity migrations, does not change
-- quote INSERT policy or GRANT SELECT / GRANT INSERT, and does not
-- convert rfqs.deadline.

create or replace function public.parse_rfq_deadline_timestamptz(p_deadline text)
returns timestamptz
language plpgsql
stable
parallel safe
set search_path = ''
as $$
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

comment on function public.parse_rfq_deadline_timestamptz(text) is
  'Fail-closed parser for public.rfqs.deadline (text). Returns timestamptz for a valid timestamp, otherwise null. Null, blank, malformed, and overflow values do not unlock commercial evaluation.';

alter function public.parse_rfq_deadline_timestamptz(text)
  owner to postgres;

revoke all
on function public.parse_rfq_deadline_timestamptz(text)
from public;

revoke all
on function public.parse_rfq_deadline_timestamptz(text)
from anon;

grant execute
on function public.parse_rfq_deadline_timestamptz(text)
to authenticated;

drop policy if exists "Company members can read permitted quotes"
  on public.quotes;

create policy "Company members can read own company quotes"
on public.quotes
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_memberships om
    where om.user_id = auth.uid()
      and om.company_id = quotes.company_id
      and om.membership_status = 'active'
  )
);

create policy "Issuing buyers can read quotes after commercial unlock"
on public.quotes
for select
to authenticated
using (
  exists (
    select 1
    from public.rfqs r
    join public.organization_memberships om
      on om.company_id = r.company_id
    where r.id = quotes.rfq_id
      and om.user_id = auth.uid()
      and om.membership_status = 'active'
      and (
        om.workspace_role in ('owner', 'admin')
        or om.procurement_function = 'buyer'
      )
      and (
        (
          coalesce(r.sourcing_method, 'invited') = 'open'
          and coalesce(r.contract_framework, 'project_specific') <> 'framework'
        )
        or (
          public.parse_rfq_deadline_timestamptz(r.deadline) is not null
          and public.parse_rfq_deadline_timestamptz(r.deadline) < now()
        )
      )
  )
);

drop policy if exists "Workspace administrators can update RFQ quote decisions"
  on public.quotes;

create policy "Workspace administrators can update RFQ quote decisions"
on public.quotes
for update
to authenticated
using (
  exists (
    select 1
    from public.rfqs r
    join public.organization_memberships om
      on om.company_id = r.company_id
    where r.id = quotes.rfq_id
      and om.user_id = auth.uid()
      and om.membership_status = 'active'
      and om.workspace_role in ('owner', 'admin')
      and (
        (
          coalesce(r.sourcing_method, 'invited') = 'open'
          and coalesce(r.contract_framework, 'project_specific') <> 'framework'
        )
        or (
          public.parse_rfq_deadline_timestamptz(r.deadline) is not null
          and public.parse_rfq_deadline_timestamptz(r.deadline) < now()
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.rfqs r
    join public.organization_memberships om
      on om.company_id = r.company_id
    where r.id = quotes.rfq_id
      and om.user_id = auth.uid()
      and om.membership_status = 'active'
      and om.workspace_role in ('owner', 'admin')
      and (
        (
          coalesce(r.sourcing_method, 'invited') = 'open'
          and coalesce(r.contract_framework, 'project_specific') <> 'framework'
        )
        or (
          public.parse_rfq_deadline_timestamptz(r.deadline) is not null
          and public.parse_rfq_deadline_timestamptz(r.deadline) < now()
        )
      )
  )
);

create or replace function public.count_rfq_quote_submissions(p_rfq_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
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

comment on function public.count_rfq_quote_submissions(uuid) is
  'Integer-only helper for issuer participation counts before commercial unlock. Authorizes the caller as an active owner/admin/buyer of the issuing RFQ company, then returns COUNT(*) of quotes for that RFQ. Unauthorized or missing RFQs return 0. Never returns quote rows, quote ids, supplier identity, or commercial columns.';

alter function public.count_rfq_quote_submissions(uuid)
  owner to postgres;

revoke all
on function public.count_rfq_quote_submissions(uuid)
from public;

revoke all
on function public.count_rfq_quote_submissions(uuid)
from anon;

grant execute
on function public.count_rfq_quote_submissions(uuid)
to authenticated;

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
  'Atomically awards one quote on its RFQ. Actor is auth.uid(); caller cannot supply company_id. Locks the RFQ row, rejects competing quotes, and writes RFQ and quote terminal state in one transaction. Blind invited/sealed/framework RFQs cannot be awarded until a valid parsed deadline is strictly in the past.';

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

-- Column-integrity: authenticated must not PATCH supplier-authored quote
-- columns after a legitimate commercial unlock. REVOKE table-level UPDATE
-- and re-grant UPDATE(decision) only. GRANT SELECT and GRANT INSERT on
-- public.quotes to authenticated remain from baseline. service_role
-- GRANT ALL and postgres SECURITY DEFINER (award_rfq_quote) bypass these
-- authenticated column grants.
revoke update
on table public.quotes
from authenticated;

grant update (decision)
on table public.quotes
to authenticated;

commit;

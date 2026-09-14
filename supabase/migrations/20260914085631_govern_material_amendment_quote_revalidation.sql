-- 18-26A: material-amendment Quote revalidation and award enforcement.

begin;

alter table public.quotes
  add constraint quotes_id_rfq_company_unique
  unique (id, rfq_id, company_id);

create table public.rfq_quote_revalidations (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null,
  rfq_id uuid not null,
  company_id uuid not null,
  addendum_id uuid not null,
  acted_by uuid not null,
  action text not null,
  commercial_before jsonb not null,
  commercial_after jsonb not null,
  created_at timestamptz not null default now(),
  constraint rfq_quote_revalidations_action_check
    check (action in ('reconfirmed', 'resubmitted')),
  constraint rfq_quote_revalidations_evidence_check
    check (
      jsonb_typeof(commercial_before) = 'object'
      and jsonb_typeof(commercial_after) = 'object'
      and commercial_before ?& array[
        'amount', 'timeline', 'message', 'validity_days', 'score'
      ]
      and commercial_after ?& array[
        'amount', 'timeline', 'message', 'validity_days', 'score'
      ]
      and (
        action <> 'reconfirmed'
        or commercial_before = commercial_after
      )
    ),
  constraint rfq_quote_revalidations_quote_identity_fkey
    foreign key (quote_id, rfq_id, company_id)
    references public.quotes (id, rfq_id, company_id)
    on delete restrict,
  constraint rfq_quote_revalidations_addendum_identity_fkey
    foreign key (addendum_id, rfq_id)
    references public.rfq_addenda (id, rfq_id)
    on delete restrict,
  constraint rfq_quote_revalidations_quote_addendum_unique
    unique (quote_id, addendum_id)
);

comment on table public.rfq_quote_revalidations is
  'Append-only evidence that one canonical Quote was explicitly reconfirmed or '
  'resubmitted against a governed material RFQ Addendum. This table is not a '
  'second current-Quote source.';

create index rfq_quote_revalidations_rfq_company_idx
on public.rfq_quote_revalidations (rfq_id, company_id, created_at desc);

alter table public.rfq_quote_revalidations enable row level security;

create policy "Respondents can read own Quote revalidation evidence"
on public.rfq_quote_revalidations
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_memberships as om
    where om.user_id = auth.uid()
      and om.company_id = rfq_quote_revalidations.company_id
      and om.membership_status = 'active'
  )
);

create policy "Issuers can read Quote revalidation evidence after opening"
on public.rfq_quote_revalidations
for select
to authenticated
using (
  exists (
    select 1
    from public.rfqs as r
    join public.organization_memberships as om
      on om.company_id = r.company_id
     and om.user_id = auth.uid()
     and om.membership_status in ('active', 'archived')
     and (
       om.workspace_role in ('owner', 'admin')
       or om.procurement_function = 'buyer'
     )
    where r.id = rfq_quote_revalidations.rfq_id
      and r.company_id <> rfq_quote_revalidations.company_id
      and public.parse_rfq_deadline_timestamptz(r.deadline) is not null
      and public.parse_rfq_deadline_timestamptz(r.deadline) < now()
  )
);

revoke all on table public.rfq_quote_revalidations
from public, anon, authenticated;

grant select on table public.rfq_quote_revalidations
to authenticated;

create or replace function public.protect_rfq_quote_revalidation_evidence()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception
    using
      errcode = '23514',
      message = 'RFQ Quote revalidation evidence is immutable.';
end;
$$;

revoke all
on function public.protect_rfq_quote_revalidation_evidence()
from public, anon, authenticated;

create trigger protect_rfq_quote_revalidation_evidence_trigger
before update or delete on public.rfq_quote_revalidations
for each row
execute function public.protect_rfq_quote_revalidation_evidence();

create or replace function public.rfq_quote_requires_material_revalidation(
  p_quote_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with quote_basis as (
    select q.id, q.rfq_id, q.company_id, q.created_at
    from public.quotes as q
    where q.id = p_quote_id
  ),
  latest_material_addendum as (
    select a.id, a.rfq_id, a.created_at
    from public.rfq_addenda as a
    join quote_basis as q
      on q.rfq_id = a.rfq_id
    where a.affected_fields is not null
      and cardinality(a.affected_fields) > 0
      and jsonb_typeof(a.amendment_before) = 'object'
      and jsonb_typeof(a.amendment_after) = 'object'
      and nullif(btrim(a.amendment_reason), '') is not null
    order by a.created_at desc, a.addendum_number desc, a.id desc
    limit 1
  )
  select exists (
    select 1
    from quote_basis as q
    join latest_material_addendum as a
      on a.rfq_id = q.rfq_id
    where not exists (
        select 1
        from public.rfq_quote_revalidations as revalidation
        where revalidation.quote_id = q.id
          and revalidation.rfq_id = q.rfq_id
          and revalidation.addendum_id = a.id
      )
      and not exists (
        select 1
        from public.rfq_addendum_acknowledgements as acknowledgement
        where acknowledgement.rfq_id = q.rfq_id
          and acknowledgement.addendum_id = a.id
          and acknowledgement.company_id = q.company_id
          and acknowledgement.acknowledged_at <= q.created_at
      )
  );
$$;

comment on function public.rfq_quote_requires_material_revalidation(uuid) is
  'Internal boolean award guard. A Quote is stale against the latest structured '
  'material Addendum unless immutable revalidation exists or the respondent '
  'acknowledged that exact Addendum before the original Quote submission.';

revoke all
on function public.rfq_quote_requires_material_revalidation(uuid)
from public, anon, authenticated;

create or replace function public.revalidate_rfq_quote(
  p_quote_id uuid,
  p_action text,
  p_amount numeric default null,
  p_timeline text default null,
  p_message text default null,
  p_validity_days integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := (select auth.uid());
  action_name text := lower(btrim(coalesce(p_action, '')));
  target_rfq_id uuid;
  target_quote public.quotes%rowtype;
  target_rfq public.rfqs%rowtype;
  latest_material_addendum public.rfq_addenda%rowtype;
  before_evidence jsonb;
  after_evidence jsonb;
  timeline_value text;
  timeline_score integer;
  revised_score numeric;
  created_revalidation public.rfq_quote_revalidations%rowtype;
begin
  if actor_user_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'AUTHENTICATION_REQUIRED',
      'error_message', 'Authentication is required.'
    );
  end if;

  if p_quote_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'QUOTE_NOT_ELIGIBLE',
      'error_message', 'Quote revalidation is not permitted.'
    );
  end if;

  if action_name not in ('reconfirmed', 'resubmitted') then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_REVALIDATION_ACTION',
      'error_message', 'Revalidation action must be reconfirmed or resubmitted.'
    );
  end if;

  select q.rfq_id
  into target_rfq_id
  from public.quotes as q
  where q.id = p_quote_id;

  if target_rfq_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'QUOTE_NOT_ELIGIBLE',
      'error_message', 'Quote revalidation is not permitted.'
    );
  end if;

  select r.*
  into target_rfq
  from public.rfqs as r
  where r.id = target_rfq_id
  for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error_code', 'QUOTE_NOT_ELIGIBLE',
      'error_message', 'Quote revalidation is not permitted.'
    );
  end if;

  perform 1
  from public.quotes as q
  where q.rfq_id = target_rfq.id
  order by q.id
  for update;

  select q.*
  into target_quote
  from public.quotes as q
  where q.id = p_quote_id
    and q.rfq_id = target_rfq.id;

  if target_quote.id is null
    or target_quote.company_id is null
    or target_quote.company_id = target_rfq.company_id
    or target_quote.status <> 'submitted'
    or target_quote.decision <> 'pending'
    or target_rfq.status <> 'open'
    or target_rfq.awarded_quote_id is not null
    or target_rfq.awarded_at is not null
    or public.parse_rfq_deadline_timestamptz(target_rfq.deadline) is null
    or now() > public.parse_rfq_deadline_timestamptz(target_rfq.deadline)
    or not exists (
      select 1
      from public.organization_memberships as om
      where om.user_id = actor_user_id
        and om.company_id = target_quote.company_id
        and om.membership_status = 'active'
    )
    or not (
      target_rfq.sourcing_method = 'open'
      or public.current_user_has_supplier_rfq_access(target_rfq.id)
    )
  then
    return jsonb_build_object(
      'success', false,
      'error_code', 'QUOTE_NOT_ELIGIBLE',
      'error_message', 'Quote revalidation is not permitted.'
    );
  end if;

  select a.*
  into latest_material_addendum
  from public.rfq_addenda as a
  where a.rfq_id = target_rfq.id
    and a.affected_fields is not null
    and cardinality(a.affected_fields) > 0
    and jsonb_typeof(a.amendment_before) = 'object'
    and jsonb_typeof(a.amendment_after) = 'object'
    and nullif(btrim(a.amendment_reason), '') is not null
  order by a.created_at desc, a.addendum_number desc, a.id desc
  limit 1;

  if latest_material_addendum.id is null
    or exists (
      select 1
      from public.rfq_quote_revalidations as revalidation
      where revalidation.quote_id = target_quote.id
        and revalidation.rfq_id = target_rfq.id
        and revalidation.addendum_id = latest_material_addendum.id
    )
    or exists (
      select 1
      from public.rfq_addendum_acknowledgements as acknowledgement
      where acknowledgement.rfq_id = target_rfq.id
        and acknowledgement.addendum_id = latest_material_addendum.id
        and acknowledgement.company_id = target_quote.company_id
        and acknowledgement.acknowledged_at <= target_quote.created_at
    )
  then
    return jsonb_build_object(
      'success', false,
      'error_code', 'REVALIDATION_NOT_REQUIRED',
      'error_message', 'This Quote does not require material-amendment revalidation.'
    );
  end if;

  if exists (
    select 1
    from public.rfq_addenda as required_addendum
    where required_addendum.rfq_id = target_rfq.id
      and required_addendum.requires_acknowledgement = true
      and not exists (
        select 1
        from public.rfq_addendum_acknowledgements as acknowledgement
        where acknowledgement.rfq_id = target_rfq.id
          and acknowledgement.addendum_id = required_addendum.id
          and acknowledgement.company_id = target_quote.company_id
      )
  ) then
    return jsonb_build_object(
      'success', false,
      'error_code', 'ADDENDUM_ACKNOWLEDGEMENT_REQUIRED',
      'error_message', 'Required RFQ Addenda must be acknowledged before Quote revalidation.'
    );
  end if;

  before_evidence := jsonb_build_object(
    'amount', target_quote.amount,
    'timeline', target_quote.timeline,
    'message', target_quote.message,
    'validity_days', target_quote.validity_days,
    'score', target_quote.score
  );

  if action_name = 'reconfirmed' then
    if p_amount is not null
      or p_timeline is not null
      or p_message is not null
      or p_validity_days is not null
    then
      return jsonb_build_object(
        'success', false,
        'error_code', 'RECONFIRMATION_TERMS_NOT_ALLOWED',
        'error_message', 'Reconfirmation cannot change commercial terms.'
      );
    end if;

    after_evidence := before_evidence;
  else
    if p_amount is null
      or p_amount::text in ('NaN', 'Infinity', '-Infinity')
      or p_amount <= 0
      or nullif(btrim(coalesce(p_timeline, '')), '') is null
      or nullif(btrim(coalesce(p_message, '')), '') is null
      or p_validity_days is null
      or p_validity_days not in (30, 60, 90, 120)
    then
      return jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_REVISED_COMMERCIAL_TERMS',
        'error_message', 'Complete valid revised commercial terms are required.'
      );
    end if;

    timeline_value := lower(p_timeline);
    timeline_score := 50;
    if timeline_value like '%q1%' then timeline_score := 100; end if;
    if timeline_value like '%q2%' then timeline_score := 85; end if;
    if timeline_value like '%q3%' then timeline_score := 70; end if;
    if timeline_value like '%q4%' then timeline_score := 55; end if;
    if timeline_value like '%week%' then timeline_score := 85; end if;
    if timeline_value like '%fast%' or timeline_value like '%quick%' then
      timeline_score := 90;
    end if;
    revised_score := least(70 + round(timeline_score * 0.3), 100);

    update public.quotes
    set amount = p_amount,
        timeline = btrim(p_timeline),
        message = btrim(p_message),
        validity_days = p_validity_days,
        score = revised_score
    where id = target_quote.id
      and rfq_id = target_rfq.id
      and company_id = target_quote.company_id
    returning * into target_quote;

    if not found then
      raise exception
        using
          errcode = '23514',
          message = 'Quote resubmission update failed.';
    end if;

    after_evidence := jsonb_build_object(
      'amount', target_quote.amount,
      'timeline', target_quote.timeline,
      'message', target_quote.message,
      'validity_days', target_quote.validity_days,
      'score', target_quote.score
    );
  end if;

  insert into public.rfq_quote_revalidations (
    quote_id,
    rfq_id,
    company_id,
    addendum_id,
    acted_by,
    action,
    commercial_before,
    commercial_after
  ) values (
    target_quote.id,
    target_rfq.id,
    target_quote.company_id,
    latest_material_addendum.id,
    actor_user_id,
    action_name,
    before_evidence,
    after_evidence
  )
  returning * into created_revalidation;

  return jsonb_build_object(
    'success', true,
    'quote_id', target_quote.id,
    'rfq_id', target_rfq.id,
    'addendum_id', latest_material_addendum.id,
    'revalidation_id', created_revalidation.id,
    'action', created_revalidation.action,
    'created_at', created_revalidation.created_at
  );
exception
  when unique_violation then
    return jsonb_build_object(
      'success', false,
      'error_code', 'REVALIDATION_NOT_REQUIRED',
      'error_message', 'This Quote does not require material-amendment revalidation.'
    );
end;
$$;

comment on function public.revalidate_rfq_quote(
  uuid, text, numeric, text, text, integer
) is
  'Reconfirms unchanged terms or atomically resubmits the one canonical Quote '
  'against the latest governed material Addendum. Actor, RFQ, respondent company, '
  'Addendum, deadline, access, and acknowledgement state are derived and enforced '
  'server-side.';

revoke all
on function public.revalidate_rfq_quote(uuid, text, numeric, text, text, integer)
from public, anon;

grant execute
on function public.revalidate_rfq_quote(uuid, text, numeric, text, text, integer)
to authenticated;

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
      raise exception using errcode = '23514',
        message = 'The issuing company cannot change during an RFQ award mutation.';
    end if;
    if new.deadline is distinct from old.deadline then
      raise exception using errcode = '23514',
        message = 'The RFQ deadline cannot change during an award mutation.';
    end if;
    if auth.uid() is null or not exists (
      select 1
      from public.organization_memberships as om
      join public.companies as c on c.id = om.company_id
      where om.user_id = auth.uid()
        and om.company_id = new.company_id
        and om.membership_status = 'active'
        and om.workspace_role in ('owner', 'admin')
        and c.workspace_status = 'active'
        and c.status = 'verified'
    ) then
      raise exception using errcode = '42501',
        message = 'Only active workspace owners or administrators of a verified issuing company may award an RFQ.';
    end if;
    if old.awarded_quote_id is not null
      and new.awarded_quote_id is distinct from old.awarded_quote_id then
      raise exception using errcode = '23514',
        message = 'An awarded RFQ cannot replace its awarded quote.';
    end if;
    if old.status = 'awarded' and new.status is distinct from 'awarded' then
      raise exception using errcode = '23514',
        message = 'An awarded RFQ cannot leave the awarded status.';
    end if;

    parsed_deadline := public.parse_rfq_deadline_timestamptz(new.deadline);
    if not (parsed_deadline is not null and parsed_deadline < now()) then
      raise exception using errcode = '42501',
        message = 'RFQ award is locked until after a valid submission deadline.';
    end if;

    select q.company_id, q.decision
    into selected_quote_company_id, selected_quote_decision
    from public.quotes as q
    where q.id = new.awarded_quote_id and q.rfq_id = new.id;

    if not found then
      raise exception using errcode = '23514',
        message = 'The awarded quote must belong to the RFQ being awarded.';
    end if;
    if selected_quote_company_id is not distinct from new.company_id then
      raise exception using errcode = '23514',
        message = 'An issuing company cannot award its own quote.';
    end if;
    if selected_quote_decision is not distinct from 'rejected' then
      raise exception using errcode = '23514',
        message = 'A rejected quote cannot be awarded.';
    end if;
    if exists (
      select 1
      from public.rfq_addenda as a
      where a.rfq_id = new.id
        and a.requires_acknowledgement = true
        and not exists (
          select 1
          from public.rfq_addendum_acknowledgements as ack
          where ack.rfq_id = new.id
            and ack.addendum_id = a.id
            and ack.company_id = selected_quote_company_id
        )
    ) then
      raise exception using errcode = '42501',
        message = 'The selected supplier must acknowledge every required RFQ addendum before award.';
    end if;
    if public.rfq_quote_requires_material_revalidation(new.awarded_quote_id) then
      raise exception using errcode = '42501',
        message = 'The selected Quote requires material-amendment revalidation before award.';
    end if;
  end if;

  return new;
end;
$$;

revoke all
on function public.enforce_rfq_award_authorization()
from public;

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

  -- Keep missing, foreign, pre-opening, rejected, self-issued,
  -- addendum-ineligible, and materially stale Quote identifiers indistinguishable.
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
    and not public.rfq_quote_requires_material_revalidation(q.id)
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
     or public.rfq_quote_requires_material_revalidation(selected_quote.id)
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

comment on function public.award_rfq_quote(uuid) is
  'Atomically awards one eligible Quote after commercial opening. The bounded '
  'pre-lock lookup, post-lock revalidation, and direct-mutation trigger all deny '
  'Quotes stale against the latest governed material Addendum.';

alter function public.award_rfq_quote(uuid) owner to postgres;

revoke all on function public.award_rfq_quote(uuid) from public, anon;
grant execute on function public.award_rfq_quote(uuid)
to authenticated, service_role;

commit;

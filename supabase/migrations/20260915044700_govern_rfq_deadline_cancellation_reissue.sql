-- 18-27: govern RFQ deadline extension, cancellation, and reissue lineage.
--
-- Launch policy:
-- - The canonical RFQ deadline remains the single commercial-opening authority.
-- - A published submission deadline may only move later, through the existing
--   governed Addendum amendment command, before commercial opening.
-- - Deadline shortening and prohibited procurement-basis changes require
--   cancellation/reissue.
-- - Cancellation is terminal and preserves all historical procurement evidence.
-- - Lifecycle-critical child writes serialize against the parent RFQ so no
--   in-flight write can commit after governed cancellation. Respondent INSERT
--   paths use existing SECURITY DEFINER trigger fences. Issuer UPDATE/Invite
--   policies call a tightly scoped SECURITY DEFINER fence helper because the
--   authenticated role intentionally does not hold direct RFQ UPDATE privilege.
-- - Reissue creates a new RFQ identity with lineage to one cancelled predecessor;
--   Quotes, Invitations, Addenda, acknowledgements, revalidations, Award state,
--   and activity history are never copied by this migration.

begin;

alter table public.rfqs
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by_user_id uuid,
  add column if not exists cancellation_reason text,
  add column if not exists reissued_from_rfq_id uuid;

alter table public.rfqs
  add constraint rfqs_cancelled_by_user_id_fkey
    foreign key (cancelled_by_user_id)
    references public.profiles (id)
    on delete restrict,
  add constraint rfqs_reissued_from_rfq_id_fkey
    foreign key (reissued_from_rfq_id)
    references public.rfqs (id)
    on delete restrict,
  add constraint rfqs_reissue_not_self_check
    check (
      reissued_from_rfq_id is null
      or reissued_from_rfq_id <> id
    ),
  add constraint rfqs_cancellation_state_check
    check (
      (
        status = 'cancelled'
        and cancelled_at is not null
        and cancelled_by_user_id is not null
        and cancellation_reason is not null
        and nullif(btrim(cancellation_reason), '') is not null
        and char_length(btrim(cancellation_reason)) <= 2000
        and awarded_quote_id is null
        and awarded_at is null
      )
      or
      (
        status <> 'cancelled'
        and cancelled_at is null
        and cancelled_by_user_id is null
        and cancellation_reason is null
      )
    );

create unique index rfqs_one_reissue_per_source_idx
on public.rfqs (reissued_from_rfq_id)
where reissued_from_rfq_id is not null;

comment on column public.rfqs.cancelled_at is
  'Authoritative timestamp at which an unawarded published RFQ entered the terminal cancelled state.';
comment on column public.rfqs.cancelled_by_user_id is
  'Authenticated issuer user who executed the governed RFQ cancellation command.';
comment on column public.rfqs.cancellation_reason is
  'Required issuer cancellation reason retained with the terminal RFQ record.';
comment on column public.rfqs.reissued_from_rfq_id is
  'Optional immutable lineage to one cancelled predecessor RFQ. No child procurement lifecycle data is inherited.';

create or replace function public.enforce_published_rfq_governance()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- Cancellation is terminal. Only the already-audited internal project metadata
  -- may be corrected after cancellation; all procurement/lifecycle evidence stays
  -- immutable.
  if old.status = 'cancelled' then
    if (to_jsonb(new) - 'internal_project_id')
       is distinct from
       (to_jsonb(old) - 'internal_project_id')
    then
      raise exception
        using
          errcode = '23514',
          message = 'Cancelled RFQs are terminal and cannot change procurement or lifecycle state.';
    end if;

    return new;
  end if;

  -- Direct Data API writes may edit draft RFQs. Once published, fail closed:
  -- every current or future RFQ column is immutable unless it is explicitly
  -- removed from the whole-row comparison below. The sole administrative
  -- exception is internal_project_id. A vetted direct open -> awarded transition
  -- may additionally change only status, awarded_quote_id, and awarded_at; the
  -- existing authoritative Award trigger remains responsible for validating it.
  if current_user in ('anon', 'authenticated', 'service_role')
     and old.status <> 'draft'
  then
    if old.status = 'open'
       and new.status = 'awarded'
    then
      if (
        to_jsonb(new)
          - 'internal_project_id'
          - 'status'
          - 'awarded_quote_id'
          - 'awarded_at'
      ) is distinct from (
        to_jsonb(old)
          - 'internal_project_id'
          - 'status'
          - 'awarded_quote_id'
          - 'awarded_at'
      )
      then
        raise exception
          using
            errcode = '42501',
            message = 'CANCEL_REISSUE_REQUIRED: Published RFQ respondent-facing changes require a governed amendment or cancel/reissue.';
      end if;
    elsif (to_jsonb(new) - 'internal_project_id')
          is distinct from
          (to_jsonb(old) - 'internal_project_id')
    then
      if new.status is distinct from old.status then
        raise exception
          using
            errcode = '42501',
            message = 'GOVERNED_RFQ_COMMAND_REQUIRED: Published RFQ lifecycle transitions require an authoritative command.';
      end if;

      raise exception
        using
          errcode = '42501',
          message = 'CANCEL_REISSUE_REQUIRED: Published RFQ respondent-facing changes require a governed amendment or cancel/reissue.';
    end if;
  end if;

  return new;
end;
$$;
revoke all
on function public.enforce_published_rfq_governance()
from public, anon, authenticated;

drop trigger if exists enforce_published_rfq_governance_trigger
on public.rfqs;

create trigger enforce_published_rfq_governance_trigger
before update on public.rfqs
for each row
execute function public.enforce_published_rfq_governance();

-- Serialize lifecycle-critical child writes against the governed parent RFQ.
-- FOR SHARE is intentional: unlike FOR KEY SHARE, it conflicts with the
-- FOR NO KEY UPDATE row lock used by ordinary non-key RFQ lifecycle updates,
-- including cancellation status/provenance changes, while allowing concurrent
-- child writers to hold compatible SHARE locks.
--
-- The authenticated role intentionally has no direct UPDATE privilege on rfqs.
-- Therefore issuer-side child RLS policies cannot use SELECT ... FOR SHARE on
-- rfqs directly. They call this narrowly authorized SECURITY DEFINER helper,
-- which checks issuer membership/lifecycle eligibility and acquires the parent
-- SHARE lock before the child row is mutated.
create or replace function public.acquire_issuer_rfq_lifecycle_fence(
  p_rfq_id uuid,
  p_owner_admin_only boolean default false,
  p_require_commercial_open boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := auth.uid();
  locked_parent_id uuid;
begin
  if actor_user_id is null or p_rfq_id is null then
    return false;
  end if;

  select r.id
  into locked_parent_id
  from public.rfqs as r
  where r.id = p_rfq_id
    and r.status = 'open'
    and r.awarded_quote_id is null
    and r.awarded_at is null
    and (
      p_require_commercial_open is not true
      or (
        public.parse_rfq_deadline_timestamptz(r.deadline) is not null
        and public.parse_rfq_deadline_timestamptz(r.deadline) < now()
      )
    )
    and exists (
      select 1
      from public.organization_memberships as om
      where om.user_id = actor_user_id
        and om.company_id = r.company_id
        and om.membership_status = 'active'
        and (
          (
            p_owner_admin_only is true
            and om.workspace_role in ('owner', 'admin')
          )
          or (
            p_owner_admin_only is not true
            and (
              om.workspace_role in ('owner', 'admin')
              or om.procurement_function = 'buyer'
            )
          )
        )
    )
  for share;

  return locked_parent_id is not null;
end;
$$;

comment on function public.acquire_issuer_rfq_lifecycle_fence(uuid, boolean, boolean) is
  'Authorizes an issuer child write and acquires a parent RFQ SHARE lock so governed cancellation/amendment/award transitions serialize before the child mutation.';

alter function public.acquire_issuer_rfq_lifecycle_fence(uuid, boolean, boolean)
owner to postgres;

revoke all
on function public.acquire_issuer_rfq_lifecycle_fence(uuid, boolean, boolean)
from public, anon, authenticated;

grant execute
on function public.acquire_issuer_rfq_lifecycle_fence(uuid, boolean, boolean)
to authenticated;


drop policy if exists "Workspace administrators can update RFQ quote decisions"
on public.quotes;

create policy "Workspace administrators can update RFQ quote decisions"
on public.quotes
for update
to authenticated
using (
  public.acquire_issuer_rfq_lifecycle_fence(
    quotes.rfq_id,
    true,
    true
  )
)
with check (
  public.acquire_issuer_rfq_lifecycle_fence(
    quotes.rfq_id,
    true,
    true
  )
);

create or replace function public.enforce_rfq_reissue_lineage()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_rfq public.rfqs%rowtype;
begin
  if tg_op = 'UPDATE'
     and new.reissued_from_rfq_id is distinct from old.reissued_from_rfq_id
  then
    raise exception
      using
        errcode = '23514',
        message = 'RFQ reissue lineage is immutable after creation.';
  end if;

  if new.reissued_from_rfq_id is null then
    return new;
  end if;

  if new.reissued_from_rfq_id = new.id then
    raise exception
      using
        errcode = '23514',
        message = 'An RFQ cannot be reissued from itself.';
  end if;

  select r.*
  into source_rfq
  from public.rfqs as r
  where r.id = new.reissued_from_rfq_id;

  if not found then
    raise exception
      using
        errcode = '23503',
        message = 'Reissue source RFQ was not found.';
  end if;

  if source_rfq.status <> 'cancelled'
    or source_rfq.awarded_quote_id is not null
    or source_rfq.awarded_at is not null
  then
    raise exception
      using
        errcode = '23514',
        message = 'A reissued RFQ must reference a cancelled, unawarded predecessor.';
  end if;

  if source_rfq.company_id is distinct from new.company_id then
    raise exception
      using
        errcode = '42501',
        message = 'RFQ reissue lineage cannot cross issuing companies.';
  end if;

  if new.status <> 'open'
    or new.awarded_quote_id is not null
    or new.awarded_at is not null
    or new.cancelled_at is not null
    or new.cancelled_by_user_id is not null
    or new.cancellation_reason is not null
  then
    raise exception
      using
        errcode = '23514',
        message = 'A reissued RFQ must begin as a new open, unawarded procurement.';
  end if;

  return new;
end;
$$;

revoke all
on function public.enforce_rfq_reissue_lineage()
from public, anon, authenticated;

drop trigger if exists enforce_rfq_reissue_lineage_trigger
on public.rfqs;

create trigger enforce_rfq_reissue_lineage_trigger
before insert or update of reissued_from_rfq_id, company_id on public.rfqs
for each row
execute function public.enforce_rfq_reissue_lineage();

create or replace function public.audit_rfq_reissue()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.reissued_from_rfq_id is not null then
    insert into public.audit_logs (
      action,
      entity_type,
      entity_id,
      user_id,
      company_id,
      metadata
    )
    values (
      'RFQ_REISSUED',
      'rfq',
      new.id,
      new.user_id,
      new.company_id,
      jsonb_build_object(
        'source_rfq_id', new.reissued_from_rfq_id,
        'reissued_rfq_id', new.id,
        'reissued_at', new.created_at
      )
    );
  end if;

  return new;
end;
$$;

revoke all
on function public.audit_rfq_reissue()
from public, anon, authenticated;

drop trigger if exists audit_rfq_reissue_trigger
on public.rfqs;

create trigger audit_rfq_reissue_trigger
after insert on public.rfqs
for each row
execute function public.audit_rfq_reissue();

create or replace function public.cancel_rfq(
  p_rfq_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := auth.uid();
  target_rfq public.rfqs%rowtype;
  cancelled_rfq public.rfqs%rowtype;
  cancelled_at_value timestamptz := clock_timestamp();
begin
  if actor_user_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHENTICATED',
      'error_message', 'Authentication is required.'
    );
  end if;

  if p_rfq_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_RFQ',
      'error_message', 'RFQ ID is required.'
    );
  end if;

  if nullif(btrim(coalesce(p_reason, '')), '') is null
    or char_length(btrim(p_reason)) > 2000
  then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_CANCELLATION_REASON',
      'error_message', 'A cancellation reason of 2000 characters or fewer is required.'
    );
  end if;

  select r.*
  into target_rfq
  from public.rfqs as r
  where r.id = p_rfq_id
  for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error_code', 'RFQ_NOT_FOUND',
      'error_message', 'RFQ not found.'
    );
  end if;

  if not exists (
    select 1
    from public.organization_memberships as om
    where om.user_id = actor_user_id
      and om.company_id = target_rfq.company_id
      and om.membership_status = 'active'
      and (
        om.workspace_role in ('owner', 'admin')
        or om.procurement_function = 'buyer'
      )
  ) then
    return jsonb_build_object(
      'success', false,
      'error_code', 'FORBIDDEN',
      'error_message', 'Only active issuer owners, administrators, and buyers may cancel this RFQ.'
    );
  end if;

  if target_rfq.status = 'cancelled' then
    return jsonb_build_object(
      'success', false,
      'error_code', 'RFQ_ALREADY_CANCELLED',
      'error_message', 'This RFQ is already cancelled.'
    );
  end if;

  if target_rfq.status <> 'open'
    or target_rfq.awarded_quote_id is not null
    or target_rfq.awarded_at is not null
  then
    return jsonb_build_object(
      'success', false,
      'error_code', 'RFQ_NOT_CANCELLABLE',
      'error_message', 'Only open, unawarded RFQs may be cancelled.'
    );
  end if;

  -- Match the existing Award/revalidation lock order: RFQ first, then Quotes.
  perform 1
  from public.quotes as q
  where q.rfq_id = target_rfq.id
  order by q.id
  for update;

  update public.rfqs
  set
    status = 'cancelled',
    cancelled_at = cancelled_at_value,
    cancelled_by_user_id = actor_user_id,
    cancellation_reason = btrim(p_reason)
  where id = target_rfq.id
    and status = 'open'
    and awarded_quote_id is null
    and awarded_at is null
  returning * into cancelled_rfq;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error_code', 'RFQ_NOT_CANCELLABLE',
      'error_message', 'The RFQ could not be cancelled in its current lifecycle state.'
    );
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
    'RFQ_CANCELLED',
    'rfq',
    cancelled_rfq.id,
    actor_user_id,
    cancelled_rfq.company_id,
    jsonb_build_object(
      'reason', cancelled_rfq.cancellation_reason,
      'cancelled_at', cancelled_rfq.cancelled_at,
      'previous_status', target_rfq.status,
      'deadline', target_rfq.deadline
    )
  );

  return jsonb_build_object(
    'success', true,
    'rfq_id', cancelled_rfq.id,
    'status', cancelled_rfq.status,
    'cancelled_at', cancelled_rfq.cancelled_at,
    'cancelled_by_user_id', cancelled_rfq.cancelled_by_user_id
  );
end;
$$;

comment on function public.cancel_rfq(uuid, text) is
  'Atomically cancels one open unawarded RFQ, preserves all procurement evidence, and records immutable cancellation provenance and audit evidence.';

alter function public.cancel_rfq(uuid, text) owner to postgres;

revoke all
on function public.cancel_rfq(uuid, text)
from public, anon;

grant execute
on function public.cancel_rfq(uuid, text)
to authenticated;

-- Respondent INSERT policies retain open/unawarded checks in RLS, while their
-- existing SECURITY DEFINER BEFORE INSERT triggers below acquire the parent
-- SHARE lock without granting respondents RFQ UPDATE authority.

drop policy if exists "Supplier members can submit company quotes"
on public.quotes;

create policy "Supplier members can submit company quotes"
on public.quotes
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.organization_memberships as om
    where om.user_id = auth.uid()
      and om.company_id = quotes.company_id
      and om.membership_status = 'active'
  )
  and exists (
    select 1
    from public.rfqs as r
    where r.id = quotes.rfq_id
      and r.status = 'open'
      and r.awarded_quote_id is null
      and r.awarded_at is null
      and r.company_id <> quotes.company_id
      and (
        r.sourcing_method = 'open'
        or public.current_user_has_supplier_rfq_access(quotes.rfq_id)
      )
      and public.parse_rfq_deadline_timestamptz(r.deadline) is not null
      and now() <= public.parse_rfq_deadline_timestamptz(r.deadline)
  )
  and not exists (
    select 1
    from public.rfq_addenda as a
    where a.rfq_id = quotes.rfq_id
      and a.requires_acknowledgement = true
      and not exists (
        select 1
        from public.rfq_addendum_acknowledgements as ack
        where ack.addendum_id = a.id
          and ack.company_id = quotes.company_id
      )
  )
);

drop policy if exists "Respondent companies can submit RFQ RFIs"
on public.rfq_rfis;

create policy "Respondent companies can submit RFQ RFIs"
on public.rfq_rfis
for insert
to authenticated
with check (
  submitted_by = auth.uid()
  and exists (
    select 1
    from public.organization_memberships as om
    where om.user_id = auth.uid()
      and om.company_id = rfq_rfis.respondent_company_id
      and om.membership_status = 'active'
  )
  and exists (
    select 1
    from public.rfqs as r
    where r.id = rfq_rfis.rfq_id
      and r.status = 'open'
      and r.awarded_quote_id is null
      and r.awarded_at is null
      and r.company_id <> rfq_rfis.respondent_company_id
      and (
        r.sourcing_method = 'open'
        or public.current_user_has_supplier_rfq_access(r.id)
      )
      and coalesce(
        r.rfi_deadline,
        public.parse_rfq_deadline_timestamptz(r.deadline)
      ) is not null
      and now() <= coalesce(
        r.rfi_deadline,
        public.parse_rfq_deadline_timestamptz(r.deadline)
      )
  )
  and btrim(question) <> ''
);

drop policy if exists "Issuer procurement users can answer open RFQ RFIs"
on public.rfq_rfis;

create policy "Issuer procurement users can answer open RFQ RFIs"
on public.rfq_rfis
for update
to authenticated
using (
  status = 'open'
  and public.acquire_issuer_rfq_lifecycle_fence(
    rfq_rfis.rfq_id,
    false,
    false
  )
)
with check (
  status = 'answered'
  and responded_by = auth.uid()
  and responded_at is not null
  and nullif(btrim(coalesce(response_text, '')), '') is not null
  and public.acquire_issuer_rfq_lifecycle_fence(
    rfq_rfis.rfq_id,
    false,
    false
  )
);

drop policy if exists "Respondent companies can acknowledge required addenda"
on public.rfq_addendum_acknowledgements;

create policy "Respondent companies can acknowledge required addenda"
on public.rfq_addendum_acknowledgements
for insert
to authenticated
with check (
  exists (
    select 1
    from public.organization_memberships as om
    where om.user_id = auth.uid()
      and om.company_id = rfq_addendum_acknowledgements.company_id
      and om.membership_status = 'active'
  )
  and exists (
    select 1
    from public.rfqs as r
    where r.id = rfq_addendum_acknowledgements.rfq_id
      and r.status = 'open'
      and r.awarded_quote_id is null
      and r.awarded_at is null
      and public.parse_rfq_deadline_timestamptz(r.deadline) is not null
      and now() <= public.parse_rfq_deadline_timestamptz(r.deadline)
      and r.company_id <> rfq_addendum_acknowledgements.company_id
      and (
        r.sourcing_method = 'open'
        or public.current_user_has_supplier_rfq_access(r.id)
      )
  )
  and exists (
    select 1
    from public.rfq_addenda as a
    where a.id = rfq_addendum_acknowledgements.addendum_id
      and a.rfq_id = rfq_addendum_acknowledgements.rfq_id
      and a.requires_acknowledgement = true
  )
);

drop policy if exists "Buyer members can create company RFQ invitations"
on public.rfq_invites;

create policy "Buyer members can create company RFQ invitations"
on public.rfq_invites
for insert
to authenticated
with check (
  public.acquire_issuer_rfq_lifecycle_fence(
    rfq_invites.rfq_id,
    false,
    false
  )
);


-- Respondent-side INSERT policies cannot safely acquire parent row locks directly:
-- SELECT ... FOR SHARE inside an RLS policy requires parent UPDATE privilege
-- and row-security authorization, which child-write callers do not receive.
-- Therefore respondent INSERT serialization is performed by existing BEFORE
-- INSERT trigger functions running as tightly scoped SECURITY DEFINER functions.
-- The child-table RLS policies remain authoritative for membership/access/deadline
-- authorization after the trigger lock is acquired.

create or replace function public.enforce_quote_award_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  rfq_awarded_quote_id uuid;
  locked_parent_id uuid;
begin
  if tg_op = 'INSERT' then
    select r.id
    into locked_parent_id
    from public.rfqs as r
    where r.id = new.rfq_id
      and r.status = 'open'
      and r.awarded_quote_id is null
      and r.awarded_at is null
      and (
        auth.uid() is null
        or (
          r.company_id <> new.company_id
          and exists (
            select 1
            from public.organization_memberships as om
            where om.user_id = auth.uid()
              and om.company_id = new.company_id
              and om.membership_status = 'active'
          )
          and (
            r.sourcing_method = 'open'
            or public.current_user_has_supplier_rfq_access(r.id)
          )
        )
      )
    for share;

    if locked_parent_id is null then
      raise exception
        using
          errcode = '42501',
          message = 'Quote submission is not permitted for this RFQ.';
    end if;
  end if;

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

revoke all
on function public.enforce_quote_award_integrity()
from public, anon, authenticated;

create or replace function public.enforce_rfq_rfi_insert_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  locked_parent_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  if nullif(btrim(coalesce(new.question, '')), '') is null then
    raise exception 'RFI question is required';
  end if;

  select r.id
  into locked_parent_id
  from public.rfqs as r
  where r.id = new.rfq_id
    and r.status = 'open'
    and r.awarded_quote_id is null
    and r.awarded_at is null
    and r.company_id <> new.respondent_company_id
    and exists (
      select 1
      from public.organization_memberships as om
      where om.user_id = auth.uid()
        and om.company_id = new.respondent_company_id
        and om.membership_status = 'active'
    )
    and (
      r.sourcing_method = 'open'
      or public.current_user_has_supplier_rfq_access(r.id)
    )
  for share;

  if locked_parent_id is null then
    raise exception
      using
        errcode = '42501',
        message = 'RFI submission is not permitted for this RFQ.';
  end if;

  new.submitted_by := auth.uid();
  new.status := 'open';
  new.response_text := null;
  new.responded_by := null;
  new.responded_at := null;
  new.created_at := now();
  new.updated_at := now();

  return new;
end;
$$;

revoke all
on function public.enforce_rfq_rfi_insert_integrity()
from public, anon, authenticated;

create or replace function public.enforce_rfq_addendum_acknowledgement_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  locked_rfq_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  select r.id
  into locked_rfq_id
  from public.rfq_addenda as a
  join public.rfqs as r
    on r.id = a.rfq_id
  where a.id = new.addendum_id
    and a.requires_acknowledgement = true
    and r.status = 'open'
    and r.awarded_quote_id is null
    and r.awarded_at is null
    and r.company_id <> new.company_id
    and exists (
      select 1
      from public.organization_memberships as om
      where om.user_id = auth.uid()
        and om.company_id = new.company_id
        and om.membership_status = 'active'
    )
    and (
      r.sourcing_method = 'open'
      or public.current_user_has_supplier_rfq_access(r.id)
    )
  for share of r;

  if locked_rfq_id is null then
    raise exception
      using
        errcode = '42501',
        message = 'RFQ Addendum acknowledgement is not permitted.';
  end if;

  new.rfq_id := locked_rfq_id;
  new.acknowledged_by := auth.uid();
  new.acknowledged_at := now();

  return new;
end;
$$;

revoke all
on function public.enforce_rfq_addendum_acknowledgement_integrity()
from public, anon, authenticated;

create or replace function public.amend_published_rfq(
  p_rfq_id uuid,
  p_changes jsonb,
  p_reason text,
  p_title text,
  p_description text default null,
  p_affected_documents text default null,
  p_requires_acknowledgement boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := auth.uid();
  target_rfq public.rfqs%rowtype;
  next_rfq public.rfqs%rowtype;
  created_addendum public.rfq_addenda%rowtype;
  parsed_deadline timestamptz;
  requested_deadline timestamptz;
  governed_fields constant text[] := array[
    'title',
    'description',
    'category',
    'location',
    'budget',
    'deadline',
    'deadline_timezone',
    'project_name',
    'owner_client',
    'mobilization_date',
    'substantial_completion_date',
    'performance_bond_required',
    'bid_bond_required',
    'insurance_required',
    'insurance_notes',
    'safety_requirements',
    'prequalification_notes'
  ];
  cancel_reissue_fields constant text[] := array[
    'company_id',
    'procurement_scope',
    'sourcing_method',
    'contract_framework',
    'bid_model',
    'nda_required'
  ];
  requested_fields text[];
  requested_cancel_reissue_fields text[];
  unknown_fields text[];
  affected_fields_value text[] := '{}'::text[];
  before_evidence jsonb := '{}'::jsonb;
  after_evidence jsonb := '{}'::jsonb;
  requested_field text;
  before_value jsonb;
  after_value jsonb;
begin
  if actor_user_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHENTICATED',
      'error_message', 'Authentication is required.'
    );
  end if;

  if p_rfq_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_RFQ',
      'error_message', 'RFQ ID is required.'
    );
  end if;

  if p_changes is null
    or jsonb_typeof(p_changes) <> 'object'
    or p_changes = '{}'::jsonb
  then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_CHANGES',
      'error_message', 'At least one governed RFQ field is required.'
    );
  end if;

  if nullif(btrim(coalesce(p_reason, '')), '') is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_REASON',
      'error_message', 'An amendment reason is required.'
    );
  end if;

  if nullif(btrim(coalesce(p_title, '')), '') is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_TITLE',
      'error_message', 'An Addendum title is required.'
    );
  end if;

  if p_requires_acknowledgement is not true then
    return jsonb_build_object(
      'success', false,
      'error_code', 'ACKNOWLEDGEMENT_REQUIRED',
      'error_message', 'Governed RFQ amendments must require acknowledgement.'
    );
  end if;

  select coalesce(array_agg(field_name order by field_name), '{}'::text[])
  into requested_fields
  from jsonb_object_keys(p_changes) as requested(field_name);

  select coalesce(array_agg(field_name order by field_name), '{}'::text[])
  into requested_cancel_reissue_fields
  from unnest(requested_fields) as requested(field_name)
  where field_name = any(cancel_reissue_fields);

  if cardinality(requested_cancel_reissue_fields) > 0 then
    return jsonb_build_object(
      'success', false,
      'error_code', 'CANCEL_REISSUE_REQUIRED',
      'error_message', 'The requested published procurement-basis change requires cancellation and reissue.',
      'fields', to_jsonb(requested_cancel_reissue_fields)
    );
  end if;

  select coalesce(array_agg(field_name order by field_name), '{}'::text[])
  into unknown_fields
  from unnest(requested_fields) as requested(field_name)
  where not (field_name = any(governed_fields));

  if cardinality(unknown_fields) > 0 then
    return jsonb_build_object(
      'success', false,
      'error_code', 'PROHIBITED_FIELDS',
      'error_message', 'The request contains unknown or prohibited RFQ fields.',
      'fields', to_jsonb(unknown_fields)
    );
  end if;

  if (p_changes ? 'deadline') <> (p_changes ? 'deadline_timezone') then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_DEADLINE_EXTENSION',
      'error_message', 'Submission deadline and deadline timezone must be amended together.'
    );
  end if;

  if p_changes ? 'deadline' then
    if jsonb_typeof(p_changes -> 'deadline') <> 'string'
      or nullif(btrim(p_changes ->> 'deadline'), '') is null
      or jsonb_typeof(p_changes -> 'deadline_timezone') <> 'string'
      or nullif(btrim(p_changes ->> 'deadline_timezone'), '') is null
    then
      return jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_DEADLINE_EXTENSION',
        'error_message', 'A valid later submission deadline and timezone are required.'
      );
    end if;

    if not exists (
      select 1
      from pg_catalog.pg_timezone_names as tz
      where tz.name = btrim(p_changes ->> 'deadline_timezone')
    ) then
      return jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_DEADLINE_TIMEZONE',
        'error_message', 'The requested submission deadline timezone is not recognized.'
      );
    end if;
  end if;

  if exists (
    select 1
    from unnest(requested_fields) as requested(field_name)
    where field_name in (
      'title',
      'description',
      'category',
      'location',
      'budget',
      'project_name',
      'owner_client',
      'insurance_notes',
      'safety_requirements',
      'prequalification_notes'
    )
      and jsonb_typeof(p_changes -> field_name) not in ('string', 'null')
  ) then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_FIELD_TYPE',
      'error_message', 'Text amendment fields must contain a string or null.'
    );
  end if;

  if p_changes ? 'title'
    and (
      jsonb_typeof(p_changes -> 'title') <> 'string'
      or nullif(btrim(p_changes ->> 'title'), '') is null
    )
  then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_TITLE',
      'error_message', 'RFQ title must be a non-blank string.'
    );
  end if;

  if exists (
    select 1
    from unnest(requested_fields) as requested(field_name)
    where field_name in (
      'performance_bond_required',
      'bid_bond_required',
      'insurance_required'
    )
      and jsonb_typeof(p_changes -> field_name) <> 'boolean'
  ) then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_FIELD_TYPE',
      'error_message', 'Requirement flags must contain a boolean.'
    );
  end if;

  if exists (
    select 1
    from unnest(requested_fields) as requested(field_name)
    where field_name in ('mobilization_date', 'substantial_completion_date')
      and jsonb_typeof(p_changes -> field_name) not in ('string', 'null')
  ) then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_FIELD_TYPE',
      'error_message', 'Schedule fields must contain an ISO date string or null.'
    );
  end if;

  if (
    p_changes ? 'mobilization_date'
    and jsonb_typeof(p_changes -> 'mobilization_date') = 'string'
    and (
      p_changes ->> 'mobilization_date' !~ '^\d{4}-\d{2}-\d{2}$'
      or to_char(
        to_date(p_changes ->> 'mobilization_date', 'YYYY-MM-DD'),
        'YYYY-MM-DD'
      ) <> p_changes ->> 'mobilization_date'
    )
  ) or (
    p_changes ? 'substantial_completion_date'
    and jsonb_typeof(p_changes -> 'substantial_completion_date') = 'string'
    and (
      p_changes ->> 'substantial_completion_date' !~ '^\d{4}-\d{2}-\d{2}$'
      or to_char(
        to_date(p_changes ->> 'substantial_completion_date', 'YYYY-MM-DD'),
        'YYYY-MM-DD'
      ) <> p_changes ->> 'substantial_completion_date'
    )
  ) then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_DATE',
      'error_message', 'Schedule fields must contain a valid ISO date.'
    );
  end if;

  select r.*
  into target_rfq
  from public.rfqs as r
  where r.id = p_rfq_id
  for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error_code', 'RFQ_NOT_FOUND',
      'error_message', 'RFQ not found.'
    );
  end if;

  if not exists (
    select 1
    from public.organization_memberships as om
    where om.user_id = actor_user_id
      and om.company_id = target_rfq.company_id
      and om.membership_status = 'active'
      and (
        om.workspace_role in ('owner', 'admin')
        or om.procurement_function = 'buyer'
      )
  ) then
    return jsonb_build_object(
      'success', false,
      'error_code', 'FORBIDDEN',
      'error_message', 'Only active issuer owners, administrators, and buyers may amend this RFQ.'
    );
  end if;

  if target_rfq.status <> 'open'
    or target_rfq.awarded_quote_id is not null
    or target_rfq.awarded_at is not null
  then
    return jsonb_build_object(
      'success', false,
      'error_code', 'RFQ_NOT_AMENDABLE',
      'error_message', 'Only open, unawarded RFQs may be amended.'
    );
  end if;

  parsed_deadline := public.parse_rfq_deadline_timestamptz(target_rfq.deadline);

  if parsed_deadline is null or now() > parsed_deadline then
    return jsonb_build_object(
      'success', false,
      'error_code', 'COMMERCIAL_OPENING_UNLOCKED',
      'error_message', 'Material amendments are prohibited after commercial opening.'
    );
  end if;

  if p_changes ? 'deadline' then
    requested_deadline := public.parse_rfq_deadline_timestamptz(
      btrim(p_changes ->> 'deadline')
    );

    if requested_deadline is null then
      return jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_DEADLINE_EXTENSION',
        'error_message', 'The requested submission deadline could not be parsed.'
      );
    end if;

    if requested_deadline <= parsed_deadline then
      return jsonb_build_object(
        'success', false,
        'error_code', 'CANCEL_REISSUE_REQUIRED',
        'error_message', 'Published submission deadlines cannot be shortened or reset. Cancel and reissue the RFQ.'
      );
    end if;

    -- Do not create a last-second MVCC race in which readers can observe the
    -- previously committed opening boundary while an extension is in flight.
    if clock_timestamp() >= parsed_deadline - interval '5 minutes' then
      return jsonb_build_object(
        'success', false,
        'error_code', 'CANCEL_REISSUE_REQUIRED',
        'error_message', 'The submission deadline is too close to commercial opening to extend safely. Cancel and reissue the RFQ.'
      );
    end if;
  end if;

  next_rfq := target_rfq;

  if p_changes ? 'title' then
    next_rfq.title := btrim(p_changes ->> 'title');
  end if;
  if p_changes ? 'description' then
    next_rfq.description := nullif(btrim(p_changes ->> 'description'), '');
  end if;
  if p_changes ? 'category' then
    next_rfq.category := nullif(btrim(p_changes ->> 'category'), '');
  end if;
  if p_changes ? 'location' then
    next_rfq.location := nullif(btrim(p_changes ->> 'location'), '');
  end if;
  if p_changes ? 'budget' then
    next_rfq.budget := nullif(btrim(p_changes ->> 'budget'), '');
  end if;
  if p_changes ? 'deadline' then
    next_rfq.deadline := btrim(p_changes ->> 'deadline');
    next_rfq.deadline_timezone := btrim(p_changes ->> 'deadline_timezone');
  end if;
  if p_changes ? 'project_name' then
    next_rfq.project_name := nullif(btrim(p_changes ->> 'project_name'), '');
  end if;
  if p_changes ? 'owner_client' then
    next_rfq.owner_client := nullif(btrim(p_changes ->> 'owner_client'), '');
  end if;
  if p_changes ? 'mobilization_date' then
    next_rfq.mobilization_date := nullif(p_changes ->> 'mobilization_date', '')::date;
  end if;
  if p_changes ? 'substantial_completion_date' then
    next_rfq.substantial_completion_date := nullif(p_changes ->> 'substantial_completion_date', '')::date;
  end if;
  if p_changes ? 'performance_bond_required' then
    next_rfq.performance_bond_required := (p_changes ->> 'performance_bond_required')::boolean;
  end if;
  if p_changes ? 'bid_bond_required' then
    next_rfq.bid_bond_required := (p_changes ->> 'bid_bond_required')::boolean;
  end if;
  if p_changes ? 'insurance_required' then
    next_rfq.insurance_required := (p_changes ->> 'insurance_required')::boolean;
  end if;
  if p_changes ? 'insurance_notes' then
    next_rfq.insurance_notes := nullif(btrim(p_changes ->> 'insurance_notes'), '');
  end if;
  if p_changes ? 'safety_requirements' then
    next_rfq.safety_requirements := nullif(btrim(p_changes ->> 'safety_requirements'), '');
  end if;
  if p_changes ? 'prequalification_notes' then
    next_rfq.prequalification_notes := nullif(btrim(p_changes ->> 'prequalification_notes'), '');
  end if;

  if char_length(btrim(coalesce(next_rfq.title, ''))) < 3
    or char_length(btrim(coalesce(next_rfq.description, ''))) < 9
    or char_length(btrim(coalesce(next_rfq.category, ''))) < 2
    or char_length(btrim(coalesce(next_rfq.location, ''))) < 2
  then
    return jsonb_build_object(
      'success', false,
      'error_code', 'PUBLICATION_INVARIANT_VIOLATION',
      'error_message', 'The amended RFQ must retain publication-ready title, description, category, and location values.'
    );
  end if;

  if next_rfq.mobilization_date is not null
    and next_rfq.substantial_completion_date is not null
    and next_rfq.mobilization_date > next_rfq.substantial_completion_date
  then
    return jsonb_build_object(
      'success', false,
      'error_code', 'PUBLICATION_INVARIANT_VIOLATION',
      'error_message', 'Target mobilization cannot be after substantial completion.'
    );
  end if;

  foreach requested_field in array requested_fields loop
    before_value := case requested_field
      when 'title' then to_jsonb(target_rfq.title)
      when 'description' then to_jsonb(target_rfq.description)
      when 'category' then to_jsonb(target_rfq.category)
      when 'location' then to_jsonb(target_rfq.location)
      when 'budget' then to_jsonb(target_rfq.budget)
      when 'deadline' then to_jsonb(target_rfq.deadline)
      when 'deadline_timezone' then to_jsonb(target_rfq.deadline_timezone)
      when 'project_name' then to_jsonb(target_rfq.project_name)
      when 'owner_client' then to_jsonb(target_rfq.owner_client)
      when 'mobilization_date' then to_jsonb(target_rfq.mobilization_date)
      when 'substantial_completion_date' then to_jsonb(target_rfq.substantial_completion_date)
      when 'performance_bond_required' then to_jsonb(target_rfq.performance_bond_required)
      when 'bid_bond_required' then to_jsonb(target_rfq.bid_bond_required)
      when 'insurance_required' then to_jsonb(target_rfq.insurance_required)
      when 'insurance_notes' then to_jsonb(target_rfq.insurance_notes)
      when 'safety_requirements' then to_jsonb(target_rfq.safety_requirements)
      when 'prequalification_notes' then to_jsonb(target_rfq.prequalification_notes)
    end;

    after_value := case requested_field
      when 'title' then to_jsonb(next_rfq.title)
      when 'description' then to_jsonb(next_rfq.description)
      when 'category' then to_jsonb(next_rfq.category)
      when 'location' then to_jsonb(next_rfq.location)
      when 'budget' then to_jsonb(next_rfq.budget)
      when 'deadline' then to_jsonb(next_rfq.deadline)
      when 'deadline_timezone' then to_jsonb(next_rfq.deadline_timezone)
      when 'project_name' then to_jsonb(next_rfq.project_name)
      when 'owner_client' then to_jsonb(next_rfq.owner_client)
      when 'mobilization_date' then to_jsonb(next_rfq.mobilization_date)
      when 'substantial_completion_date' then to_jsonb(next_rfq.substantial_completion_date)
      when 'performance_bond_required' then to_jsonb(next_rfq.performance_bond_required)
      when 'bid_bond_required' then to_jsonb(next_rfq.bid_bond_required)
      when 'insurance_required' then to_jsonb(next_rfq.insurance_required)
      when 'insurance_notes' then to_jsonb(next_rfq.insurance_notes)
      when 'safety_requirements' then to_jsonb(next_rfq.safety_requirements)
      when 'prequalification_notes' then to_jsonb(next_rfq.prequalification_notes)
    end;

    if before_value is distinct from after_value then
      affected_fields_value := array_append(affected_fields_value, requested_field);
      before_evidence := before_evidence || jsonb_build_object(requested_field, before_value);
      after_evidence := after_evidence || jsonb_build_object(requested_field, after_value);
    end if;
  end loop;

  if cardinality(affected_fields_value) = 0 then
    return jsonb_build_object(
      'success', false,
      'error_code', 'NO_CHANGES',
      'error_message', 'The requested values do not change the RFQ.'
    );
  end if;

  update public.rfqs
  set
    title = next_rfq.title,
    description = next_rfq.description,
    category = next_rfq.category,
    location = next_rfq.location,
    budget = next_rfq.budget,
    deadline = next_rfq.deadline,
    deadline_timezone = next_rfq.deadline_timezone,
    project_name = next_rfq.project_name,
    owner_client = next_rfq.owner_client,
    mobilization_date = next_rfq.mobilization_date,
    substantial_completion_date = next_rfq.substantial_completion_date,
    performance_bond_required = next_rfq.performance_bond_required,
    bid_bond_required = next_rfq.bid_bond_required,
    insurance_required = next_rfq.insurance_required,
    insurance_notes = next_rfq.insurance_notes,
    safety_requirements = next_rfq.safety_requirements,
    prequalification_notes = next_rfq.prequalification_notes
  where id = target_rfq.id;

  insert into public.rfq_addenda (
    rfq_id,
    title,
    description,
    affected_documents,
    requires_acknowledgement,
    affected_fields,
    amendment_before,
    amendment_after,
    amendment_reason
  )
  values (
    target_rfq.id,
    btrim(p_title),
    nullif(btrim(coalesce(p_description, '')), ''),
    nullif(btrim(coalesce(p_affected_documents, '')), ''),
    true,
    affected_fields_value,
    before_evidence,
    after_evidence,
    btrim(p_reason)
  )
  returning * into created_addendum;

  return jsonb_build_object(
    'success', true,
    'rfq_id', target_rfq.id,
    'addendum_id', created_addendum.id,
    'addendum_number', created_addendum.addendum_number,
    'affected_fields', to_jsonb(affected_fields_value),
    'amended_by', created_addendum.created_by,
    'amended_at', created_addendum.created_at
  );
end;
$$;

comment on function public.amend_published_rfq(
  uuid,
  jsonb,
  text,
  text,
  text,
  text,
  boolean
) is
  'Atomically applies whitelisted pre-commercial-opening RFQ amendments, including forward-only governed deadline extension, while prohibited procurement-basis changes require cancellation/reissue.';

revoke all
on function public.amend_published_rfq(uuid, jsonb, text, text, text, text, boolean)
from public, anon;

grant execute
on function public.amend_published_rfq(uuid, jsonb, text, text, text, text, boolean)
to authenticated;

create or replace function public.enforce_rfq_addendum_insert_integrity()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_company_id uuid;
  v_status text;
  v_awarded_quote_id uuid;
  v_awarded_at timestamptz;
  v_next_number integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  if nullif(btrim(coalesce(new.title, '')), '') is null then
    raise exception 'Addendum title is required';
  end if;

  select
    r.company_id,
    r.status,
    r.awarded_quote_id,
    r.awarded_at
  into
    v_company_id,
    v_status,
    v_awarded_quote_id,
    v_awarded_at
  from public.rfqs as r
  where r.id = new.rfq_id
  for update;

  if not found then
    raise exception 'RFQ not found';
  end if;

  if v_status <> 'open'
    or v_awarded_quote_id is not null
    or v_awarded_at is not null
  then
    raise exception
      using
        errcode = '42501',
        message = 'RFQ Addenda can be created only for open, unawarded RFQs.';
  end if;

  select coalesce(max(a.addendum_number), 0) + 1
  into v_next_number
  from public.rfq_addenda as a
  where a.rfq_id = new.rfq_id;

  new.company_id := v_company_id;
  new.created_by := auth.uid();
  new.created_at := now();
  new.addendum_number := v_next_number;

  return new;
end;
$$;

revoke all
on function public.enforce_rfq_addendum_insert_integrity()
from public, anon, authenticated;

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
    if old.status <> 'open' then
      raise exception using errcode = '42501',
        message = 'Only an open RFQ may enter the awarded state.';
    end if;

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
      and new.awarded_quote_id is distinct from old.awarded_quote_id
    then
      raise exception using errcode = '23514',
        message = 'An awarded RFQ cannot replace its awarded quote.';
    end if;

    parsed_deadline := public.parse_rfq_deadline_timestamptz(new.deadline);

    if not (
      parsed_deadline is not null
      and parsed_deadline < now()
    ) then
      raise exception using errcode = '42501',
        message = 'RFQ award is locked until after a valid submission deadline.';
    end if;

    select q.company_id, q.decision
    into selected_quote_company_id, selected_quote_decision
    from public.quotes as q
    where q.id = new.awarded_quote_id
      and q.rfq_id = new.id;

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

  -- Keep missing, foreign, non-open, pre-opening, rejected, self-issued,
  -- addendum-ineligible, and materially stale Quote identifiers indistinguishable.
  select r.id
  into candidate_rfq_id
  from public.quotes q
  join public.rfqs r
    on r.id = q.rfq_id
  where q.id = p_quote_id
    and r.company_id = actor_company_id
    and r.status = 'open'
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

  if rfq_row.status <> 'open'
     or selected_quote.id is null
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
    and status = 'open'
    and awarded_quote_id is null
    and awarded_at is null
  returning * into rfq_row;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error_code', 'AWARD_NOT_PERMITTED',
      'error_message', 'Award is not permitted.'
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
  'Atomically awards one eligible Quote only from an open RFQ after commercial opening; cancellation remains terminal and materially stale Quotes remain ineligible.';

alter function public.award_rfq_quote(uuid) owner to postgres;

revoke all
on function public.award_rfq_quote(uuid)
from public, anon;

grant execute
on function public.award_rfq_quote(uuid)
to authenticated, service_role;

commit;

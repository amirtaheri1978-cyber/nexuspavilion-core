begin;

-- Cursor 04C: RFI collaboration persistence foundation (final draft).
-- Creates addenda, acknowledgement, attachment, and private RFI tables with
-- RLS, explicit grants, private Storage bucket policies, and a mandatory
-- addendum acknowledgement gate on quote INSERT.
-- Does not alter rfqs.rfi_deadline values or backfill historical data.
-- DO NOT APPLY until approved.

-- ---------------------------------------------------------------------------
-- rfq_addenda
-- ---------------------------------------------------------------------------

create table public.rfq_addenda (
  id uuid primary key default gen_random_uuid(),
  rfq_id uuid not null references public.rfqs (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete restrict,
  created_by uuid not null references public.profiles (id) on delete restrict,
  title text not null,
  description text null,
  addendum_number integer not null,
  affected_documents text null,
  requires_acknowledgement boolean not null default true,
  created_at timestamptz not null default now(),
  constraint rfq_addenda_title_not_blank check (btrim(title) <> ''),
  constraint rfq_addenda_number_positive check (addendum_number > 0),
  constraint rfq_addenda_rfq_number_unique unique (rfq_id, addendum_number),
  constraint rfq_addenda_id_rfq_unique unique (id, rfq_id)
);

create index rfq_addenda_rfq_id_idx
  on public.rfq_addenda (rfq_id);

create index rfq_addenda_rfq_id_created_at_idx
  on public.rfq_addenda (rfq_id, created_at);

alter table public.rfq_addenda
  enable row level security;

-- ---------------------------------------------------------------------------
-- rfq_addendum_acknowledgements
-- ---------------------------------------------------------------------------

create table public.rfq_addendum_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  rfq_id uuid not null references public.rfqs (id) on delete cascade,
  addendum_id uuid not null,
  company_id uuid not null references public.companies (id) on delete restrict,
  acknowledged_by uuid not null references public.profiles (id) on delete restrict,
  acknowledged_at timestamptz not null default now(),
  constraint rfq_addendum_acknowledgements_addendum_company_unique
    unique (addendum_id, company_id),
  constraint rfq_addendum_acknowledgements_addendum_rfq_fkey
    foreign key (addendum_id, rfq_id)
    references public.rfq_addenda (id, rfq_id)
    on delete cascade
);

create index rfq_addendum_acknowledgements_rfq_id_idx
  on public.rfq_addendum_acknowledgements (rfq_id);

create index rfq_addendum_acknowledgements_company_id_idx
  on public.rfq_addendum_acknowledgements (company_id);

alter table public.rfq_addendum_acknowledgements
  enable row level security;

-- ---------------------------------------------------------------------------
-- rfq_attachments (scoped defect R-35)
-- Durable identity is file_path. Do not persist signed URLs.
-- ---------------------------------------------------------------------------

create table public.rfq_attachments (
  id uuid primary key default gen_random_uuid(),
  rfq_id uuid not null references public.rfqs (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete restrict,
  uploaded_by uuid not null references public.profiles (id) on delete restrict,
  file_name text not null,
  file_path text not null,
  file_type text null,
  file_size bigint not null default 0,
  attachment_type text not null default 'supporting',
  revision_label text not null default 'Rev 0',
  created_at timestamptz not null default now(),
  constraint rfq_attachments_file_name_not_blank check (btrim(file_name) <> ''),
  constraint rfq_attachments_file_path_not_blank check (btrim(file_path) <> ''),
  constraint rfq_attachments_file_path_unique unique (file_path),
  constraint rfq_attachments_file_size_nonnegative check (file_size >= 0),
  constraint rfq_attachments_type_check check (
    attachment_type = any (
      array[
        'drawing'::text,
        'specification'::text,
        'boq'::text,
        'photo'::text,
        'addenda'::text,
        'supporting'::text
      ]
    )
  )
);

create index rfq_attachments_rfq_id_idx
  on public.rfq_attachments (rfq_id);

alter table public.rfq_attachments
  enable row level security;

-- ---------------------------------------------------------------------------
-- rfq_rfis (private launch model)
-- ---------------------------------------------------------------------------

create table public.rfq_rfis (
  id uuid primary key default gen_random_uuid(),
  rfq_id uuid not null references public.rfqs (id) on delete cascade,
  respondent_company_id uuid not null references public.companies (id) on delete restrict,
  submitted_by uuid not null references public.profiles (id) on delete restrict,
  question text not null,
  status text not null default 'open',
  response_text text null,
  responded_by uuid null references public.profiles (id) on delete restrict,
  responded_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rfq_rfis_question_not_blank check (btrim(question) <> ''),
  constraint rfq_rfis_question_length check (char_length(question) <= 8000),
  constraint rfq_rfis_response_length check (
    response_text is null or char_length(response_text) <= 16000
  ),
  constraint rfq_rfis_status_check check (
    status = any (array['open'::text, 'answered'::text])
  ),
  constraint rfq_rfis_state_consistency check (
    (
      status = 'open'
      and response_text is null
      and responded_by is null
      and responded_at is null
    )
    or (
      status = 'answered'
      and response_text is not null
      and btrim(response_text) <> ''
      and responded_by is not null
      and responded_at is not null
    )
  )
);

create index rfq_rfis_rfq_id_idx
  on public.rfq_rfis (rfq_id);

create index rfq_rfis_respondent_company_id_idx
  on public.rfq_rfis (respondent_company_id);

create index rfq_rfis_rfq_id_created_at_idx
  on public.rfq_rfis (rfq_id, created_at);

create index rfq_rfis_open_status_idx
  on public.rfq_rfis (rfq_id, status)
  where status = 'open';

alter table public.rfq_rfis
  enable row level security;

-- ---------------------------------------------------------------------------
-- Integrity triggers (SECURITY INVOKER, search_path = '')
-- ---------------------------------------------------------------------------

create or replace function public.enforce_rfq_addendum_insert_integrity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_company_id uuid;
  v_next_number integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  if nullif(btrim(coalesce(new.title, '')), '') is null then
    raise exception 'Addendum title is required';
  end if;

  -- Serialize per-RFQ numbering against concurrent inserts.
  select r.company_id
    into v_company_id
  from public.rfqs r
  where r.id = new.rfq_id
  for update;

  if v_company_id is null then
    raise exception 'RFQ not found';
  end if;

  select coalesce(max(a.addendum_number), 0) + 1
    into v_next_number
  from public.rfq_addenda a
  where a.rfq_id = new.rfq_id;

  new.company_id := v_company_id;
  new.created_by := auth.uid();
  new.created_at := now();
  new.addendum_number := v_next_number;

  return new;
end;
$$;

create or replace function public.enforce_rfq_addendum_acknowledgement_integrity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_rfq_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  select a.rfq_id
    into v_rfq_id
  from public.rfq_addenda a
  where a.id = new.addendum_id;

  if v_rfq_id is null then
    raise exception 'Addendum not found';
  end if;

  new.rfq_id := v_rfq_id;
  new.acknowledged_by := auth.uid();
  new.acknowledged_at := now();

  return new;
end;
$$;

create or replace function public.enforce_rfq_attachment_insert_integrity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_company_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  if nullif(btrim(coalesce(new.file_name, '')), '') is null then
    raise exception 'Attachment file name is required';
  end if;

  if nullif(btrim(coalesce(new.file_path, '')), '') is null then
    raise exception 'Attachment file path is required';
  end if;

  select r.company_id
    into v_company_id
  from public.rfqs r
  where r.id = new.rfq_id;

  if v_company_id is null then
    raise exception 'RFQ not found';
  end if;

  new.company_id := v_company_id;
  new.uploaded_by := auth.uid();
  new.created_at := now();

  return new;
end;
$$;

create or replace function public.enforce_rfq_rfi_insert_integrity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  if nullif(btrim(coalesce(new.question, '')), '') is null then
    raise exception 'RFI question is required';
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

create or replace function public.enforce_rfq_rfi_response_integrity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
    or new.rfq_id is distinct from old.rfq_id
    or new.respondent_company_id is distinct from old.respondent_company_id
    or new.submitted_by is distinct from old.submitted_by
    or new.question is distinct from old.question
    or new.created_at is distinct from old.created_at
  then
    raise exception 'RFI core fields are immutable after creation';
  end if;

  if old.status = 'answered' then
    raise exception 'Answered RFIs cannot be modified';
  end if;

  if old.status <> 'open' then
    raise exception 'Only open RFIs can receive a response';
  end if;

  if nullif(btrim(coalesce(new.response_text, '')), '') is null then
    raise exception 'RFI response text is required';
  end if;

  new.status := 'answered';
  new.responded_by := auth.uid();
  new.responded_at := now();
  new.updated_at := now();

  return new;
end;
$$;

create trigger enforce_rfq_addendum_insert_integrity_trigger
before insert on public.rfq_addenda
for each row
execute function public.enforce_rfq_addendum_insert_integrity();

create trigger enforce_rfq_addendum_acknowledgement_integrity_trigger
before insert on public.rfq_addendum_acknowledgements
for each row
execute function public.enforce_rfq_addendum_acknowledgement_integrity();

create trigger enforce_rfq_attachment_insert_integrity_trigger
before insert on public.rfq_attachments
for each row
execute function public.enforce_rfq_attachment_insert_integrity();

create trigger enforce_rfq_rfi_insert_integrity_trigger
before insert on public.rfq_rfis
for each row
execute function public.enforce_rfq_rfi_insert_integrity();

create trigger enforce_rfq_rfi_response_integrity_trigger
before update on public.rfq_rfis
for each row
execute function public.enforce_rfq_rfi_response_integrity();

comment on function public.enforce_rfq_addendum_insert_integrity() is
  'Addendum insert guard. Sets company_id from RFQ, created_by from auth.uid(), created_at from now(), and next addendum_number under RFQ row lock. SECURITY INVOKER.';

comment on function public.enforce_rfq_addendum_acknowledgement_integrity() is
  'Immutable addendum acknowledgement insert guard. Sets rfq_id from Addendum, acknowledged_by from auth.uid(), acknowledged_at from now(). SECURITY INVOKER.';

comment on function public.enforce_rfq_attachment_insert_integrity() is
  'Attachment insert guard. Sets company_id from RFQ, uploaded_by from auth.uid(), created_at from now(). SECURITY INVOKER.';

comment on function public.enforce_rfq_rfi_insert_integrity() is
  'Launch-scope RFI insert guard. Forces submitted_by, open status, and clears response fields. SECURITY INVOKER.';

comment on function public.enforce_rfq_rfi_response_integrity() is
  'Launch-scope RFI answer guard. Issuer response sets answered status and audit fields from auth.uid()/now(). SECURITY INVOKER.';

revoke all on function public.enforce_rfq_addendum_insert_integrity() from public;
revoke all on function public.enforce_rfq_addendum_insert_integrity() from anon;
revoke all on function public.enforce_rfq_addendum_insert_integrity() from authenticated;

revoke all on function public.enforce_rfq_addendum_acknowledgement_integrity() from public;
revoke all on function public.enforce_rfq_addendum_acknowledgement_integrity() from anon;
revoke all on function public.enforce_rfq_addendum_acknowledgement_integrity() from authenticated;

revoke all on function public.enforce_rfq_attachment_insert_integrity() from public;
revoke all on function public.enforce_rfq_attachment_insert_integrity() from anon;
revoke all on function public.enforce_rfq_attachment_insert_integrity() from authenticated;

revoke all on function public.enforce_rfq_rfi_insert_integrity() from public;
revoke all on function public.enforce_rfq_rfi_insert_integrity() from anon;
revoke all on function public.enforce_rfq_rfi_insert_integrity() from authenticated;

revoke all on function public.enforce_rfq_rfi_response_integrity() from public;
revoke all on function public.enforce_rfq_rfi_response_integrity() from anon;
revoke all on function public.enforce_rfq_rfi_response_integrity() from authenticated;

-- ---------------------------------------------------------------------------
-- RFQ SELECT lifecycle correction (scoped defect R-37)
-- Open-market discovery remains open-only. Explicit invitation / existing
-- quote participation retains non-draft historical package access.
-- ---------------------------------------------------------------------------

drop policy if exists "Authenticated users can read permitted RFQs"
on public.rfqs;

create policy "Authenticated users can read permitted RFQs"
on public.rfqs
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_memberships om
    where om.user_id = auth.uid()
      and om.company_id = rfqs.company_id
      and om.membership_status = 'active'
  )
  or (
    exists (
      select 1
      from public.organization_memberships om
      where om.user_id = auth.uid()
        and om.membership_status = 'active'
    )
    and (
      (
        rfqs.status = 'open'
        and rfqs.sourcing_method = 'open'
      )
      or (
        rfqs.status <> 'draft'
        and public.current_user_has_supplier_rfq_access(rfqs.id)
      )
    )
  )
);

-- ---------------------------------------------------------------------------
-- rfq_addenda RLS
-- ---------------------------------------------------------------------------

create policy "RFQ participants can read addenda"
on public.rfq_addenda
for select
to authenticated
using (
  exists (
    select 1
    from public.rfqs r
    where r.id = rfq_addenda.rfq_id
      and (
        exists (
          select 1
          from public.organization_memberships om
          where om.user_id = auth.uid()
            and om.company_id = r.company_id
            and om.membership_status = 'active'
        )
        or (
          exists (
            select 1
            from public.organization_memberships om
            where om.user_id = auth.uid()
              and om.membership_status = 'active'
          )
          and (
            (
              r.status = 'open'
              and r.sourcing_method = 'open'
            )
            or (
              r.status <> 'draft'
              and public.current_user_has_supplier_rfq_access(r.id)
            )
          )
        )
      )
  )
);

create policy "Issuer procurement users can create addenda"
on public.rfq_addenda
for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.rfqs r
    where r.id = rfq_addenda.rfq_id
      and r.company_id = rfq_addenda.company_id
  )
  and exists (
    select 1
    from public.organization_memberships om
    where om.user_id = auth.uid()
      and om.company_id = rfq_addenda.company_id
      and om.membership_status = 'active'
      and (
        om.workspace_role in ('owner', 'admin')
        or om.procurement_function = 'buyer'
      )
  )
);

-- ---------------------------------------------------------------------------
-- rfq_addendum_acknowledgements RLS (immutable insert-only)
-- ---------------------------------------------------------------------------

create policy "Respondent companies can read own addendum acknowledgements"
on public.rfq_addendum_acknowledgements
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_memberships om
    where om.user_id = auth.uid()
      and om.company_id = rfq_addendum_acknowledgements.company_id
      and om.membership_status = 'active'
  )
  and exists (
    select 1
    from public.rfqs r
    where r.id = rfq_addendum_acknowledgements.rfq_id
      and r.company_id <> rfq_addendum_acknowledgements.company_id
      and (
        r.sourcing_method = 'open'
        or public.current_user_has_supplier_rfq_access(r.id)
      )
  )
);

create policy "Issuer procurement users can read addendum acknowledgements"
on public.rfq_addendum_acknowledgements
for select
to authenticated
using (
  exists (
    select 1
    from public.rfqs r
    join public.organization_memberships om
      on om.company_id = r.company_id
    where r.id = rfq_addendum_acknowledgements.rfq_id
      and om.user_id = auth.uid()
      and om.membership_status = 'active'
      and (
        om.workspace_role in ('owner', 'admin')
        or om.procurement_function = 'buyer'
      )
  )
);

create policy "Respondent companies can acknowledge required addenda"
on public.rfq_addendum_acknowledgements
for insert
to authenticated
with check (
  exists (
    select 1
    from public.organization_memberships om
    where om.user_id = auth.uid()
      and om.company_id = rfq_addendum_acknowledgements.company_id
      and om.membership_status = 'active'
  )
  and exists (
    select 1
    from public.rfqs r
    where r.id = rfq_addendum_acknowledgements.rfq_id
      and r.status = 'open'
      and r.company_id <> rfq_addendum_acknowledgements.company_id
      and (
        r.sourcing_method = 'open'
        or public.current_user_has_supplier_rfq_access(r.id)
      )
  )
  and exists (
    select 1
    from public.rfq_addenda a
    where a.id = rfq_addendum_acknowledgements.addendum_id
      and a.rfq_id = rfq_addendum_acknowledgements.rfq_id
      and a.requires_acknowledgement = true
  )
);

-- ---------------------------------------------------------------------------
-- rfq_attachments RLS
-- ---------------------------------------------------------------------------

create policy "RFQ participants can read attachments"
on public.rfq_attachments
for select
to authenticated
using (
  exists (
    select 1
    from public.rfqs r
    where r.id = rfq_attachments.rfq_id
      and (
        exists (
          select 1
          from public.organization_memberships om
          where om.user_id = auth.uid()
            and om.company_id = r.company_id
            and om.membership_status = 'active'
        )
        or (
          exists (
            select 1
            from public.organization_memberships om
            where om.user_id = auth.uid()
              and om.membership_status = 'active'
          )
          and (
            (
              r.status = 'open'
              and r.sourcing_method = 'open'
            )
            or (
              r.status <> 'draft'
              and public.current_user_has_supplier_rfq_access(r.id)
            )
          )
        )
      )
  )
);

create policy "Issuer procurement users can upload attachments"
on public.rfq_attachments
for insert
to authenticated
with check (
  uploaded_by = auth.uid()
  and exists (
    select 1
    from public.rfqs r
    where r.id = rfq_attachments.rfq_id
      and r.company_id = rfq_attachments.company_id
  )
  and exists (
    select 1
    from public.organization_memberships om
    where om.user_id = auth.uid()
      and om.company_id = rfq_attachments.company_id
      and om.membership_status = 'active'
      and (
        om.workspace_role in ('owner', 'admin')
        or om.procurement_function = 'buyer'
      )
  )
);

create policy "Issuer procurement users can delete attachments"
on public.rfq_attachments
for delete
to authenticated
using (
  exists (
    select 1
    from public.rfqs r
    join public.organization_memberships om
      on om.company_id = r.company_id
    where r.id = rfq_attachments.rfq_id
      and r.company_id = rfq_attachments.company_id
      and om.user_id = auth.uid()
      and om.membership_status = 'active'
      and (
        om.workspace_role in ('owner', 'admin')
        or om.procurement_function = 'buyer'
      )
  )
);

-- ---------------------------------------------------------------------------
-- rfq_rfis RLS (private only)
-- ---------------------------------------------------------------------------

create policy "Issuer procurement users can read RFQ RFIs"
on public.rfq_rfis
for select
to authenticated
using (
  exists (
    select 1
    from public.rfqs r
    join public.organization_memberships om
      on om.company_id = r.company_id
    where r.id = rfq_rfis.rfq_id
      and om.user_id = auth.uid()
      and om.membership_status = 'active'
      and (
        om.workspace_role in ('owner', 'admin')
        or om.procurement_function = 'buyer'
      )
  )
);

create policy "Respondent companies can read own RFQ RFIs"
on public.rfq_rfis
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_memberships om
    where om.user_id = auth.uid()
      and om.company_id = rfq_rfis.respondent_company_id
      and om.membership_status = 'active'
  )
  and exists (
    select 1
    from public.rfqs r
    where r.id = rfq_rfis.rfq_id
      and r.company_id <> rfq_rfis.respondent_company_id
      and (
        r.sourcing_method = 'open'
        or public.current_user_has_supplier_rfq_access(r.id)
      )
  )
);

create policy "Respondent companies can submit RFQ RFIs"
on public.rfq_rfis
for insert
to authenticated
with check (
  submitted_by = auth.uid()
  and exists (
    select 1
    from public.organization_memberships om
    where om.user_id = auth.uid()
      and om.company_id = rfq_rfis.respondent_company_id
      and om.membership_status = 'active'
  )
  and exists (
    select 1
    from public.rfqs r
    where r.id = rfq_rfis.rfq_id
      and r.status = 'open'
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
  and btrim(rfq_rfis.question) <> ''
);

create policy "Issuer procurement users can answer open RFQ RFIs"
on public.rfq_rfis
for update
to authenticated
using (
  status = 'open'
  and exists (
    select 1
    from public.rfqs r
    join public.organization_memberships om
      on om.company_id = r.company_id
    where r.id = rfq_rfis.rfq_id
      and om.user_id = auth.uid()
      and om.membership_status = 'active'
      and (
        om.workspace_role in ('owner', 'admin')
        or om.procurement_function = 'buyer'
      )
  )
)
with check (
  status = 'answered'
  and responded_by = auth.uid()
  and responded_at is not null
  and nullif(btrim(coalesce(response_text, '')), '') is not null
  and exists (
    select 1
    from public.rfqs r
    join public.organization_memberships om
      on om.company_id = r.company_id
    where r.id = rfq_rfis.rfq_id
      and om.user_id = auth.uid()
      and om.membership_status = 'active'
      and (
        om.workspace_role in ('owner', 'admin')
        or om.procurement_function = 'buyer'
      )
  )
);

-- ---------------------------------------------------------------------------
-- Mandatory addendum acknowledgement on quote INSERT (defense in depth)
-- ---------------------------------------------------------------------------

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
    from public.organization_memberships om
    where om.user_id = auth.uid()
      and om.company_id = quotes.company_id
      and om.membership_status = 'active'
  )
  and exists (
    select 1
    from public.rfqs r
    where r.id = quotes.rfq_id
      and r.status = 'open'
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
    from public.rfq_addenda a
    where a.rfq_id = quotes.rfq_id
      and a.requires_acknowledgement = true
      and not exists (
        select 1
        from public.rfq_addendum_acknowledgements ack
        where ack.addendum_id = a.id
          and ack.company_id = quotes.company_id
      )
  )
);

-- ---------------------------------------------------------------------------
-- Explicit Data API grants (REVOKE broad defaults, then minimum grants)
-- ---------------------------------------------------------------------------

revoke all on table public.rfq_addenda from public;
revoke all on table public.rfq_addenda from anon;
revoke all on table public.rfq_addenda from authenticated;
grant select on table public.rfq_addenda to authenticated;
grant insert (
  rfq_id,
  title,
  description,
  affected_documents,
  requires_acknowledgement
) on table public.rfq_addenda to authenticated;
grant all on table public.rfq_addenda to service_role;

revoke all on table public.rfq_addendum_acknowledgements from public;
revoke all on table public.rfq_addendum_acknowledgements from anon;
revoke all on table public.rfq_addendum_acknowledgements from authenticated;
grant select on table public.rfq_addendum_acknowledgements to authenticated;
grant insert (addendum_id, company_id)
  on table public.rfq_addendum_acknowledgements
  to authenticated;
grant all on table public.rfq_addendum_acknowledgements to service_role;

revoke all on table public.rfq_attachments from public;
revoke all on table public.rfq_attachments from anon;
revoke all on table public.rfq_attachments from authenticated;
grant select on table public.rfq_attachments to authenticated;
grant insert (
  rfq_id,
  file_name,
  file_path,
  file_type,
  file_size,
  attachment_type,
  revision_label
) on table public.rfq_attachments to authenticated;
grant delete on table public.rfq_attachments to authenticated;
grant all on table public.rfq_attachments to service_role;

revoke all on table public.rfq_rfis from public;
revoke all on table public.rfq_rfis from anon;
revoke all on table public.rfq_rfis from authenticated;
grant select on table public.rfq_rfis to authenticated;
grant insert (rfq_id, respondent_company_id, question)
  on table public.rfq_rfis
  to authenticated;
grant update (response_text) on table public.rfq_rfis to authenticated;
grant all on table public.rfq_rfis to service_role;

-- ---------------------------------------------------------------------------
-- Private Storage bucket: rfq-attachments
-- Path contract: <issuer-company-id>/<rfq-id>/<attachment-type>/<filename>
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('rfq-attachments', 'rfq-attachments', false)
on conflict (id) do update
set public = false;

drop policy if exists "RFQ participants can read rfq-attachments objects"
  on storage.objects;
drop policy if exists "Issuer procurement users can upload rfq-attachments objects"
  on storage.objects;
drop policy if exists "Issuer procurement users can delete rfq-attachments objects"
  on storage.objects;

create policy "RFQ participants can read rfq-attachments objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'rfq-attachments'
  and exists (
    select 1
    from public.rfqs r
    where r.id::text = (storage.foldername(name))[2]
      and r.company_id::text = (storage.foldername(name))[1]
      and (
        exists (
          select 1
          from public.organization_memberships om
          where om.user_id = auth.uid()
            and om.company_id = r.company_id
            and om.membership_status = 'active'
        )
        or (
          exists (
            select 1
            from public.organization_memberships om
            where om.user_id = auth.uid()
              and om.membership_status = 'active'
          )
          and (
            (
              r.status = 'open'
              and r.sourcing_method = 'open'
            )
            or (
              r.status <> 'draft'
              and public.current_user_has_supplier_rfq_access(r.id)
            )
          )
        )
      )
  )
);

create policy "Issuer procurement users can upload rfq-attachments objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'rfq-attachments'
  and (storage.foldername(name))[3] = any (
    array[
      'drawing'::text,
      'specification'::text,
      'boq'::text,
      'photo'::text,
      'addenda'::text,
      'supporting'::text
    ]
  )
  and exists (
    select 1
    from public.rfqs r
    join public.organization_memberships om
      on om.company_id = r.company_id
    where r.id::text = (storage.foldername(name))[2]
      and r.company_id::text = (storage.foldername(name))[1]
      and om.user_id = auth.uid()
      and om.membership_status = 'active'
      and (
        om.workspace_role in ('owner', 'admin')
        or om.procurement_function = 'buyer'
      )
  )
);

create policy "Issuer procurement users can delete rfq-attachments objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'rfq-attachments'
  and exists (
    select 1
    from public.rfqs r
    join public.organization_memberships om
      on om.company_id = r.company_id
    where r.id::text = (storage.foldername(name))[2]
      and r.company_id::text = (storage.foldername(name))[1]
      and om.user_id = auth.uid()
      and om.membership_status = 'active'
      and (
        om.workspace_role in ('owner', 'admin')
        or om.procurement_function = 'buyer'
      )
  )
);

commit;

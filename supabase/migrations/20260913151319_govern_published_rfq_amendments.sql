-- 18-24: govern material changes to published RFQs through an atomic Addendum.

begin;

alter table public.rfq_addenda
  add column if not exists affected_fields text[],
  add column if not exists amendment_before jsonb,
  add column if not exists amendment_after jsonb,
  add column if not exists amendment_reason text;

alter table public.rfq_addenda
  add constraint rfq_addenda_structured_amendment_evidence_check
  check (
    (
      affected_fields is null
      and amendment_before is null
      and amendment_after is null
      and amendment_reason is null
    )
    or (
      affected_fields is not null
      and cardinality(affected_fields) > 0
      and amendment_before is not null
      and jsonb_typeof(amendment_before) = 'object'
      and amendment_after is not null
      and jsonb_typeof(amendment_after) = 'object'
      and nullif(btrim(amendment_reason), '') is not null
    )
  );

comment on column public.rfq_addenda.affected_fields is
  'Ordered factual RFQ or package attributes changed by a governed amendment. NULL identifies a legacy Addendum.';
comment on column public.rfq_addenda.amendment_before is
  'Immutable field-scoped RFQ values immediately before a governed amendment.';
comment on column public.rfq_addenda.amendment_after is
  'Immutable field-scoped RFQ values immediately after a governed amendment.';
comment on column public.rfq_addenda.amendment_reason is
  'Required issuer reason for a governed amendment. NULL remains valid for legacy Addenda.';

create or replace function public.protect_structured_rfq_amendment_evidence()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    tg_op = 'UPDATE'
    and (
      new.affected_fields is distinct from old.affected_fields
      or new.amendment_before is distinct from old.amendment_before
      or new.amendment_after is distinct from old.amendment_after
      or new.amendment_reason is distinct from old.amendment_reason
      or old.affected_fields is not null
      or old.amendment_before is not null
      or old.amendment_after is not null
      or old.amendment_reason is not null
    )
  ) or (
    tg_op = 'DELETE'
    and (
      old.affected_fields is not null
      or old.amendment_before is not null
      or old.amendment_after is not null
      or old.amendment_reason is not null
    )
  )
  then
    raise exception
      using
        errcode = '23514',
        message = 'Structured RFQ amendment evidence is immutable.';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

revoke all
on function public.protect_structured_rfq_amendment_evidence()
from public;

drop trigger if exists protect_structured_rfq_amendment_evidence_trigger
on public.rfq_addenda;

create trigger protect_structured_rfq_amendment_evidence_trigger
before update or delete on public.rfq_addenda
for each row
execute function public.protect_structured_rfq_amendment_evidence();

create or replace function public.audit_rfq_internal_project_id_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.internal_project_id is distinct from old.internal_project_id then
    insert into public.audit_logs (
      action,
      entity_type,
      entity_id,
      user_id,
      company_id,
      metadata
    )
    values (
      'RFQ_INTERNAL_METADATA_UPDATED',
      'rfq',
      new.id,
      auth.uid(),
      new.company_id,
      jsonb_build_object(
        'field', 'internal_project_id',
        'before', old.internal_project_id,
        'after', new.internal_project_id,
        'updated_at', now()
      )
    );
  end if;

  return new;
end;
$$;

revoke all
on function public.audit_rfq_internal_project_id_update()
from public;

drop trigger if exists audit_rfq_internal_project_id_update_trigger
on public.rfqs;

create trigger audit_rfq_internal_project_id_update_trigger
after update of internal_project_id on public.rfqs
for each row
execute function public.audit_rfq_internal_project_id_update();

create or replace function public.enforce_published_rfq_package_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_rfq_id uuid;
  target_rfq_status text;
begin
  target_rfq_id := case when tg_op = 'DELETE' then old.rfq_id else new.rfq_id end;

  if current_user in ('anon', 'authenticated', 'service_role') then
    select r.status
    into target_rfq_status
    from public.rfqs as r
    where r.id = target_rfq_id;

    if not found and tg_op = 'DELETE' then
      -- The parent RFQ has already left the statement snapshot during an
      -- authorized ON DELETE CASCADE. The parent policy below permits that
      -- cascade only for draft RFQs.
      return old;
    end if;

    if not found then
      raise exception
        using
          errcode = '23503',
          message = 'RFQ not found for package mutation.';
    end if;

    if target_rfq_status <> 'draft' then
      raise exception
        using
          errcode = '42501',
          message = 'Published RFQ package changes require a governed Addendum.';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

revoke all
on function public.enforce_published_rfq_package_mutation()
from public;
revoke all
on function public.enforce_published_rfq_package_mutation()
from anon;
revoke all
on function public.enforce_published_rfq_package_mutation()
from authenticated;

drop trigger if exists enforce_published_rfq_document_requirement_mutation_trigger
on public.rfq_document_requirements;

create trigger enforce_published_rfq_document_requirement_mutation_trigger
before insert or delete on public.rfq_document_requirements
for each row
execute function public.enforce_published_rfq_package_mutation();

drop trigger if exists enforce_published_rfq_attachment_mutation_trigger
on public.rfq_attachments;

create trigger enforce_published_rfq_attachment_mutation_trigger
before insert or delete on public.rfq_attachments
for each row
execute function public.enforce_published_rfq_package_mutation();

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
  governed_fields constant text[] := array[
    'title',
    'description',
    'category',
    'location',
    'budget',
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
  requested_fields text[];
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
  'Atomically applies a whitelisted pre-commercial-opening RFQ amendment and records immutable structured evidence in the existing Addendum domain.';

revoke all
on function public.amend_published_rfq(uuid, jsonb, text, text, text, text, boolean)
from public;
revoke all
on function public.amend_published_rfq(uuid, jsonb, text, text, text, text, boolean)
from anon;
grant execute
on function public.amend_published_rfq(uuid, jsonb, text, text, text, text, boolean)
to authenticated;

create or replace function public.amend_published_rfq_package(
  p_rfq_id uuid,
  p_change jsonb,
  p_reason text,
  p_title text,
  p_description text default null,
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
  created_addendum public.rfq_addenda%rowtype;
  added_requirement public.rfq_document_requirements%rowtype;
  added_attachment public.rfq_attachments%rowtype;
  removed_attachment public.rfq_attachments%rowtype;
  removed_requirement public.rfq_document_requirements%rowtype;
  locked_storage_object_id uuid;
  parsed_deadline timestamptz;
  operation_name text;
  attachment_type_value text;
  attachment_id_value uuid;
  allowed_fields text[];
  requested_fields text[];
  unknown_fields text[];
  evidence_key text;
  affected_documents_value text;
  before_evidence jsonb;
  after_evidence jsonb;
begin
  if actor_user_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHENTICATED',
      'error_message', 'Authentication is required.'
    );
  end if;

  if p_change is null or jsonb_typeof(p_change) <> 'object' then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_PACKAGE_CHANGE',
      'error_message', 'A structured package change is required.'
    );
  end if;

  if nullif(btrim(coalesce(p_reason, '')), '') is null
    or nullif(btrim(coalesce(p_title, '')), '') is null
  then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_ADDENDUM_EVIDENCE',
      'error_message', 'An Addendum title and amendment reason are required.'
    );
  end if;

  if p_requires_acknowledgement is not true then
    return jsonb_build_object(
      'success', false,
      'error_code', 'ACKNOWLEDGEMENT_REQUIRED',
      'error_message', 'Governed RFQ package amendments must require acknowledgement.'
    );
  end if;

  operation_name := nullif(btrim(p_change ->> 'operation'), '');

  allowed_fields := case operation_name
    when 'add_document_requirement' then
      array['operation', 'attachment_type']
    when 'remove_document_requirement' then
      array['operation', 'attachment_type']
    when 'add_attachment' then
      array[
        'operation',
        'file_name',
        'file_path',
        'file_type',
        'file_size',
        'attachment_type',
        'revision_label'
      ]
    when 'remove_attachment' then
      array['operation', 'attachment_id']
    else null
  end;

  if allowed_fields is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_PACKAGE_CHANGE',
      'error_message', 'Unsupported RFQ package operation.'
    );
  end if;

  select coalesce(array_agg(field_name order by field_name), '{}'::text[])
  into requested_fields
  from jsonb_object_keys(p_change) as requested(field_name);

  select coalesce(array_agg(field_name order by field_name), '{}'::text[])
  into unknown_fields
  from unnest(requested_fields) as requested(field_name)
  where not (field_name = any(allowed_fields));

  if cardinality(unknown_fields) > 0 then
    return jsonb_build_object(
      'success', false,
      'error_code', 'PROHIBITED_PACKAGE_FIELDS',
      'error_message', 'The request contains unknown or prohibited package fields.',
      'fields', to_jsonb(unknown_fields)
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
      'error_message', 'Only active issuer owners, administrators, and buyers may amend this RFQ package.'
    );
  end if;

  if target_rfq.status <> 'open'
    or target_rfq.awarded_quote_id is not null
    or target_rfq.awarded_at is not null
  then
    return jsonb_build_object(
      'success', false,
      'error_code', 'RFQ_NOT_AMENDABLE',
      'error_message', 'Only open, unawarded RFQ packages may be amended.'
    );
  end if;

  parsed_deadline := public.parse_rfq_deadline_timestamptz(target_rfq.deadline);

  if parsed_deadline is null or now() > parsed_deadline then
    return jsonb_build_object(
      'success', false,
      'error_code', 'COMMERCIAL_OPENING_UNLOCKED',
      'error_message', 'Material package amendments are prohibited after commercial opening.'
    );
  end if;

  if operation_name in (
    'add_document_requirement',
    'remove_document_requirement',
    'add_attachment'
  ) then
    if jsonb_typeof(p_change -> 'attachment_type') is distinct from 'string' then
      return jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_ATTACHMENT_TYPE',
        'error_message', 'A valid attachment type is required.'
      );
    end if;

    attachment_type_value := btrim(p_change ->> 'attachment_type');

    if attachment_type_value not in (
      'drawing',
      'specification',
      'boq',
      'photo',
      'addenda',
      'supporting'
    ) then
      return jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_ATTACHMENT_TYPE',
        'error_message', 'Unsupported attachment type.'
      );
    end if;
  end if;

  if operation_name = 'add_document_requirement' then
    if exists (
      select 1
      from public.rfq_document_requirements as requirement
      where requirement.rfq_id = target_rfq.id
        and requirement.attachment_type = attachment_type_value
    ) then
      return jsonb_build_object(
        'success', false,
        'error_code', 'NO_PACKAGE_CHANGE',
        'error_message', 'The document requirement is already present.'
      );
    end if;

    evidence_key := 'document_requirement:' || attachment_type_value;
    affected_documents_value := attachment_type_value;
    before_evidence := jsonb_build_object(evidence_key, null);

    insert into public.rfq_document_requirements (
      rfq_id,
      attachment_type
    )
    values (
      target_rfq.id,
      attachment_type_value
    )
    returning * into added_requirement;

    after_evidence := jsonb_build_object(
      evidence_key,
      to_jsonb(added_requirement)
    );
  elsif operation_name = 'remove_document_requirement' then
    select requirement.*
    into removed_requirement
    from public.rfq_document_requirements as requirement
    where requirement.rfq_id = target_rfq.id
      and requirement.attachment_type = attachment_type_value
    for update;

    if not found then
      return jsonb_build_object(
        'success', false,
        'error_code', 'NO_PACKAGE_CHANGE',
        'error_message', 'The document requirement is not present.'
      );
    end if;

    evidence_key := 'document_requirement:' || attachment_type_value;
    affected_documents_value := attachment_type_value;
    before_evidence := jsonb_build_object(
      evidence_key,
      to_jsonb(removed_requirement)
    );
    after_evidence := jsonb_build_object(evidence_key, null);

    delete from public.rfq_document_requirements
    where id = removed_requirement.id;
  elsif operation_name = 'add_attachment' then
    if jsonb_typeof(p_change -> 'file_name') is distinct from 'string'
      or nullif(btrim(p_change ->> 'file_name'), '') is null
      or jsonb_typeof(p_change -> 'file_path') is distinct from 'string'
      or nullif(btrim(p_change ->> 'file_path'), '') is null
      or (
        p_change ? 'file_type'
        and jsonb_typeof(p_change -> 'file_type') not in ('string', 'null')
      )
      or (
        p_change ? 'revision_label'
        and jsonb_typeof(p_change -> 'revision_label') not in ('string', 'null')
      )
    then
      return jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_ATTACHMENT',
        'error_message', 'Valid attachment metadata is required.'
      );
    end if;

    if jsonb_typeof(p_change -> 'file_size') is distinct from 'number'
    then
      return jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_ATTACHMENT',
        'error_message', 'Attachment file size must be a nonnegative integer.'
      );
    end if;

    if trunc((p_change ->> 'file_size')::numeric) <> (p_change ->> 'file_size')::numeric
      or (p_change ->> 'file_size')::numeric < 0
      or (p_change ->> 'file_size')::numeric > 9223372036854775807
    then
      return jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_ATTACHMENT',
        'error_message', 'Attachment file size must be a nonnegative integer.'
      );
    end if;

    if (storage.foldername(btrim(p_change ->> 'file_path')))[1]
        is distinct from target_rfq.company_id::text
      or (storage.foldername(btrim(p_change ->> 'file_path')))[2]
        is distinct from target_rfq.id::text
      or (storage.foldername(btrim(p_change ->> 'file_path')))[3]
        is distinct from attachment_type_value
    then
      return jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_ATTACHMENT_PATH',
        'error_message', 'Attachment path does not match the issuer, RFQ, and attachment type.'
      );
    end if;

    select stored_object.id
    into locked_storage_object_id
    from storage.objects as stored_object
    where stored_object.bucket_id = 'rfq-attachments'
      and stored_object.name = btrim(p_change ->> 'file_path')
    for update;

    if not found then
      return jsonb_build_object(
        'success', false,
        'error_code', 'ATTACHMENT_OBJECT_NOT_FOUND',
        'error_message', 'The uploaded attachment object was not found.'
      );
    end if;

    if exists (
      select 1
      from public.rfq_attachments as attachment
      where attachment.file_path = btrim(p_change ->> 'file_path')
    ) then
      return jsonb_build_object(
        'success', false,
        'error_code', 'NO_PACKAGE_CHANGE',
        'error_message', 'The attachment is already recorded.'
      );
    end if;

    insert into public.rfq_attachments (
      rfq_id,
      file_name,
      file_path,
      file_type,
      file_size,
      attachment_type,
      revision_label
    )
    values (
      target_rfq.id,
      btrim(p_change ->> 'file_name'),
      btrim(p_change ->> 'file_path'),
      nullif(btrim(p_change ->> 'file_type'), ''),
      (p_change ->> 'file_size')::bigint,
      attachment_type_value,
      coalesce(nullif(btrim(p_change ->> 'revision_label'), ''), 'Rev 0')
    )
    returning * into added_attachment;

    evidence_key := 'attachment:' || added_attachment.id::text;
    affected_documents_value := added_attachment.file_name;
    before_evidence := jsonb_build_object(evidence_key, null);
    after_evidence := jsonb_build_object(
      evidence_key,
      to_jsonb(added_attachment)
    );
  elsif operation_name = 'remove_attachment' then
    if jsonb_typeof(p_change -> 'attachment_id') is distinct from 'string'
      or p_change ->> 'attachment_id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    then
      return jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_ATTACHMENT',
        'error_message', 'A valid attachment ID is required.'
      );
    end if;

    attachment_id_value := (p_change ->> 'attachment_id')::uuid;

    select attachment.*
    into removed_attachment
    from public.rfq_attachments as attachment
    where attachment.id = attachment_id_value
      and attachment.rfq_id = target_rfq.id
    for update;

    if not found then
      return jsonb_build_object(
        'success', false,
        'error_code', 'NO_PACKAGE_CHANGE',
        'error_message', 'The attachment is not present on this RFQ.'
      );
    end if;

    evidence_key := 'attachment:' || removed_attachment.id::text;
    affected_documents_value := removed_attachment.file_name;
    before_evidence := jsonb_build_object(
      evidence_key,
      to_jsonb(removed_attachment)
    );
    after_evidence := jsonb_build_object(evidence_key, null);

    delete from public.rfq_attachments
    where id = removed_attachment.id;
  end if;

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
    affected_documents_value,
    true,
    array[evidence_key],
    before_evidence,
    after_evidence,
    btrim(p_reason)
  )
  returning * into created_addendum;

  return jsonb_build_object(
    'success', true,
    'rfq_id', target_rfq.id,
    'operation', operation_name,
    'addendum_id', created_addendum.id,
    'addendum_number', created_addendum.addendum_number,
    'affected_fields', to_jsonb(created_addendum.affected_fields),
    'amended_by', created_addendum.created_by,
    'amended_at', created_addendum.created_at
  );
end;
$$;

comment on function public.amend_published_rfq_package(
  uuid,
  jsonb,
  text,
  text,
  text,
  boolean
) is
  'Atomically changes one published RFQ document requirement or participant-visible attachment and records immutable evidence in the existing Addendum domain.';

revoke all
on function public.amend_published_rfq_package(uuid, jsonb, text, text, text, boolean)
from public;
revoke all
on function public.amend_published_rfq_package(uuid, jsonb, text, text, text, boolean)
from anon;
grant execute
on function public.amend_published_rfq_package(uuid, jsonb, text, text, text, boolean)
to authenticated;

drop policy if exists "Workspace administrators can delete company RFQs"
on public.rfqs;

create policy "Workspace administrators can delete company RFQs"
on public.rfqs
for delete
to authenticated
using (
  rfqs.status = 'draft'
  and exists (
    select 1
    from public.organization_memberships as om
    where om.user_id = auth.uid()
      and om.company_id = rfqs.company_id
      and om.membership_status = 'active'
      and om.workspace_role in ('owner', 'admin')
  )
);

drop policy if exists "RFQ participants can read rfq-attachments objects"
on storage.objects;

create policy "RFQ participants can read rfq-attachments objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'rfq-attachments'
  and exists (
    select 1
    from public.rfqs as r
    where r.id::text = (storage.foldername(name))[2]
      and r.company_id::text = (storage.foldername(name))[1]
      and exists (
        select 1
        from public.rfq_attachments as attachment
        where attachment.rfq_id = r.id
          and attachment.file_path = storage.objects.name
      )
      and (
        exists (
          select 1
          from public.organization_memberships as om
          where om.user_id = auth.uid()
            and om.company_id = r.company_id
            and om.membership_status = 'active'
        )
        or (
          exists (
            select 1
            from public.organization_memberships as om
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

drop policy if exists "Issuer procurement users can delete rfq-attachments objects"
on storage.objects;

create policy "Issuer procurement users can delete rfq-attachments objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'rfq-attachments'
  and exists (
    select 1
    from public.rfqs as r
    join public.organization_memberships as om
      on om.company_id = r.company_id
    where r.id::text = (storage.foldername(name))[2]
      and r.company_id::text = (storage.foldername(name))[1]
      and om.user_id = auth.uid()
      and om.membership_status = 'active'
      and (
        om.workspace_role in ('owner', 'admin')
        or om.procurement_function = 'buyer'
      )
      and (
        r.status = 'draft'
        or not exists (
          select 1
          from public.rfq_attachments as attachment
          where attachment.rfq_id = r.id
            and attachment.file_path = storage.objects.name
        )
      )
  )
);

-- Remove the table-wide client write capability. Draft creation remains INSERT;
-- award_rfq_quote and this command retain their security-definer write authority.
revoke update on table public.rfqs from authenticated;
grant update (internal_project_id) on table public.rfqs to authenticated;

commit;

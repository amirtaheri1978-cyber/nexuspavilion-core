begin;

-- Task 28 revised: company-scoped activity READ access plus a trusted
-- SECURITY DEFINER writer for RFQ_CREATED and quote-submitted events.
-- Authenticated clients receive SELECT only. INSERT grants and INSERT
-- policies are intentionally omitted so audit history cannot be forged
-- through the Supabase client. FORCE RLS is not set so existing
-- postgres-owned SECURITY DEFINER RPCs continue to write events.

alter table public.notifications
  add column if not exists company_id uuid;

alter table public.notifications
  drop constraint if exists notifications_company_id_fkey;

alter table public.notifications
  add constraint notifications_company_id_fkey
  foreign key (company_id) references public.companies(id);

create index if not exists notifications_company_id_idx
  on public.notifications (company_id);

alter table public.notifications
  enable row level security;

alter table public.audit_logs
  enable row level security;

drop policy if exists "Company members can read company notifications"
  on public.notifications;

drop policy if exists "Company members can create company notifications"
  on public.notifications;

drop policy if exists "Company members can read company audit logs"
  on public.audit_logs;

drop policy if exists "Company members can create company audit logs"
  on public.audit_logs;

create policy "Company members can read company notifications"
on public.notifications
for select
to authenticated
using (
  company_id is not null
  and exists (
    select 1
    from public.organization_memberships om
    where om.user_id = auth.uid()
      and om.company_id = notifications.company_id
      and om.membership_status = 'active'
  )
);

create policy "Company members can read company audit logs"
on public.audit_logs
for select
to authenticated
using (
  company_id is not null
  and exists (
    select 1
    from public.organization_memberships om
    where om.user_id = auth.uid()
      and om.company_id = audit_logs.company_id
      and om.membership_status = 'active'
  )
);

grant select
on table public.notifications
to authenticated;

grant select
on table public.audit_logs
to authenticated;

create or replace function public.record_procurement_activity(
  p_activity_kind text,
  p_entity_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := auth.uid();
  activity_kind text := lower(btrim(coalesce(p_activity_kind, '')));
  rfq_row public.rfqs%rowtype;
  quote_row public.quotes%rowtype;
  buyer_company_id uuid;
  scope_label text;
  notification_message text;
  existing_audit_id uuid;
  written_audit_id uuid;
  written_notification_id uuid;
begin
  if actor_user_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'AUTHENTICATION_REQUIRED',
      'error_message', 'Authentication is required.'
    );
  end if;

  if p_entity_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'ENTITY_ID_REQUIRED',
      'error_message', 'Entity ID is required.'
    );
  end if;

  if activity_kind not in ('rfq_created', 'quote_submitted') then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_ACTIVITY_KIND',
      'error_message', 'Unsupported procurement activity.'
    );
  end if;

  if activity_kind = 'rfq_created' then
    select r.*
    into rfq_row
    from public.rfqs r
    where r.id = p_entity_id
      and r.user_id = actor_user_id
      and exists (
        select 1
        from public.organization_memberships om
        where om.user_id = actor_user_id
          and om.company_id = r.company_id
          and om.membership_status = 'active'
          and (
            om.workspace_role in ('owner', 'admin')
            or om.procurement_function = 'buyer'
          )
      );

    if not found then
      return jsonb_build_object(
        'success', false,
        'error_code', 'ENTITY_NOT_FOUND',
        'error_message', 'RFQ not found.'
      );
    end if;

    select a.id
    into existing_audit_id
    from public.audit_logs a
    where a.action = 'RFQ_CREATED'
      and a.entity_id = rfq_row.id
    order by a.created_at
    limit 1;

    if existing_audit_id is not null then
      return jsonb_build_object(
        'success', true,
        'activity_kind', activity_kind,
        'idempotent', true,
        'audit_id', existing_audit_id
      );
    end if;

    scope_label := case rfq_row.procurement_scope
      when 'material' then 'Material / Product RFQ'
      when 'equipment' then 'Equipment Rental RFQ'
      when 'professional_service' then 'Professional Service RFQ'
      else 'Subcontractor / Trade RFQ'
    end;

    notification_message := coalesce(rfq_row.title, 'Untitled RFQ')
      || ' procurement opportunity has been published as a '
      || scope_label
      || '.';

    insert into public.audit_logs (
      action,
      entity_type,
      entity_id,
      user_id,
      company_id,
      metadata
    )
    values (
      'RFQ_CREATED',
      'rfq',
      rfq_row.id,
      actor_user_id,
      rfq_row.company_id,
      jsonb_build_object(
        'title', rfq_row.title,
        'budget', rfq_row.budget,
        'category', rfq_row.category,
        'location', rfq_row.location,
        'slug', rfq_row.slug,
        'deadline', rfq_row.deadline,
        'procurement_scope', rfq_row.procurement_scope,
        'sourcing_method', rfq_row.sourcing_method,
        'contract_framework', rfq_row.contract_framework,
        'bid_model', rfq_row.bid_model
      )
    )
    returning id into written_audit_id;

    insert into public.notifications (
      title,
      message,
      type,
      is_read,
      company_id
    )
    values (
      'RFQ Created',
      notification_message,
      'rfq',
      false,
      rfq_row.company_id
    )
    returning id into written_notification_id;

    return jsonb_build_object(
      'success', true,
      'activity_kind', activity_kind,
      'audit_id', written_audit_id,
      'notification_id', written_notification_id
    );
  end if;

  select q.*
  into quote_row
  from public.quotes q
  where q.id = p_entity_id
    and q.user_id = actor_user_id
    and exists (
      select 1
      from public.organization_memberships om
      where om.user_id = actor_user_id
        and om.company_id = q.company_id
        and om.membership_status = 'active'
        and om.procurement_function in ('supplier', 'consultant')
    );

  if not found then
    return jsonb_build_object(
      'success', false,
      'error_code', 'ENTITY_NOT_FOUND',
      'error_message', 'Quote not found.'
    );
  end if;

  select r.company_id, r.title
  into buyer_company_id, notification_message
  from public.rfqs r
  where r.id = quote_row.rfq_id;

  if buyer_company_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'ENTITY_NOT_FOUND',
      'error_message', 'Quote not found.'
    );
  end if;

  select a.id
  into existing_audit_id
  from public.audit_logs a
  where a.action = 'QUOTE_SUBMITTED'
    and a.entity_id = quote_row.id
  order by a.created_at
  limit 1;

  if existing_audit_id is not null then
    return jsonb_build_object(
      'success', true,
      'activity_kind', activity_kind,
      'idempotent', true,
      'audit_id', existing_audit_id
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
    'QUOTE_SUBMITTED',
    'quote',
    quote_row.id,
    actor_user_id,
    quote_row.company_id,
    jsonb_build_object(
      'rfq_id', quote_row.rfq_id,
      'amount', quote_row.amount,
      'timeline', quote_row.timeline,
      'validity_days', quote_row.validity_days
    )
  )
  returning id into written_audit_id;

  insert into public.notifications (
    title,
    message,
    type,
    is_read,
    company_id
  )
  values (
    'Quote Submitted',
    'A new quote was submitted for '
      || coalesce(notification_message, 'this RFQ')
      || '.',
    'quote',
    false,
    buyer_company_id
  )
  returning id into written_notification_id;

  return jsonb_build_object(
    'success', true,
    'activity_kind', activity_kind,
    'audit_id', written_audit_id,
    'notification_id', written_notification_id
  );
end;
$$;

comment on function public.record_procurement_activity(text, uuid) is
  'Records allowlisted procurement activity. Actor is auth.uid(). Caller cannot supply company_id, action, title, message, or metadata. rfq_created writes RFQ_CREATED plus an RFQ Created notification for the RFQ company. quote_submitted writes QUOTE_SUBMITTED for the supplier company and a Quote Submitted notification for the buyer RFQ company.';

alter function public.record_procurement_activity(text, uuid)
  owner to postgres;

revoke all
on function public.record_procurement_activity(text, uuid)
from public;

revoke all
on function public.record_procurement_activity(text, uuid)
from anon;

grant execute
on function public.record_procurement_activity(text, uuid)
to authenticated;

commit;

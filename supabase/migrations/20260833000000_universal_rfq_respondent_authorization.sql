begin;

-- Task 33E: Universal RFQ respondent authorization.
-- Stop using organization_memberships.procurement_function as the global
-- RFQ-response permission. Active company membership is the company-level
-- prerequisite. Restricted sourcing still requires
-- current_user_has_supplier_rfq_access (invitation email match or existing
-- quote participation). Open sourcing remains marketplace-visible to
-- authenticated users with any legitimate active company membership.
-- Quote SELECT, award, buyer intelligence, invitation tokens, and
-- procurement_function values are unchanged. No membership backfill.

create or replace function public.current_user_has_supplier_rfq_access(p_rfq_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
begin
  if v_uid is null or p_rfq_id is null then
    return false;
  end if;

  -- Prefer the authenticated identity email, then the profile email.
  -- rfq_invites.email is stored as lower(btrim(email)).
  v_email := nullif(lower(btrim(coalesce(auth.jwt() ->> 'email', ''))), '');

  if v_email is null then
    select nullif(lower(btrim(p.email)), '')
      into v_email
    from public.profiles p
    where p.id = v_uid;
  end if;

  -- Explicit invitation under the existing email-normalized rfq_invites model.
  -- Access is bound to the authenticated email, not an invitation URL.
  if v_email is not null and exists (
    select 1
    from public.rfq_invites i
    where i.rfq_id = p_rfq_id
      and i.email = v_email
      and i.status in ('sent', 'invited')
  ) then
    return true;
  end if;

  -- Existing participation: the caller already quoted this RFQ for an
  -- authorized active company membership.
  if exists (
    select 1
    from public.quotes q
    join public.organization_memberships om
      on om.company_id = q.company_id
     and om.user_id = v_uid
     and om.membership_status = 'active'
    where q.rfq_id = p_rfq_id
  ) then
    return true;
  end if;

  return false;
end;
$$;

comment on function public.current_user_has_supplier_rfq_access(uuid) is
  'Boolean-only helper for restricted RFQ SELECT / quote INSERT RLS. Returns true for an explicit rfq_invites email match or existing quote participation by an active company membership. SECURITY DEFINER so respondents can be authorized without a direct rfq_invites SELECT grant.';

revoke all on function public.current_user_has_supplier_rfq_access(uuid) from public;
revoke all on function public.current_user_has_supplier_rfq_access(uuid) from anon;
grant execute on function public.current_user_has_supplier_rfq_access(uuid) to authenticated;

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
    rfqs.status = 'open'
    and exists (
      select 1
      from public.organization_memberships om
      where om.user_id = auth.uid()
        and om.membership_status = 'active'
    )
    and (
      rfqs.sourcing_method = 'open'
      or public.current_user_has_supplier_rfq_access(rfqs.id)
    )
  )
);

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
  )
);

-- Align quote_submitted activity recording with the same respondent
-- membership contract. Issuer RFQ_CREATED authorization is unchanged.
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
  'Records allowlisted procurement activity. Actor is auth.uid(). Caller cannot supply company_id, action, title, message, or metadata. rfq_created writes RFQ_CREATED plus an RFQ Created notification for the RFQ company. quote_submitted writes QUOTE_SUBMITTED for the quoting company and a Quote Submitted notification for the buyer RFQ company. quote_submitted authorizes any active membership of the quoting company.';

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

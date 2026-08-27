begin;

-- Cursor 05B: expand trusted procurement activity writers.
-- Extends public.record_procurement_activity allowlist with RFQ invitation,
-- RFI, and Addendum events. Preserves rfq_created / quote_submitted behavior,
-- SECURITY DEFINER + search_path='', auth.uid() actor derivation, and
-- audit-first idempotency. Does NOT restore authenticated INSERT on
-- notifications / audit_logs. Does NOT modify workspace invitation flows.

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
  invite_row public.rfq_invites%rowtype;
  rfi_row public.rfq_rfis%rowtype;
  addendum_row public.rfq_addenda%rowtype;
  acknowledgement_row public.rfq_addendum_acknowledgements%rowtype;
  buyer_company_id uuid;
  issuer_company_id uuid;
  scope_label text;
  notification_title text;
  notification_message text;
  notification_type text;
  audit_action text;
  audit_entity_type text;
  audit_company_id uuid;
  notification_company_id uuid;
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

  if activity_kind not in (
    'rfq_created',
    'quote_submitted',
    'rfq_invitation_sent',
    'rfi_submitted',
    'rfi_responded',
    'addendum_published',
    'addendum_acknowledged'
  ) then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_ACTIVITY_KIND',
      'error_message', 'Unsupported procurement activity.'
    );
  end if;

  -- -----------------------------------------------------------------------
  -- rfq_created (unchanged contract)
  -- -----------------------------------------------------------------------
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

  -- -----------------------------------------------------------------------
  -- quote_submitted (unchanged contract; buyer notification audience only)
  -- -----------------------------------------------------------------------
  if activity_kind = 'quote_submitted' then
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
  end if;

  -- -----------------------------------------------------------------------
  -- rfq_invitation_sent
  -- -----------------------------------------------------------------------
  if activity_kind = 'rfq_invitation_sent' then
    select i.*
    into invite_row
    from public.rfq_invites i
    where i.id = p_entity_id;

    if not found then
      return jsonb_build_object(
        'success', false,
        'error_code', 'ENTITY_NOT_FOUND',
        'error_message', 'RFQ invitation not found.'
      );
    end if;

    select r.*
    into rfq_row
    from public.rfqs r
    where r.id = invite_row.rfq_id
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
        'error_message', 'RFQ invitation not found.'
      );
    end if;

    audit_action := 'RFQ_INVITATION_SENT';
    audit_entity_type := 'rfq_invite';
    audit_company_id := rfq_row.company_id;
    notification_company_id := rfq_row.company_id;
    notification_type := 'invitation';
    notification_title := 'Supplier Invited';
    notification_message := invite_row.email
      || ' was invited to quote on '
      || coalesce(rfq_row.title, 'this RFQ')
      || '.';

    select a.id
    into existing_audit_id
    from public.audit_logs a
    where a.action = audit_action
      and a.entity_id = invite_row.id
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
      audit_action,
      audit_entity_type,
      invite_row.id,
      actor_user_id,
      audit_company_id,
      jsonb_build_object(
        'rfq_id', rfq_row.id,
        'rfq_title', rfq_row.title,
        'supplier_email', invite_row.email,
        'invite_status', invite_row.status
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
      notification_title,
      notification_message,
      notification_type,
      false,
      notification_company_id
    )
    returning id into written_notification_id;

    return jsonb_build_object(
      'success', true,
      'activity_kind', activity_kind,
      'audit_id', written_audit_id,
      'notification_id', written_notification_id
    );
  end if;

  -- -----------------------------------------------------------------------
  -- rfi_submitted
  -- -----------------------------------------------------------------------
  if activity_kind = 'rfi_submitted' then
    select rfi.*
    into rfi_row
    from public.rfq_rfis rfi
    where rfi.id = p_entity_id
      and rfi.submitted_by = actor_user_id
      and exists (
        select 1
        from public.organization_memberships om
        where om.user_id = actor_user_id
          and om.company_id = rfi.respondent_company_id
          and om.membership_status = 'active'
      );

    if not found then
      return jsonb_build_object(
        'success', false,
        'error_code', 'ENTITY_NOT_FOUND',
        'error_message', 'RFI not found.'
      );
    end if;

    select r.*
    into rfq_row
    from public.rfqs r
    where r.id = rfi_row.rfq_id;

    if not found or rfq_row.company_id is null then
      return jsonb_build_object(
        'success', false,
        'error_code', 'ENTITY_NOT_FOUND',
        'error_message', 'RFI not found.'
      );
    end if;

    audit_action := 'RFI_SUBMITTED';
    audit_entity_type := 'rfq_rfi';
    audit_company_id := rfi_row.respondent_company_id;
    notification_company_id := rfq_row.company_id;
    notification_type := 'rfi';
    notification_title := 'RFI Submitted';
    notification_message := 'A private RFI was submitted on '
      || coalesce(rfq_row.title, 'this RFQ')
      || '.';

    select a.id
    into existing_audit_id
    from public.audit_logs a
    where a.action = audit_action
      and a.entity_id = rfi_row.id
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
      audit_action,
      audit_entity_type,
      rfi_row.id,
      actor_user_id,
      audit_company_id,
      jsonb_build_object(
        'rfq_id', rfi_row.rfq_id,
        'respondent_company_id', rfi_row.respondent_company_id,
        'status', rfi_row.status
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
      notification_title,
      notification_message,
      notification_type,
      false,
      notification_company_id
    )
    returning id into written_notification_id;

    return jsonb_build_object(
      'success', true,
      'activity_kind', activity_kind,
      'audit_id', written_audit_id,
      'notification_id', written_notification_id
    );
  end if;

  -- -----------------------------------------------------------------------
  -- rfi_responded
  -- -----------------------------------------------------------------------
  if activity_kind = 'rfi_responded' then
    select rfi.*
    into rfi_row
    from public.rfq_rfis rfi
    where rfi.id = p_entity_id
      and rfi.status = 'answered'
      and rfi.responded_by = actor_user_id;

    if not found then
      return jsonb_build_object(
        'success', false,
        'error_code', 'ENTITY_NOT_FOUND',
        'error_message', 'RFI response not found.'
      );
    end if;

    select r.*
    into rfq_row
    from public.rfqs r
    where r.id = rfi_row.rfq_id
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
        'error_message', 'RFI response not found.'
      );
    end if;

    if rfi_row.respondent_company_id is null then
      return jsonb_build_object(
        'success', false,
        'error_code', 'ENTITY_NOT_FOUND',
        'error_message', 'RFI response not found.'
      );
    end if;

    audit_action := 'RFI_RESPONDED';
    audit_entity_type := 'rfq_rfi';
    audit_company_id := rfq_row.company_id;
    notification_company_id := rfi_row.respondent_company_id;
    notification_type := 'rfi_response';
    notification_title := 'RFI Answered';
    notification_message := 'An issuer response was posted for your RFI on '
      || coalesce(rfq_row.title, 'this RFQ')
      || '.';

    select a.id
    into existing_audit_id
    from public.audit_logs a
    where a.action = audit_action
      and a.entity_id = rfi_row.id
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
      audit_action,
      audit_entity_type,
      rfi_row.id,
      actor_user_id,
      audit_company_id,
      jsonb_build_object(
        'rfq_id', rfi_row.rfq_id,
        'respondent_company_id', rfi_row.respondent_company_id,
        'status', rfi_row.status
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
      notification_title,
      notification_message,
      notification_type,
      false,
      notification_company_id
    )
    returning id into written_notification_id;

    return jsonb_build_object(
      'success', true,
      'activity_kind', activity_kind,
      'audit_id', written_audit_id,
      'notification_id', written_notification_id
    );
  end if;

  -- -----------------------------------------------------------------------
  -- addendum_published
  -- -----------------------------------------------------------------------
  if activity_kind = 'addendum_published' then
    select a.*
    into addendum_row
    from public.rfq_addenda a
    where a.id = p_entity_id
      and a.created_by = actor_user_id;

    if not found then
      return jsonb_build_object(
        'success', false,
        'error_code', 'ENTITY_NOT_FOUND',
        'error_message', 'Addendum not found.'
      );
    end if;

    select r.*
    into rfq_row
    from public.rfqs r
    where r.id = addendum_row.rfq_id
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
        'error_message', 'Addendum not found.'
      );
    end if;

    issuer_company_id := rfq_row.company_id;
    audit_action := 'ADDENDUM_PUBLISHED';
    audit_entity_type := 'rfq_addendum';
    audit_company_id := issuer_company_id;
    notification_company_id := issuer_company_id;
    notification_type := 'addendum';
    notification_title := 'Addendum Published';
    notification_message := 'Addendum '
      || addendum_row.addendum_number::text
      || ' ('
      || coalesce(addendum_row.title, 'Untitled')
      || ') was published on '
      || coalesce(rfq_row.title, 'this RFQ')
      || '.';

    select a.id
    into existing_audit_id
    from public.audit_logs a
    where a.action = audit_action
      and a.entity_id = addendum_row.id
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
      audit_action,
      audit_entity_type,
      addendum_row.id,
      actor_user_id,
      audit_company_id,
      jsonb_build_object(
        'rfq_id', addendum_row.rfq_id,
        'addendum_number', addendum_row.addendum_number,
        'title', addendum_row.title,
        'requires_acknowledgement', addendum_row.requires_acknowledgement
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
      notification_title,
      notification_message,
      notification_type,
      false,
      notification_company_id
    )
    returning id into written_notification_id;

    return jsonb_build_object(
      'success', true,
      'activity_kind', activity_kind,
      'audit_id', written_audit_id,
      'notification_id', written_notification_id
    );
  end if;

  -- -----------------------------------------------------------------------
  -- addendum_acknowledged
  -- -----------------------------------------------------------------------
  if activity_kind = 'addendum_acknowledged' then
    select ack.*
    into acknowledgement_row
    from public.rfq_addendum_acknowledgements ack
    where ack.id = p_entity_id
      and ack.acknowledged_by = actor_user_id
      and exists (
        select 1
        from public.organization_memberships om
        where om.user_id = actor_user_id
          and om.company_id = ack.company_id
          and om.membership_status = 'active'
      );

    if not found then
      return jsonb_build_object(
        'success', false,
        'error_code', 'ENTITY_NOT_FOUND',
        'error_message', 'Addendum acknowledgement not found.'
      );
    end if;

    select r.*
    into rfq_row
    from public.rfqs r
    where r.id = acknowledgement_row.rfq_id;

    if not found or rfq_row.company_id is null then
      return jsonb_build_object(
        'success', false,
        'error_code', 'ENTITY_NOT_FOUND',
        'error_message', 'Addendum acknowledgement not found.'
      );
    end if;

    audit_action := 'ADDENDUM_ACKNOWLEDGED';
    audit_entity_type := 'rfq_addendum_acknowledgement';
    audit_company_id := acknowledgement_row.company_id;
    notification_company_id := rfq_row.company_id;
    notification_type := 'addendum_acknowledgement';
    notification_title := 'Addendum Acknowledged';
    notification_message := 'A required addendum was acknowledged on '
      || coalesce(rfq_row.title, 'this RFQ')
      || '.';

    select a.id
    into existing_audit_id
    from public.audit_logs a
    where a.action = audit_action
      and a.entity_id = acknowledgement_row.id
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
      audit_action,
      audit_entity_type,
      acknowledgement_row.id,
      actor_user_id,
      audit_company_id,
      jsonb_build_object(
        'rfq_id', acknowledgement_row.rfq_id,
        'addendum_id', acknowledgement_row.addendum_id,
        'respondent_company_id', acknowledgement_row.company_id
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
      notification_title,
      notification_message,
      notification_type,
      false,
      notification_company_id
    )
    returning id into written_notification_id;

    return jsonb_build_object(
      'success', true,
      'activity_kind', activity_kind,
      'audit_id', written_audit_id,
      'notification_id', written_notification_id
    );
  end if;

  return jsonb_build_object(
    'success', false,
    'error_code', 'INVALID_ACTIVITY_KIND',
    'error_message', 'Unsupported procurement activity.'
  );
end;
$$;

comment on function public.record_procurement_activity(text, uuid) is
  'Records allowlisted procurement activity. Actor is auth.uid(). Caller cannot supply company_id, action, title, message, or metadata. Supports rfq_created, quote_submitted, rfq_invitation_sent, rfi_submitted, rfi_responded, addendum_published, and addendum_acknowledged. quote_submitted notification audience remains the buyer RFQ company only.';

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

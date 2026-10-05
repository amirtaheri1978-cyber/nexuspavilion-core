begin;

create or replace function public.record_company_workspace_invitation_activity(
  p_activity_kind text,
  p_invitation_id uuid,
  p_delivery_status text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := auth.uid();
  activity_kind text := lower(btrim(coalesce(p_activity_kind, '')));
  delivery_status text := nullif(lower(btrim(coalesce(p_delivery_status, ''))), '');
  actor_company_id uuid;
  actor_workspace_role text;
  resolution_error text;
  invitation_record public.invitations%rowtype;
  access_level_label text;
  action_name text;
  existing_audit_id uuid;
  written_audit_id uuid;
  written_notification_id uuid;
begin
  if actor_user_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHENTICATED',
      'error_message', 'Authentication is required.'
    );
  end if;

  if p_invitation_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_INVITATION',
      'error_message', 'Invitation ID is required.'
    );
  end if;

  if activity_kind not in ('created', 'resent', 'revoked') then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_ACTIVITY_KIND',
      'error_message', 'Unsupported Company Workspace invitation activity.'
    );
  end if;

  if activity_kind in ('created', 'resent')
     and delivery_status not in ('sent', 'skipped', 'failed') then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_DELIVERY_STATUS',
      'error_message', 'Invitation delivery status is invalid.'
    );
  end if;

  if activity_kind = 'revoked' and delivery_status is not null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_DELIVERY_STATUS',
      'error_message', 'Revocation does not accept a delivery status.'
    );
  end if;

  select
    resolved_company_id,
    resolved_workspace_role,
    resolution_error_code
  into
    actor_company_id,
    actor_workspace_role,
    resolution_error
  from public.resolve_company_workspace_invitation_context();

  if resolution_error is not null then
    return jsonb_build_object(
      'success', false,
      'error_code', resolution_error,
      'error_message', 'Workspace access could not be verified.'
    );
  end if;

  if actor_workspace_role not in ('owner', 'admin') then
    return jsonb_build_object(
      'success', false,
      'error_code', 'FORBIDDEN',
      'error_message', 'You do not have permission to manage invitations.'
    );
  end if;

  select i.*
  into invitation_record
  from public.invitations i
  where i.id = p_invitation_id
    and i.company_id = actor_company_id;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVITATION_NOT_FOUND',
      'error_message', 'Invitation not found in your company workspace.'
    );
  end if;

  if activity_kind in ('created', 'resent')
     and invitation_record.status <> 'pending' then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVITATION_NOT_PENDING',
      'error_message', 'Invitation activity requires a pending invitation.'
    );
  end if;

  if activity_kind = 'revoked'
     and invitation_record.status <> 'revoked' then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVITATION_NOT_REVOKED',
      'error_message', 'Revocation activity requires a revoked invitation.'
    );
  end if;

  access_level_label :=
    case lower(btrim(coalesce(invitation_record.role, '')))
      when 'viewer' then 'Read Only'
      when 'member' then 'Standard'
      when 'admin' then 'Administrator'
      else 'Workspace Access'
    end;

  action_name :=
    case activity_kind
      when 'created' then 'INVITATION_CREATED'
      when 'resent' then 'INVITATION_RESENT'
      when 'revoked' then 'INVITATION_REVOKED'
    end;

  if activity_kind in ('created', 'revoked') then
    perform pg_advisory_xact_lock(
      hashtextextended(
        action_name || ':' || p_invitation_id::text,
        0
      )
    );

    select a.id
    into existing_audit_id
    from public.audit_logs a
    where a.action = action_name
      and a.entity_type = 'invitation'
      and a.entity_id = p_invitation_id
      and a.company_id = actor_company_id
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
    action_name,
    'invitation',
    invitation_record.id,
    actor_user_id,
    actor_company_id,
    jsonb_strip_nulls(
      jsonb_build_object(
        'email', invitation_record.email,
        'role', invitation_record.role,
        'access_level_label', access_level_label,
        'delivery_status', delivery_status,
        'recorded_at', now()
      )
    )
  )
  returning id into written_audit_id;

  if activity_kind = 'created' then
    insert into public.notifications (
      title,
      message,
      type,
      is_read,
      company_id
    )
    values (
      'Invitation Created',
      invitation_record.email ||
        ' was invited to the company workspace as ' ||
        access_level_label || '.',
      'invitation',
      false,
      actor_company_id
    )
    returning id into written_notification_id;
  end if;

  return jsonb_build_object(
    'success', true,
    'activity_kind', activity_kind,
    'idempotent', false,
    'audit_id', written_audit_id,
    'notification_id', written_notification_id
  );
end;
$$;

comment on function public.record_company_workspace_invitation_activity(text, uuid, text) is
  'Records allowlisted Company Workspace invitation activity for auth.uid(). The caller supplies only the activity kind, invitation id, and bounded delivery status. The function resolves the current workspace, requires owner/admin authority, derives invitation details from stored state, and preserves direct-write denial on audit_logs and notifications.';

alter function public.record_company_workspace_invitation_activity(text, uuid, text)
  owner to postgres;

revoke all
on function public.record_company_workspace_invitation_activity(text, uuid, text)
from public;

revoke all
on function public.record_company_workspace_invitation_activity(text, uuid, text)
from anon;

grant execute
on function public.record_company_workspace_invitation_activity(text, uuid, text)
to authenticated;

commit;

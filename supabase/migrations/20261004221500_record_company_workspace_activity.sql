begin;

-- Company Workspace activity correction:
-- authenticated application sessions must not receive direct INSERT access to
-- notifications or audit_logs. Company creation activity is recorded through a
-- narrow SECURITY DEFINER command that derives the actor from auth.uid(),
-- verifies ownership plus the active founder membership, derives all event
-- content from stored workspace state, and serializes the one allowed event for
-- idempotent concurrent retries.

create or replace function public.record_company_workspace_activity(
  p_activity_kind text,
  p_company_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := auth.uid();
  activity_kind text := lower(btrim(coalesce(p_activity_kind, '')));
  company_name text;
  company_slug text;
  company_category text;
  company_location text;
  company_network_role text;
  profile_email text;
  profile_role text;
  membership_workspace_role text;
  membership_type text;
  membership_procurement_function text;
  membership_job_title text;
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

  if p_company_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'COMPANY_REQUIRED',
      'error_message', 'Company Workspace is required.'
    );
  end if;

  if activity_kind <> 'company_created' then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_ACTIVITY_KIND',
      'error_message', 'Unsupported Company Workspace activity.'
    );
  end if;

  select
    c.name,
    c.slug,
    c.category,
    c.location,
    c.network_role,
    p.email,
    p.role,
    om.workspace_role,
    om.membership_type,
    om.procurement_function,
    om.job_title
  into
    company_name,
    company_slug,
    company_category,
    company_location,
    company_network_role,
    profile_email,
    profile_role,
    membership_workspace_role,
    membership_type,
    membership_procurement_function,
    membership_job_title
  from public.companies c
  join public.profiles p
    on p.id = actor_user_id
   and p.company_id = c.id
  join public.organization_memberships om
    on om.user_id = actor_user_id
   and om.company_id = c.id
  where c.id = p_company_id
    and c.user_id = actor_user_id
    and om.workspace_role = 'owner'
    and om.membership_type = 'founder'
    and om.membership_status = 'active';

  if not found then
    return jsonb_build_object(
      'success', false,
      'error_code', 'COMPANY_WORKSPACE_NOT_AUTHORIZED',
      'error_message', 'The Company Workspace could not be authorized.'
    );
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('company_created:' || p_company_id::text, 0)
  );

  select a.id
  into existing_audit_id
  from public.audit_logs a
  where a.action = 'COMPANY_CREATED'
    and a.entity_type = 'company'
    and a.entity_id = p_company_id
    and a.company_id = p_company_id
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
    'COMPANY_CREATED',
    'company',
    p_company_id,
    actor_user_id,
    p_company_id,
    jsonb_build_object(
      'name', company_name,
      'slug', company_slug,
      'category', company_category,
      'location', company_location,
      'network_role', company_network_role,
      'profile_role', profile_role,
      'workspace_role', membership_workspace_role,
      'membership_type', membership_type,
      'procurement_function', membership_procurement_function,
      'job_title', membership_job_title,
      'owner_email', profile_email
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
    'Company Created',
    coalesce(company_name, 'Company Workspace') ||
      ' workspace was created successfully.',
    'company',
    false,
    p_company_id
  )
  returning id into written_notification_id;

  return jsonb_build_object(
    'success', true,
    'activity_kind', activity_kind,
    'idempotent', false,
    'audit_id', written_audit_id,
    'notification_id', written_notification_id
  );
end;
$$;

comment on function public.record_company_workspace_activity(text, uuid) is
  'Records allowlisted Company Workspace activity for auth.uid(). The caller may supply only the activity kind and company id. The function verifies company ownership plus active founder membership, derives event content from stored workspace state, and preserves direct-write denial on audit_logs and notifications.';

alter function public.record_company_workspace_activity(text, uuid)
  owner to postgres;

revoke all
on function public.record_company_workspace_activity(text, uuid)
from public;

revoke all
on function public.record_company_workspace_activity(text, uuid)
from anon;

grant execute
on function public.record_company_workspace_activity(text, uuid)
to authenticated;

commit;

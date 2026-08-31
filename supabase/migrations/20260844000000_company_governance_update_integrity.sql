-- Nexus Pavilion
-- 7-10D-R47
--
-- DRAFT ONLY. NOT AUTHORIZED FOR DATABASE EXECUTION.
--
-- Proposed final repository path after explicit execution approval:
--   supabase/migrations/20260844000000_company_governance_update_integrity.sql
--
-- Scope:
-- - Company profile updates: name/category/location/network_role.
-- - Company logo binding: logo_url.
-- - Immutable audit evidence must be atomic with the primary company update.
-- - The existing Company Profile Updated product notification remains atomic
--   in this draft so the current product behavior is preserved without
--   restoring direct authenticated INSERT authority.
-- - Permanent company DELETE is explicitly excluded and remains under the
--   separate 7-10D-DELETE retention/lifecycle architecture gate.
--
-- Security posture:
-- - Preserve the intentionally granted authenticated column-level UPDATE
--   privileges for ordinary company fields.
-- - Revalidate active owner/admin membership for authenticated actors inside
--   the trusted trigger boundary.
-- - No authenticated INSERT grant/policy is added for audit_logs or
--   notifications.
-- - Do not reuse record_procurement_activity; procurement and company
--   governance remain separate domains.

begin;

create or replace function public.enforce_company_governance_update_integrity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  actor_user_id uuid := auth.uid();
  actor_email text := nullif(
    lower(btrim(coalesce(auth.jwt() ->> 'email', ''))),
    ''
  );
  actor_workspace_role text;
  actor_membership_type text;

  profile_changed boolean :=
    old.name is distinct from new.name
    or old.category is distinct from new.category
    or old.location is distinct from new.location
    or old.network_role is distinct from new.network_role;

  logo_changed boolean :=
    old.logo_url is distinct from new.logo_url;

  jwt_issuer text;
  project_origin text;
  expected_logo_prefix text;
  logo_path text;
begin
  if not profile_changed and not logo_changed then
    return new;
  end if;

  ---------------------------------------------------------------------------
  -- Authenticated company-governance authority.
  --
  -- RLS remains the primary table authorization layer. This check protects
  -- the trusted side-effect boundary and prevents a permitted ordinary
  -- company-column update from bypassing canonical workspace authority.
  --
  -- auth.uid() = null is reserved for trusted database/service execution.
  -- Such writes remain audited with actor_type=trusted_system.
  ---------------------------------------------------------------------------

  if actor_user_id is not null then
    select
      om.workspace_role,
      om.membership_type
    into
      actor_workspace_role,
      actor_membership_type
    from public.organization_memberships as om
    where om.user_id = actor_user_id
      and om.company_id = new.id
      and om.membership_status = 'active'
      and om.workspace_role in ('owner', 'admin')
    limit 1;

    if not found then
      raise exception
        using
          errcode = '42501',
          message =
            'An active owner or administrator workspace membership is required.';
    end if;
  end if;

  ---------------------------------------------------------------------------
  -- Managed company-logo validation.
  ---------------------------------------------------------------------------

  if logo_changed and new.logo_url is not null then
    if position('?' in new.logo_url) > 0
       or position('#' in new.logo_url) > 0
    then
      raise exception
        using
          errcode = '22023',
          message = 'Company logo URL must not contain a query or fragment.';
    end if;

    logo_path := split_part(
      new.logo_url,
      '/storage/v1/object/public/Company-logos/',
      2
    );

    if logo_path = ''
       or logo_path !~ (
         '^' || new.id::text
         || '/branding/'
         || '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
         || '\.(jpg|jpeg|png|webp)$'
       )
    then
      raise exception
        using
          errcode = '22023',
          message = 'Company logo path is invalid.';
    end if;

    if actor_user_id is not null then
      jwt_issuer := coalesce(auth.jwt() ->> 'iss', '');
      project_origin := regexp_replace(
        jwt_issuer,
        '/auth/v1/?$',
        ''
      );

      if project_origin = '' then
        raise exception
          using
            errcode = '42501',
            message = 'Authenticated project origin is unavailable.';
      end if;

      expected_logo_prefix :=
        project_origin
        || '/storage/v1/object/public/Company-logos/';

      if new.logo_url <> (expected_logo_prefix || logo_path) then
        raise exception
          using
            errcode = '22023',
            message = 'Company logo URL origin or object path is invalid.';
      end if;
    end if;

    if not exists (
      select 1
      from storage.objects as so
      where so.bucket_id = 'Company-logos'
        and so.name = logo_path
        and so.metadata ? 'mimetype'
        and so.metadata ->> 'mimetype' in (
          'image/jpeg',
          'image/png',
          'image/webp'
        )
        and so.metadata ? 'size'
        and nullif(btrim(so.metadata ->> 'size'), '') is not null
        and so.metadata ->> 'size' ~ '^[0-9]+$'
        and (so.metadata ->> 'size')::bigint > 0
        and (so.metadata ->> 'size')::bigint <= 5242880
    ) then
      raise exception
        using
          errcode = '22023',
          message =
            'Company logo Storage object is missing or invalid.';
    end if;
  end if;

  ---------------------------------------------------------------------------
  -- Company profile audit + notification.
  --
  -- Both are intentionally in the same transaction as the primary company
  -- update in this draft. A failure to persist either record rolls back the
  -- protected profile mutation.
  ---------------------------------------------------------------------------

  if profile_changed then
    insert into public.audit_logs (
      action,
      entity_type,
      entity_id,
      user_id,
      company_id,
      metadata
    )
    values (
      'COMPANY_UPDATED',
      'company',
      new.id,
      actor_user_id,
      new.id,
      jsonb_build_object(
        'previous',
        jsonb_build_object(
          'id', old.id,
          'name', old.name,
          'category', old.category,
          'location', old.location,
          'network_role', old.network_role
        ),
        'updated',
        jsonb_build_object(
          'name', new.name,
          'category', new.category,
          'location', new.location,
          'network_role', new.network_role
        ),
        'updated_by',
        case
          when actor_user_id is null then
            jsonb_build_object(
              'id', null,
              'email', null,
              'actor_type', 'trusted_system'
            )
          else
            jsonb_build_object(
              'id', actor_user_id,
              'email', actor_email,
              'workspace_role', actor_workspace_role,
              'membership_type', actor_membership_type
            )
        end,
        'updated_at', now()
      )
    );

    insert into public.notifications (
      title,
      message,
      type,
      is_read,
      company_id
    )
    values (
      'Company Profile Updated',
      new.name || ' workspace profile was updated.',
      'company',
      false,
      new.id
    );
  end if;

  ---------------------------------------------------------------------------
  -- Company logo audit.
  ---------------------------------------------------------------------------

  if logo_changed then
    insert into public.audit_logs (
      action,
      entity_type,
      entity_id,
      user_id,
      company_id,
      metadata
    )
    values (
      'COMPANY_LOGO_UPDATED',
      'company',
      new.id,
      actor_user_id,
      new.id,
      jsonb_build_object(
        'previous_logo_url', old.logo_url,
        'new_logo_url', new.logo_url,
        'updated_by',
        case
          when actor_user_id is null then
            jsonb_build_object(
              'id', null,
              'email', null,
              'actor_type', 'trusted_system'
            )
          else
            jsonb_build_object(
              'id', actor_user_id,
              'email', actor_email,
              'workspace_role', actor_workspace_role,
              'membership_type', actor_membership_type
            )
        end,
        'updated_at', now()
      )
    );
  end if;

  return new;
end;
$function$;

alter function public.enforce_company_governance_update_integrity()
  owner to postgres;

revoke all
on function public.enforce_company_governance_update_integrity()
from public, anon, authenticated;

drop trigger if exists
  enforce_company_governance_update_integrity
on public.companies;

create trigger enforce_company_governance_update_integrity
before update of
  name,
  category,
  location,
  network_role,
  logo_url
on public.companies
for each row
execute function public.enforce_company_governance_update_integrity();

commit;

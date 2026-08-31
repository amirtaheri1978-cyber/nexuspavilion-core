-- Nexus Pavilion
-- 7-10D-DELETE
-- Company workspace archive/reactivation lifecycle contract.
--
-- DRAFT SOURCE ONLY. NOT AUTHORIZED FOR DATABASE EXECUTION.
--
-- Contract:
-- - Physical authenticated deletion of public.companies is disabled.
-- - Operational retirement uses companies.workspace_status = 'archived'.
-- - companies.status remains the independent organization-verification state.
-- - Archive/reactivation is owner-only and audit evidence is atomic.
-- - Pending ownership transfer blocks archive.
-- - Only memberships that were active at archive time become archived;
--   pending/suspended/revoked membership history is preserved.
-- - Reactivation restores only archived memberships to active.
-- - Existing mutation authorization remains active-membership-only.
-- - Explicitly allowlisted read surfaces accept active or archived membership
--   so historical workspace/procurement evidence remains readable.
-- - Existing Workspace Invitation resolver/mutation functions remain unchanged;
--   archived Settings does not invoke the invitation RPC.
-- - Archived companies are removed from public company discovery.
-- - No RFQ/quote/award/representative-verification business semantics are
--   rewritten by this migration.

begin;

-- ---------------------------------------------------------------------------
-- Fail-closed installed-state preflight.
-- ---------------------------------------------------------------------------
do $$
declare
  membership_constraint_definition text;
  delete_policy_qual text;
  insert_policy_check text;
  directory_columns text[];
begin
  select pg_get_constraintdef(c.oid)
  into membership_constraint_definition
  from pg_constraint as c
  join pg_class as t
    on t.oid = c.conrelid
  join pg_namespace as n
    on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'organization_memberships'
    and c.conname = 'organization_memberships_membership_status_check'
    and c.contype = 'c';

  if membership_constraint_definition is null then
    raise exception
      'Expected organization_memberships_membership_status_check is missing.';
  end if;

  if membership_constraint_definition not ilike '%pending%'
     or membership_constraint_definition not ilike '%active%'
     or membership_constraint_definition not ilike '%suspended%'
     or membership_constraint_definition not ilike '%revoked%'
     or membership_constraint_definition ilike '%archived%'
  then
    raise exception
      'Unexpected organization membership status constraint state. Review before lifecycle installation.';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'companies'
      and column_name = 'workspace_status'
  ) then
    raise exception
      'companies.workspace_status is required before lifecycle installation.';
  end if;

  if not exists (
    select 1
    from pg_constraint as c
    join pg_class as t
      on t.oid = c.conrelid
    join pg_namespace as n
      on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'companies'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%workspace_status%archived%'
  ) then
    raise exception
      'companies.workspace_status must already permit archived.';
  end if;

  if has_column_privilege(
    'authenticated',
    'public.companies',
    'workspace_status',
    'UPDATE'
  ) then
    raise exception
      'authenticated unexpectedly has direct UPDATE privilege on companies.workspace_status.';
  end if;

  select with_check
  into insert_policy_check
  from pg_policies
  where schemaname = 'public'
    and tablename = 'companies'
    and policyname = 'Authenticated users can create own company'
    and cmd = 'INSERT';

  if insert_policy_check is null
     or insert_policy_check not ilike '%auth.uid()%user_id%'
     or insert_policy_check ilike '%workspace_status%'
  then
    raise exception
      'Authenticated company INSERT policy no longer matches the reviewed pre-lifecycle shape.';
  end if;

  if exists (
    select 1
    from pg_proc as p
    join pg_namespace as n
      on n.oid = p.pronamespace
    where n.nspname = 'public'
      and (
        (p.proname = 'archive_company_workspace'
          and pg_get_function_identity_arguments(p.oid) = 'p_company_id uuid')
        or (p.proname = 'reactivate_company_workspace'
          and pg_get_function_identity_arguments(p.oid) = 'p_company_id uuid')
        or (p.proname = 'enforce_company_workspace_membership_lifecycle'
          and pg_get_function_identity_arguments(p.oid) = '')
        or (p.proname = 'get_organization_members'
          and pg_get_function_identity_arguments(p.oid) = 'p_company_id uuid')
      )
  ) then
    raise exception
      'A 7-10D-DELETE lifecycle function signature already exists; review before installation.';
  end if;

  if exists (
    select 1
    from pg_trigger as tg
    join pg_class as t
      on t.oid = tg.tgrelid
    join pg_namespace as n
      on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'organization_memberships'
      and not tg.tgisinternal
      and tg.tgname in (
        'enforce_archived_workspace_membership_activation',
        'enforce_company_workspace_membership_lifecycle'
      )
  ) then
    raise exception
      'A workspace lifecycle membership trigger already exists; review before installation.';
  end if;

  select array_agg(c.column_name order by c.ordinal_position)
  into directory_columns
  from information_schema.columns as c
  where c.table_schema = 'public'
    and c.table_name = 'company_directory';

  if directory_columns is distinct from array[
    'id',
    'name',
    'slug',
    'category',
    'location',
    'network_role',
    'logo_url',
    'status',
    'created_at'
  ]::text[] then
    raise exception
      'public.company_directory columns no longer match the reviewed pre-lifecycle view contract.';
  end if;

  if pg_get_viewdef('public.company_directory'::regclass, true) ilike '%workspace_status%' then
    raise exception
      'public.company_directory already contains workspace lifecycle filtering; review before installation.';
  end if;

  select qual
  into delete_policy_qual
  from pg_policies
  where schemaname = 'public'
    and tablename = 'companies'
    and policyname = 'Company owners and admins can delete company'
    and cmd = 'DELETE';

  if delete_policy_qual is null then
    raise exception
      'Expected authenticated company DELETE policy is missing; refusing lifecycle rewrite.';
  end if;

  if delete_policy_qual not ilike '%membership_status%active%'
     or delete_policy_qual not ilike '%workspace_role%owner%admin%'
  then
    raise exception
      'Authenticated company DELETE policy no longer matches the reviewed owner/admin active-membership shape.';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Membership lifecycle state.
-- ---------------------------------------------------------------------------
alter table public.organization_memberships
  drop constraint organization_memberships_membership_status_check;

alter table public.organization_memberships
  add constraint organization_memberships_membership_status_check
  check (
    membership_status in (
      'pending',
      'active',
      'archived',
      'suspended',
      'revoked'
    )
  );

-- Lifecycle/membership concurrency is serialized per company. Membership DML
-- acquires the same transaction advisory lock non-blockingly; if a lifecycle
-- transition already owns it, the membership mutation fails immediately
-- instead of deadlocking behind company->membership lock ordering.
create or replace function public.enforce_company_workspace_membership_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  target_company_id uuid := new.company_id;
  target_workspace_status text;
begin
  if target_company_id is null then
    return new;
  end if;

  if not pg_try_advisory_xact_lock(
    hashtextextended(target_company_id::text, 71046)
  ) then
    raise exception
      using
        errcode = '55P03',
        message = 'Company workspace lifecycle transition is in progress. Retry the membership change.';
  end if;

  if new.membership_status = 'active' then
    select c.workspace_status
    into target_workspace_status
    from public.companies as c
    where c.id = target_company_id;

    if target_workspace_status = 'archived' then
      raise exception
        using
          errcode = '42501',
          message = 'Archived company workspaces cannot activate memberships.';
    end if;
  end if;

  return new;
end;
$function$;

alter function public.enforce_company_workspace_membership_lifecycle()
  owner to postgres;

revoke all
on function public.enforce_company_workspace_membership_lifecycle()
from public, anon, authenticated;

create trigger enforce_company_workspace_membership_lifecycle
before insert or update of membership_status, company_id
on public.organization_memberships
for each row
execute function public.enforce_company_workspace_membership_lifecycle();

-- ---------------------------------------------------------------------------
-- Trusted lifecycle commands.
-- Lock ordering intentionally matches ownership-transfer governance:
-- company row first, then actor membership.
-- ---------------------------------------------------------------------------
create or replace function public.archive_company_workspace(
  p_company_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  actor_user_id uuid := auth.uid();
  actor_email text := nullif(lower(btrim(coalesce(auth.jwt() ->> 'email', ''))), '');
  company_row public.companies%rowtype;
  actor_workspace_role text;
  actor_membership_type text;
begin
  if actor_user_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHENTICATED',
      'error_message', 'Authentication is required.'
    );
  end if;

  if p_company_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'WORKSPACE_NOT_FOUND',
      'error_message', 'Company workspace was not found.'
    );
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_company_id::text, 71046)
  );

  select c.*
  into company_row
  from public.companies as c
  where c.id = p_company_id
  for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error_code', 'WORKSPACE_NOT_FOUND',
      'error_message', 'Company workspace was not found.'
    );
  end if;

  select
    om.workspace_role,
    om.membership_type
  into
    actor_workspace_role,
    actor_membership_type
  from public.organization_memberships as om
  where om.user_id = actor_user_id
    and om.company_id = p_company_id
    and om.membership_status = 'active'
  for update;

  if not found or actor_workspace_role <> 'owner' then
    return jsonb_build_object(
      'success', false,
      'error_code', 'FORBIDDEN',
      'error_message', 'Only the active workspace owner can archive this company workspace.'
    );
  end if;

  if company_row.workspace_status <> 'active' then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_WORKSPACE_STATE',
      'error_message', 'Only an active company workspace can be archived.'
    );
  end if;

  if exists (
    select 1
    from public.ownership_transfer_requests as otr
    where otr.company_id = p_company_id
      and otr.status = 'pending_acceptance'
  ) then
    return jsonb_build_object(
      'success', false,
      'error_code', 'OWNERSHIP_TRANSFER_PENDING',
      'error_message', 'Resolve the pending ownership transfer before archiving this workspace.'
    );
  end if;

  update public.companies
  set workspace_status = 'archived'
  where id = p_company_id;

  update public.organization_memberships
  set membership_status = 'archived'
  where company_id = p_company_id
    and membership_status = 'active';

  insert into public.audit_logs (
    action,
    entity_type,
    entity_id,
    user_id,
    company_id,
    metadata
  )
  values (
    'COMPANY_ARCHIVED',
    'company',
    p_company_id,
    actor_user_id,
    p_company_id,
    jsonb_build_object(
      'company_name', company_row.name,
      'previous_workspace_status', company_row.workspace_status,
      'workspace_status', 'archived',
      'archived_by', jsonb_build_object(
        'id', actor_user_id,
        'email', actor_email,
        'workspace_role', actor_workspace_role,
        'membership_type', actor_membership_type
      ),
      'archived_at', now()
    )
  );

  return jsonb_build_object(
    'success', true,
    'workspace_status', 'archived'
  );
end;
$function$;

alter function public.archive_company_workspace(uuid)
  owner to postgres;

revoke all
on function public.archive_company_workspace(uuid)
from public, anon;

grant execute
on function public.archive_company_workspace(uuid)
to authenticated;

create or replace function public.reactivate_company_workspace(
  p_company_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  actor_user_id uuid := auth.uid();
  actor_email text := nullif(lower(btrim(coalesce(auth.jwt() ->> 'email', ''))), '');
  company_row public.companies%rowtype;
  actor_workspace_role text;
  actor_membership_type text;
begin
  if actor_user_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHENTICATED',
      'error_message', 'Authentication is required.'
    );
  end if;

  if p_company_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'WORKSPACE_NOT_FOUND',
      'error_message', 'Company workspace was not found.'
    );
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_company_id::text, 71046)
  );

  select c.*
  into company_row
  from public.companies as c
  where c.id = p_company_id
  for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error_code', 'WORKSPACE_NOT_FOUND',
      'error_message', 'Company workspace was not found.'
    );
  end if;

  select
    om.workspace_role,
    om.membership_type
  into
    actor_workspace_role,
    actor_membership_type
  from public.organization_memberships as om
  where om.user_id = actor_user_id
    and om.company_id = p_company_id
    and om.membership_status = 'archived'
  for update;

  if not found or actor_workspace_role <> 'owner' then
    return jsonb_build_object(
      'success', false,
      'error_code', 'FORBIDDEN',
      'error_message', 'Only the archived workspace owner can reactivate this company workspace.'
    );
  end if;

  if company_row.workspace_status <> 'archived' then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_WORKSPACE_STATE',
      'error_message', 'Only an archived company workspace can be reactivated.'
    );
  end if;

  update public.companies
  set workspace_status = 'active'
  where id = p_company_id;

  update public.organization_memberships
  set membership_status = 'active'
  where company_id = p_company_id
    and membership_status = 'archived';

  insert into public.audit_logs (
    action,
    entity_type,
    entity_id,
    user_id,
    company_id,
    metadata
  )
  values (
    'COMPANY_REACTIVATED',
    'company',
    p_company_id,
    actor_user_id,
    p_company_id,
    jsonb_build_object(
      'company_name', company_row.name,
      'previous_workspace_status', company_row.workspace_status,
      'workspace_status', 'active',
      'reactivated_by', jsonb_build_object(
        'id', actor_user_id,
        'email', actor_email,
        'workspace_role', actor_workspace_role,
        'membership_type', actor_membership_type
      ),
      'reactivated_at', now()
    )
  );

  return jsonb_build_object(
    'success', true,
    'workspace_status', 'active'
  );
end;
$function$;

alter function public.reactivate_company_workspace(uuid)
  owner to postgres;

revoke all
on function public.reactivate_company_workspace(uuid)
from public, anon;

grant execute
on function public.reactivate_company_workspace(uuid)
to authenticated;

-- ---------------------------------------------------------------------------
-- Disable physical authenticated company deletion.
-- Service-side privileged maintenance is intentionally not granted or revoked
-- here; this contract only removes the authenticated application delete path.
-- ---------------------------------------------------------------------------
drop policy if exists
  "Company owners and admins can delete company"
on public.companies;

revoke delete
on table public.companies
from public, anon, authenticated;

-- Authenticated company creation continues to use the existing active default,
-- but callers may not create a workspace directly in archived lifecycle state.
alter policy "Authenticated users can create own company"
on public.companies
with check (
  auth.uid() is not null
  and user_id = auth.uid()
  and workspace_status = 'active'
);

-- ---------------------------------------------------------------------------
-- Read-only historical access for archived memberships.
-- Mutation policies/functions remain active-membership-only.
-- The exact policy allowlist is intentional and fail-closed.
-- ---------------------------------------------------------------------------
do $$
declare
  target record;
  installed_qual text;
  next_qual text;
  needle constant text := 'membership_status = ''active''::text';
  occurrence_count integer;
begin
  for target in
    select *
    from (
      values
        ('public', 'audit_logs', 'Company members can read company audit logs', 1),
        ('public', 'companies', 'Authenticated users can read created or member companies', 1),
        ('public', 'company_capabilities', 'company_capabilities_select_active_member', 1),
        ('public', 'company_compliance', 'company_compliance_select_active_member', 1),
        ('public', 'company_documents', 'company_documents_select_active_member', 1),
        ('public', 'company_qualifications', 'company_qualifications_select_active_member', 1),
        ('public', 'notifications', 'Company members can read company notifications', 1),
        ('public', 'quotes', 'Company members can read own company quotes', 1),
        ('public', 'quotes', 'Issuing buyers can read quotes after commercial unlock', 1),
        ('public', 'rfq_addenda', 'RFQ participants can read addenda', 2),
        ('public', 'rfq_addendum_acknowledgements', 'Issuer procurement users can read addendum acknowledgements', 1),
        ('public', 'rfq_addendum_acknowledgements', 'Respondent companies can read own addendum acknowledgements', 1),
        ('public', 'rfq_ai_reviews', 'Buyer members can read company RFQ AI reviews', 1),
        ('public', 'rfq_attachments', 'RFQ participants can read attachments', 2),
        ('public', 'rfq_invites', 'Buyer members can read company RFQ invitations', 1),
        ('public', 'rfq_rfis', 'Issuer procurement users can read RFQ RFIs', 1),
        ('public', 'rfq_rfis', 'Respondent companies can read own RFQ RFIs', 1),
        ('public', 'rfqs', 'Authenticated users can read permitted RFQs', 2)
    ) as expected(schemaname, tablename, policyname, expected_occurrences)
  loop
    select p.qual
    into installed_qual
    from pg_policies as p
    where p.schemaname = target.schemaname
      and p.tablename = target.tablename
      and p.policyname = target.policyname
      and p.cmd = 'SELECT';

    if installed_qual is null then
      raise exception
        'Expected lifecycle read policy %.%.% is missing.',
        target.schemaname,
        target.tablename,
        target.policyname;
    end if;

    occurrence_count :=
      (length(installed_qual) - length(replace(installed_qual, needle, '')))
      / length(needle);

    if occurrence_count <> target.expected_occurrences then
      raise exception
        'Lifecycle read policy %.%.% expected % active-membership predicates; found %.',
        target.schemaname,
        target.tablename,
        target.policyname,
        target.expected_occurrences,
        occurrence_count;
    end if;

    next_qual := replace(
      installed_qual,
      needle,
      'membership_status = ANY (ARRAY[''active''::text, ''archived''::text])'
    );

    execute format(
      'alter policy %I on %I.%I using (%s)',
      target.policyname,
      target.schemaname,
      target.tablename,
      next_qual
    );
  end loop;
end
$$;

-- Company-document object reads are retained for archived members, while
-- upload/delete/cleanup policies remain active-membership-only.
do $$
declare
  installed_qual text;
  next_qual text;
  needle constant text := 'membership_status = ''active''::text';
begin
  select p.qual
  into installed_qual
  from pg_policies as p
  where p.schemaname = 'storage'
    and p.tablename = 'objects'
    and p.policyname = 'Company members can read company-documents objects'
    and p.cmd = 'SELECT';

  if installed_qual is null then
    raise exception
      'Expected Company-documents member read policy is missing.';
  end if;

  if (
    (length(installed_qual) - length(replace(installed_qual, needle, '')))
    / length(needle)
  ) <> 1 then
    raise exception
      'Expected Company-documents member read policy to contain exactly one active-membership predicate.';
  end if;

  next_qual := replace(
    installed_qual,
    needle,
    'membership_status = ANY (ARRAY[''active''::text, ''archived''::text])'
  );

  execute format(
    'alter policy %I on storage.objects using (%s)',
    'Company members can read company-documents objects',
    next_qual
  );
end
$$;

-- ---------------------------------------------------------------------------
-- Explicit company-scoped member history read for Settings lifecycle.
-- The existing no-argument get_organization_members() function is intentionally
-- left unchanged so current active-workspace behavior elsewhere is preserved.
-- Workspace Invitation resolver/read/mutation functions are also untouched.
-- ---------------------------------------------------------------------------
create or replace function public.get_organization_members(
  p_company_id uuid
)
returns table(
  membership_id uuid,
  user_id uuid,
  company_id uuid,
  email text,
  legacy_role text,
  profile_created_at timestamp with time zone,
  workspace_role text,
  procurement_function text,
  membership_type text,
  membership_status text,
  joined_at timestamp with time zone,
  role_changed_at timestamp with time zone,
  membership_created_at timestamp with time zone,
  membership_updated_at timestamp with time zone,
  first_name text,
  last_name text,
  job_title text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  actor_user_id uuid := auth.uid();
  actor_membership_status text;
begin
  if actor_user_id is null then
    raise exception
      'Authentication is required.'
      using errcode = '42501';
  end if;

  if p_company_id is null then
    raise exception
      'A company workspace is required.'
      using errcode = '42501';
  end if;

  select om.membership_status
  into actor_membership_status
  from public.organization_memberships as om
  where om.user_id = actor_user_id
    and om.company_id = p_company_id
    and om.membership_status in ('active', 'archived')
  limit 1;

  if actor_membership_status is null then
    raise exception
      'An active or archived workspace membership is required.'
      using errcode = '42501';
  end if;

  return query
  select
    om.id as membership_id,
    om.user_id,
    om.company_id,
    p.email,
    p.role as legacy_role,
    p.created_at as profile_created_at,
    om.workspace_role,
    om.procurement_function,
    om.membership_type,
    om.membership_status,
    om.joined_at,
    om.role_changed_at,
    om.created_at as membership_created_at,
    om.updated_at as membership_updated_at,
    p.first_name,
    p.last_name,
    om.job_title
  from public.organization_memberships as om
  join public.profiles as p
    on p.id = om.user_id
  where om.company_id = p_company_id
    and om.membership_status = actor_membership_status
  order by
    case om.workspace_role
      when 'owner' then 1
      when 'admin' then 2
      when 'member' then 3
      when 'viewer' then 4
      else 5
    end,
    lower(coalesce(p.email, '')),
    om.created_at;
end;
$function$;

alter function public.get_organization_members(uuid)
  owner to postgres;

revoke all
on function public.get_organization_members(uuid)
from public, anon;

grant execute
on function public.get_organization_members(uuid)
to authenticated;

-- Preserve selective supplier history without reopening archived mutation
-- paths. The shared helper is used by both reads and writes, but every write
-- policy that calls it independently requires an active membership. Only the
-- quote-participation membership predicate is widened here.
do $$
declare
  function_oid oid;
  function_definition text;
  next_definition text;
  needle constant text := 'om.membership_status = ''active''';
  occurrence_count integer;
begin
  select p.oid
  into function_oid
  from pg_proc as p
  join pg_namespace as n
    on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'current_user_has_supplier_rfq_access'
    and pg_get_function_identity_arguments(p.oid) = 'p_rfq_id uuid';

  if function_oid is null then
    raise exception
      'Expected current_user_has_supplier_rfq_access(p_rfq_id uuid) is missing.';
  end if;

  function_definition := pg_get_functiondef(function_oid);
  occurrence_count :=
    (length(function_definition) - length(replace(function_definition, needle, '')))
    / length(needle);

  if occurrence_count <> 1 then
    raise exception
      'Expected exactly one active-membership predicate in current_user_has_supplier_rfq_access; found %.',
      occurrence_count;
  end if;

  if (
    select count(*)
    from pg_policies as policy
    where policy.schemaname = 'public'
      and policy.cmd <> 'SELECT'
      and (
        coalesce(policy.qual, '') ilike '%current_user_has_supplier_rfq_access%'
        or coalesce(policy.with_check, '') ilike '%current_user_has_supplier_rfq_access%'
      )
  ) <> 3 then
    raise exception
      'Unexpected non-SELECT policy count for current_user_has_supplier_rfq_access; review before lifecycle installation.';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'quotes'
      and policyname = 'Supplier members can submit company quotes'
      and cmd = 'INSERT'
  ) or not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'rfq_addendum_acknowledgements'
      and policyname = 'Respondent companies can acknowledge required addenda'
      and cmd = 'INSERT'
  ) or not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'rfq_rfis'
      and policyname = 'Respondent companies can submit RFQ RFIs'
      and cmd = 'INSERT'
  ) then
    raise exception
      'Expected supplier write-policy allowlist no longer matches installed state.';
  end if;

  if exists (
    select 1
    from pg_policies as policy
    where policy.schemaname = 'public'
      and policy.cmd <> 'SELECT'
      and (
        coalesce(policy.qual, '') ilike '%current_user_has_supplier_rfq_access%'
        or coalesce(policy.with_check, '') ilike '%current_user_has_supplier_rfq_access%'
      )
      and position(
        'membership_status = ''active''::text' in
        coalesce(policy.qual, '') || ' ' || coalesce(policy.with_check, '')
      ) = 0
  ) then
    raise exception
      'A non-SELECT policy uses current_user_has_supplier_rfq_access without an independent active-membership predicate.';
  end if;

  next_definition := replace(
    function_definition,
    needle,
    'om.membership_status in (''active'', ''archived'')'
  );

  execute next_definition;
end
$$;

-- Archived workspaces remain internally readable but leave public discovery.
create or replace view public.company_directory
with (security_invoker = false) as
select
  id,
  name,
  slug,
  category,
  location,
  network_role,
  logo_url,
  status,
  created_at
from public.companies
where workspace_status <> 'archived';

comment on column public.companies.workspace_status is
  'Operational lifecycle state of the company workspace. Separate from companies.status, which currently represents organization verification state.';

commit;

-- Nexus Pavilion
-- 7-10D-LOGO
--
-- DRAFT ONLY. NOT AUTHORIZED FOR DATABASE EXECUTION.
--
-- Proposed final repository path after explicit execution approval:
--   supabase/migrations/20260843000000_company_logo_storage_contract.sql
--
-- Contract:
-- - Preserve public delivery for company logos.
-- - New managed objects use:
--     <company_id>/branding/<uuid>.(jpg|jpeg|png|webp)
-- - Authenticated Storage access is limited to active owner/admin members of
--   the company encoded in the first path segment.
-- - New uploads are immutable: the application uses upsert=false and this
--   migration creates no UPDATE policy.
-- - Managed uploads are capped at 5 MiB and JPEG/PNG/WebP.
-- - Authenticated DELETE cannot remove the object currently referenced by
--   companies.logo_url.
-- - No existing legacy/orphan object is deleted or rewritten here.

begin;

do $$
begin
  if not exists (
    select 1
    from storage.buckets
    where id = 'Company-logos'
  ) then
    raise exception
      'Company-logos bucket is required before installing the logo storage contract.';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname not in (
        'Company owners and admins can read Company-logos objects',
        'Company owners and admins can upload Company-logos objects',
        'Company owners and admins can delete unbound Company-logos objects'
      )
      and (
        coalesce(qual, '') ilike '%Company-logos%'
        or coalesce(with_check, '') ilike '%Company-logos%'
      )
  ) then
    raise exception
      'Unexpected existing Company-logos Storage policy detected. Review installed policy state before proceeding.';
  end if;
end
$$;

update storage.buckets
set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp'
  ]::text[]
where id = 'Company-logos';

drop policy if exists
  "Company owners and admins can read Company-logos objects"
on storage.objects;

drop policy if exists
  "Company owners and admins can upload Company-logos objects"
on storage.objects;

drop policy if exists
  "Company owners and admins can delete unbound Company-logos objects"
on storage.objects;

create policy
  "Company owners and admins can read Company-logos objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'Company-logos'
  and (storage.foldername(name))[2] = 'branding'
  and name ~ (
    '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
    || '/branding/'
    || '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
    || '\.(jpg|jpeg|png|webp)$'
  )
  and exists (
    select 1
    from public.organization_memberships as om
    where om.user_id = auth.uid()
      and om.company_id::text = (storage.foldername(name))[1]
      and om.membership_status = 'active'
      and om.workspace_role in ('owner', 'admin')
  )
);

create policy
  "Company owners and admins can upload Company-logos objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'Company-logos'
  and (storage.foldername(name))[2] = 'branding'
  and name ~ (
    '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
    || '/branding/'
    || '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
    || '\.(jpg|jpeg|png|webp)$'
  )
  and exists (
    select 1
    from public.organization_memberships as om
    where om.user_id = auth.uid()
      and om.company_id::text = (storage.foldername(name))[1]
      and om.membership_status = 'active'
      and om.workspace_role in ('owner', 'admin')
  )
);

create policy
  "Company owners and admins can delete unbound Company-logos objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'Company-logos'
  and (storage.foldername(name))[2] = 'branding'
  and name ~ (
    '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
    || '/branding/'
    || '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
    || '\.(jpg|jpeg|png|webp)$'
  )
  and exists (
    select 1
    from public.organization_memberships as om
    where om.user_id = auth.uid()
      and om.company_id::text = (storage.foldername(name))[1]
      and om.membership_status = 'active'
      and om.workspace_role in ('owner', 'admin')
  )
  and not exists (
    select 1
    from public.companies as c
    where c.id::text = (storage.foldername(name))[1]
      and c.logo_url is not null
      and c.logo_url like (
        '%/storage/v1/object/public/Company-logos/' || name
      )
  )
);

-- Intentionally no UPDATE policy for Company-logos.
-- The application must use immutable object names with upsert=false.

commit;

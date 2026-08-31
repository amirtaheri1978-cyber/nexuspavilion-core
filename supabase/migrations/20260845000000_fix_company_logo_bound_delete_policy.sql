-- Nexus Pavilion
-- 7-10D-LOGO forward remediation
--
-- Purpose:
-- - Preserve the immutable migration history of
--   20260843000000_company_logo_storage_contract.sql.
-- - Correct the installed Company-logos DELETE-policy correlation so the
--   currently bound company logo cannot be deleted by authenticated cleanup.
-- - Reproduce the targeted remediation already verified on nexus-pavilion-dev.
-- - Remain safe when the equivalent remediation is already installed: the
--   reviewed policy is validated, then recreated in its canonical form.
--
-- Scope exclusions:
-- - No bucket creation.
-- - No Storage UPDATE policy.
-- - No broad Storage grants.
-- - No audit/notification grants.
-- - No legacy/orphan object deletion.
-- - No company profile, ownership, Representative Verification, procurement,
--   or permanent-delete lifecycle changes.

begin;

do $$
declare
  installed_qual text;
  installed_cmd text;
  installed_roles name[];
  legacy_shape boolean;
  remediated_shape boolean;
begin
  select
    qual,
    cmd,
    roles
  into
    installed_qual,
    installed_cmd,
    installed_roles
  from pg_policies
  where schemaname = 'storage'
    and tablename = 'objects'
    and policyname = 'Company owners and admins can delete unbound Company-logos obje';

  if installed_qual is null then
    raise exception
      'Expected Company-logos DELETE policy is not installed; refusing forward remediation.';
  end if;

  if installed_cmd <> 'DELETE'
     or installed_roles <> array['authenticated'::name]
  then
    raise exception
      'Installed Company-logos DELETE policy command/role state differs from the reviewed contract.';
  end if;

  legacy_shape :=
    installed_qual like '%storage.foldername(c.name)%'
    and installed_qual like '%|| c.name%';

  remediated_shape :=
    installed_qual like '%storage.foldername(objects.name)%'
    and installed_qual like '%|| objects.name%'
    and installed_qual not like '%storage.foldername(c.name)%';

  if not legacy_shape and not remediated_shape then
    raise exception
      'Installed Company-logos DELETE policy no longer matches the reviewed legacy or remediated shape.';
  end if;
end
$$;

-- PostgreSQL identifiers are limited to 63 bytes. The original longer policy
-- name was automatically truncated to this exact installed identifier.
drop policy if exists
  "Company owners and admins can delete unbound Company-logos obje"
on storage.objects;

create policy
  "Company owners and admins can delete unbound Company-logos obje"
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
      and om.company_id::text = (storage.foldername(storage.objects.name))[1]
      and om.membership_status = 'active'
      and om.workspace_role in ('owner', 'admin')
  )
  and not exists (
    select 1
    from public.companies as c
    where c.id::text = (storage.foldername(storage.objects.name))[1]
      and c.logo_url is not null
      and c.logo_url like (
        '%/storage/v1/object/public/Company-logos/' || storage.objects.name
      )
  )
);

-- Intentionally no UPDATE policy for Company-logos.
-- No grants are changed by this forward remediation.

commit;

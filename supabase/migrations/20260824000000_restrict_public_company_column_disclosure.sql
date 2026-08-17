begin;

-- Public directory remains intentional. The companies table itself must not
-- expose owner UUID or workspace lifecycle state to anonymous or
-- cross-company directory reads.

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
from public.companies;

comment on view public.company_directory is
  'Public company directory surface. Exposes only intentional directory columns; does not include user_id or workspace_status.';

revoke all on table public.company_directory from public, anon, authenticated, service_role;
grant select on table public.company_directory to anon, authenticated, service_role;

revoke select on table public.companies from public;
revoke select on table public.companies from anon;

drop policy if exists "Public can read companies" on public.companies;

create policy "Authenticated users can read created or member companies"
on public.companies
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.organization_memberships om
    where om.user_id = auth.uid()
      and om.company_id = companies.id
      and om.membership_status = 'active'
  )
);

commit;

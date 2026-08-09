begin;

-- Section 3 canonical company authorization correction.
-- This additive migration supersedes legacy profile-role checks without
-- rewriting deployed migration history.

alter table public.companies
enable row level security;

drop policy if exists "Public can read companies"
on public.companies;

drop policy if exists "Authenticated users can create own company"
on public.companies;

drop policy if exists "Company owners and admins can update company"
on public.companies;

drop policy if exists "Company owners and admins can delete company"
on public.companies;

create policy "Public can read companies"
on public.companies
for select
to public
using (true);

create policy "Authenticated users can create own company"
on public.companies
for insert
to authenticated
with check (
  auth.uid() is not null
  and user_id = auth.uid()
);

create policy "Company owners and admins can update company"
on public.companies
for update
to authenticated
using (
  exists (
    select 1
    from public.organization_memberships om
    where om.user_id = auth.uid()
      and om.company_id = companies.id
      and om.membership_status = 'active'
      and om.workspace_role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.organization_memberships om
    where om.user_id = auth.uid()
      and om.company_id = companies.id
      and om.membership_status = 'active'
      and om.workspace_role in ('owner', 'admin')
  )
);

create policy "Company owners and admins can delete company"
on public.companies
for delete
to authenticated
using (
  exists (
    select 1
    from public.organization_memberships om
    where om.user_id = auth.uid()
      and om.company_id = companies.id
      and om.membership_status = 'active'
      and om.workspace_role in ('owner', 'admin')
  )
);

commit;

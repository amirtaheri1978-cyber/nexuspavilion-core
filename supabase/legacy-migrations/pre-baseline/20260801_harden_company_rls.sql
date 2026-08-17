begin;

drop policy if exists "Allow public insert companies"
on public.companies;

drop policy if exists "Allow public update companies"
on public.companies;

drop policy if exists "Allow public delete companies"
on public.companies;

drop policy if exists "Allow public read companies"
on public.companies;

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
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = companies.id
      and p.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = companies.id
      and p.role in ('owner', 'admin')
  )
);

create policy "Company owners and admins can delete company"
on public.companies
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = companies.id
      and p.role in ('owner', 'admin')
  )
);

commit;
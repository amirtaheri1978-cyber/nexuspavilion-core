begin;

alter table public.companies
add column if not exists workspace_status text;

update public.companies
set workspace_status = 'active'
where workspace_status is null;

alter table public.companies
alter column workspace_status set default 'active';

alter table public.companies
alter column workspace_status set not null;

alter table public.companies
drop constraint if exists companies_workspace_status_check;

alter table public.companies
add constraint companies_workspace_status_check
check (
  workspace_status in (
    'setup',
    'active',
    'restricted',
    'suspended',
    'archived'
  )
);

comment on column public.companies.workspace_status is
  'Operational lifecycle state of the company workspace. Separate from companies.status, which currently represents organization verification state.';

commit;
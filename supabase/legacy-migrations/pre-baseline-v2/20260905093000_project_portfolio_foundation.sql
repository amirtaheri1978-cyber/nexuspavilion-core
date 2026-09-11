begin;

/*
 * Nexus Pavilion 9-01 — Project Portfolio foundation.
 *
 * Draft only. Do not execute without a separate database execution authorization.
 *
 * Project is an independent company-owned business entity. This migration
 * intentionally does not create Project↔RFQ/Award relationships or project
 * status/risk signals; those belong to 9-02 and 9-03.
 */

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  created_by uuid references public.profiles(id) on delete set null,
  name text not null,
  project_code text,
  owner_client text,
  location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint projects_name_not_blank_check
    check (char_length(btrim(name)) > 0),

  constraint projects_name_length_check
    check (char_length(name) <= 180),

  constraint projects_project_code_not_blank_check
    check (project_code is null or char_length(btrim(project_code)) > 0),

  constraint projects_project_code_length_check
    check (project_code is null or char_length(project_code) <= 80),

  constraint projects_owner_client_length_check
    check (owner_client is null or char_length(owner_client) <= 180),

  constraint projects_location_length_check
    check (location is null or char_length(location) <= 180)
);

create index if not exists projects_company_recency_idx
  on public.projects (company_id, updated_at desc, created_at desc, id);

create unique index if not exists projects_company_project_code_unique_idx
  on public.projects (
    company_id,
    lower(regexp_replace(btrim(project_code), '\s+', ' ', 'g'))
  )
  where project_code is not null
    and char_length(btrim(project_code)) > 0;

alter table public.projects enable row level security;

create policy projects_select_active_company_member
  on public.projects
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.organization_memberships as om
      where om.user_id = auth.uid()
        and om.company_id = projects.company_id
        and om.membership_status = 'active'
    )
  );

create policy projects_insert_company_manager
  on public.projects
  for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1
      from public.organization_memberships as om
      where om.user_id = auth.uid()
        and om.company_id = projects.company_id
        and om.membership_status = 'active'
        and om.workspace_role in ('owner', 'admin')
    )
  );

revoke all on table public.projects from public;
revoke all on table public.projects from anon;
revoke update, delete on table public.projects from authenticated;
grant select, insert on table public.projects to authenticated;

/*
 * Conservative deterministic seed from existing RFQ metadata.
 *
 * A Project is synthesized only when both project_name and internal_project_id
 * are non-empty for an RFQ. The company-scoped normalized internal project ID
 * is the strong migration key. The most recent RFQ provides representative
 * metadata. Name-only RFQs are intentionally not synthesized.
 *
 * No RFQ row is changed or linked in 9-01.
 */
with ranked_project_sources as (
  select
    r.company_id,
    regexp_replace(btrim(r.project_name), '\s+', ' ', 'g') as project_name,
    regexp_replace(btrim(r.internal_project_id), '\s+', ' ', 'g') as project_code,
    nullif(regexp_replace(btrim(coalesce(r.owner_client, '')), '\s+', ' ', 'g'), '') as owner_client,
    nullif(regexp_replace(btrim(coalesce(r.location, '')), '\s+', ' ', 'g'), '') as location,
    r.created_at,
    row_number() over (
      partition by
        r.company_id,
        lower(regexp_replace(btrim(r.internal_project_id), '\s+', ' ', 'g'))
      order by r.created_at desc, r.id desc
    ) as source_rank
  from public.rfqs as r
  where r.company_id is not null
    and nullif(btrim(coalesce(r.project_name, '')), '') is not null
    and nullif(btrim(coalesce(r.internal_project_id, '')), '') is not null
)
insert into public.projects (
  company_id,
  created_by,
  name,
  project_code,
  owner_client,
  location,
  created_at,
  updated_at
)
select
  source.company_id,
  null,
  source.project_name,
  source.project_code,
  source.owner_client,
  source.location,
  source.created_at,
  source.created_at
from ranked_project_sources as source
where source.source_rank = 1
on conflict do nothing;

comment on table public.projects is
  'Company-owned Project Portfolio records independent from RFQ containers.';

comment on column public.projects.project_code is
  'Optional company-internal project identifier. Unique within a company when present.';

comment on column public.projects.created_by is
  'Authenticated creator when user-created; null is permitted for deterministic migration-created records.';

commit;

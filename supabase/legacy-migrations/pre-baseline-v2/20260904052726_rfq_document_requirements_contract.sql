-- Nexus Pavilion — Phase 8 / Task 8-08 Missing Document Checks
-- Contract v2
-- Applied to nexus-pavilion-dev as migration 20260904052726.
--
-- Scope:
--   Current-state issuer-declared RFQ procurement-package required document
--   categories, evaluated against governed public.rfq_attachments rows.
--
-- Explicitly NOT modeled here:
--   respondent quote attachments; NDA/bond/insurance controls; private
--   company_documents; content-quality/compliance inference; attachment
--   revision supersession; immutable historical bid-package snapshots.
--
-- Backward compatibility:
--   No backfill. Existing RFQs begin with zero declared document requirements.

begin;

create table public.rfq_document_requirements (
  id uuid primary key default gen_random_uuid(),

  rfq_id uuid not null
    references public.rfqs (id)
    on delete cascade,

  attachment_type text not null,

  created_by uuid not null
    default auth.uid()
    references public.profiles (id)
    on delete restrict,

  created_at timestamptz not null
    default now(),

  constraint rfq_document_requirements_attachment_type_check
    check (
      attachment_type = any (
        array[
          'drawing'::text,
          'specification'::text,
          'boq'::text,
          'photo'::text,
          'addenda'::text,
          'supporting'::text
        ]
      )
    ),

  constraint rfq_document_requirements_rfq_attachment_type_unique
    unique (rfq_id, attachment_type)
);

comment on table public.rfq_document_requirements is
  'Issuer-declared current-state RFQ procurement-package required attachment categories. '
  'A row means the attachment category is declared required for that RFQ. '
  'Coverage is evaluated separately against current governed rfq_attachments. '
  'This table does not assert document content validity, contractual compliance, '
  'revision supersession, or immutable historical package state.';

comment on column public.rfq_document_requirements.attachment_type is
  'Required RFQ package attachment category. Must match the governed rfq_attachments attachment_type taxonomy exactly.';

comment on column public.rfq_document_requirements.created_by is
  'Authenticated actor who declared the requirement. Authenticated clients cannot supply this column directly.';

create index rfq_document_requirements_created_by_idx
  on public.rfq_document_requirements (created_by);

alter table public.rfq_document_requirements
  enable row level security;

create policy "RFQ participants can read document requirements"
on public.rfq_document_requirements
for select
to authenticated
using (
  exists (
    select 1
    from public.rfqs as r
    where r.id = rfq_document_requirements.rfq_id
  )
);

create policy "Issuer procurement users can declare document requirements"
on public.rfq_document_requirements
for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and exists (
    select 1
    from public.rfqs as r
    join public.organization_memberships as om
      on om.company_id = r.company_id
    where r.id = rfq_document_requirements.rfq_id
      and om.user_id = (select auth.uid())
      and om.membership_status = 'active'
      and (
        om.workspace_role in ('owner', 'admin')
        or om.procurement_function = 'buyer'
      )
  )
);

create policy "Issuer procurement users can remove document requirements"
on public.rfq_document_requirements
for delete
to authenticated
using (
  exists (
    select 1
    from public.rfqs as r
    join public.organization_memberships as om
      on om.company_id = r.company_id
    where r.id = rfq_document_requirements.rfq_id
      and om.user_id = (select auth.uid())
      and om.membership_status = 'active'
      and (
        om.workspace_role in ('owner', 'admin')
        or om.procurement_function = 'buyer'
      )
  )
);

revoke all
on table public.rfq_document_requirements
from public;

revoke all
on table public.rfq_document_requirements
from anon;

revoke all
on table public.rfq_document_requirements
from authenticated;

grant select
on table public.rfq_document_requirements
to authenticated;

grant insert (rfq_id, attachment_type)
on table public.rfq_document_requirements
to authenticated;

grant delete
on table public.rfq_document_requirements
to authenticated;

grant all
on table public.rfq_document_requirements
to service_role;

commit;

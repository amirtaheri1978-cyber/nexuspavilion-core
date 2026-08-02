begin;

-- RFC-001
-- INV-001
-- A company may have at most one active owner.

create unique index if not exists
  organization_memberships_one_active_owner_per_company
on public.organization_memberships (company_id)
where
  workspace_role = 'owner'
  and membership_status = 'active';

commit;
-- Nexus Pavilion — Phase 14 / Task 14-07
-- Purpose-bound Contract Award Supplier notification recipient resolution.
--
-- SECURITY DEFINER is required so an authorized issuing-company awarder can
-- resolve only the awarded Quote submitter's profiles.email without loosening
-- profiles RLS or introducing a generic profile/email lookup RPC.
--
-- Returns a single email text column derived exclusively from
-- quotes.user_id → profiles.id after verifying:
--   - authenticated caller
--   - Quote is the RFQ awarded Quote (decision = awarded, awarded_quote_id match)
--   - RFQ is in awarded terminal status
--   - Supplier company differs from issuing company
--   - caller is an ACTIVE issuing-company owner/admin (award authority)
--   - issuing company status = verified and workspace_status = active
--   - submitter has an ACTIVE membership on the awarded Supplier company

begin;

create or replace function public.resolve_rfq_award_notification_recipient(
  p_quote_id uuid
)
returns table (
  email text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'Unauthorized';
  end if;

  if p_quote_id is null then
    return;
  end if;

  return query
  select nullif(lower(btrim(p.email)), '')::text
  from public.quotes as q
  join public.rfqs as r
    on r.id = q.rfq_id
   and r.awarded_quote_id = q.id
   and r.status = 'awarded'
  join public.companies as issuer_company
    on issuer_company.id = r.company_id
   and issuer_company.status = 'verified'
   and issuer_company.workspace_status = 'active'
  join public.organization_memberships as issuer_om
    on issuer_om.company_id = r.company_id
   and issuer_om.user_id = v_uid
   and issuer_om.membership_status = 'active'
   and issuer_om.workspace_role in ('owner', 'admin')
  join public.organization_memberships as supplier_om
    on supplier_om.company_id = q.company_id
   and supplier_om.user_id = q.user_id
   and supplier_om.membership_status = 'active'
  join public.profiles as p
    on p.id = q.user_id
  where q.id = p_quote_id
    and q.decision = 'awarded'
    and q.user_id is not null
    and q.company_id is not null
    and q.company_id <> r.company_id
  limit 1;
end;
$$;

comment on function public.resolve_rfq_award_notification_recipient(uuid) is
  'Purpose-bound SECURITY DEFINER helper for Contract Award Supplier email '
  'notification. Returns only the awarded Quote submitter email after verifying '
  'the Quote is the RFQ awarded Quote, the RFQ is awarded, the Supplier company '
  'differs from the issuing company, the issuing company is verified with an '
  'active workspace, the caller is an active issuing-company owner/admin, and '
  'the submitter holds an active membership on the awarded Supplier company. '
  'Does not accept caller-supplied user IDs, company IDs, or email addresses and '
  'does not provide generic profile/email lookup.';

revoke all
on function public.resolve_rfq_award_notification_recipient(uuid)
from public;

revoke all
on function public.resolve_rfq_award_notification_recipient(uuid)
from anon;

grant execute
on function public.resolve_rfq_award_notification_recipient(uuid)
to authenticated;

commit;

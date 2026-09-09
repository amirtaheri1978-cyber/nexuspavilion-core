-- Nexus Pavilion — Phase 14 / Task 14-04
-- Purpose-bound RFI response notification recipient resolution.
--
-- SECURITY DEFINER is required so an authorized issuer responder can resolve
-- only the original submitter's profiles.email without loosening profiles RLS
-- or introducing a generic profile/email lookup RPC.
--
-- Returns a single email text column derived exclusively from
-- rfq_rfis.submitted_by → profiles.id after verifying:
--   - authenticated caller
--   - RFI exists and status = 'answered'
--   - responded_by = auth.uid()
--   - caller is an ACTIVE issuing-company owner/admin or buyer

begin;

create or replace function public.resolve_rfi_response_notification_recipient(
  p_rfi_id uuid
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

  if p_rfi_id is null then
    return;
  end if;

  return query
  select nullif(lower(btrim(p.email)), '')::text
  from public.rfq_rfis as rfi
  join public.rfqs as r
    on r.id = rfi.rfq_id
  join public.organization_memberships as om
    on om.company_id = r.company_id
   and om.user_id = v_uid
   and om.membership_status = 'active'
   and (
     om.workspace_role in ('owner', 'admin')
     or om.procurement_function = 'buyer'
   )
  join public.profiles as p
    on p.id = rfi.submitted_by
  where rfi.id = p_rfi_id
    and rfi.status = 'answered'
    and rfi.responded_by = v_uid
  limit 1;
end;
$$;

comment on function public.resolve_rfi_response_notification_recipient(uuid) is
  'Purpose-bound SECURITY DEFINER helper for private RFI response notification. '
  'Returns only the original submitter email after verifying the caller answered '
  'the RFI and is an active issuing-company owner/admin or buyer. Does not accept '
  'caller-supplied user IDs, company IDs, or email addresses.';

revoke all
on function public.resolve_rfi_response_notification_recipient(uuid)
from public;

revoke all
on function public.resolve_rfi_response_notification_recipient(uuid)
from anon;

grant execute
on function public.resolve_rfi_response_notification_recipient(uuid)
to authenticated;

commit;

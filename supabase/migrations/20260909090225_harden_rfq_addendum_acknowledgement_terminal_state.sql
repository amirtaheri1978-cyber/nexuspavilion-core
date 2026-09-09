-- Nexus Pavilion — Phase 14 / Task 14-08
-- Defense-in-depth: harden RFQ Addendum acknowledgement INSERT policy for
-- terminal RFQ state (deadline passed / awarded), while preserving the existing
-- open-status, membership, sourcing, and requires_acknowledgement predicates.
--
-- Does not modify SELECT policies, grants, table schema, or invitation RPCs.

begin;

drop policy if exists "Respondent companies can acknowledge required addenda"
on public.rfq_addendum_acknowledgements;

create policy "Respondent companies can acknowledge required addenda"
on public.rfq_addendum_acknowledgements
for insert
to authenticated
with check (
  exists (
    select 1
    from public.organization_memberships om
    where om.user_id = auth.uid()
      and om.company_id = rfq_addendum_acknowledgements.company_id
      and om.membership_status = 'active'
  )
  and exists (
    select 1
    from public.rfqs r
    where r.id = rfq_addendum_acknowledgements.rfq_id
      and r.status = 'open'
      and r.awarded_quote_id is null
      and r.awarded_at is null
      and public.parse_rfq_deadline_timestamptz(r.deadline) is not null
      and now() <= public.parse_rfq_deadline_timestamptz(r.deadline)
      and r.company_id <> rfq_addendum_acknowledgements.company_id
      and (
        r.sourcing_method = 'open'
        or public.current_user_has_supplier_rfq_access(r.id)
      )
  )
  and exists (
    select 1
    from public.rfq_addenda a
    where a.id = rfq_addendum_acknowledgements.addendum_id
      and a.rfq_id = rfq_addendum_acknowledgements.rfq_id
      and a.requires_acknowledgement = true
  )
);

commit;

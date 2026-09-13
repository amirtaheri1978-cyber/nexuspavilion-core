begin;

drop policy if exists "Issuing buyers can read quotes after commercial unlock"
  on public.quotes;

create policy "Issuing buyers can read quotes after commercial unlock"
on public.quotes
for select
to authenticated
using (
  exists (
    select 1
    from public.rfqs r
    join public.organization_memberships om
      on om.company_id = r.company_id
    where r.id = quotes.rfq_id
      and om.user_id = auth.uid()
      and om.membership_status in ('active', 'archived')
      and (
        om.workspace_role in ('owner', 'admin')
        or om.procurement_function = 'buyer'
      )
      and public.parse_rfq_deadline_timestamptz(r.deadline) is not null
      and public.parse_rfq_deadline_timestamptz(r.deadline) < now()
  )
);

drop policy if exists "Workspace administrators can update RFQ quote decisions"
  on public.quotes;

create policy "Workspace administrators can update RFQ quote decisions"
on public.quotes
for update
to authenticated
using (
  exists (
    select 1
    from public.rfqs r
    join public.organization_memberships om
      on om.company_id = r.company_id
    where r.id = quotes.rfq_id
      and om.user_id = auth.uid()
      and om.membership_status = 'active'
      and om.workspace_role in ('owner', 'admin')
      and public.parse_rfq_deadline_timestamptz(r.deadline) is not null
      and public.parse_rfq_deadline_timestamptz(r.deadline) < now()
  )
)
with check (
  exists (
    select 1
    from public.rfqs r
    join public.organization_memberships om
      on om.company_id = r.company_id
    where r.id = quotes.rfq_id
      and om.user_id = auth.uid()
      and om.membership_status = 'active'
      and om.workspace_role in ('owner', 'admin')
      and public.parse_rfq_deadline_timestamptz(r.deadline) is not null
      and public.parse_rfq_deadline_timestamptz(r.deadline) < now()
  )
);

commit;

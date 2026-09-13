create or replace function public.resolve_rfq_award_notification_recipient(p_quote_id uuid)
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
    and public.parse_rfq_deadline_timestamptz(r.deadline) is not null
    and public.parse_rfq_deadline_timestamptz(r.deadline) < now()
  limit 1;
end;
$$;

comment on function public.resolve_rfq_award_notification_recipient(uuid) is
  'Purpose-bound SECURITY DEFINER helper for Contract Award Supplier email notification. Returns only the awarded Quote submitter email after strict deadline-based commercial opening, after verifying the Quote is the RFQ awarded Quote, the RFQ is awarded, the Supplier company differs from the issuing company, the issuing company is verified with an active workspace, the caller is an active issuing-company owner/admin, and the submitter holds an active membership on the awarded Supplier company. Does not accept caller-supplied user IDs, company IDs, or email addresses and does not provide generic profile/email lookup.';

create or replace function public.resolve_rfq_addendum_notification_recipients(p_addendum_id uuid)
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

  if p_addendum_id is null then
    return;
  end if;

  return query
  with verified as (
    select
      a.id as addendum_id,
      a.rfq_id,
      r.company_id as issuer_company_id,
      public.parse_rfq_deadline_timestamptz(r.deadline) as parsed_deadline
    from public.rfq_addenda as a
    join public.rfqs as r
      on r.id = a.rfq_id
    join public.organization_memberships as om
      on om.company_id = r.company_id
     and om.user_id = v_uid
     and om.membership_status = 'active'
     and (
       om.workspace_role in ('owner', 'admin')
       or om.procurement_function = 'buyer'
     )
    where a.id = p_addendum_id
      and a.created_by = v_uid
  ),
  invite_emails as (
    select nullif(lower(btrim(i.email)), '') as email
    from verified as v
    join public.rfq_invites as i
      on i.rfq_id = v.rfq_id
    where i.status in ('sent', 'invited')
  ),
  participant_companies as (
    select distinct established.company_id
    from (
      select q.company_id
      from verified as v
      join public.quotes as q
        on q.rfq_id = v.rfq_id
      where v.parsed_deadline is not null
        and v.parsed_deadline < now()
        and q.company_id is not null
        and q.company_id <> v.issuer_company_id
      union
      select rfi.respondent_company_id
      from verified as v
      join public.rfq_rfis as rfi
        on rfi.rfq_id = v.rfq_id
      where v.parsed_deadline is not null
        and v.parsed_deadline < now()
        and rfi.respondent_company_id is not null
        and rfi.respondent_company_id <> v.issuer_company_id
      union
      select ack.company_id
      from verified as v
      join public.rfq_addendum_acknowledgements as ack
        on ack.rfq_id = v.rfq_id
      where v.parsed_deadline is not null
        and v.parsed_deadline < now()
        and ack.company_id is not null
        and ack.company_id <> v.issuer_company_id
    ) as established(company_id)
  ),
  member_emails as (
    select nullif(lower(btrim(p.email)), '') as email
    from participant_companies as pc
    join public.organization_memberships as om
      on om.company_id = pc.company_id
     and om.membership_status = 'active'
    join public.profiles as p
      on p.id = om.user_id
  ),
  issuer_emails as (
    select nullif(lower(btrim(p.email)), '') as email
    from verified as v
    join public.organization_memberships as om
      on om.company_id = v.issuer_company_id
     and om.membership_status = 'active'
    join public.profiles as p
      on p.id = om.user_id
  ),
  candidates as (
    select ie.email
    from invite_emails as ie
    where ie.email is not null
    union
    select me.email
    from member_emails as me
    where me.email is not null
  )
  select c.email::text
  from candidates as c
  where c.email is not null
    and not exists (
      select 1
      from issuer_emails as xe
      where xe.email = c.email
    );
end;
$$;

comment on function public.resolve_rfq_addendum_notification_recipients(uuid) is
  'Purpose-bound SECURITY DEFINER helper for RFQ Addendum email notification. Returns DISTINCT normalized invite emails for sent/invited invitations, plus active membership profile emails for quote, RFI, and prior acknowledgement participant companies only after strict deadline-based commercial opening. Requires the caller published the Addendum and is an active issuing-company owner/admin or buyer. Excludes issuer-company active member emails. Does not accept caller-supplied user IDs, company IDs, or email addresses and does not broadcast to open-market viewers.';

drop policy if exists "Company members can read company audit logs"
on public.audit_logs;

create policy "Company members can read company audit logs"
on public.audit_logs
for select
to authenticated
using (
  audit_logs.company_id is not null
  and exists (
    select 1
    from public.organization_memberships as om
    where om.user_id = auth.uid()
      and om.company_id = audit_logs.company_id
      and om.membership_status in ('active', 'archived')
  )
  and (
    audit_logs.entity_type is distinct from 'quote'
    or exists (
      select 1
      from public.rfqs as r
      join public.quotes as q
        on q.id = audit_logs.entity_id
       and q.rfq_id = r.id
      where r.id::text = nullif(btrim(audit_logs.metadata ->> 'rfq_id'), '')
        and (
          (
            q.company_id = audit_logs.company_id
            and r.company_id <> audit_logs.company_id
          )
          or (
            r.company_id = audit_logs.company_id
            and public.parse_rfq_deadline_timestamptz(r.deadline) is not null
            and public.parse_rfq_deadline_timestamptz(r.deadline) < now()
          )
        )
    )
  )
);

comment on policy "Company members can read company audit logs"
on public.audit_logs is
  'Same-company active or archived members may read non-Quote audit entries. Quote audit entries require a safely resolved RFQ: Supplier-side entries remain visible, while issuer-side entries become visible only after strict deadline-based commercial opening.';

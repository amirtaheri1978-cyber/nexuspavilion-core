begin;

-- F16-01: Align RFQ SELECT and quote INSERT RLS with the application sourcing
-- contract. Restricted sourcing_method values ('invited', 'sealed_bid') are no
-- longer readable or quotable by every active supplier. Access requires open
-- sourcing, an explicit rfq_invites email match, or existing quote participation.
-- Forward-only. Do not edit 20260816_create_procurement_domain_schema.sql.

create or replace function public.current_user_has_supplier_rfq_access(p_rfq_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
begin
  if v_uid is null or p_rfq_id is null then
    return false;
  end if;

  -- Prefer the authenticated identity email, then the profile email.
  -- rfq_invites.email is stored as lower(btrim(email)).
  v_email := nullif(lower(btrim(coalesce(auth.jwt() ->> 'email', ''))), '');

  if v_email is null then
    select nullif(lower(btrim(p.email)), '')
      into v_email
    from public.profiles p
    where p.id = v_uid;
  end if;

  -- Explicit invitation under the existing email-normalized rfq_invites model.
  if v_email is not null and exists (
    select 1
    from public.rfq_invites i
    where i.rfq_id = p_rfq_id
      and i.email = v_email
      and i.status in ('sent', 'invited')
  ) then
    return true;
  end if;

  -- Existing participation: the caller already quoted this RFQ for an
  -- authorized supplier/consultant company.
  if exists (
    select 1
    from public.quotes q
    join public.organization_memberships om
      on om.company_id = q.company_id
     and om.user_id = v_uid
     and om.membership_status = 'active'
     and om.procurement_function in ('supplier', 'consultant')
    where q.rfq_id = p_rfq_id
  ) then
    return true;
  end if;

  return false;
end;
$$;

comment on function public.current_user_has_supplier_rfq_access(uuid) is
  'Boolean-only helper for restricted RFQ SELECT / quote INSERT RLS. Returns true for an explicit rfq_invites email match or existing quote participation. SECURITY DEFINER so suppliers can be authorized without a direct rfq_invites SELECT grant.';

revoke all on function public.current_user_has_supplier_rfq_access(uuid) from public;
revoke all on function public.current_user_has_supplier_rfq_access(uuid) from anon;
grant execute on function public.current_user_has_supplier_rfq_access(uuid) to authenticated;

drop policy if exists "Authenticated users can read permitted RFQs"
on public.rfqs;

create policy "Authenticated users can read permitted RFQs"
on public.rfqs
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_memberships om
    where om.user_id = auth.uid()
      and om.company_id = rfqs.company_id
      and om.membership_status = 'active'
  )
  or (
    rfqs.status = 'open'
    and exists (
      select 1
      from public.organization_memberships om
      where om.user_id = auth.uid()
        and om.membership_status = 'active'
        and om.procurement_function in ('supplier', 'consultant')
    )
    and (
      rfqs.sourcing_method = 'open'
      or public.current_user_has_supplier_rfq_access(rfqs.id)
    )
  )
);

drop policy if exists "Supplier members can submit company quotes"
on public.quotes;

create policy "Supplier members can submit company quotes"
on public.quotes
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.organization_memberships om
    where om.user_id = auth.uid()
      and om.company_id = quotes.company_id
      and om.membership_status = 'active'
      and om.procurement_function = 'supplier'
  )
  and exists (
    select 1
    from public.rfqs r
    where r.id = quotes.rfq_id
      and r.status = 'open'
      and r.company_id <> quotes.company_id
      and (
        r.sourcing_method = 'open'
        or public.current_user_has_supplier_rfq_access(quotes.rfq_id)
      )
  )
);

commit;

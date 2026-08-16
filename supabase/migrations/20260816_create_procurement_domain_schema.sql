begin;

-- Restore the procurement-domain persistence contract required by the
-- application without carrying forward the legacy Core grants or RLS policies.
--
-- This migration intentionally contains schema and authorization only.
-- Development demo data must be loaded through a separately reviewed seed.

create table if not exists public.rfqs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  slug text not null,
  description text,
  category text,
  location text,
  budget text,
  deadline text not null,
  status text not null,
  company_id uuid not null,
  user_id uuid not null,
  awarded_quote_id uuid,
  awarded_at timestamptz,
  procurement_scope text not null default 'subcontractor',
  sourcing_method text not null default 'invited',
  contract_framework text not null default 'project_specific',
  project_name text,
  owner_client text,
  internal_project_id text,
  rfi_deadline timestamptz,
  mobilization_date date,
  substantial_completion_date date,
  bid_model text default 'lump_sum',
  nda_required boolean not null default false,
  performance_bond_required boolean not null default false,
  bid_bond_required boolean not null default false,
  insurance_required boolean not null default false,
  insurance_notes text,
  safety_requirements text,
  prequalification_notes text,
  advanced_controls_enabled boolean not null default false,
  deadline_timezone text default 'America/Toronto',
  rfi_deadline_timezone text default 'America/Toronto',
  constraint rfqs_company_id_fkey
    foreign key (company_id)
    references public.companies (id)
    on delete restrict,
  constraint rfqs_user_id_fkey
    foreign key (user_id)
    references public.profiles (id)
    on delete restrict,
  constraint rfqs_slug_key unique (slug),
  constraint rfqs_contract_framework_check
    check (contract_framework in ('project_specific', 'framework')),
  constraint rfqs_procurement_scope_check
    check (
      procurement_scope in (
        'material',
        'subcontractor',
        'equipment',
        'professional_service'
      )
    ),
  constraint rfqs_sourcing_method_check
    check (sourcing_method in ('open', 'invited', 'sealed_bid'))
);

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  rfq_id uuid not null,
  company_id uuid not null,
  user_id uuid,
  amount numeric,
  timeline text,
  message text,
  status text not null default 'submitted',
  score numeric,
  decision text not null default 'pending',
  awarded_at timestamptz,
  validity_days integer not null default 30,
  constraint quotes_rfq_id_fkey
    foreign key (rfq_id)
    references public.rfqs (id)
    on delete cascade,
  constraint quotes_company_id_fkey
    foreign key (company_id)
    references public.companies (id)
    on delete restrict,
  constraint quotes_user_id_fkey
    foreign key (user_id)
    references public.profiles (id)
    on delete set null,
  constraint quotes_rfq_company_key unique (rfq_id, company_id),
  constraint quotes_validity_days_check
    check (validity_days in (30, 60, 90, 120)),
  constraint quotes_amount_check
    check (amount is null or amount >= 0)
);

alter table public.rfqs
add constraint rfqs_awarded_quote_id_fkey
foreign key (awarded_quote_id)
references public.quotes (id)
on delete set null;

create table if not exists public.rfq_ai_reviews (
  id uuid primary key default gen_random_uuid(),
  rfq_id uuid not null,
  company_id uuid not null,
  created_by uuid,
  readiness_score integer not null default 0,
  risk_level text not null default 'medium',
  executive_summary text,
  missing_items text,
  recommendations text,
  created_at timestamptz not null default now(),
  constraint rfq_ai_reviews_rfq_id_fkey
    foreign key (rfq_id)
    references public.rfqs (id)
    on delete cascade,
  constraint rfq_ai_reviews_company_id_fkey
    foreign key (company_id)
    references public.companies (id)
    on delete cascade,
  constraint rfq_ai_reviews_created_by_fkey
    foreign key (created_by)
    references public.profiles (id)
    on delete set null,
  constraint rfq_ai_reviews_readiness_score_check
    check (readiness_score between 0 and 100),
  constraint rfq_ai_reviews_risk_level_check
    check (risk_level in ('low', 'medium', 'high', 'critical'))
);

create table if not exists public.rfq_invites (
  id uuid primary key default gen_random_uuid(),
  rfq_id uuid not null,
  email text not null,
  token text not null,
  status text not null default 'sent',
  created_at timestamptz not null default now(),
  constraint rfq_invites_rfq_id_fkey
    foreign key (rfq_id)
    references public.rfqs (id)
    on delete cascade,
  constraint rfq_invites_token_key unique (token),
  constraint rfq_invites_email_normalized_check
    check (email = lower(btrim(email))),
  constraint rfq_invites_token_length_check
    check (length(token) >= 32)
);

create unique index if not exists rfq_invites_rfq_email_key
on public.rfq_invites (rfq_id, lower(email));

create index if not exists rfqs_company_id_idx
on public.rfqs (company_id);

create index if not exists rfqs_status_deadline_idx
on public.rfqs (status, deadline);

create index if not exists quotes_rfq_id_idx
on public.quotes (rfq_id);

create index if not exists quotes_company_id_idx
on public.quotes (company_id);

create index if not exists rfq_ai_reviews_rfq_id_idx
on public.rfq_ai_reviews (rfq_id);

create index if not exists rfq_invites_rfq_id_idx
on public.rfq_invites (rfq_id);

alter table public.rfqs enable row level security;
alter table public.quotes enable row level security;
alter table public.rfq_ai_reviews enable row level security;
alter table public.rfq_invites enable row level security;

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
  )
);

drop policy if exists "Buyer members can create company RFQs"
on public.rfqs;

create policy "Buyer members can create company RFQs"
on public.rfqs
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.organization_memberships om
    where om.user_id = auth.uid()
      and om.company_id = rfqs.company_id
      and om.membership_status = 'active'
      and (
        om.workspace_role in ('owner', 'admin')
        or om.procurement_function = 'buyer'
      )
  )
);

drop policy if exists "Buyer members can update company RFQs"
on public.rfqs;

create policy "Buyer members can update company RFQs"
on public.rfqs
for update
to authenticated
using (
  exists (
    select 1
    from public.organization_memberships om
    where om.user_id = auth.uid()
      and om.company_id = rfqs.company_id
      and om.membership_status = 'active'
      and (
        om.workspace_role in ('owner', 'admin')
        or om.procurement_function = 'buyer'
      )
  )
)
with check (
  exists (
    select 1
    from public.organization_memberships om
    where om.user_id = auth.uid()
      and om.company_id = rfqs.company_id
      and om.membership_status = 'active'
      and (
        om.workspace_role in ('owner', 'admin')
        or om.procurement_function = 'buyer'
      )
  )
);

drop policy if exists "Workspace administrators can delete company RFQs"
on public.rfqs;

create policy "Workspace administrators can delete company RFQs"
on public.rfqs
for delete
to authenticated
using (
  exists (
    select 1
    from public.organization_memberships om
    where om.user_id = auth.uid()
      and om.company_id = rfqs.company_id
      and om.membership_status = 'active'
      and om.workspace_role in ('owner', 'admin')
  )
);

drop policy if exists "Company members can read permitted quotes"
on public.quotes;

create policy "Company members can read permitted quotes"
on public.quotes
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_memberships om
    where om.user_id = auth.uid()
      and om.company_id = quotes.company_id
      and om.membership_status = 'active'
  )
  or exists (
    select 1
    from public.rfqs r
    join public.organization_memberships om
      on om.company_id = r.company_id
    where r.id = quotes.rfq_id
      and om.user_id = auth.uid()
      and om.membership_status = 'active'
      and (
        om.workspace_role in ('owner', 'admin')
        or om.procurement_function = 'buyer'
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
  )
);

drop policy if exists "Buyer members can read company RFQ AI reviews"
on public.rfq_ai_reviews;

create policy "Buyer members can read company RFQ AI reviews"
on public.rfq_ai_reviews
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_memberships om
    where om.user_id = auth.uid()
      and om.company_id = rfq_ai_reviews.company_id
      and om.membership_status = 'active'
      and (
        om.workspace_role in ('owner', 'admin')
        or om.procurement_function = 'buyer'
      )
  )
);

drop policy if exists "Buyer members can create company RFQ AI reviews"
on public.rfq_ai_reviews;

create policy "Buyer members can create company RFQ AI reviews"
on public.rfq_ai_reviews
for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.organization_memberships om
    where om.user_id = auth.uid()
      and om.company_id = rfq_ai_reviews.company_id
      and om.membership_status = 'active'
      and (
        om.workspace_role in ('owner', 'admin')
        or om.procurement_function = 'buyer'
      )
  )
  and exists (
    select 1
    from public.rfqs r
    where r.id = rfq_ai_reviews.rfq_id
      and r.company_id = rfq_ai_reviews.company_id
  )
);

drop policy if exists "Buyer members can read company RFQ invitations"
on public.rfq_invites;

create policy "Buyer members can read company RFQ invitations"
on public.rfq_invites
for select
to authenticated
using (
  exists (
    select 1
    from public.rfqs r
    join public.organization_memberships om
      on om.company_id = r.company_id
    where r.id = rfq_invites.rfq_id
      and om.user_id = auth.uid()
      and om.membership_status = 'active'
      and (
        om.workspace_role in ('owner', 'admin')
        or om.procurement_function = 'buyer'
      )
  )
);

drop policy if exists "Buyer members can create company RFQ invitations"
on public.rfq_invites;

create policy "Buyer members can create company RFQ invitations"
on public.rfq_invites
for insert
to authenticated
with check (
  exists (
    select 1
    from public.rfqs r
    join public.organization_memberships om
      on om.company_id = r.company_id
    where r.id = rfq_invites.rfq_id
      and r.status = 'open'
      and om.user_id = auth.uid()
      and om.membership_status = 'active'
      and (
        om.workspace_role in ('owner', 'admin')
        or om.procurement_function = 'buyer'
      )
  )
);

create or replace function public.enforce_rfq_award_authorization()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.awarded_quote_id is distinct from old.awarded_quote_id
    or new.awarded_at is distinct from old.awarded_at
    or (
      new.status is distinct from old.status
      and new.status = 'awarded'
    )
  then
    if auth.uid() is not null
      and coalesce(auth.role(), '') <> 'service_role'
      and not exists (
        select 1
        from public.organization_memberships om
        where om.user_id = auth.uid()
          and om.company_id = new.company_id
          and om.membership_status = 'active'
          and om.workspace_role in ('owner', 'admin')
      )
    then
      raise exception
        using
          errcode = '42501',
          message = 'Only active workspace owners or administrators may award an RFQ.';
    end if;

    if new.awarded_quote_id is not null
      and not exists (
        select 1
        from public.quotes q
        where q.id = new.awarded_quote_id
          and q.rfq_id = new.id
      )
    then
      raise exception
        using
          errcode = '23514',
          message = 'The awarded quote must belong to the RFQ being awarded.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_rfq_award_authorization_trigger
on public.rfqs;

create trigger enforce_rfq_award_authorization_trigger
before update on public.rfqs
for each row
execute function public.enforce_rfq_award_authorization();

create or replace function public.get_rfq_invitation_context(
  p_token text
)
returns table (
  invite_id uuid,
  invite_email text,
  invite_status text,
  rfq_id uuid,
  rfq_title text,
  rfq_slug text,
  rfq_description text,
  rfq_category text,
  rfq_location text,
  rfq_budget text,
  rfq_deadline text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    i.id,
    i.email,
    i.status,
    r.id,
    r.title,
    r.slug,
    r.description,
    r.category,
    r.location,
    r.budget,
    r.deadline
  from public.rfq_invites i
  join public.rfqs r
    on r.id = i.rfq_id
  where p_token is not null
    and length(p_token) >= 32
    and i.token = p_token
    and i.status in ('sent', 'invited')
    and r.status = 'open'
  limit 1;
$$;

revoke all on table public.rfqs from public, anon, authenticated;
revoke all on table public.quotes from public, anon, authenticated;
revoke all on table public.rfq_ai_reviews from public, anon, authenticated;
revoke all on table public.rfq_invites from public, anon, authenticated;

grant select, insert, update, delete
on table public.rfqs
to authenticated;

grant select, insert, update
on table public.quotes
to authenticated;

grant select, insert
on table public.rfq_ai_reviews
to authenticated;

grant select, insert
on table public.rfq_invites
to authenticated;

grant all privileges
on table public.rfqs,
  public.quotes,
  public.rfq_ai_reviews,
  public.rfq_invites
to service_role;

revoke all on function public.get_rfq_invitation_context(text)
from public, anon, authenticated;

revoke all on function public.enforce_rfq_award_authorization()
from public, anon, authenticated;

grant execute on function public.get_rfq_invitation_context(text)
to anon, authenticated, service_role;

commit;
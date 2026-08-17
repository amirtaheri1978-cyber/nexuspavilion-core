-- Section 4: platform-scoped human reviewer authority only.
-- This does not implement representative-verification cases or decisions.

create table public.internal_reviewer_assignments (
  id uuid primary key default gen_random_uuid(),
  reviewer_user_id uuid not null references public.profiles(id),
  capability text not null default 'representative_verification.review'
    check (capability = 'representative_verification.review'),
  status text not null default 'active'
    check (status in ('active', 'revoked')),
  granted_at timestamp with time zone not null default now(),
  granted_by_user_id uuid references public.profiles(id),
  revoked_at timestamp with time zone,
  revoked_by_user_id uuid references public.profiles(id),
  reason_reference text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  check (
    (status = 'active' and revoked_at is null and revoked_by_user_id is null)
    or (status = 'revoked' and revoked_at is not null)
  )
);

create unique index internal_reviewer_assignments_one_active_capability
  on public.internal_reviewer_assignments (reviewer_user_id, capability)
  where status = 'active';

alter table public.internal_reviewer_assignments enable row level security;

revoke all on table public.internal_reviewer_assignments from public;
revoke all on table public.internal_reviewer_assignments from anon;
revoke all on table public.internal_reviewer_assignments from authenticated;

grant all privileges on table public.internal_reviewer_assignments to service_role;

comment on table public.internal_reviewer_assignments is
  'Platform-scoped internal reviewer capability assignments. Client roles have no access; future protected commands must check active assignment at decision time.';

comment on column public.internal_reviewer_assignments.reason_reference is
  'Optional non-sensitive grant or revocation reference. Never store credentials, tokens, contact data, or reviewer notes.';

-- Future controlled grant/revoke operations must append immutable audit_logs
-- events INTERNAL_REVIEWER_GRANTED and INTERNAL_REVIEWER_REVOKED. No such
-- operation is exposed by this foundation migration.

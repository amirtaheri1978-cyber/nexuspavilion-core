create table public.representative_verification_cases (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  representative_user_id uuid not null references public.profiles(id),
  submitted_by_user_id uuid not null references public.profiles(id),
  submitted_owner_membership_id uuid references public.organization_memberships(id),
  submitted_company_owner_user_id uuid references public.profiles(id),
  status text not null check (status in ('pending_review', 'verified', 'rejected', 'invalidated')),
  submitted_at timestamp with time zone not null default now(),
  reviewed_by_user_id uuid references public.profiles(id),
  decided_at timestamp with time zone,
  rejection_reason_code text check (rejection_reason_code = 'REPRESENTATIVE_AUTHORITY_NOT_CONFIRMED'),
  invalidation_reason_code text check (invalidation_reason_code in ('OWNER_CHANGED', 'OWNER_MEMBERSHIP_INACTIVE', 'OWNERSHIP_PROJECTION_MISMATCH', 'SUBJECT_UNAVAILABLE')),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  check ((status = 'pending_review' and decided_at is null and reviewed_by_user_id is null and rejection_reason_code is null and invalidation_reason_code is null) or (status = 'verified' and decided_at is not null and reviewed_by_user_id is not null and rejection_reason_code is null and invalidation_reason_code is null) or (status = 'rejected' and decided_at is not null and reviewed_by_user_id is not null and rejection_reason_code is not null and invalidation_reason_code is null) or (status = 'invalidated' and decided_at is not null and rejection_reason_code is null and invalidation_reason_code is not null))
);
create unique index representative_verification_cases_one_pending_per_subject on public.representative_verification_cases (company_id, representative_user_id) where status = 'pending_review';
alter table public.representative_verification_cases enable row level security;
revoke all on table public.representative_verification_cases from public;
revoke all on table public.representative_verification_cases from anon;
revoke all on table public.representative_verification_cases from authenticated;
grant all privileges on table public.representative_verification_cases to service_role;
comment on table public.representative_verification_cases is 'Section 4 metadata-only persistence. Lifecycle writes and audits belong to future protected commands.';

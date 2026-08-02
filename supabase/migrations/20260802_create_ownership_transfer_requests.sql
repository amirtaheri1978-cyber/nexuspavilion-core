begin;

-- ============================================================================
-- DEV-004 - Company Ownership Lifecycle
-- RFC-001 - Company Ownership Domain
--
-- Purpose:
-- Persist voluntary company-ownership transfer requests.
--
-- Architectural rules:
-- - Current ownership remains unchanged while a request is pending.
-- - Acceptance and ownership completion occur in one atomic RPC.
-- - A company may have only one pending ownership-transfer request.
-- - Generic browser clients cannot directly create or mutate requests.
-- - The previous owner's post-transfer workspace role is an explicit
--   cross-domain completion instruction.
-- ============================================================================

create table if not exists public.ownership_transfer_requests (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  from_user_id uuid not null
    references public.profiles(id)
    on delete restrict,

  to_user_id uuid not null
    references public.profiles(id)
    on delete restrict,

  status text not null
    default 'pending_acceptance'
    check (
      status in (
        'pending_acceptance',
        'rejected',
        'cancelled',
        'expired',
        'completed'
      )
    ),

  /*
   * Explicit instruction for the Workspace Membership projection after
   * successful ownership completion.
   *
   * This field does not directly mutate membership. The future atomic
   * ownership-completion RPC is responsible for applying it.
   */
  previous_owner_next_role text not null
    default 'admin'
    check (
      previous_owner_next_role in (
        'admin',
        'member',
        'viewer'
      )
    ),

  /*
   * Optional business explanation supplied by the current owner.
   */
  transfer_reason text,

  /*
   * Non-canonical supplementary information.
   *
   * Security-critical decisions must not depend exclusively on metadata.
   */
  metadata jsonb not null
    default '{}'::jsonb,

  requested_at timestamp with time zone not null
    default now(),

  expires_at timestamp with time zone not null,

  /*
   * Acceptance and completion occur inside one atomic workflow.
   *
   * accepted_at records the recipient's explicit acceptance evidence.
   * completed_at records successful completion of the ownership mutation.
   */
  accepted_at timestamp with time zone,

  rejected_at timestamp with time zone,

  cancelled_at timestamp with time zone,

  expired_at timestamp with time zone,

  completed_at timestamp with time zone,

  created_at timestamp with time zone not null
    default now(),

  updated_at timestamp with time zone not null
    default now(),

  /*
   * Ownership cannot be transferred to the current owner.
   */
  constraint ownership_transfer_different_users_check
    check (
      from_user_id <> to_user_id
    ),

  /*
   * A request must expire after it is created.
   */
  constraint ownership_transfer_expiration_check
    check (
      expires_at > requested_at
    ),

  /*
   * Status and lifecycle timestamps must remain consistent.
   *
   * A pending request has no terminal timestamps.
   * Each terminal status has exactly the timestamps appropriate to it.
   */
  constraint ownership_transfer_status_timestamps_check
    check (
      (
        status = 'pending_acceptance'
        and accepted_at is null
        and rejected_at is null
        and cancelled_at is null
        and expired_at is null
        and completed_at is null
      )
      or
      (
        status = 'rejected'
        and accepted_at is null
        and rejected_at is not null
        and cancelled_at is null
        and expired_at is null
        and completed_at is null
      )
      or
      (
        status = 'cancelled'
        and accepted_at is null
        and rejected_at is null
        and cancelled_at is not null
        and expired_at is null
        and completed_at is null
      )
      or
      (
        status = 'expired'
        and accepted_at is null
        and rejected_at is null
        and cancelled_at is null
        and expired_at is not null
        and completed_at is null
      )
      or
      (
        status = 'completed'
        and accepted_at is not null
        and rejected_at is null
        and cancelled_at is null
        and expired_at is null
        and completed_at is not null
      )
    ),

  /*
   * Acceptance cannot occur before the request was created.
   */
  constraint ownership_transfer_acceptance_order_check
    check (
      accepted_at is null
      or accepted_at >= requested_at
    ),

  /*
   * Completion requires acceptance and cannot precede it.
   */
  constraint ownership_transfer_completion_order_check
    check (
      completed_at is null
      or (
        accepted_at is not null
        and completed_at >= accepted_at
      )
    ),

  /*
   * Terminal decisions cannot predate the request.
   */
  constraint ownership_transfer_terminal_time_check
    check (
      (
        rejected_at is null
        or rejected_at >= requested_at
      )
      and
      (
        cancelled_at is null
        or cancelled_at >= requested_at
      )
      and
      (
        expired_at is null
        or expired_at >= requested_at
      )
    )
);

-- Only one unresolved voluntary ownership transfer may exist per company.
create unique index if not exists
  ownership_transfer_requests_one_pending_per_company
on public.ownership_transfer_requests (company_id)
where status = 'pending_acceptance';

-- Supports the recipient inbox and expiration processing.
create index if not exists
  ownership_transfer_requests_recipient_pending_idx
on public.ownership_transfer_requests (
  to_user_id,
  expires_at
)
where status = 'pending_acceptance';

-- Supports owner-side transfer history.
create index if not exists
  ownership_transfer_requests_sender_history_idx
on public.ownership_transfer_requests (
  from_user_id,
  created_at desc
);

-- Supports company governance and ownership history.
create index if not exists
  ownership_transfer_requests_company_history_idx
on public.ownership_transfer_requests (
  company_id,
  created_at desc
);

alter table public.ownership_transfer_requests
enable row level security;

-- Anonymous clients have no access.
revoke all
on table public.ownership_transfer_requests
from anon;

-- Authenticated browser clients cannot directly create or mutate requests.
-- Future ownership RPCs will perform governed mutations.
revoke insert, update, delete
on table public.ownership_transfer_requests
from authenticated;

-- Participants may read requests through RLS.
grant select
on table public.ownership_transfer_requests
to authenticated;

drop policy if exists
  "Transfer participants can read ownership transfer requests"
on public.ownership_transfer_requests;

create policy
  "Transfer participants can read ownership transfer requests"
on public.ownership_transfer_requests
for select
to authenticated
using (
  auth.uid() = from_user_id
  or auth.uid() = to_user_id
);

commit;
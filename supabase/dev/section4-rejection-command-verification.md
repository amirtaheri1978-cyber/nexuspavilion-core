# Section 4 Rejection Command: Development Verification Plan

This file is a Development verification plan for
`public.reject_representative_verification`. Use disposable synthetic actors,
companies, memberships, reviewer assignments, verification cases, and audit
records only.

Do not execute SQL or connect to a database in this task. Production is out of
scope.

## Authority and disclosure boundary

- Verify an active `representative_verification.review` reviewer can execute
  the command.
- Revoke the assignment and verify the reviewer is immediately denied.
- Verify an ordinary authenticated user is denied.
- Verify a workspace owner or admin without a reviewer assignment is denied.
- Verify unauthorized callers receive the same authorization result for an
  existing and nonexistent case, so a case ID is not a disclosure oracle.
- Verify rejection and reviewer revocation serialize: a command that first
  locks an active assignment completes its single decision before revocation;
  a command running after revocation is denied.

## Rejection-reason boundary

- Verify `REPRESENTATIVE_AUTHORITY_NOT_CONFIRMED` is accepted.
- Verify NULL is rejected with `INVALID_REJECTION_REASON`.
- Verify unknown or arbitrary codes are rejected with
  `INVALID_REJECTION_REASON`.
- Verify no free-form reviewer note is stored.

## Valid rejection

For a `pending_review` case with valid current eligibility:

- Verify transition to `rejected`.
- Verify `reviewed_by_user_id` is the authorized reviewer and `decided_at` is
  populated.
- Verify `rejection_reason_code` is
  `REPRESENTATIVE_AUTHORITY_NOT_CONFIRMED` and
  `invalidation_reason_code` remains NULL.
- Verify exactly one `REPRESENTATIVE_VERIFICATION_REJECTED` audit event.
- Inject or simulate audit-write failure and verify the terminal transition
  rolls back with the audit write.

## Idempotency and terminal states

- Replay the same reason against a rejected case and verify idempotent success
  with no second rejection audit.
- Verify a rejected case with a different stored reason returns
  `CASE_REJECTION_CONFLICT`.
- Verify a verified case returns `CASE_NOT_PENDING`.
- Verify an invalidated case returns `CASE_INVALIDATED`.
- Verify a missing case returns `CASE_NOT_FOUND` only after reviewer authority
  has been established.

## Lazy invalidation

Independently create stale pending cases for:

- `SUBJECT_UNAVAILABLE`.
- `OWNER_MEMBERSHIP_INACTIVE`.
- `OWNERSHIP_PROJECTION_MISMATCH`.
- `OWNER_CHANGED`.

For each scenario, verify:

- `pending_review` transitions to `invalidated`; rejection does not occur.
- `decided_at` is populated while `reviewed_by_user_id` and
  `rejection_reason_code` remain NULL.
- The controlled `invalidation_reason_code` is stored.
- Exactly one `REPRESENTATIVE_VERIFICATION_INVALIDATED` audit event is written.
- The initiating authorized reviewer is the audit actor and metadata contains
  `system_enforced = true`.
- An audit-write failure rolls back the invalidation.

## Ownership semantics and concurrency

`OWNER_CHANGED` means the current canonical owner is valid and internally
consistent but differs from the submission-time owner.

`OWNERSHIP_PROJECTION_MISMATCH` means the current canonical owner relationship
disagrees with `companies.user_id`.

- Verify the submitted owner membership remains associated with the captured
  company and submitter, and remains active with the owner role.
- Submit concurrent duplicate rejections and verify exactly one terminal
  transition and audit event.
- Race approval against rejection and verify exactly one terminal result.
- Verify rejection and reviewer revocation serialize through the reviewer lock.
- Verify rejection and ownership change serialize through the company and
  authoritative membership locks.
- When ownership mutation wins first, verify rejection observes stale state and
  invalidates rather than rejects.

## Security boundaries

- Verify authenticated clients cannot directly mutate verification-case rows.
- Verify rejection performs no ownership mutation.
- Verify no separate invalidation command exists.
- This plan includes no API/UI, re-verification, recovery, cancellation, or
  provider/document work.
- Do not perform Production operations.

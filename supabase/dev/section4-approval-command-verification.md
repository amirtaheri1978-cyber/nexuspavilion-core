# Section 4 Approval Command: Development Verification Plan

This document is a Development verification plan for
`approve_representative_verification`. Use only disposable synthetic actors,
companies, memberships, reviewer assignments, cases, and audit records.

Do not execute SQL or connect to a database as part of this documentation task.
Production is out of scope.

## Authority and case-disclosure boundary

- Verify an authenticated user with an active
  `representative_verification.review` assignment can execute the command.
- Revoke that assignment and verify the same user is immediately denied with
  `REVIEWER_NOT_AUTHORIZED`.
- Verify an ordinary authenticated user is denied.
- Verify a workspace owner or admin without the reviewer assignment is denied.
- Verify an unauthorized caller receives the same authorization failure for an
  existing case and a nonexistent case; the caller must not learn whether the
  supplied case exists.
- Verify reviewer revocation and approval serialize: an approval that locks an
  active assignment first completes its single decision before revocation; an
  approval that runs after revocation observes no active assignment and is
  denied.

## Valid approval

For a `pending_review` case with valid current eligibility:

- Verify the command transitions the case to `verified`.
- Verify `reviewed_by_user_id` is the authorized reviewer.
- Verify `decided_at` is populated.
- Verify `rejection_reason_code` and `invalidation_reason_code` remain NULL.
- Verify exactly one `REPRESENTATIVE_VERIFIED` audit event is written.
- Inject or simulate an audit-write failure and verify the terminal transition
  rolls back with the audit write.

## Idempotency and terminal states

- Replay approval for a verified case and verify idempotent success.
- Verify that replay creates no second audit event.
- Verify a rejected case returns `CASE_NOT_PENDING`.
- Verify an invalidated case returns `CASE_INVALIDATED`.
- Verify a missing case returns `CASE_NOT_FOUND` only after reviewer
  authorization succeeds.

## Lazy invalidation

Independently create stale pending cases that exercise each controlled reason:

- `SUBJECT_UNAVAILABLE` when a required representative or submitting identity
  is unavailable.
- `OWNER_MEMBERSHIP_INACTIVE` when the captured submission-time membership is
  inactive, no longer owner-valid, or no longer belongs to the captured company
  and submitter.
- `OWNERSHIP_PROJECTION_MISMATCH` when a valid current canonical owner
  relationship disagrees with `companies.user_id`.
- `OWNER_CHANGED` when current canonical ownership is valid and internally
  consistent but differs from the submission-time owner.

For every invalidation scenario, verify:

- `pending_review` transitions to `invalidated`.
- `decided_at` is populated.
- `reviewed_by_user_id` remains NULL.
- `rejection_reason_code` remains NULL.
- The controlled `invalidation_reason_code` is recorded.
- Exactly one `REPRESENTATIVE_VERIFICATION_INVALIDATED` audit event is written.
- The initiating authorized reviewer is the audit actor.
- Audit metadata records `system_enforced = true`.
- An audit-write failure rolls back the invalidation transition.

## Ownership semantics and serialization

`OWNER_CHANGED` means the current canonical owner relationship is valid and
internally consistent, but differs from the submission-time owner.

`OWNERSHIP_PROJECTION_MISMATCH` means the current canonical owner relationship
disagrees with the `companies.user_id` projection.

- Verify `submitted_owner_membership_id` still belongs to the captured company
  and submitter and remains active and owner-valid.
- Submit concurrent approvals for the same pending case and verify one terminal
  transition and one audit event.
- Verify approval and reviewer revocation serialize through the reviewer
  assignment lock.
- Verify approval and ownership change serialize through the company and
  authoritative membership locks.
- When ownership mutation wins the lock race, verify approval observes the new
  authoritative state and invalidates rather than verifies.
- Reserve a future approve/reject race test: it must preserve exactly one
  terminal outcome once the reject command exists.

## Boundaries

- Verify authenticated clients cannot directly mutate verification-case rows.
- Verify approval performs no ownership mutation.
- Reject-command verification is not included yet.
- No separate invalidation command exists.
- This plan includes no API, UI, re-verification, recovery, cancellation, or
  provider/document processing work.
- Do not perform Production operations.

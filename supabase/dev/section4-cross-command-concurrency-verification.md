# Section 4 Cross-Command Concurrency: Development Verification Plan

This file is a Development verification plan for the corrected shared lock
hierarchy. Use disposable synthetic Development actors, companies, memberships,
reviewer assignments, transfer requests, verification cases, and audit records.

Do not execute SQL or connect to a database in this documentation task.
Production is out of scope. This plan changes no ownership business semantics
and includes no API or UI integration.

## Shared hierarchy under test

- Submission: non-locking owner preflight → company lock → authoritative owner
  membership lock and revalidation.
- Request transfer: non-locking owner preflight → company lock → actor/target
  membership set locked in deterministic `user_id, id` order.
- Approval/rejection: reviewer assignment → verification case → company →
  memberships.
- Acceptance: transfer request → company → memberships.

Expected blocking and serialization are permitted. A deadlock is circular wait
and is not permitted in any scenario below.

## Race matrix

| Race | Synthetic prerequisite | Expected serialization and final result | Expected audit | Deadlock |
| --- | --- | --- | --- | --- |
| Submit vs approve | Eligible canonical owner; pending or concurrently created case | Company-first serialization; approval sees the committed current case state and either verifies a valid pending case or returns its governed terminal result | One submission audit; at most one verified audit | None |
| Submit vs reject | Eligible canonical owner; pending or concurrently created case | Company-first serialization; rejection sees the committed current case state and either rejects a valid pending case or returns its governed terminal result | One submission audit; at most one rejected audit | None |
| Submit vs request transfer | Active owner and eligible transfer target | Company lock serializes. The loser revalidates authoritative owner state and returns its governed result | Only successful command audits | None |
| Submit vs accept transfer | Pending transfer and eligible submitting owner | Transfer acceptance or submission wins company lock. Submission after ownership change must revalidate and not create a stale case | Transfer audit; submission audit only on valid success | None |
| Approve vs request/accept transfer | Pending verification case and valid transfer fixture | Case holder then company serializes against transfer. If ownership mutation wins first, approval observes stale state and invalidates | One terminal verification audit; transfer audit when transfer succeeds | None |
| Reject vs request/accept transfer | Pending verification case and valid transfer fixture | Same as approval. If ownership mutation wins first, rejection invalidates rather than rejects | One terminal verification audit; transfer audit when transfer succeeds | None |
| Approve vs reject | One pending verification case and two authorized reviewers | Case lock serializes the decisions; exactly one terminal outcome | Exactly one verified, rejected, or invalidated audit | None |
| Reviewer revoke vs approve | Active reviewer assignment and pending case | Assignment lock serializes. If revocation wins first, approval returns `REVIEWER_NOT_AUTHORIZED` | At most one terminal verification audit | None |
| Reviewer revoke vs reject | Active reviewer assignment and pending case | Assignment lock serializes. If revocation wins first, rejection returns `REVIEWER_NOT_AUTHORIZED` | At most one terminal verification audit | None |
| Duplicate submissions | Eligible owner and no pending case | Company lock plus partial unique index yield one pending case; the other result is `DUPLICATE_PENDING_CASE` | Exactly one submitted audit | None |
| Concurrent transfer requests | Current owner and two active non-owner targets | Company lock serializes requests; one request may persist and the other observes governed pending-transfer behavior | Audit only for the persisted request and any expiry handling | None |
| Multi-membership combinations | Same company with synthetic actor/target pairs invoked in different order | Request transfer locks the intended membership set in `user_id, id` order regardless of caller order | Audits reflect only successful transfer requests | None |

## Security and state-regression checks

- Attempt submission as an authenticated non-owner and verify it fails during
  non-locking preflight without waiting on or locking the target company row.
- Attempt transfer request as an authenticated non-owner and verify the same
  arbitrary-company lock resistance.
- For every successful submission and transfer request, verify the
  post-company-lock membership validation repeats the authoritative active
  owner check rather than relying on preflight state.
- Make ownership change win before approval or rejection reaches the company
  lock; verify the reviewer command observes the new authoritative state and
  invalidates using the governed reason.
- Make reviewer revocation win before approval or rejection locks the active
  assignment; verify `REVIEWER_NOT_AUTHORIZED` and no case disclosure or audit.
- Verify the verification-case lock preserves exactly one approve/reject
  terminal transition.
- Verify the pending-case partial unique index preserves exactly one pending
  submission under concurrent attempts.
- Force each command's audit write to fail and verify the lifecycle write rolls
  back in the same transaction.

## Evidence to retain

For each run, retain only synthetic Development identifiers, command start and
completion ordering, returned business result, final case/request state, and
audit-event count. Record blocking duration only as diagnostic evidence; do
not treat ordinary blocking as a failure. Any database deadlock, timeout caused
by circular wait, duplicate terminal decision, direct client mutation, or audit
desynchronization is a failure requiring reconciliation.

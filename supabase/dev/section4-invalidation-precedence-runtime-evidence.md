# Section 4 Invalidation Precedence — Development Runtime Evidence

## Scope

This record documents the bounded Development runtime verification of:

`20260817_reconcile_representative_verification_invalidation_precedence.sql`

The reconciliation changes only the invalidation-reason precedence used by the protected Representative Verification approval and rejection decision functions.

It does not modify the Section 3 ownership-transfer implementation, ownership state model, or Production.

## Environment

Target: dedicated Development environment.

Production: not touched.

All runtime fixtures and temporary ownership-state changes used by the verification scenarios were executed inside explicit transactions and rolled back after evidence was captured.

## Static and Regression Verification

The dedicated invalidation-precedence static regression suite passed:

- Test files: 1 passed
- Tests: 5 passed

The bounded Representative Verification regression suite passed:

- Test files: 3 passed
- Tests: 14 passed
- Approval RPC tests: passed
- Rejection RPC tests: passed
- Invalidation-precedence reconciliation tests: passed

The reconciliation preserves:

- protected approval and rejection RPC replacement;
- explicit preservation of submission-membership existence before `FOUND` can be overwritten;
- company-before-membership lock hierarchy;
- deterministic membership lock ordering by `user_id, id`;
- authenticated-only RPC execution grants.

## Development Migration Application

The reconciliation migration was applied successfully to Development.

Result:

`Success. No rows returned`

## OWNER_CHANGED Runtime Verification

A fresh Representative Verification case was submitted while the original canonical owner was active.

The test then reproduced the legitimate post-transfer ownership state:

- the original owner membership was no longer the active owner;
- the replacement membership became the active owner;
- `companies.user_id` matched the replacement owner.

An authorized temporary reviewer then attempted the protected approval decision.

Observed decision:

- submission status: `pending_review`
- decision error: `CASE_INVALIDATED`
- persisted case status: `invalidated`
- `reviewed_by_user_id`: `null`
- `rejection_reason_code`: `null`
- `invalidation_reason_code`: `OWNER_CHANGED`

Verdict: **PASS**

The previously unreachable `OWNER_CHANGED` invalidation classification is reachable after a legitimate ownership change.

The complete runtime fixture was rolled back after evidence capture.

## OWNER_MEMBERSHIP_INACTIVE Regression Verification

A separate pending case was constructed while canonical ownership remained unchanged and internally consistent, but the case's captured submission-time owner membership did not represent the submitting canonical owner.

An authorized temporary reviewer attempted the protected approval decision.

Observed decision:

- decision error: `CASE_INVALIDATED`
- persisted case status: `invalidated`
- `reviewed_by_user_id`: `null`
- `rejection_reason_code`: `null`
- `invalidation_reason_code`: `OWNER_MEMBERSHIP_INACTIVE`

Verdict: **PASS**

The precedence correction therefore does not remove or mask the independent `OWNER_MEMBERSHIP_INACTIVE` classification.

The complete runtime fixture was rolled back after evidence capture.

## Reconciliation Verdict

**PASS**

The bounded Development evidence confirms that:

1. legitimate ownership change is classified as `OWNER_CHANGED`;
2. stale or invalid submission-time owner membership remains independently classified as `OWNER_MEMBERSHIP_INACTIVE`;
3. the corrected precedence resolves the observed Section 4 runtime defect without changing the Section 3 ownership-transfer implementation.

This evidence does not constitute Section 4 closeout or Production authorization.
# Section 4 Reviewer Authorization Development Verification

Run only in the dedicated Development environment with disposable synthetic actors.
Production is out of scope.

| Actor | Assignment | Expected future capability check |
|---|---|---|
| A | Active `representative_verification.review` assignment | Allowed. |
| B | Authenticated, no assignment | Denied. |
| C | Active company workspace admin, no assignment | Denied; workspace authority is irrelevant. |
| D | Revoked reviewer assignment | Denied immediately at decision time. |

Verify that client roles cannot read or mutate `internal_reviewer_assignments`, that there is at most one active assignment for a reviewer/capability pair, and that future grant/revoke operations emit non-sensitive `INTERNAL_REVIEWER_GRANTED` / `INTERNAL_REVIEWER_REVOKED` audit events. No verification case, decision, or Production operation is part of this plan.

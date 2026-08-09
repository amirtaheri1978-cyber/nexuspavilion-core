# Section 4 Submission Command Development Verification

Use disposable synthetic Development actors and companies only. Production is out of scope. This plan executes no Development SQL.

| Scenario | Expected result |
|---|---|
| Canonical owner submits | One pending case and one `REPRESENTATIVE_VERIFICATION_SUBMITTED` audit. |
| Non-owner submits | Denied; no case or successful-submission audit. |
| Workspace admin, not canonical owner | Denied; workspace authority is insufficient. |
| Inactive or suspended owner membership | Denied; no mutation. |
| `companies.user_id` mismatch | `OWNERSHIP_STATE_INCONSISTENT`; no mutation. |
| Existing pending case | `DUPLICATE_PENDING_CASE`; no second case or audit. |
| Simultaneous duplicate submissions | Exactly one pending case and one controlled duplicate result. |
| Applicable verified case | `ALREADY_VERIFIED`; re-verification remains prohibited. |
| Rejected history | New submission succeeds when current eligibility is valid. |
| Invalidated history | New submission succeeds when current eligibility is valid. |
| Snapshot integrity | Submitter, owner membership, owner projection, and timestamp match authoritative current state. |
| Audit failure | Case creation rolls back; no pending case remains. |
| Direct authenticated mutation | Denied for `representative_verification_cases`. |
| Ownership state | Submission does not mutate company, membership, or transfer state. |

Approve, reject, and lazy-invalidation runtime verification belongs to later S4-07B slices.

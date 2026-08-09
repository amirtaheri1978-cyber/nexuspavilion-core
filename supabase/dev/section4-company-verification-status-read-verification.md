# Section 4 Company Verification Status Read — Development Verification Plan

This is a Development-only verification plan for
`public.get_company_representative_verification_status(uuid)`. Use disposable
synthetic actors, companies, memberships, and verification cases. This task does
not execute SQL or connect to a database. Production is out of scope.

## Authorization and nondisclosure

Verify that an authenticated current canonical owner (active `owner` membership
and matching `companies.user_id`) succeeds. Verify that an active company admin
succeeds. Verify that an inactive or suspended admin, ordinary member, viewer,
former owner without current authority, and user from another company each
receive the same controlled non-disclosing result. Verify that an anonymous
caller receives `AUTHENTICATION_REQUIRED`, and that a nonexistent company is
indistinguishable from an unauthorized company (`STATUS_NOT_AUTHORIZED`).

Verify that internal reviewer assignment, procurement function, legacy profile
role, and generic authenticated access do not authorize the command.

## Status calculation

For an authorized reader, verify these single returned values:

- no case: `unverified`;
- pending case: `pending_review`;
- verified case: `verified`;
- rejected case: `rejected`;
- invalidated case: `invalidated`;
- rejected then later pending: `pending_review`;
- invalidated then later pending: `pending_review`;
- rejected then later verified: `verified`;
- multiple terminal cases: the case latest by `decided_at`, then `id`;
- verified plus terminal history: `verified`;
- ownership transfer after verified: still `verified`;
- stale pending before protected reviewer decision: `pending_review`.

Confirm that all cases for the target company remain applicable regardless of
the current owner, `representative_user_id`, or `submitted_by_user_id`.

## Concurrency and boundaries

Exercise concurrent submit/read, approve/read, reject/read, and ownership or
admin-change/read scenarios. Each read may return the valid pre-commit or
post-commit status, never partial state, and must not deadlock.

Confirm the command returns only `success` and one status on success. It must
not expose case IDs, identities, timestamps, reasons, audit data, history,
evidence, or provider data. Confirm authenticated clients retain no direct
mutation or direct table-read capability for
`representative_verification_cases` and that the command makes no lifecycle or
ownership mutation.

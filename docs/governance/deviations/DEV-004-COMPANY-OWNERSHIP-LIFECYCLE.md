# DEV-004 — Company Ownership Lifecycle

## Status

Active - technical backend implementation verified; integration and UI/UX validation deferred

## Parent Governance Record

DEV-003 — Business Role Foundation

## Architecture Specification

RFC-001 — Company Ownership Domain

## Master Plan Position

Section 3 — Company and Team Lifecycle

## Objective

Introduce a dedicated, auditable, and transactional company ownership
lifecycle without expanding generic workspace-member management.

## Problem Statement

The repository currently:

- represents the active owner through workspace membership;
- retains `companies.user_id` for migration compatibility;
- protects owners from generic role changes and removal;
- defines `canTransferOwnership()`;
- references a dedicated ownership-transfer workflow;
- provides an existing ownership-recovery route.

The voluntary ownership-transfer backend is now materially implemented through governed persistence, request/accept/reject commands, expiration handling, invariants, audit contracts, and client privilege boundaries. Integration and UI/UX validation remain incomplete, and recovery remains a separate deferred governance concern.

## Scope

### Included

1. Ownership establishment
2. Provisional and verified ownership states
3. Representative verification contract
4. Ownership-transfer requests
5. Recipient acceptance, rejection, cancellation, and expiration
6. Atomic ownership transfer
7. Ownership history and audit evidence
8. Governance hardening of ownership recovery
9. Synchronization with owner membership and `companies.user_id`
10. Runtime and API authorization validation

### Explicitly Excluded

- Generic workspace invitation redesign
- Procurement authorization migration
- RFQ authorization changes
- Quote authorization changes
- Award authorization changes
- Subscription entitlement
- Company-profile redesign
- Removal of legacy ownership fields before an authorized migration phase

## Architectural Boundaries

The following concepts are independent:

- Workspace Membership
- Workspace Role
- Procurement Function
- Company Ownership
- Company Verification
- Representative Verification
- Ownership Transfer
- Ownership Recovery

Generic role-management commands must never create, demote, remove,
or replace an owner.

## Core Invariants

1. Every company has at least one active owner.
2. Every company has exactly one canonical owner.
3. Only the current canonical owner may initiate a voluntary transfer.
4. The proposed owner must be an active member of the same company.
5. The proposed owner must explicitly accept the transfer.
6. Transfer completion must be atomic.
7. Procurement function must not change during transfer.
8. Ownership recovery must remain separate from voluntary transfer.
9. Expired, rejected, cancelled, or completed requests cannot be replayed.
10. Every ownership transition must generate immutable audit evidence.
11. During migration, canonical ownership, owner membership, and
    `companies.user_id` must remain synchronized.

## Delivery Phases

### Phase 1 — Repository and Recovery Audit

- Audit `src/lib/workspace/commands.ts`
- Audit `/api/company/recover-admin`
- Audit all ownership-related SQL
- Determine current owner-establishment behavior
- Record migration dependencies

### Phase 2 — Database Foundation

- Create ownership-transfer request persistence
- Add transfer state constraints
- Add expiration and replay-protection constraints
- Define canonical ownership synchronization requirements

### Phase 3 — Atomic Domain Commands

- Initiate ownership transfer
- Accept ownership transfer
- Reject ownership transfer
- Cancel ownership transfer
- Expire ownership transfer
- Complete ownership transfer atomically

### Phase 4 — Application Contracts

- Command-layer integration
- Owner-only API endpoints
- Recipient acceptance endpoint
- Error contracts and authorization policies

### Phase 5 — User Experience

- Ownership and Controls section
- Current-owner display
- Transfer initiation
- Recipient acceptance experience
- Pending-transfer status
- Ownership history

### Phase 6 — Recovery Hardening

- Separate recovery eligibility from normal transfer
- Require appropriate identity and company evidence
- Produce recovery audit evidence
- Prevent recovery while an active canonical owner exists, unless formally approved

### Phase 7 — Validation and Closure

- Owner authorization tests
- Admin, Member, and Viewer rejection tests
- Recipient acceptance tests
- Expiration tests
- Replay-protection tests
- Atomicity tests
- Legacy synchronization tests
- Runtime evidence
- SQL evidence
- Audit-log evidence
- Product Owner closure approval

### Product Owner Section 3 Technical Closeout Decision

On 2026-08-09, the Product Owner accepted the Development technical baseline as PASS WITH DEFERRED PRE-LAUNCH BEHAVIORAL VERIFICATION. The following remain unresolved and must not be recorded as executed: authenticated request-to-accept, request-to-reject, expiration, replay/idempotency, concurrency/race, and role-specific company DELETE behavior. They do not block Section 4, but remain Production-launch requirements unless later governance changes that decision.

### Section 4 Boundary - Representative Verification Foundation

Representative Verification Foundation proceeds as a separately approved Section 4 capability under DOM-005 Trust and Verification, with DOM-003 Company Ownership as a dependency. It verifies representative authority for a specific company; it is neither company legal/business verification nor ownership itself. Current canonical ownership is initial submission eligibility only and does not create a permanent representative-equals-owner invariant.

Section 4 does not reopen ownership transfer, cancellation, recovery, D1-D6, completed Section 3 RLS, completed privilege reconciliation, or the existing ownership RPC architecture. It does not modify workspace membership or RFQ Procurement. It must not establish, transfer, recover, revoke, remove, or otherwise mutate ownership projections or ownership-transfer request lifecycle.

The approved foundation is metadata/status only, uses authorized internal platform review distinct from workspace/company/procurement roles, and excludes raw documents, external providers, automated verification, revocation, re-verification, and Production deployment. Retention, deletion/legal-hold, sensitive-evidence storage, external-provider policy, revocation, and re-verification remain deferred under the Section 4 governance contract.

Pending verification cases may be invalidated lazily at protected reviewer decision time when authoritative ownership eligibility is no longer valid. Invalidated is distinct from reviewer rejection and is neither cancellation, revocation, nor a generic application/database error. This eligibility validation depends on current ownership state but does not alter ownership authority, transfer semantics, recovery, D1-D6, RLS, or privilege reconciliation.

Section 4 prohibits a new submission when an applicable verified case exists; rejected or invalidated history may permit a new eligible submission. This is protected-command enforcement, not UI behavior. It does not implement re-verification, revocation, ownership-transfer changes, recovery, cancellation, or D1-D6.

### Company-Side Representative Verification Status Read Boundary

The next authorized Section 4 capability is a protected, read-only,
company-scoped status boundary. Current canonical owners and active company
admins may receive only one normalized current status: `unverified`,
`pending_review`, `verified`, `rejected`, or `invalidated`. Authorization is
company-local and must not use procurement roles, reviewer capability, generic
authenticated access, service-role human identity, or client-side filtering.

Current status is not case history. An applicable verified case takes
precedence; otherwise a pending case takes precedence; otherwise the most
recently decided terminal case by `decided_at` and `id` supplies `rejected` or
`invalidated`; absence of a case supplies `unverified`. A later pending case
supersedes terminal history for display, and a later verified case supersedes
prior terminal history. Re-verification remains prohibited.

This capability must not expose case IDs, identities, snapshots, timestamps,
rejection or invalidation reasons, reviewer data, audit information, metadata,
evidence, provider data, notes, or historical cases. It does not modify
ownership, reopen ownership transfer, recovery, cancellation, or D1-D6, and it
does not create re-verification or revocation. A future implementation requires
one protected database read mechanism and a thin authenticated API adapter; UI
is outside this capability. Production remains separately gated.

## Required Audit Events

- OWNERSHIP_ESTABLISHED
- REPRESENTATIVE_VERIFIED
- OWNERSHIP_TRANSFER_REQUESTED
- OWNERSHIP_TRANSFER_ACCEPTED
- OWNERSHIP_TRANSFER_REJECTED
- OWNERSHIP_TRANSFER_CANCELLED
- OWNERSHIP_TRANSFER_EXPIRED
- OWNERSHIP_TRANSFER_COMPLETED
- OWNERSHIP_RECOVERY_REQUESTED
- OWNERSHIP_RECOVERY_APPROVED
- OWNERSHIP_RECOVERY_REJECTED
- OWNERSHIP_RECOVERED

OWNERSHIP_TRANSFER_CANCELLED is deferred by design and is not implemented for Section 3. Its event is deferred with the capability.

## Implementation Gate

No product implementation may begin until:

1. RFC-001 is reviewed;
2. the existing recovery implementation is audited;
3. current ownership-establishment behavior is documented;
4. schema ownership and migration dependencies are confirmed;
5. this deviation is changed from Proposed to Active.

## Completion Criteria

DEV-004 may be marked complete only when:

1. all included phases are implemented or formally deferred;
2. ownership transfer is transactional and replay-safe;
3. generic membership operations remain unable to mutate ownership;
4. recovery and transfer remain separate;
5. owner membership and legacy ownership fields remain consistent;
6. required audit events are produced;
7. authorization and runtime matrices pass;
8. the working tree is clean;
9. final evidence and commit hash are recorded;
10. the Product Owner approves closure.

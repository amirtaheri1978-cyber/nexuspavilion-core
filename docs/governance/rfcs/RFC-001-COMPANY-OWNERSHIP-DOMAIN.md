# RFC-001 - Company Ownership Domain

## Status

Draft

## Domain

DOM-003 - Company Ownership

## Related Governance

- DEV-003 - Business Role Foundation
- DEV-004 - Company Ownership Lifecycle

## Implemented By

DEV-004 - Company Ownership Lifecycle

## Supersedes

None

## Purpose

Define the canonical enterprise model for establishing, verifying,
transferring, recovering, and auditing company ownership in Nexus Pavilion.

## Business Problem

The repository currently protects owners from generic membership mutations,
defines an owner-only transfer permission, references a dedicated transfer
workflow, provides a separate recovery path, and temporarily retains
`companies.user_id`.

The voluntary ownership-transfer workflow itself is not implemented.

## Repository Evidence

The current repository already:

- protects owners from generic member-role updates;
- protects owners from generic member removal;
- defines `canTransferOwnership()`;
- references a dedicated ownership-transfer workflow in UI and SQL;
- provides a separate ownership-recovery path;
- retains `companies.user_id` for migration compatibility.

## Architectural Decision

Company Ownership is a distinct governance domain.

Ownership is not:

- a generic workspace-role mutation;
- a procurement function;
- a company-profile field;
- an authentication concern;
- an emergency recovery shortcut.

Generic member-management commands must never create, demote, remove,
or replace an owner.

## Domain Charter

### Owns

- Ownership establishment
- Canonical-owner determination
- Representative-verification status
- Ownership transfer
- Ownership recovery
- Ownership history
- Ownership audit evidence

### Does Not Own

- Authentication
- Generic workspace membership
- Procurement function
- RFQ authorization
- Quote authorization
- Company-profile content
- Subscription entitlement

## Aggregate Root

`CompanyOwnership`

### Aggregate Data

- Ownership ID
- Company ID
- Current representative ID
- Ownership status
- Representative-verification status
- Established timestamp
- Verified timestamp
- Transferred timestamp
- Recovered timestamp
- Revoked timestamp

## Capabilities

- CAP-003 - Ownership Establishment
- CAP-004 - Representative Verification
- CAP-005 - Ownership Transfer
- CAP-006 - Ownership Recovery

## Ownership State Machine

```text
Provisional
    |
    v
Pending Verification
    |
    v
Verified
    |
    v
Transfer Pending
    |
    v
Transferred

Verified
    |
    v
Recovery Pending
    |
    v
Recovered

Any authorized terminal path
    |
    v
Revoked
```

## Transfer Request State Machine

```text
Pending Acceptance
    |-- Accepted -> Completed
    |-- Rejected
    |-- Cancelled
    `-- Expired
```

Terminal transfer requests cannot be executed again.

## Commands

- EstablishOwnership
- VerifyRepresentative
- InitiateOwnershipTransfer
- AcceptOwnershipTransfer
- RejectOwnershipTransfer
- CancelOwnershipTransfer
- ExpireOwnershipTransfer
- RequestOwnershipRecovery
- ApproveOwnershipRecovery
- RejectOwnershipRecovery

## Domain Events

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
- OWNERSHIP_REVOKED

## Core Invariants

1. Every company must have at least one active owner.
2. Every company must have exactly one canonical owner.
3. Generic membership operations cannot assign or remove ownership.
4. Only the current canonical owner may initiate a voluntary transfer.
5. The proposed owner must be an active member of the same company.
6. Transfer requires explicit acceptance by the proposed owner.
7. Transfer completion must be atomic.
8. Ownership transfer must not change procurement function.
9. Recovery is separate from voluntary transfer.
10. Expired, rejected, cancelled, or completed requests cannot be replayed.
11. Every ownership transition must produce immutable audit evidence.
12. During migration, canonical ownership, owner membership, and
    `companies.user_id` must remain synchronized.

## Integration Contracts

### Workspace Membership

Provides the active membership associated with the current canonical owner.
It cannot independently create or remove ownership.

### Trust and Verification

Provides company- and representative-verification evidence.

### Organization

Creates the company and requests initial ownership establishment.

### Procurement

May query authorized ownership context but cannot mutate ownership.

## Migration Strategy

### Phase A

Introduce the ownership domain while preserving:

- owner workspace membership;
- `companies.user_id`;
- current migration compatibility.

### Phase B

Route all ownership transitions through DEV-004 contracts.

### Phase C

Remove legacy ownership dependencies only through a separately authorized
migration after all consumers and runtime behavior are verified.

## Traceability

```text
DOM-003
  |
  v
RFC-001
  |
  v
DEV-004
  |
  v
Database and domain implementation
  |
  v
Runtime and authorization audit
  |
  v
Formal closure
```

## Acceptance Criteria

- Transfer-request persistence exists.
- Only the current canonical owner can initiate transfer.
- The target is an active member of the same company.
- The target explicitly accepts.
- Requests expire and cannot be replayed.
- Transfer completes atomically.
- The previous owner receives an explicitly selected non-owner role.
- Procurement function remains unchanged.
- Recovery remains a separate workflow.
- Legacy ownership fields remain synchronized during migration.
- Required audit events are generated.
- Unauthorized API calls are rejected.
- Owner, Admin, Member, Viewer, recipient, expiration, atomicity,
  and replay-protection tests pass.

## Implementation Gate

No product implementation begins until:

1. this RFC is approved;
2. DEV-004 is changed from `Proposed` to `Active`;
3. the existing recovery implementation is audited;
4. current ownership establishment is documented;
5. schema and migration dependencies are confirmed.

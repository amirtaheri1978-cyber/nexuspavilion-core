# RFC-001 - Company Ownership Domain

## Status

Draft

Version: 1.1

Domain: DOM-003 - Company Ownership

---

## Related Governance

- DEV-003 - Business Role Foundation
- DEV-004 - Company Ownership Lifecycle

---

## Implemented By

DEV-004 - Company Ownership Lifecycle

---

## Supersedes

None

---

# Purpose

Define the canonical enterprise ownership model for establishing,
verifying, transferring, recovering, auditing, and governing company
ownership throughout Nexus Pavilion.

This RFC establishes Company Ownership as an independent business domain
with its own lifecycle, invariants, commands, events, aggregate, and
governance model.

---

# Business Problem

The current repository already separates ownership from generic workspace
membership by:

- protecting owners from generic membership mutations;
- protecting owners from generic member removal;
- introducing owner-only authorization checks;
- referencing a dedicated ownership-transfer workflow;
- providing a separate ownership recovery endpoint;
- temporarily retaining `companies.user_id` for compatibility.

However:

- voluntary ownership transfer is not implemented;
- ownership recovery is not governed as an enterprise workflow;
- ownership lifecycle is not yet modeled as a canonical business domain.

---

# Repository Evidence

Current repository behavior already demonstrates ownership separation.

Implemented protections include:

- owner protection during role updates;
- owner protection during member removal;
- dedicated ownership transfer authorization;
- dedicated ownership recovery endpoint;
- ownership-aware membership RPCs;
- migration compatibility through `companies.user_id`.

---

# Architectural Decision

Company Ownership is a dedicated enterprise domain.

Ownership is **not**:

- a workspace role;
- a procurement function;
- a profile attribute;
- an authentication concern;
- a company-profile property;
- a generic member-management operation.

Generic membership commands MUST NEVER:

- establish ownership;
- transfer ownership;
- recover ownership;
- revoke ownership;
- replace ownership.

Ownership changes SHALL occur exclusively through Company Ownership
contracts.

---

# Domain Charter

## Owns

- ownership establishment
- canonical owner determination
- representative verification
- ownership transfer
- ownership recovery
- ownership history
- ownership audit evidence
- ownership governance

---

## Does Not Own

- authentication
- user identity
- workspace membership lifecycle
- procurement functions
- RFQ authorization
- quotation authorization
- company profile
- billing
- subscriptions

---

# Canonical Ownership Authority

The Company Ownership domain is the sole canonical authority for
determining ownership.

The following operational projections exist:

| Projection | Purpose |
|------------|---------|
| Company Ownership | Canonical authority |
| organization_memberships.workspace_role = owner | Workspace authorization projection |
| companies.user_id | Temporary legacy compatibility projection |

The ownership aggregate remains the source of truth.

---

# Aggregate Boundaries

## Aggregate Root

`CompanyOwnership`

The aggregate root represents the canonical ownership relationship
between one company and its authorized representative.

---

## Aggregate-Owned Records

The aggregate owns:

- canonical ownership
- ownership transfer requests
- ownership recovery requests
- representative verification
- ownership history
- ownership audit evidence

---

## External References

The aggregate may reference:

- companies.id
- profiles.id
- organization_memberships.id
- authenticated identity
- verification evidence

The aggregate does **not** own these resources.

---

## Explicit Non-Ownership

The aggregate never owns:

- Company Profile
- Workspace Membership
- Procurement Function
- RFQ Authorization
- Quote Authorization
- Authentication
- Billing
- Subscription

---

## Synchronization Contract

Successful ownership completion SHALL atomically synchronize:

1. canonical ownership
2. active owner membership
3. `companies.user_id`
4. immutable ownership audit evidence

Workspace Membership remains an operational projection.

`companies.user_id` remains a temporary compatibility projection only.

---

# Aggregate Data

- Ownership ID
- Company ID
- Representative ID
- Ownership Status
- Verification Status
- Created Timestamp
- Verified Timestamp
- Superseded Timestamp
- Revoked Timestamp

---

# Capabilities

- CAP-003 Ownership Establishment
- CAP-004 Representative Verification
- CAP-005 Ownership Transfer
- CAP-006 Ownership Recovery

---

# Company Ownership State Machine

The ownership state represents the current canonical relationship between
a company and its authorized representative.

Workflow requests NEVER modify ownership until completion succeeds.

```text
Provisional
    |
    v
Verified

Provisional or Verified
    |
    v
Superseded

Provisional or Verified
    |
    v
Revoked
```

## State Definitions

### Provisional

Ownership exists but representative verification is incomplete.

---

### Verified

Representative verification completed successfully.

Current canonical owner.

---

### Superseded

Historical ownership replaced by:

- completed transfer
- completed recovery

This ownership record is immutable.

---

### Revoked

Ownership terminated through an authorized governance action.

---

Transferred and Recovered are workflow outcomes, not ownership states.

---

# Ownership Transfer Request State Machine

Transfer requests are independent from ownership.

The current owner remains the canonical owner until the atomic transfer
transaction completes successfully.

```text
Pending Acceptance
    |
    +---- Accepted
    |         |
    |         v
    |     Completed
    |
    +---- Rejected
    |
    +---- Cancelled
    |
    +---- Expired
```

## Rules

Only Pending Acceptance requests may transition.

Completed requests are immutable.

Expired requests cannot be replayed.

Rejected requests cannot be replayed.

Cancelled requests cannot be replayed.

---

# Ownership Recovery Request State Machine

Recovery is a governance workflow independent from voluntary transfer.

```text
Pending Review
    |
    +---- Approved
    |         |
    |         v
    |     Completed
    |
    +---- Rejected
    |
    +---- Cancelled
```

## Rules

Approval alone never changes ownership.

Ownership changes only after the recovery completion transaction succeeds.

Completed recovery supersedes the previous ownership relationship.

Recovery requires:

- identity evidence
- company evidence
- reviewer
- decision record
- immutable audit

---

# Commands

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

---

# Domain Events

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

Events are immutable.

---

# Core Invariants

## Database-Enforced

### INV-001

A company may have at most one active canonical owner.

### INV-002

A user may have only one membership per company.

---

## Workflow-Enforced

### INV-003

Every company must always have one active canonical owner after every
successful ownership transaction.

### INV-004

Generic membership operations cannot establish or remove ownership.

### INV-005

Only the canonical owner may initiate voluntary transfer.

### INV-006

The proposed owner must already be an active workspace member.

### INV-007

Ownership transfer requires explicit acceptance.

### INV-008

Ownership completion must be atomic.

### INV-009

Ownership transfer shall never modify procurement function.

### INV-010

Recovery remains independent from voluntary transfer.

### INV-011

Completed, expired, rejected and cancelled requests cannot be replayed.

### INV-012

Every ownership transition produces immutable audit evidence.

### INV-013

Canonical ownership, owner membership, and legacy compatibility
projection (`companies.user_id`) remain synchronized throughout the
migration period.

---

# Integration Contracts

## Workspace Membership

Provides operational authorization.

Never establishes ownership.

Never transfers ownership.

Never recovers ownership.

---

## Organization

Creates companies.

Requests initial ownership establishment.

---

## Trust and Verification

Provides representative verification evidence.

---

## Procurement

Consumes ownership authorization.

Never mutates ownership.

---

# Migration Strategy

## Phase A

Introduce Company Ownership while maintaining:

- owner membership
- companies.user_id
- backward compatibility

---

## Phase B

Route all ownership operations through DEV-004 contracts.

---

## Phase C

Remove legacy ownership projections after all runtime dependencies have
been migrated and verified.

---

# Traceability

```text
DOM-003
      │
      ▼
RFC-001
      │
      ▼
DEV-004
      │
      ▼
Ownership Aggregate
      │
      ▼
Database
      │
      ▼
RPC
      │
      ▼
API
      │
      ▼
UI
      │
      ▼
Runtime Audit
```

---

# Acceptance Criteria

The implementation is complete when:

- ownership establishment exists;
- representative verification exists;
- transfer requests persist;
- recovery requests persist;
- only canonical owners initiate transfer;
- recipients explicitly accept transfer;
- transfer completes atomically;
- previous ownership becomes superseded;
- procurement function remains unchanged;
- recovery remains independent;
- audit evidence is immutable;
- replay protection exists;
- ownership synchronization is guaranteed;
- legacy compatibility remains synchronized until migration completion.

---

# Implementation Gate

Implementation SHALL NOT begin until:

1. RFC-001 is approved.
2. DEV-004 becomes Active.
3. Recovery implementation is audited.
4. Ownership establishment is documented.
5. Schema dependencies are confirmed.
6. Ownership invariants are formally accepted.
7. Aggregate boundaries are approved.
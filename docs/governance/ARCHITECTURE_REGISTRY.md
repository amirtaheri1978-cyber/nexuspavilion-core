# Nexus Pavilion Architecture Registry

## Purpose

This registry is the canonical index of major domains, capabilities,
architecture specifications, and governed implementation deviations.

The repository is the source of truth. Chat history is not a project
record and must not be required to recover project state.

## Domains

| ID | Domain | Status | Canonical Responsibility |
|---|---|---|---|
| DOM-001 | Identity | Active | Authentication and user identity |
| DOM-002 | Organization | Active | Company identity and organization records |
| DOM-003 | Company Ownership | Active - technical backend baseline verified; integration validation deferred | Canonical ownership, verification, transfer, and recovery |
| DOM-004 | Workspace Membership | Active | Membership lifecycle and operational workspace authority |
| DOM-005 | Trust and Verification | Active - Section 4 authorized; technical discovery pending | Company and representative verification |
| DOM-006 | Procurement | Active | RFQ, quote, award, and procurement workflows |
| DOM-007 | Supplier Network | Active | Supplier discovery and organizational relationships |
| DOM-008 | Executive Intelligence | Active | Procurement analytics and executive decision support |

## Capabilities

| ID | Capability | Domain | Status | RFC | Deviation |
|---|---|---|---|---|---|
| CAP-001 | Workspace Membership Management | DOM-004 | Implemented, under closeout | — | DEV-003 |
| CAP-002 | Workspace Role Administration | DOM-004 | Implemented, under closeout | — | DEV-003 |
| CAP-003 | Ownership Establishment | DOM-003 | Compatibility ownership baseline and transfer backend foundation verified; broader establishment and representative-verification workflow deferred | RFC-001 | DEV-004 |
| CAP-004 | Representative Verification | DOM-005, dependent on DOM-003 | Active - Section 4 governance contract approved; not implemented or verified | RFC-001 | DEV-004 |
| CAP-005 | Ownership Transfer | DOM-003 | Backend implemented; pre-launch behavioral verification deferred | RFC-001 | DEV-004 |
| CAP-006 | Ownership Recovery | DOM-003 | Deferred governance scope; normal recovery endpoint disabled | RFC-001 | DEV-004 |

## Governance Records

| Record | Status | Purpose |
|---|---|---|
| PROJECT_CONSTITUTION | Active | Project-wide governance rules |
| DEV-003 | Technical implementation complete; deferred pre-launch verification | Business Role Foundation |
| RFC-001 | Draft - implementation reconciliation recorded | Company Ownership Domain Specification |
| DEV-004 | Active - technical backend implementation verified; integration/UI validation deferred | Company Ownership Lifecycle implementation |

## Canonical Decisions

1. Workspace membership and company ownership are separate concepts.
2. Generic member management cannot assign, demote, remove, or replace an owner.
3. Ownership transfer and ownership recovery are separate governance workflows.
4. Procurement function must remain unchanged during ownership transitions.
5. During migration, canonical ownership records, owner membership, and
   `companies.user_id` must remain synchronized.
6. Major capability implementation requires repository evidence, runtime
   validation, audit evidence, and formal closure.

## Current Execution Position

- Section 3: Technical implementation complete; Development verification complete with deferred pre-launch behavioral items
- DEV-003: Technical implementation complete; deferred runtime verification remains visible
- RFC-001: Draft; implementation reconciliation recorded without asserting formal RFC approval
- DEV-004: Active; backend implementation verified, with integration and UI/UX validation deferred
- Section 4: Representative Verification Foundation governance contract approved; technical discovery authorized; implementation, verification, and Production authorization remain pending
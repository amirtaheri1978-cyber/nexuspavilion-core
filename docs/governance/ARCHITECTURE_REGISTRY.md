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
| DOM-003 | Company Ownership | Proposed | Canonical ownership, verification, transfer, and recovery |
| DOM-004 | Workspace Membership | Active | Membership lifecycle and operational workspace authority |
| DOM-005 | Trust and Verification | Planned | Company and representative verification |
| DOM-006 | Procurement | Active | RFQ, quote, award, and procurement workflows |
| DOM-007 | Supplier Network | Active | Supplier discovery and organizational relationships |
| DOM-008 | Executive Intelligence | Active | Procurement analytics and executive decision support |

## Capabilities

| ID | Capability | Domain | Status | RFC | Deviation |
|---|---|---|---|---|---|
| CAP-001 | Workspace Membership Management | DOM-004 | Implemented, under closeout | — | DEV-003 |
| CAP-002 | Workspace Role Administration | DOM-004 | Implemented, under closeout | — | DEV-003 |
| CAP-003 | Ownership Establishment | DOM-003 | Planned | RFC-001 | DEV-004 |
| CAP-004 | Representative Verification | DOM-003 / DOM-005 | Planned | RFC-001 | DEV-004 |
| CAP-005 | Ownership Transfer | DOM-003 | Planned | RFC-001 | DEV-004 |
| CAP-006 | Ownership Recovery | DOM-003 | Existing legacy flow; requires governance hardening | RFC-001 | DEV-004 |

## Governance Records

| Record | Status | Purpose |
|---|---|---|
| PROJECT_CONSTITUTION | Active | Project-wide governance rules |
| DEV-003 | Implemented, under completion audit | Business Role Foundation |
| RFC-001 | Draft | Company Ownership Domain Specification |
| DEV-004 | Proposed | Company Ownership Lifecycle implementation |

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

- Sections 1–2: Complete
- Section 3: In progress
- DEV-003: Implemented; completion audit in progress
- RFC-001: Draft created
- DEV-004: Proposed
- No DEV-004 product implementation has started

# Nexus Pavilion Project Constitution

**Status:** Active  
**Authority:** Product Owner  
**Purpose:** Highest-level decision framework for product, architecture, and execution  
**Last reviewed:** 2026-08-02

---

## 1. Product Definition

Nexus Pavilion is an enterprise platform for:

- company workspace administration;
- organization membership and access governance;
- construction procurement and sourcing;
- supplier participation;
- RFQ management;
- quotation and evaluation;
- contract award;
- executive intelligence and auditability.

The platform must preserve clear boundaries between organizational access and procurement business processes.

---

## 2. Decision Hierarchy

All product and engineering decisions must follow this hierarchy:

1. Product Constitution
2. Business Architecture
3. Platform Architecture
4. Architecture Decision Records
5. Master Launch Execution Plan
6. Active Deviation Records
7. Implementation Tasks
8. Code and Database Changes

A lower-level decision may not silently contradict a higher-level decision.

When a conflict exists, implementation must stop until the conflict is resolved explicitly.

---

## 3. Core Architectural Principles

### 3.1 Workspace membership and procurement workflows are related but distinct

Workspace membership provides the organizational identity and authorization foundation used by business workflows.

Procurement workflows consume those permissions, but they do not define company membership.

---

### 3.2 Workspace Invitation and RFQ Invitation are different business flows

A **Workspace Invitation** invites a person to become a member of a company's workspace.

Expected result:

```text
Person
→ Workspace Invitation
→ Organization Membership
→ Workspace Role and Procurement Function
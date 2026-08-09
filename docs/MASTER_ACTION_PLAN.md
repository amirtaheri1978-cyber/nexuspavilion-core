# Nexus Pavilion — Master Action Plan

> Single source of truth for engineering progress.
> Every completed task is locked and must not be reopened unless explicitly approved.

---

# Locked Milestones

## Foundation
- [x] Project architecture
- [x] Governance registry
- [x] Project constitution

## Executive Analytics
- [x] Enterprise Executive PDF
- [x] Board-ready report
- [x] Print layout
- [x] Cover page
- [x] Table of contents
- [x] Executive summary
- [x] Executive scorecards
- [x] Footer cleanup
- [x] Production-ready PDF

## Stability
- [x] Build passing
- [x] Lint passing
- [x] Git clean

---

# Current Development

## Section 3

Status: TECHNICAL IMPLEMENTATION COMPLETE — DEVELOPMENT VERIFICATION COMPLETE WITH DEFERRED PRE-LAUNCH BEHAVIORAL ITEMS

Current Focus:
- Product Owner closeout review and the approved Section 4 transition.

Completed:
- [x] Enterprise PDF
- [x] Build stabilization
- [x] Lint stabilization
- [x] Section 3 ownership and membership technical implementation
- [x] Dedicated Development schema, migration, RLS, privilege, RPC ACL, invariant, and audit-contract verification
- [x] Production isolation confirmed

Deferred — pre-launch / integration verification required:
- [ ] D1 Authenticated Request -> Accept
- [ ] D2 Authenticated Request -> Reject
- [ ] D3 Expiration behavior
- [ ] D4 Replay/idempotency behavior
- [ ] D5 Concurrency/race behavior
- [ ] D6 Role-specific company DELETE behavior

Gate classification: D1-D6 are NON-BLOCKING FOR SECTION 4 and REQUIRED BEFORE PRODUCTION LAUNCH unless a later explicit Product Owner governance decision changes that status.

Cancellation: DEFERRED BY DESIGN. It is not implemented and is not required for Section 3 technical completion.

Production: not touched.

---

## Section 4

Title: Representative Verification Foundation

Status: GOVERNANCE CONTRACT APPROVED - TECHNICAL DISCOVERY AUTHORIZED

Purpose: Establish a secure, auditable foundation for verifying a representative's authority to represent a specific company without changing ownership authority.

Primary domain: DOM-005 Trust and Verification.

Dependency domain: DOM-003 Company Ownership.

Scope:
- Representative authority for a specific company, not company legal/business verification and not ownership itself.
- Metadata/status-only verification cases; no raw documents, sensitive-evidence storage, external providers, or automated verification.
- Lifecycle: `unverified -> pending_review -> verified | rejected`.
- Current canonical ownership is submission eligibility only; it is not a permanent representative-equals-owner invariant.
- Authorized internal platform reviewers issue decisions; this authority is distinct from workspace, company, and procurement roles.

Authorization and privacy:
- Status is available to the current canonical owner and active company admins.
- Case metadata and decision/rationale are available to the submitting representative and authorized internal reviewers.
- Audit access is reviewer-authorized; submitters receive only appropriately redacted company-scoped information.
- Audit events are immutable and use non-sensitive metadata. General activity feeds must not contain raw evidence or sensitive reviewer notes.

Required lifecycle events:
- `REPRESENTATIVE_VERIFICATION_SUBMITTED`
- `REPRESENTATIVE_VERIFICATION_REJECTED`
- `REPRESENTATIVE_VERIFIED`

Implementation expectations:
- Prevent multiple active pending cases for the same governed representative/company relationship.
- Make terminal decisions idempotent, reject stale review safely, allow exactly one concurrent terminal decision, and deny cross-company access without disclosure.
- Do not silently transfer verification authority when ownership changes while a case is pending; technical invalidation behavior requires separate design.
- Use static, integration, accessibility, responsive UI, and dedicated Development runtime verification before closeout.

Out of scope:
- Section 3 D1-D6 execution, ownership-transfer cancellation, ownership recovery, company legal/business verification, raw document upload/storage, external providers, automated verification, scheduled re-verification, revocation, jurisdiction-specific legal rules, compliance dashboards, workspace membership redesign, RFQ procurement changes, legacy ownership-field removal, and Production deployment.

Deferred policies:
- Retention duration: DEFERRED - REQUIRED BEFORE PRODUCTION.
- Deletion / legal-hold policy: DEFERRED - REQUIRED BEFORE PRODUCTION.
- Sensitive-evidence storage: DEFERRED - REQUIRED BEFORE ANY FUTURE RAW-EVIDENCE CAPABILITY.
- External-provider policy, revocation, and re-verification: DEFERRED.

Acceptance criteria:
- The approved minimal lifecycle, reviewer authority, least-privilege reads, audit events, and ownership boundary are implemented and verified.
- Workspace membership and RFQ Procurement remain separate.
- Dedicated Development runtime evidence, build, lint, and clean working tree are recorded before closeout.

Exit criteria:
- Product Owner approves completion evidence.
- Governance records and CAP-004 status are reconciled.
- Production remains separately authorized; Section 4 governance approval does not authorize Production.

---

## Section 5

Status: ⏳ Pending

---

# Rules

1. Completed tasks are LOCKED.
2. Never reopen completed work unless explicitly requested.
3. Every feature finishes with:
   - Build ✅
   - Lint ✅
   - Git Clean ✅
4. This file is the single source of truth.

# DEV-003 — Business Role Foundation

**Status:** Technical implementation complete; Product Owner-authorized closeout with deferred pre-launch verification
**Master Plan Position:** Section 3  
**Affected Domain:** Company Workspace  
**Secondary Dependency:** Procurement Authorization  
**Return Point:** Master Launch Execution Plan — Section 3  
**Owner:** Product Owner  
**Last reviewed:** 2026-08-02

**Closeout decision:** On 2026-08-09, the Product Owner accepted the Section 3 Development technical baseline and authorized Section 4 after independent governance review and commit. Deferred authenticated workflow and concurrency checks remain pre-launch / integration requirements and are not recorded as executed.

---

## 1. Reason for Deviation

During Section 3 of the Master Launch Execution Plan, a structural gap was discovered in the original authorization model.

The legacy model combined several different concepts inside:

- `profiles.role`
- `profiles.company_id`

This model did not clearly distinguish:

- organizational authority;
- workspace membership;
- procurement business function;
- membership lifecycle;
- tenant scope.

The deviation was opened to establish a dedicated workspace membership foundation before continuing the launch plan.

---

## 2. Domain Boundary

This deviation belongs primarily to the **Company Workspace Domain**.

It covers:

- company membership;
- workspace authority;
- procurement function assigned to a workspace member;
- workspace invitation acceptance;
- member access management;
- membership lifecycle;
- membership-based workspace reads.

It does not include:

- RFQ supplier invitation redesign;
- quotation authorization migration;
- award authorization migration;
- procurement email redesign;
- new procurement features;
- analytics redesign;
- unrelated navigation redesign.

---

## 3. Business Rules

### 3.1 Workspace Role

Workspace Role represents organizational authority.

Supported values:

- `owner`
- `admin`
- `member`
- `viewer`

---

### 3.2 Procurement Function

Procurement Function represents a member's business function.

Supported values:

- `buyer`
- `supplier`
- `consultant`
- `none`

Workspace Role and Procurement Function must remain separate concepts.

---

### 3.3 Membership Status

Membership Status represents the lifecycle of workspace access.

Supported values:

- `pending`
- `active`
- `suspended`
- `revoked`

Only an active membership may provide authoritative workspace access.

---

### 3.4 Invitation Boundary

A Workspace Invitation:

- invites a person to join a company workspace;
- may create or reactivate an organization membership;
- assigns workspace authority and business function.

An RFQ Invitation:

- invites a supplier to one specific RFQ;
- does not create membership in the buyer's workspace;
- belongs to the Procurement Domain.

These flows must never be treated as the same business process.

---

## 4. Changes Completed

### Database Foundation

- [x] `organization_memberships` foundation created
- [x] workspace role model introduced
- [x] membership type model introduced
- [x] membership status model introduced
- [x] procurement function added to membership model
- [x] active membership uniqueness and lifecycle considered
- [x] compatibility with legacy profile fields retained temporarily

### Workspace Commands

- [x] workspace role update command introduced
- [x] member removal command introduced
- [x] member removal revokes membership instead of destroying history
- [x] owner protection exists
- [x] self-removal protection exists
- [x] sensitive membership mutations write audit records

### Workspace Invitation Acceptance

- [x] invitation acceptance validates authenticated identity
- [x] invitation recipient email is validated
- [x] invitation expiration is validated
- [x] invitation status is validated
- [x] membership is created or reactivated
- [x] legacy profile compatibility fields are synchronized
- [x] invitation is marked accepted
- [x] audit record is created
- [x] acceptance is handled atomically through a protected command

### Workspace Read Model

- [x] workspace member list is loaded through a protected RPC
- [x] RLS no longer limits the company member UI to the current user
- [x] member counts use active memberships
- [x] workspace roles are displayed from membership data
- [x] procurement functions are displayed from membership data
- [x] revoked memberships are excluded from the active member list

### Workspace UI

- [x] company member list displays all active workspace members
- [x] current user cannot manage their own membership from the member panel
- [x] owner is protected from generic member removal
- [x] role and access controls use membership data
- [x] workspace invitations are clearly distinguished from RFQ invitations
- [x] workspace terminology is clear in member-management UI

---

## 5. Items Requiring Final Validation

### Runtime Validation

- [ ] owner can view all active workspace members
- [ ] admin can view all active workspace members
- [ ] member can view only the level of workspace data permitted by policy
- [ ] viewer cannot execute workspace mutations
- [ ] owner/admin can update an eligible member's workspace role
- [ ] unauthorized member cannot update workspace roles
- [ ] owner/admin can remove an eligible non-owner member
- [ ] user cannot remove themselves
- [ ] owner cannot be removed by the generic member-removal flow
- [ ] removed member receives `membership_status = revoked`
- [ ] removed member loses legacy active company attachment
- [ ] re-inviting a revoked member correctly reactivates membership
- [ ] accepting a fresh workspace invitation creates an active membership
- [ ] accepting an invitation with the wrong email is rejected
- [ ] accepting an expired invitation is rejected
- [ ] accepting an already-used invitation is rejected

### Data Consistency Validation

- [ ] every active legacy company attachment has an expected membership record
- [ ] active membership company matches legacy `profiles.company_id`
- [ ] workspace owner data is consistent with the company record
- [ ] no duplicate active memberships exist for the same user and company
- [ ] revoked members do not appear in the active workspace member list
- [ ] membership role and procurement function combinations are valid
- [ ] audit records contain the correct actor, target, company, and previous state

### Engineering Validation

- [x] lint passes
- [ ] production build passes
- [ ] working tree is clean
- [x] migrations are committed
- [x] migration names are unique and ordered
- [x] RPC execute permissions are restricted to intended roles
- [ ] security-definer functions use a controlled `search_path`
- [x] no service-role key is exposed in application code
- [x] no unrelated Procurement Domain behavior was changed by this deviation

---

## 6. Legacy Dependencies

The following legacy fields may still exist temporarily:

- `profiles.role`
- `profiles.company_id`
- `companies.user_id`

They may support migration compatibility.

They must not be removed until:

1. all consuming routes are inventoried;
2. each consuming route is assigned to a formal migration phase;
3. runtime tests confirm replacement behavior;
4. the Master Plan authorizes the next migration.

Procurement routes are not automatically part of this deviation merely because they currently read legacy fields.

---

## 7. Explicitly Deferred Work

The following work is deferred and must not be silently added to DEV-003:

- Procurement Authorization Migration
- RFQ supplier invitation authorization migration
- quote submission authorization migration
- quote decision authorization migration
- award authorization migration
- approved vendor authorization migration
- procurement email redesign
- Activity Center domain separation
- additional navigation redesign
- deletion of all legacy profile fields

Each deferred item requires its own Plan position or formal deviation.

---

## 8. Completion Criteria

DEV-003 may be marked complete only when:

1. all Runtime Validation items are checked;
2. all Data Consistency Validation items are checked;
3. all Engineering Validation items are checked;
4. all known changes are classified as:
   - KEEP
   - CORRECT
   - REVERT
   - DEFER
5. no unresolved workspace-membership defect remains;
6. no Procurement Domain flow was unintentionally modified;
7. the working tree is clean;
8. the Product Owner approves closure.

### Deferred Pre-Launch Verification

The Section 3 technical baseline is accepted with the following unresolved verification work: authenticated Request -> Accept, Request -> Reject, expiration, replay/idempotency, concurrency/race, and role-specific company DELETE behavior. These items do not block Section 4, but they remain required before Production launch unless the Product Owner changes that decision.

---

## 9. Closure Procedure

When all completion criteria are satisfied:

1. change status from `Active` to `Complete`;
2. record the completion date;
3. record the final commit hash;
4. create a completion tag;
5. return to Master Launch Execution Plan — Section 3;
6. update the Master Plan progress report;
7. open a separate deviation only if the next plan item requires one.

Suggested tag:

```text
business-role-foundation-complete
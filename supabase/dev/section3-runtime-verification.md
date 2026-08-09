# Section 3 Development runtime verification matrix

Development only. Do not execute against Production. Every case below uses the same structure: setup, actor, action, expected RPC/API result, database state, audit evidence, non-changes, replay/second attempt, concurrency expectation where applicable, cleanup, and pass criteria.

## Global isolation and evidence rules

- Use fresh synthetic companies for destructive lifecycle scenarios when practical.
- Record deterministic scenario labels; terminal requests are reused only by their replay case.
- Keep concurrency fixtures separate from ordinary cases.
- Scope audit checks by `transfer_request_id` and `company_id`.
- Reset by discarding scenario-specific synthetic fixtures or restoring them through an approved Development-only process; no reset SQL is supplied here.

## Membership cases

| ID / purpose | Preconditions / actor / action | Expected API or RPC result | Expected database state, audit, non-changes, replay, cleanup, pass criteria |
| --- | --- | --- | --- |
| M-01 Own membership read | User C is active in Company A. Actor: User C. Action: direct table read limited to own membership. | Own row is returned. | No mutation or audit expected; other users’ rows are absent. Repeat yields the same read-only result. Reset none. Pass: only own row visible. |
| M-02 Other-member direct read denied | User C and User B are active. Actor: User C. Action: direct table read targeting User B. | No User B membership row is returned through self-read policy. | No mutation/audit. Repeat remains denied. Reset none. Pass: RLS prevents cross-user direct read. |
| M-03 Authorized role update | User A owner and User C member. Actor: User A. Action: update User C to viewer through role RPC. | Success. | User C role becomes viewer; one `MEMBER_WORKSPACE_ROLE_UPDATED` audit; procurement function unchanged. Replay returns success only if same permitted update remains accepted; audit behavior must match implementation. Restore User C to member. Pass: authorized change only. |
| M-04 Unauthorized role update | User C member and User D viewer. Actor: User C. Action: update User D through role RPC. | Forbidden result. | No membership change or audit. Replay remains forbidden. Reset none. Pass: User D remains viewer. |
| M-05 Owner protection | User A owner. Actor: User B admin. Action: attempt to demote or remove User A through generic role/removal RPC. | `OWNER_PROTECTED` result. | User A remains active owner; no ownership projection or audit mutation from the rejected command. Replay remains protected. Reset none. Pass: owner unchanged. |
| M-06 Authorized removal | User A owner and User C active member. Actor: User A. Action: remove User C through removal RPC. | Success. | User C membership becomes revoked; legacy profile company attachment is cleared only as implemented; one `MEMBER_REMOVED` audit. Replay reports member unavailable/forbidden and creates no extra removal audit. Restore/recreate fixture. Pass: controlled removal only. |
| M-07 Unauthorized removal | User C member and User D viewer. Actor: User C. Action: remove User D. | Forbidden result. | No state or audit change. Replay remains forbidden. Reset none. Pass: User D active viewer. |
| M-08 Invitation acceptance | Fresh synthetic invitation for a synthetic account. Actor: invited account with matching Auth email. Action: accept invitation RPC. | Success. | Profile and active membership created/activated with mapped role/procurement function; invitation accepted; notification and `INVITATION_ACCEPTED` audit exist. Second attempt is not pending and must not recreate membership/audit. Discard fixture. Pass: exactly one acceptance transition. |

## Ownership-request cases

| ID / purpose | Preconditions / actor / action | Expected API or RPC result | Expected database state, audit, non-changes, replay, cleanup, pass criteria |
| --- | --- | --- | --- |
| OR-01 Valid request | User A owner, User B active admin, no pending transfer. Actor: User A. Action: request transfer to User B. | Success. | One pending request from A to B; one `OWNERSHIP_TRANSFER_REQUESTED` audit; ownership/memberships/company projection unchanged. A second identical request follows OR-08. Discard or use in OA/OJ. Pass: valid pending request. |
| OR-02 Unauthenticated request | No authenticated actor. Action: request transfer. | `UNAUTHENTICATED`. | No request/audit/state mutation. Repeat same result. Reset none. Pass: no anonymous transition. |
| OR-03 Non-owner request | User C active member. Actor: User C. Action: request transfer to User B. | Forbidden/not-owner result. | No request/audit/ownership mutation. Repeat denied. Reset none. Pass: owner-only enforcement. |
| OR-04 Self transfer | User A owner. Actor: User A. Action: target User A. | Self-transfer validation failure. | No request/audit mutation. Repeat denied. Reset none. Pass: no self request. |
| OR-05 Inactive target | User E suspended. Actor: User A. Action: target User E. | Target-not-active failure. | No request/audit mutation. Repeat denied. Reset none. Pass: suspended target rejected. |
| OR-06 Cross-company target | User F belongs only to Company B. Actor: User A. Action: target User F. | Target-not-found/cross-company failure. | No request/audit mutation. Repeat denied. Reset none. Pass: company boundary preserved. |
| OR-07 Existing owner target | User A is existing active owner. Actor: User A. Action: target an owner identity, using a controlled fixture if needed. | Target-already-owner or self-transfer failure. | No request/audit mutation. Repeat denied. Reset fixture. Pass: owner cannot be target. |
| OR-08 One pending request | OR-01 pending request exists. Actor: User A. Action: request another transfer for Company A. | `PENDING_TRANSFER_EXISTS`. | Exactly one pending request; no second Requested audit. Repeat same result. Resolve/discard fixture. Pass: partial unique invariant holds. |
| OR-09 Request-time expiration | Old Company A pending request is expired; User A and User B otherwise valid. Actor: User A. Action: create a new request. | Success for new request. | Old request changes pending to expired with one `OWNERSHIP_TRANSFER_EXPIRED`; new request is pending with one `OWNERSHIP_TRANSFER_REQUESTED`; ownership unchanged. Second request follows OR-08. Discard fixtures. Pass: expiration audit and new request prove request-time cleanup. |

## Ownership-acceptance cases

| ID / purpose | Preconditions / actor / action | Expected API or RPC result | Expected database state, audit, non-changes, replay, cleanup, pass criteria |
| --- | --- | --- | --- |
| OA-01 Correct acceptance | Pending A-to-B request. Capture A=buyer and B=supplier procurement functions. Actor: User B. Action: accept RPC. | Success, completed. | A becomes configured post-transfer role; B becomes owner; `companies.user_id` becomes B; request has accepted/completed timestamps; both procurement values unchanged. Audits ordered Accepted then Completed, one each for request. Replay covered OA-05. Reset fresh fixture. Pass: atomic transition and F2 audit proof. |
| OA-02 Wrong actor | Pending A-to-B request. Actor: User C. Action: accept. | `NOT_TRANSFER_RECIPIENT`. | Request remains pending; roles, projection, and audits unchanged. Repeat denied. Discard/use valid recipient separately. Pass: recipient-only enforcement. |
| OA-03 Expired acceptance | Pending A-to-B request with elapsed expiry. Actor: User B. Action: accept. | `REQUEST_EXPIRED`. | Request becomes expired; ownership/projection/roles unchanged; one Expired audit. Second acceptance reports terminal expired state and adds no audit. Discard fixture. Pass: acceptance-time expiration. |
| OA-04 Rejected acceptance | Rejected A-to-B request. Actor: User B. Action: accept. | `REQUEST_REJECTED`. | No mutation/audit. Replay same terminal response. Reset none. Pass: rejected request cannot complete. |
| OA-05 Completed replay | Completed A-to-B request from OA-01. Actor: User B. Action: accept again. | `REQUEST_ALREADY_COMPLETED`. | No second role/projection change and no extra Accepted/Completed audit. Reset fixture. Pass: exactly one completion. |
| OA-06 Cancelled-state replay only | Manually prepared synthetic cancelled request; no cancellation command is invoked. Actor: User B. Action: accept. | `REQUEST_CANCELLED`. | No mutation/audit. Replay same terminal result. Discard manual fixture. Pass: reserved terminal state is respected. |

## Ownership-rejection cases

| ID / purpose | Preconditions / actor / action | Expected API or RPC result | Expected database state, audit, non-changes, replay, cleanup, pass criteria |
| --- | --- | --- | --- |
| OJ-01 Correct rejection | Pending A-to-B request. Actor: User B. Action: reject RPC. | Success, rejected. | Request is rejected with timestamp; ownership, roles, and `companies.user_id` unchanged; one Rejected audit. Replay covered OJ-04. Discard fixture. Pass: rejection has no ownership mutation. |
| OJ-02 Wrong actor reject | Pending A-to-B request. Actor: User C. Action: reject. | Recipient-only failure. | Pending request and all ownership state remain unchanged; no audit. Repeat denied. Discard/use valid recipient separately. Pass: recipient-only enforcement. |
| OJ-03 Expired rejection | Pending A-to-B request with elapsed expiry. Actor: User B. Action: reject. | `REQUEST_EXPIRED`. | Request becomes expired; ownership unchanged; one Expired audit. Second attempt terminal/no extra audit. Discard fixture. Pass: reject-time expiration evidence. |
| OJ-04 Rejected replay | Rejected A-to-B request. Actor: User B. Action: reject again. | Terminal rejected result. | No second rejection timestamp mutation or duplicate Rejected audit. Reset fixture. Pass: exactly one rejection. |

## Concurrency cases

| ID / synchronization method | Setup / action | Expected result and final invariant | Audit count / reset / pass criteria |
| --- | --- | --- | --- |
| C-01 Duplicate requests | Two authenticated User A sessions are released simultaneously against a fresh Company A fixture. | One request succeeds; one receives pending/conflict result; exactly one pending request and one active owner. | One Requested audit only. Discard fixture. Pass: unique pending invariant. |
| C-02 Concurrent accept | Two User B sessions are released simultaneously for one pending request. | One succeeds; one sees completed/terminal result; one active owner matching company projection. | One Accepted and one Completed audit only. Discard fixture. Pass: one completion. |

### C-03 Accept versus reject race

- **TEST ID:** C-03
- **INITIAL STATE:** One pending A-to-B transfer request (`pending_acceptance`), User A active owner, User B active recipient, and `companies.user_id = User A`.
- **OPERATION A:** User B invokes `accept_company_ownership_transfer` for that request.
- **OPERATION B:** User B invokes `reject_company_ownership_transfer` for the same request.
- **SYNCHRONIZATION METHOD:** Release both calls through a conceptual barrier or simultaneous invocation against the same request ID.
- **PERMITTED WINNER(S):** Either operation may acquire the decisive request lock first.
- **WINNER RESPONSE:** Accept winner returns success/completed; reject winner returns success/rejected.
- **LOSER RESPONSE:** The loser must return an existing terminal/not-pending failure appropriate to the resulting request state; no new error code is assumed.
- **FINAL REQUEST STATE:** If accept wins, `completed`; if reject wins, `rejected`.
- **FINAL OWNER STATE:** If accept wins, User B is active owner, User A has `previous_owner_next_role`, and `companies.user_id = User B`. If reject wins, owner roles and `companies.user_id` remain unchanged.
- **EXPECTED AUDIT COUNTS:** Accept winner: exactly one `OWNERSHIP_TRANSFER_ACCEPTED`, exactly one `OWNERSHIP_TRANSFER_COMPLETED`, zero `OWNERSHIP_TRANSFER_REJECTED`. Reject winner: exactly one `OWNERSHIP_TRANSFER_REJECTED`, zero Accepted, zero Completed.
- **EXPECTED NON-CHANGES:** No winner creates the opposite terminal state; procurement functions remain unchanged.
- **DUPLICATE-EVIDENCE CHECK:** The request has evidence for only its winning terminal path; no duplicate terminal audit event exists.
- **PASS CRITERIA:** Exactly one terminal transition and the matching ownership projection and audit pattern exist. Discard the isolated fixture.

### C-04 Request-time expiration cleanup versus accept race

- **TEST ID:** C-04
- **INITIAL STATE:** An old A-to-B request is pending at the boundary `expires_at <= current timestamp`; ownership still belongs to User A.
- **OPERATION A:** User A invokes a new transfer request, causing request-time cleanup to attempt expiration of the old request.
- **OPERATION B:** User B invokes `accept_company_ownership_transfer` for that same old request.
- **SYNCHRONIZATION METHOD:** Use a conceptual barrier around the expiry boundary and simultaneously release both operations.
- **PERMITTED WINNER(S):** Expiration cleanup may win after expiry is established; acceptance may win only if it completes before expiration is established for its transaction.
- **WINNER RESPONSE:** Cleanup winner permits the new request flow subject to ordinary pending-request checks; accept winner returns success/completed for the old request.
- **LOSER RESPONSE:** If cleanup wins, acceptance returns `REQUEST_EXPIRED` or another existing terminal-state failure. If acceptance wins, cleanup does not expire the completed request; because User A may no longer be owner, the new-request call must be assessed against the request RPC's existing post-accept authorization result rather than assumed to be a pending/conflict result.
- **FINAL REQUEST STATE:** Old request is exactly one of `expired` or `completed`, never both.
- **FINAL OWNER STATE:** Expired outcome leaves User A as owner and leaves `companies.user_id` unchanged. Completed outcome promotes User B, demotes User A according to `previous_owner_next_role`, and sets `companies.user_id = User B`.
- **EXPECTED AUDIT COUNTS:** Expired outcome: exactly one `OWNERSHIP_TRANSFER_EXPIRED`, zero Accepted, zero Completed for the old request. Completed outcome: exactly one Accepted, exactly one Completed, zero Expired for the old request.
- **EXPECTED NON-CHANGES:** No duplicate expiration audit; procurement functions remain unchanged in either outcome.
- **DUPLICATE-EVIDENCE CHECK:** The old request has audit evidence for one terminal outcome only; any new request is audited and asserted separately by its own request ID.
- **PASS CRITERIA:** One terminal state, matching owner projection, and matching audit counts for the old request. Discard all isolated fixtures.

### C-05 Request-time expiration cleanup versus reject race

- **TEST ID:** C-05
- **INITIAL STATE:** An old A-to-B request is pending at the boundary `expires_at <= current timestamp`; User A remains owner.
- **OPERATION A:** User A invokes a new transfer request, causing request-time cleanup to attempt expiration of the old request.
- **OPERATION B:** User B invokes `reject_company_ownership_transfer` for that same old request.
- **SYNCHRONIZATION METHOD:** Use a conceptual barrier around the expiry boundary and simultaneously release both operations.
- **PERMITTED WINNER(S):** Either request-time expiration transition or rejection may acquire the decisive transition first.
- **WINNER RESPONSE:** Expiration winner leaves the cleanup/new-request call subject to its ordinary request result; rejection winner returns success/rejected.
- **LOSER RESPONSE:** If expiration wins, rejection returns `REQUEST_EXPIRED` or another existing terminal-state failure. If rejection wins, cleanup does not expire the rejected request; User A remains owner, so the separate new-request call may follow its normal success or validation path, but it must not create an expiration event for the old request.
- **FINAL REQUEST STATE:** Old request is exactly one of `expired` or `rejected`, never both.
- **FINAL OWNER STATE:** Ownership is unchanged in either outcome; User A remains owner and `companies.user_id` remains User A.
- **EXPECTED AUDIT COUNTS:** Expired outcome: exactly one `OWNERSHIP_TRANSFER_EXPIRED`, zero Rejected. Rejected outcome: exactly one `OWNERSHIP_TRANSFER_REJECTED`, zero Expired. Both outcomes have zero Accepted and zero Completed for the old request.
- **EXPECTED NON-CHANGES:** No ownership, `companies.user_id`, membership-role, or procurement-function mutation.
- **DUPLICATE-EVIDENCE CHECK:** The old request has exactly one terminal audit path and no duplicate terminal event.
- **PASS CRITERIA:** Exactly one terminal transition, unchanged ownership projection, and matching audit counts. Discard all isolated fixtures.

## Read-only invariant checks

Do not run these until execution is separately authorized. Each is a read-only verification plan; expected result is zero rows.

| ID | Check | Expected | Pass criteria |
| --- | --- | --- | --- |
| I-01 | **Purpose:** detect a tested company with zero active owners. **Source set:** known synthetic/test companies expected to require ownership. **Join:** start from that company set and LEFT JOIN `organization_memberships` filtered to `workspace_role = 'owner'` and `membership_status = 'active'`. **Grouping:** by company. **Fail condition:** `active_owner_count = 0`. Explicitly exclude and document any intentionally ownerless lifecycle state. | Zero rows. | No applicable tested company lacks an active owner; a company with no matching membership is still detected by the left join. |
| I-02 | Group active owner memberships by company and locate count greater than one. | Zero rows. | No tested company has multiple active owners. |
| I-03 | Compare each tested company `user_id` to its active owner membership user. | Zero mismatches. | Compatibility projection matches canonical owner. |
| I-04 | Inverse projection check from each active owner membership to `companies.user_id`. | Zero mismatches. | No active owner disagrees with company projection. |
| I-05 | Group pending transfer requests by company and locate count greater than one. | Zero rows. | One-pending invariant holds. |
| I-06 | Group memberships by user/company and locate duplicate rows. | Zero rows. | Membership uniqueness holds. |

## Audit event matrix

| Action | Expected event | Actor | Entity / company | Required metadata / expected count |
| --- | --- | --- | --- | --- |
| Valid request | `OWNERSHIP_TRANSFER_REQUESTED` | User A | transfer request / Company A | from/to users, role, timestamps; count 1. |
| Request-time expiration | `OWNERSHIP_TRANSFER_EXPIRED` | Requesting User A | expired old request / Company A | request, users, expiry, detection `request`; count 1 per old request. |
| Accept | `OWNERSHIP_TRANSFER_ACCEPTED` | User B | transfer request / Company A | request, company, previous/new owner, accepted time; `OWNERSHIP_TRANSFER_ACCEPTED count = 1`. |
| Complete | `OWNERSHIP_TRANSFER_COMPLETED` | User B | transfer request / Company A | request, company, ownership and procurement context, timestamps; `OWNERSHIP_TRANSFER_COMPLETED count = 1`. Must follow Accepted. |
| Reject | `OWNERSHIP_TRANSFER_REJECTED` | User B | transfer request / Company A | request, users, rejected time; count 1. |
| Accept-time expiration | `OWNERSHIP_TRANSFER_EXPIRED` | User B | expired request / Company A | request, users, expiry, detection `acceptance`; count 1. |
| Reject-time expiration | `OWNERSHIP_TRANSFER_EXPIRED` | User B | expired request / Company A | request, users, expiry, detection `rejection`; count 1. |

Cancellation is excluded. No cancellation command is tested or introduced.

## Company ownership-sensitive update boundary

Run these Development-only checks after the company RLS correction and column-privilege migration. Each case uses a fresh synthetic Company A fixture where mutation occurs; scope audits and privilege checks to the tested company and authenticated role.

| ID | Setup / actor / action | Expected result and database state | Audit / reset / pass criteria |
| --- | --- | --- | --- |
| CU-01 Owner profile update | Active owner updates `name`, `category`, `location`, and `network_role`. | Success; only supplied ordinary fields change; `user_id` and memberships unchanged. | Existing company-update audit; restore values. Pass: allowlisted update succeeds. |
| CU-02 Admin profile update | Active admin performs the same ordinary update. | Success; ownership projection unchanged. | Existing company-update audit; restore values. Pass: admin ordinary update succeeds. |
| CU-03 Authorized logo update | Active owner or admin updates `logo_url`. | Success; only logo changes. | Existing logo audit; restore value. Pass: logo column remains writable. |
| CU-04 Member/viewer denial | Active member and viewer separately attempt ordinary update. | Database/RLS denial; no company mutation. | No company-update audit; reset none. Pass: both denied. |
| CU-05 Suspended/cross-company denial | Suspended owner and Company B member separately attempt Company A update. | Database/RLS denial; no mutation. | No company-update audit; reset none. Pass: both denied. |
| CU-06 Owner direct ownership write denied | Active owner attempts direct authenticated `companies.user_id` update. | Privilege denial before ownership mutation. | No ownership audit or membership change; reset none. Pass: column is not writable. |
| CU-07 Admin direct ownership write denied | Active admin attempts the same direct authenticated update. | Privilege denial before ownership mutation. | No ownership audit or membership change; reset none. Pass: column is not writable. |
| CU-08 Controlled transfer projection | Valid recipient accepts pending transfer. | Acceptance succeeds; `companies.user_id` changes only with owner membership transition. | Exactly one Accepted and one Completed audit; reset fixture. Pass: sole active owner equals projection. |
| CU-09 Recovery bypass disabled | Authenticated actor invokes emergency recovery endpoint. | HTTP 410; no company, membership, profile-role, or audit mutation. | Reset none. Pass: no unsynchronized recovery path remains. |
| CU-10 Effective privilege metadata | Inspect Development table and column privileges, role membership/inheritance, and the ownership-transfer function owner after authorization. Inspect `PUBLIC`, `anon`, `authenticated`, and every inherited client-facing role applicable to authenticated execution; identify the `accept_company_ownership_transfer` function owner and verify its required company UPDATE capability. | Client roles: no effective generic table UPDATE, no effective `user_id` column UPDATE, and `anon` receives no company UPDATE. Authenticated: effective UPDATE only on `name`, `category`, `location`, `network_role`, and `logo_url`. Function owner: retains the capability required by the SECURITY DEFINER ownership projection. | Read-only metadata evidence; reset none. Pass: each client-role result is `NO GENERIC UPDATE`, `NO USER_ID UPDATE`, or `ALLOWLIST ONLY` as applicable; function-owner result is `OWNERSHIP RPC UPDATE PRESERVED`. Any inherited generic grant is a failure. |

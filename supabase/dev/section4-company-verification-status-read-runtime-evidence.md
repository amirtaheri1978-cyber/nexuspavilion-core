# Section 4 Company Verification Status Read — Development Runtime Evidence

TASK: NP-MASTER-15

TITLE: Company Verification Status Runtime Verification

CLASSIFICATION: **PASS WITH ONE FIXTURE-EVIDENCE LIMITATION**

This record documents independently observed Development runtime evidence for
the company-side representative-verification status read contract:

- RPC: `public.get_company_representative_verification_status(uuid)`
- API: `GET /api/representative-verification/status`

This is a validation report only. It does not modify application code,
migrations, schema, grants, or persistent Development data.

Production was not touched.

---

## Environment

Target: Nexus Pavilion Dev (`nexus-pavilion-dev`).

Canonical branch at the time of the original Task 15 inspection:

- Branch: `executive-benchmark-engine`
- HEAD: `de64f14d49079231cef8f0e80409d51bab28f51c`

Working tree for this report update contains only this evidence file.

Production: not contacted.

No users were created. No persistent fixtures were manufactured. No privileges
were granted. Direct table mutation was attempted only as a negative security
probe and was denied.

---

## Overall assessment

All directly testable authorization, nondisclosure, status-state, API-session,
response-minimization, and direct-table-protection behaviors passed runtime
validation.

The only unresolved item is direct runtime proof for former-owner denial,
because no provable historical former-owner fixture currently exists in
nexus-pavilion-dev.

That item is a validation-fixture limitation, not evidence of an authorization
failure. It is not converted to PASS.

---

## 1. Canonical owner authorization — PASS

Actor: `72000000-0000-0000-0000-000000000027`

Company: `71000000-0000-0000-0000-000000000011`

Result:

```json
{"status":"verified","success":true}
```

The current canonical owner is allowed to read verification status for the
owned company.

---

## 2. Active admin authorization — PASS

Actor: `72000000-0000-0000-0000-000000000026`

Company: `71000000-0000-0000-0000-000000000011`

Result:

```json
{"status":"verified","success":true}
```

An active company admin is allowed to read company verification status where
governance permits company status read.

---

## 3. Active ordinary member denial — PASS

Actor: `72000000-0000-4000-8000-000000000012`

Company: `71000000-0000-4000-8000-000000000005`

Result:

```json
{"success":false,"error_code":"STATUS_NOT_AUTHORIZED","error_message":"Status is not authorized."}
```

An active ordinary member is denied without a distinct company-existence
disclosure code.

---

## 4. Suspended admin denial — PASS

Actor: `72000000-0000-0000-0000-000000000046`

Company: `71000000-0000-0000-0000-000000000021`

Result:

```json
{"success":false,"error_code":"STATUS_NOT_AUTHORIZED","error_message":"Status is not authorized."}
```

A suspended admin is denied with the same bounded unauthorized contract.

---

## 5. Unrelated authenticated user denial — PASS

Actor: `72000000-0000-0000-0000-000000000030`

Company: `71000000-0000-0000-0000-000000000011`

Result:

```json
{"success":false,"error_code":"STATUS_NOT_AUTHORIZED","error_message":"Status is not authorized."}
```

An unrelated authenticated user is denied without company existence or status
disclosure.

---

## 6. Nonexistent company nondisclosure — PASS

Actor: `72000000-0000-0000-0000-000000000027`

Company: `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa`

Result:

```json
{"success":false,"error_code":"STATUS_NOT_AUTHORIZED","error_message":"Status is not authorized."}
```

The nonexistent-company response is intentionally indistinguishable from the
unauthorized-company response in items 3–5.

---

## 7. Status matrix — PASS

Observed authorized read results:

| State | Result |
|---|---|
| unverified | `{"status":"unverified","success":true}` |
| pending_review | `{"status":"pending_review","success":true}` |
| verified | `{"status":"verified","success":true}` |
| invalidated | `{"status":"invalidated","success":true}` |
| rejected | `{"status":"rejected","success":true}` |

The rejected state was validated using a transaction-local temporary state
change followed by `ROLLBACK`. No persistent database state was changed.

### Rejected fixture note

No existing persisted rejected verification case or
`REPRESENTATIVE_VERIFICATION_REJECTED` audit event was present in the inspected
Dev fixtures.

Runtime rejected-status behavior was nevertheless validated safely inside a
transaction and rolled back.

---

## 8. Direct table mutation protection — PASS

An authenticated-role attempt to directly update
`public.representative_verification_cases` failed with:

```text
ERROR 42501:
permission denied for table representative_verification_cases
```

No privilege was granted to bypass this restriction.

This confirms the authenticated role cannot directly mutate the protected
verification-case table. This is positive security evidence.

---

## 9. Authenticated API session propagation — PASS

Using a real logged-in browser session, requesting:

```text
/api/representative-verification/status
```

without `companyId` returned:

```json
{"success":false,"errorCode":"INVALID_COMPANY_ID"}
```

The request passed authentication and reached route-level input validation
rather than failing authentication.

Using the same authenticated browser session with a valid authorized
`companyId` returned:

```json
{"success":true,"status":"unverified"}
```

The browser session → API route → authenticated Supabase/RPC path is
operational.

---

## 10. Response minimization — PASS

Successful status responses exposed only:

- `success`
- `status`

Observed statuses:

- `unverified`
- `pending_review`
- `verified`
- `rejected`
- `invalidated`

Unauthorized responses used the bounded `STATUS_NOT_AUTHORIZED` contract.

No case IDs, identities, snapshots, timestamps, reason codes, reviewer data,
audit records, metadata, evidence, or provider data were returned on the
observed success or unauthorized status-read paths.

---

## 11. Former-owner denial — BLOCKED BY FIXTURE EVIDENCE

A possible historical fixture was investigated:

- Company: `95c1ab3d-d513-4da7-8461-386ae17a1186`
- Current owner: `081decc5-ab1e-4091-bf01-21122a1147d1`
- Possible former owner/member: `e67905f8-6e0c-4006-a90e-92267ab58d88`

However:

- `audit_logs` returned no ownership history for this company.
- `ownership_transfer_requests` returned no rows for this company.

The available Development database does not provide sufficient evidence that
the second actor was actually a former owner.

Persistent data was not manufactured or mutated merely to make this validation
pass.

Recorded result:

**BLOCKED — no provable existing former-owner fixture.**

This is a validation-fixture limitation, not evidence of an authorization
failure. This item is not classified PASS.

---

## Requirement matrix

| Requirement | Evidence | Status |
|---|---|---|
| Canonical owner allowed | Actor `...027` / company `...011` → `{"status":"verified","success":true}` | PASS |
| Active admin allowed | Actor `...026` / company `...011` → `{"status":"verified","success":true}` | PASS |
| Inactive / ordinary / unrelated denied | Ordinary member, suspended admin, and unrelated user each returned `STATUS_NOT_AUTHORIZED` | PASS |
| Nonexistent / unauthorized company nondisclosure | Nonexistent company `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa` returned the same `STATUS_NOT_AUTHORIZED` body as unauthorized-company probes | PASS |
| unverified / pending / verified / rejected / invalidated | All five statuses returned as `{success, status}` only; rejected via rolled-back transaction-local state | PASS |
| Ownership-transfer applicability / former-owner denial | Candidate company `95c1ab3d-d513-4da7-8461-386ae17a1186` has no ownership-transfer request rows and no ownership audit history | BLOCKED — no provable existing former-owner fixture |
| Direct table mutation protection | Authenticated `UPDATE` on `representative_verification_cases` → `42501 permission denied` | PASS |
| Authenticated API session propagation | Logged-in browser session reached `INVALID_COMPANY_ID` without `companyId`, and returned `{"success":true,"status":"unverified"}` with an authorized `companyId` | PASS |
| Response minimization | Success bodies contained only `success` and `status`; unauthorized bodies used `STATUS_NOT_AUTHORIZED` | PASS |

---

## Files / database / production

- Application code: not modified
- Migrations: not modified
- Schema: not modified
- Persistent database data: not modified
- Grants: not modified
- Production: not touched

---

## Verdict

**PASS WITH ONE FIXTURE-EVIDENCE LIMITATION**

Task 15 runtime validation is complete for every directly testable
authorization, nondisclosure, status-state, API-session, response-minimization,
and direct-table-protection behavior.

The remaining gap is former-owner denial, which cannot be proven from current
nexus-pavilion-dev fixtures without manufacturing persistent history.

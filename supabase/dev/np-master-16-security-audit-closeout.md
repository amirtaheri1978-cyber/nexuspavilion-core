# Task 16 Security Audit — Closeout Evidence

TASK: NP-MASTER-16

TITLE: Launch Security Authorization Boundary Closeout

CLASSIFICATION: **SECURITY FINDINGS CLOSED — MIGRATION-LEDGER FOLLOW-UP REMAINS**

This record documents closeout evidence for Task 16 using already completed and
validated security work. It does not modify application code, migrations,
schema, grants, or persistent Development data.

This is a validation/evidence report only.

Production was not touched.

---

## 1. Scope

Task 16 audited launch-sensitive authorization boundaries independently of UI
filtering:

- RFQ sourcing access at the database RLS boundary
- procurement write-route authorization
- SECURITY DEFINER / RPC execution boundaries
- excessive client table privileges (`TRUNCATE`, `TRIGGER`, `REFERENCES`)
- storage privilege/bucket exposure
- service-role use as a human authorization path

Target: Nexus Pavilion Dev (`nexus-pavilion-dev`).

Supabase project ref: `bzntqnwoytdakmstbtyh`.

Canonical branch at closeout:

- Branch: `executive-benchmark-engine`
- HEAD: `28841d5795d1c547b14e0bb480230591b78d9818`

Production: not contacted.

No database mutation, `db push`, migration repair, `db pull`, or schema reset
was performed for this closeout record.

---

## 2. Finding disposition

| Finding | Disposition | Canonical commit |
|---|---|---|
| F16-01 RFQ sourcing RLS | Closed | `3577e07342d712e8fc6f9acd610b5665ae915da2` |
| F16-02 procurement write membership authorization | Closed | `7c7019c3e22fd499776424003a348589ad9c84c1` |
| F16-03 SECURITY DEFINER / RPC boundary | Closed — reviewed and validated; no remaining Task 16 remediation | n/a (no code change required) |
| F16-04 client `TRUNCATE` / `TRIGGER` / `REFERENCES` | Closed | `28841d5795d1c547b14e0bb480230591b78d9818` |

Task 16 security findings are closed based on current evidence.

Migration-ledger reconciliation remains required before future CLI-driven
database migration deployment. That item is a separate tooling/governance
follow-up and is not an unresolved F16 security finding.

---

## 3. F16-01 — RFQ sourcing access at the database boundary

Status: **CLOSED**

Commit: `3577e07342d712e8fc6f9acd610b5665ae915da2`

Message: `fix(security): enforce RFQ sourcing access in RLS`

Forward-only migration:

- `supabase/migrations/20260819_restrict_rfq_sourcing_access_rls.sql`

Contract now enforced in RLS, independently of JavaScript filtering:

- a supplier/consultant may `SELECT` an open RFQ when `sourcing_method = 'open'`, or when an explicit `rfq_invites` email match or existing quote participation exists
- restricted sourcing (`invited`, `sealed_bid`) is not readable or quotable by an unrelated supplier through PostgREST
- buyer-company membership, owner/admin controls, supplier ownership, no-self-quote, open-status, and award authorization are preserved

Static tests: `src/lib/procurement/rfq-sourcing-access-rls.test.ts`.

---

## 4. F16-02 — procurement write authorization by membership

Status: **CLOSED**

Commit: `7c7019c3e22fd499776424003a348589ad9c84c1`

Message: `fix(security): authorize procurement writes by membership`

In-scope routes:

- `src/app/api/rfqs/route.ts`
- `src/app/api/quotes/route.ts`
- `src/app/api/quote-decision/route.ts`
- `src/app/api/award-contract/route.ts`

`profiles.role` no longer authorizes these write operations. Authorization
derives from an active `organization_memberships` row for `user.id` and
`profile.company_id`:

- RFQ create: `workspace_role IN ('owner', 'admin')` OR `procurement_function = 'buyer'`
- quote submit: `procurement_function = 'supplier'`
- quote decision: active owner/admin membership, with existing RFQ company ownership check preserved
- award: active owner/admin membership plus existing `workspace_status = 'active'` and organization verification `verified` trust-state checks; RFQ ownership, no-self-award, and award-state protections preserved

Already validated implementation evidence:

- lint PASS
- build PASS
- vitest PASS

---

## 5. F16-03 — SECURITY DEFINER / RPC boundary

Status: **CLOSED**

The Task 16 review validated the SECURITY DEFINER / RPC execution boundary.
Relevant RPCs use constrained execution privileges and authenticated authority.

No open Task 16 remediation remains for this finding. No application or
migration change was required under this closeout.

---

## 6. F16-04 — excessive client table privileges

Status: **CLOSED**

Commit: `28841d5795d1c547b14e0bb480230591b78d9818`

Message: `fix(security): revoke excessive client table privileges`

Forward-only migration:

- `supabase/migrations/20260820_revoke_client_truncate_trigger_references.sql`

The migration revokes only `TRUNCATE`, `TRIGGER`, and `REFERENCES` from
`public`, `anon`, and `authenticated` on launch-sensitive public tables. It
does not change CRUD grants, RLS policies, schema ownership, RPC `EXECUTE`
grants, or `service_role` privileges.

Canonical validation recorded for this commit:

- lint PASS
- build PASS
- vitest PASS: 36 files / 274 tests / 0 failures
- git diff check PASS

The migration was applied manually to `nexus-pavilion-dev` through the Dev SQL
Editor. It was not applied through `npx supabase db push`.

### Dev runtime postcondition

Representative `anon` / `authenticated` privilege checks after application
returned:

| Table | `can_truncate` | `can_trigger` | `can_reference` |
|---|---|---|---|
| `audit_logs` | false | false | false |
| `companies` | false | false | false |
| `invitations` | false | false | false |
| `notifications` | false | false | false |
| `profiles` | false | false | false |
| `organization_memberships` | false | false | false |

Production was not used as an application target.

---

## 7. Service-role authorization-path gate

Status: **PASS**

Inspection of the application source found:

- no `SUPABASE_SERVICE_ROLE_KEY`
- no real service-role client usage in `src`
- `service_role` matches in `src` are test assertions only
- canonical server/browser clients use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

No human authorization path backed by service-role authority was identified.

---

## 8. Storage privilege / bucket audit

Status: **COMPLETED**

The Task 16 storage privilege/bucket audit was completed. No remaining Task 16
security remediation is recorded for storage under this closeout.

---

## 9. Migration-ledger drift — separate follow-up

Status: **OPEN TOOLING / GOVERNANCE FOLLOW-UP — NOT AN F16 SECURITY FINDING**

Observed on `nexus-pavilion-dev`:

- Supabase CLI is linked to Dev ref `bzntqnwoytdakmstbtyh`
- `supabase_migrations.schema_migrations` does not exist on Dev
- `npx supabase migration list` shows every local migration as absent remotely
- `npx supabase db push --dry-run` would attempt all 30 local migrations
- the repository contains duplicate migration versions:
  - `20260801`: 7 files
  - `20260802`: 6 files
  - `20260808`: 4 files
  - `20260816`: 2 files
- Dev object/function inventory already contains the expected historical structures

Therefore historical migrations must not be blindly replayed.

F16-04 was intentionally applied directly through the Dev SQL Editor instead of
`db push`.

Migration-ledger reconciliation remains required before future CLI-driven
database migration deployment. This closeout does not claim that reconciliation
is complete and does not attempt to repair it.

---

## 10. Production

Production was not touched.

No Production validation occurred.

---

## 11. Files / database / production for this closeout record

- Application code: not modified
- Migrations: not modified
- Schema: not modified
- Persistent database data: not modified
- Grants: not modified by this closeout task
- Production: not touched

---

## Verdict

**TASK 16 SECURITY FINDINGS ARE CLOSED** based on current evidence.

F16-01, F16-02, F16-03, and F16-04 are closed. The service-role human
authorization-path gate passed. The storage privilege/bucket audit is complete.

**Migration-ledger reconciliation remains required** before future CLI-driven
database migration deployment. That remaining item is a separate
tooling/governance blocker and is not an unresolved Task 16 security finding.

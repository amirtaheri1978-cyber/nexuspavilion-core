# Task 16 Security Audit — Closeout Evidence

TASK: NP-MASTER-16

TITLE: Launch Security Authorization Boundary Closeout

CLASSIFICATION: **SECURITY FINDINGS CLOSED — MIGRATION-LEDGER RECONCILIATION COMPLETE**

This record documents closeout evidence for Task 16, including the F16-05
addendum and completed migration-ledger reconciliation. This documentation
task does not modify application code, migrations, schema, grants, or
persistent Development data.

This is a validation/evidence report only.

Production was not touched.

---

## 1. Scope

Task 16 audited launch-sensitive authorization boundaries independently of UI
filtering:

- RFQ sourcing access at the database RLS boundary
- procurement write-route authorization
- SECURITY DEFINER / RPC execution boundaries
- excessive client table privileges (`TRUNCATE`, `TRIGGER`, `REFERENCES`, `MAINTAIN`)
- storage privilege/bucket exposure
- service-role use as a human authorization path
- migration-ledger reconciliation for CLI-driven Dev deployment

Target: Nexus Pavilion Dev (`nexus-pavilion-dev`).

Supabase project ref: `bzntqnwoytdakmstbtyh`.

Canonical branch at this addendum:

- Branch: `executive-benchmark-engine`
- HEAD: `9069d4d`
- F16-05 commit: `34daaa5`
- Original F16-04 closeout HEAD: `28841d5795d1c547b14e0bb480230591b78d9818`

Production: not contacted.

This documentation addendum does not mutate the database, run `db push`,
repair the ledger, `db pull`, or reset schema. Those ledger actions were
already completed on the canonical baseline commit and are recorded below.

---

## 2. Finding disposition

| Finding | Disposition | Canonical commit |
|---|---|---|
| F16-01 RFQ sourcing RLS | Closed | `3577e07342d712e8fc6f9acd610b5665ae915da2` |
| F16-02 procurement write membership authorization | Closed | `7c7019c3e22fd499776424003a348589ad9c84c1` |
| F16-03 SECURITY DEFINER / RPC boundary | Closed — reviewed and validated; no remaining Task 16 remediation | n/a (no code change required) |
| F16-04 client `TRUNCATE` / `TRIGGER` / `REFERENCES` | Closed | `28841d5795d1c547b14e0bb480230591b78d9818` |
| F16-05 client `MAINTAIN` and postgres default ACL | Closed | `34daaa5` |
| Migration-ledger reconciliation | Complete | `9069d4d` |

Task 16 security findings are closed based on current evidence.

Migration-ledger reconciliation is complete. The Dev public schema is
represented by a single active baseline migration, historical SQL is archived
unchanged, and CLI-driven Dev deployment now reports the remote database up to
date.

---

## 3. F16-01 — RFQ sourcing access at the database boundary

Status: **CLOSED**

Commit: `3577e07342d712e8fc6f9acd610b5665ae915da2`

Message: `fix(security): enforce RFQ sourcing access in RLS`

Forward-only migration:

- `supabase/legacy-migrations/pre-baseline/20260819_restrict_rfq_sourcing_access_rls.sql`

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

After migration-ledger reconciliation, the historical F16-04 file is archived
unchanged at:

- `supabase/legacy-migrations/pre-baseline/20260820_revoke_client_truncate_trigger_references.sql`

---

## 7. F16-05 — residual client `MAINTAIN` and postgres-owned default ACL

Status: **CLOSED**

Commit: `34daaa5`

Message: `fix(security): revoke client maintain privileges`

Forward-only migration, now archived unchanged at:

- `supabase/legacy-migrations/pre-baseline/20260821_revoke_client_maintain_and_postgres_default_privileges.sql`

The migration revokes only `MAINTAIN` from `PUBLIC`, `anon`, and
`authenticated` on launch-sensitive public tables. It also hardens
postgres-owned default table privileges in `public` by revoking `TRUNCATE`,
`REFERENCES`, `TRIGGER`, and `MAINTAIN` from those client roles. It does not
change CRUD grants, RLS policies, schema ownership, RPC `EXECUTE` grants, or
`service_role` privileges.

### Dev current-table runtime

`anon` / `authenticated` `MAINTAIN` is false on all audited public tables.
`service_role` `MAINTAIN` remained true and unchanged.

### postgres-owned public table default ACL

After F16-05, postgres-owned future public tables no longer grant `Dxtm`
(`TRUNCATE` / `REFERENCES` / `TRIGGER` / `MAINTAIN`) to `anon` or
`authenticated`. `service_role` remains `Dxtm`.

### supabase_admin default ACL

`supabase_admin` default table ACL remained a separate platform-owned
limitation during the F16-05 execution context. postgres could not
`SET`/`MEMBER` `supabase_admin`, so F16-05 did not modify that default ACL.

Production was not used as an application target.

---

## 8. Service-role authorization-path gate

Status: **PASS**

Inspection of the application source found:

- no `SUPABASE_SERVICE_ROLE_KEY`
- no real service-role client usage in `src`
- `service_role` matches in `src` are test assertions only
- canonical server/browser clients use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

No human authorization path backed by service-role authority was identified.

---

## 9. Storage privilege / bucket audit

Status: **COMPLETED**

The Task 16 storage privilege/bucket audit was completed. No remaining Task 16
security remediation is recorded for storage under this closeout.

---

## 10. Migration-ledger reconciliation — complete

Status: **COMPLETE**

Canonical baseline commit: `9069d4d`

Message: `chore(db): establish reproducible migration baseline`

The earlier observation that Dev lacked a usable CLI migration ledger, and that
historical files could not be blindly replayed, is closed. Reconciliation is
complete.

Completed repository state:

- single active migration: `supabase/migrations/20260822000000_dev_public_baseline.sql`
- 31 historical migrations archived unchanged under `supabase/legacy-migrations/pre-baseline/`
- historical migration tests now explicitly read immutable archive paths under `supabase/legacy-migrations/pre-baseline/`

Baseline replay validation:

- `supabase db reset` PASS

Baseline vs linked Dev public schema:

- `No schema changes found`
- diff file length 0

Repository validation recorded for the baseline commit:

- lint PASS
- build PASS
- vitest PASS: 38 files / 286 tests / 0 failures

Dev migration ledger repaired only to mark the baseline version applied:

- Local `20260822000000`
- Remote `20260822000000`

Final CLI check:

- `supabase db push --dry-run` => Remote database is up to date

Production was not touched. No Production validation occurred.

---

## 11. Production

Production was not touched.

No Production validation occurred.

---

## 12. Files / database / production for this closeout addendum

- Application code: not modified
- Migrations: not modified
- Schema: not modified
- Persistent database data: not modified
- Grants: not modified by this documentation task
- Production: not touched

This addendum updates only `supabase/dev/np-master-16-security-audit-closeout.md`.

---

## Verdict

**TASK 16 SECURITY FINDINGS ARE CLOSED** based on current evidence.

F16-01, F16-02, F16-03, F16-04, and F16-05 are closed. The service-role human
authorization-path gate passed. The storage privilege/bucket audit is complete.

**Migration-ledger reconciliation is complete.** The canonical baseline is
`9069d4d`. CLI-driven Dev deployment reports the remote database up to date.
Production remains untouched and was not validated.

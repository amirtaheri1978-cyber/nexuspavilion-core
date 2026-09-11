# Nexus Pavilion launch operations runbook

Status: Task 29 operator evidence recorded. This runbook describes
capabilities that exist in the Launch Candidate application and host
dashboards. It does not invent APM, paging, or backup products.

Active backend: Supabase project `nexus-pavilion-dev`, ref
`bzntqnwoytdakmstbtyh`.

Current classification: **DEVELOPMENT / LAUNCH-CANDIDATE BACKEND**.

Future intended role: this same project may become the launch/production
backend only after the authorized Task 29 Go/No-Go / cutover. Product Owner
decision stands: a second, distinct Supabase project is **not** currently
required. Do not use a retired project.

Current Production migration state: **NO VERIFIED PRODUCTION MIGRATIONS
EXECUTED**. Do not treat development / launch-candidate history as
Production history, and do not claim the application is already in
Production.

Historical migrations `20260828000000` and `20260829000000` were applied and
live-validated during the pre-Baseline V2 development history. Their final
schema/security effects remain embodied in `nexus-pavilion-dev`, but their
historical ledger rows were retired by the authorized metadata-only Baseline V2
normalization. **DO NOT RE-APPLY 280 OR 290.** The canonical active migration
identity is now `20260911000000_launch_candidate_baseline_v2.sql`.

## Ownership (do not invent extra roles)

| Responsibility | Owner |
| --- | --- |
| Product Go/No-Go, Production change authorization, rollback authority | Product Owner |
| Application deploy, host env vars, application logs, `/api/health` | Application/operator (deploying the Next.js app) |
| Database, Auth, Storage, RLS, backup/PITR console evidence | Database/Supabase operator via the Supabase dashboard (same Product Owner gate) |
| Security/cross-company incident | Product Owner stops writes; preserve evidence; escalate only if isolation is unproven |
| Email delivery (`RESEND_API_KEY`, `EMAIL_FROM`) | Application/operator |

Workspace product authorization already in the app (owner / admin / reviewer /
buyer / vendor) is not an incident-response org chart. Do not create a CISO or
on-call rotation in this document.

## Evidence sources that actually exist

- Application: Vercel (or equivalent host) deploy logs, runtime logs, previous
  deployment SHA
- Liveness: `GET /api/health` → `{ ok: true, service, commitSha }`
  - `commitSha` is present only when the host injects `VERCEL_GIT_COMMIT_SHA`
    or `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA`
  - The probe does **not** ping Supabase and does **not** report secret presence
- Auth / data: Supabase dashboard (project ref, Auth, Database, Storage,
  Backups). Console access is operator-only
- Governance: `audit_logs` rows for RFQ, quote, award, invite, company, and
  representative-verification actions. Company settings shows recent actions
  (`id`, `action`, `entity_type`, `created_at`) for the signed-in company
- User-safe UI: `src/app/error.tsx` retry + dashboard/login exits;
  `src/app/not-found.tsx`; loading files for dashboard, RFQ detail, compare,
  and canonical submit
- Automated: `npm run test:launch`, `npx vitest run`, `npx eslint src`,
  `npm run build`

Scheduled backups and PITR are **unavailable** on the current Free Plan.
Product Owner accepted a manual pre-launch database dump plus copied
Storage objects as the launch-stage recovery checkpoint. Recorded
filenames, sizes, and SHA-256 hashes live in
`docs/operations/TASK_28_OPERATOR_EVIDENCE.md`. Do not claim PITR exists.

## Application and database health verification (Task 15-10)

Health verification is deliberately split into two independent signals.
A green public liveness response is not sufficient evidence that Auth or
database-backed application behavior is healthy.

Production application liveness evidence captured on **2026-09-11**:

- Public origin: `https://nexuspavilion-core.vercel.app`.
- `GET /api/health` returned `HTTP 200`, `ok: true`,
  `service: "nexus-pavilion"`, and
  `commitSha: "7a0d937cc7cfcfcb26a93655bc8a4783ffa4dfde"`.
- Response fields were limited to `commitSha`, `ok`, and `service`.
- The public probe remains dependency-light: it does not query Supabase,
  expose secret/configuration presence, or require authenticated access.

Database/backend verification evidence:

- Target: active launch-candidate Supabase project `nexus-pavilion-dev`,
  ref `bzntqnwoytdakmstbtyh`.
- Supabase project status was `ACTIVE_HEALTHY`.
- An operator-only, read-only SQL connectivity check returned
  `database_name = postgres` and `reachable = true`.
- The bounded check used
  `select current_database() as database_name, true as reachable;`.
- Database verification is not exposed through `/api/health`, does not
  require a service-role client in the Next.js application, and performs
  no schema, data, RLS, RPC, migration, Auth, or Storage mutation.
- Retired Supabase project `nexus-pavilion-core` remains out of scope.

The active backend remains classified **DEVELOPMENT / LAUNCH-CANDIDATE
BACKEND**. This health evidence establishes launch-readiness connectivity;
it does not reclassify that backend as Production.

### Health verification procedure

1. From the real public application origin, call `GET /api/health` and
   require `HTTP 200`, `ok: true`, and `service: "nexus-pavilion"`.
   Compare `commitSha` with the intended deployment SHA when the host
   provides deployment metadata.
2. If public liveness passes but login, RFQ reads, or other database-backed
   behavior fails, do **not** declare the full application healthy.
3. The Database/Supabase operator verifies the active project status and
   performs a bounded read-only connectivity query such as
   `select current_database() as database_name, true as reachable;`.
4. Never add database credentials, table contents, environment values, or
   service-role access to the public health response. Never mutate data or
   schema merely to prove health.
5. Application/database health readiness requires both public application
   liveness and operator-confirmed database connectivity. Auth, RFQ/quote
   writes, tenant isolation, and other business-flow checks remain governed
   by their dedicated launch gates and incident procedures.

## Rate-limit and abuse protection review (Task 15-11)

Launch abuse review distinguishes provider-managed authentication controls from
custom application endpoints. Supabase Auth provider controls must not be
misrepresented as rate limiting for unrelated custom Next.js API routes.

### Review boundary

- Authentication actions use Supabase Auth, including `signUp`,
  `signInWithPassword`, `resetPasswordForEmail`, and `/auth/callback` session
  exchange.
- Supabase Auth enforces provider-side authentication rate limits and returns
  `HTTP 429 Too Many Requests` when applicable limits are exceeded.
- Task 15-11 does not add a second application-level authentication limiter.
- Repository review found no general application-level `429`, `Retry-After`,
  request-IP extraction, CAPTCHA, or distributed rate-limit dependency for
  custom Next.js API routes.
- `/api/contact` was identified as the anonymous custom endpoint with an
  external email side effect.
- Its existing `website` honeypot remains bot friction but is not considered
  sufficient protection against sustained anonymous submission abuse.
- Workspace Invitation, RFQ Invitation, Quotation, RFQ, RFI, addendum, and
  other procurement write flows retain their existing authentication and
  authorization boundaries. The contact limiter does not replace them.

### Production contact abuse control

Production Vercel Firewall evidence captured on **2026-09-11**:

- Team: `nexus-pavilion`.
- Project: `nexuspavilion-core`.
- Project ID: `prj_KMhk2Q5Gtm0cadrv7uX6IZkI99tg`.
- Firewall configuration ID: `waf_eTacgRDePCgf`.
- Active configuration version: `1`.
- Rule ID: `rule_rate_limit_contact_submissions_YoP3MN`.
- Rule name: `Rate limit contact submissions`.
- Match: exact path `/api/contact` AND method `POST`.
- Action: `rate_limit`.
- Key: client `ip`.
- Algorithm: `fixed_window`.
- Limit: `10` requests per `600` seconds.
- Exceeded action: `rate_limit`.
- Vercel reported the rule `valid: true` with no validation errors.

No Next.js application route, package dependency, Supabase project, database
schema, RLS policy, environment variable, or procurement authorization
behavior was changed to provide this control.

### Activation sequencing evidence

The authorized change was intended to follow a draft-review-publish sequence.
The initial inline-JSON CLI attempt failed during local argument parsing before
any firewall mutation occurred.

The subsequent authorized Vercel Firewall API `PATCH`, using a validated
temporary JSON payload, returned success and immediately exposed the approved
rule in the active configuration with `draft: null`.

The provider therefore activated the exact approved change without a separate
publish step. No rollback/re-publish cycle was performed solely to recreate the
intended sequencing because the active rule exactly matched the authorized
scope and additional Production security churn would add risk without improving
the resulting control.

This sequencing deviation must not be represented as if a separate publish
command occurred.

### Bounded Production verification

Runtime enforcement was verified using the existing contact-form `website`
honeypot so synthetic requests did not send email.

- `GET /api/contact` returned `HTTP 405`.
- Contact POST requests `1` through `10` returned `HTTP 200`.
- Contact POST request `11` returned `HTTP 429`.
- `GET /api/health` returned `HTTP 200` after the contact test.
- The temporary test payload was removed after verification.
- Repository HEAD and staged index remained unchanged during runtime
  verification.

### Operator security verification procedure

1. Keep Supabase Auth as the provider-managed throttling boundary for
   authentication operations unless a separate reviewed requirement changes
   that architecture.
2. Read the active Vercel Firewall configuration and require exactly one
   enabled, valid `Rate limit contact submissions` rule matching
   `POST /api/contact`.
3. Treat a missing, disabled, invalid, broadened, or materially weakened
   contact rule as a launch security stop condition.
4. Any Production firewall mutation remains Product Owner-gated.
5. Prefer configuration read-back for routine evidence. Use bounded Production
   enforcement testing only when runtime behavior itself must be reconfirmed.
6. Keep Workspace Membership, Workspace Invitation, RFQ Invitation, Quotation,
   and Contract Award domains distinct. Contact abuse protection does not
   replace business authorization or tenant isolation.

## Shared stop conditions

Stop launching or stop writing when any of the following is true:

- `/api/health` does not return `ok: true` from the real public application origin
- Auth login or `/auth/callback` cannot establish a session
- RFQ/quote/award writes fail for authorized users
- Cross-company data is visible
- Host `NEXT_PUBLIC_SITE_URL` is unset, localhost, parked, or a leftover
  Codespace host
- Host `NEXT_PUBLIC_SUPABASE_URL` is not `bzntqnwoytdakmstbtyh.supabase.co`
- Anyone proposes re-applying `20260828000000` or `20260829000000`

---

## 1. Failed deployment

- Detection signal: host deploy fails; `/api/health` missing or not `ok`;
  `commitSha` does not match the intended git SHA when the host provides it.
- Immediate stop: do not promote the failed build. Do not retry by mutating
  Production data.
- Owner: application/operator; Product Owner holds promotion authority.
- Containment: keep the last successful deployment as the live alias.
- Rollback/recovery: redeploy the last known-good git SHA from the host
  (see Application rollback). Do not “fix forward” with Production SQL.
- Verification: `/api/health` returns `ok: true`; login works; one RFQ read
  succeeds.
- Escalation: repeated deploy failure after a clean rebuild, or health OK
  while auth/data is down (Supabase incident).

## 2. Application rollback (Task 15-07)

- Detection signal: post-deploy functional failure (auth, RFQ, quote, award)
  with a healthy previous deployment available.
- Immediate stop: freeze new Production deploys until Product Owner authorizes
  rollback or a forward fix. Do not mutate Production data to compensate for
  an application release.
- Owner: Product Owner holds rollback authority; application/operator executes
  the authorized host rollback.
- Containment: do not apply database migrations and do not change environment
  variables while performing an application-only rollback.
- Boundary: application rollback changes the deployed application revision
  only. Application rollback does **not** reverse SQL or undo Postgres
  migrations. If the failing release crossed a database compatibility
  boundary, stop and follow Database migration rollback.
- Escalation: rollback does not restore service, the database schema is ahead
  of the restored application, the known-good deployment cannot be identified,
  or post-rollback tenant isolation is uncertain.

### Operator rollback procedure

1. **Freeze promotion.** Stop new deployment promotion and record the incident
   reason. Do not start a second deploy while rollback is being evaluated.
2. **Record the bad deployment.** Capture the bad deployment SHA, deployment
   identifier when the host exposes one, public application origin, detection
   time, and the failing verification signal. `/api/health` `commitSha` may be
   used as deployment evidence when the host injects it.
3. **Identify the known-good rollback SHA.** Use deployment host history and
   repository history to select the most recent deployment that was previously
   healthy. Record the exact known-good git SHA; do not use an unverified
   branch tip or an ad-hoc local commit as the rollback target.
4. **Check database compatibility before rollback.** Determine whether the bad
   deployment introduced or depended on a database migration. If the database
   schema would be incompatible with the known-good application SHA, do not
   proceed with an application-only rollback; follow Database migration
   rollback under the separate Product Owner gate.
5. **Obtain Product Owner rollback authorization.** Record the bad deployment
   SHA, known-good rollback SHA, rollback reason, database-compatibility
   determination, and authorization before changing the live deployment.
6. **Restore the known-good deployment.** In the existing deployment host,
   select the previously successful deployment for the known-good SHA and use
   the provider's rollback, promote, or redeploy capability to make that exact
   revision live. If the provider has no direct rollback action, redeploy the
   exact known-good git SHA through the existing project. Do not create a
   fix-forward commit and call it a rollback.
7. **Verify the restored revision.** Confirm `/api/health` returns `ok: true`
   from the real public origin and, when available, `commitSha` matches the
   known-good rollback SHA. Verify login, one RFQ read, and one non-destructive
   write path or Product Owner-approved synthetic check. Any cross-company
   visibility or authorization regression is an immediate stop condition.
8. **Record rollback evidence.** Preserve the bad deployment SHA, restored
   deployment SHA, rollback time, operator, Product Owner authorization,
   verification results, and any unresolved follow-up. Do not declare service
   restored until the verification checks pass.

A rollback is complete only when the public application is serving the
authorized known-good revision and the post-rollback verification checks pass.
This Task 15-07 procedure does not assert backup/PITR capability and does not
perform the Task 15-09 environment variable audit.

## 3. Database migration rollback (Task 29)

- Detection signal: RPC/RLS failure after 280/290; award/quote unique-
  constraint or function errors in host logs.
- Immediate stop: **DO NOT RE-APPLY 280 OR 290.** Do not run casual
  launch-backend SQL from this repository.
- Owner: Product Owner; database/Supabase operator executes reverse SQL
  only after written review.
- Containment: prefer **application rollback or forward-fix first**.
  Application rollback does not undo Postgres migrations.
- Rollback/recovery: emergency reverse artifacts already exist:
  `docs/operations/sql/task28_reverse_20260829000000.sql` then
  `docs/operations/sql/task28_reverse_20260828000000.sql`. Postgres does
  not auto-undo an applied Supabase migration. Reverse SQL does not delete
  `schema_migrations` rows. The 290 reverse is **emergency-only** and
  restores the known pre-290 confidentiality/integrity weakness. It is
  **not** normal rollback. PITR is not available; the accepted checkpoint
  is the recorded manual dump (see backup verification).
- Verification: after reverse or dump restore, `award_rfq_quote`, quote
  submit, and RFQ reads succeed; no duplicate awarded quotes.
- Escalation: restore would discard writes after the dump point, or 290
  reverse would re-open locked quotes — Product Owner decision only.

See **Migration discipline and history reconciliation** for the general
migration rollback model (application rollback vs forward database
correction vs data recovery vs migration history repair).

## 4. Production backup verification

- Detection signal: operator cannot locate the recorded manual dump or
  Storage object copies; hashes do not match
  `TASK_28_OPERATOR_EVIDENCE.md`.
- Immediate stop: do not claim scheduled backups or PITR. They are
  unavailable on Free Plan.
- Owner: Product Owner accepted the manual checkpoint; database/Supabase
  operator preserves the local dump and Storage copies (not in git).
- Containment: treat
  `backups/nexus-pavilion-dev-prelaunch-2026-08-22.dump` plus the three
  recorded Storage object copies as the launch-stage restore point.
- Rollback/recovery: `pg_restore` of that dump after Product Owner
  authorization; restore Storage bytes from the recorded local copies.
  Dashboard PITR is not available.
- Verification: dump SHA-256
  `6A7D76ACDE4E7D8C7CF7FA7761809639C2EDE38F10A2CD9D541D4D3F9621D687`;
  `pg_restore -l` already succeeded (541 TOC entries, custom/gzip,
  Postgres 17.6). Restore into the live database was **not** executed as
  part of evidence capture.
- Escalation: dump missing, hash mismatch, or Product Owner later requires
  paid PITR.

## 5. Supabase incident

- Detection signal: Supabase status page; Auth/API 5xx; RLS/RPC errors across
  unrelated routes; health OK while every data fetch fails.
- Immediate stop: freeze RFQ/quote/award writes. Do not “repair” with
  service-role from the Next.js app (the app has no service-role client).
- Owner: database/Supabase operator; Product Owner freeze authority.
- Containment: communicate workspace-unavailable to users; do not disable
  RLS.
- Rollback/recovery: wait/restore via Supabase; application rollback only if
  the app release caused the incident. Preserve `audit_logs`.
- Verification: login, RFQ list, quote submit (authorized), award path in a
  Product Owner-approved check.
- Escalation: data loss, backup restore required, or suspected RLS bypass.

## 6. Authentication outage

- Detection signal: login failures; `/auth/callback` redirects to login with
  `authStatus=attention`; session cookies missing; Supabase Auth dashboard
  errors.
- Immediate stop: do not invite users or send recovery email until Auth is
  confirmed. Do not rotate keys during the incident unless Product Owner
  explicitly authorizes (Task 29+).
- Owner: application/operator checks `NEXT_PUBLIC_SUPABASE_URL` /
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_SITE_URL`; database
  operator checks Auth.
- Containment: keep users on login; `src/app/error.tsx` already offers Sign
  In Again without exposing internals.
- Rollback/recovery: restore last good app if callback/SITE_URL regresses;
  Auth platform incidents are Supabase-side.
- Verification: password login, confirmation callback, invite accept,
  sign-out.
- Escalation: sessions issued to the wrong project, or recovery links point
  at a non-Production host.

## 7. RFQ/quote write failure

- Detection signal: `/api/rfqs` or `/api/quotes` 401/403/500; client copy
  “The quote could not be submitted”; host logs
  `Quote submit membership lookup failed` / `RFQ create membership lookup failed`.
- Immediate stop: if failures are cross-company or 500s cluster, freeze
  writes. 401/403 for unauthorized users is expected.
- Owner: application/operator (API); database operator if RLS/RPC errors.
- Containment: do not retry-award or duplicate-submit past the in-flight
  client lock; canonical quotes remain unique on `(rfq_id, company_id)` when
  `company_id` is present. Invite-token quotes may have null `company_id`
  (PostgreSQL UNIQUE allows multiple NULLs) — do not “fix” with a Production
  migration in this task.
- Rollback/recovery: app rollback if a release broke the write route;
  otherwise inspect RLS/RPC in Development, not Production SQL.
- Verification: authorized create RFQ; authorized quote submit; unauthorized
  caller still 401/403.
- Escalation: writes succeed for the wrong company.

## 8. Award integrity incident

- Detection signal: `/api/award-contract` 4xx/5xx; log
  `Award contract RPC error`; RFQ shows two awarded quotes; awarded RFQ still
  open.
- Immediate stop: freeze further awards on the affected RFQ. Do not award
  from the UI until Product Owner clears.
- Owner: Product Owner; database operator reviews `award_rfq_quote` and
  `audit_logs` action for the award.
- Containment: keep the RFQ in its last consistent state. Do not hand-edit
  `awarded_quote_id` in Production.
- Rollback/recovery: application rollback if the client double-posted (Task
  26 in-flight lock should prevent this). Data repair is Task 29+ with
  reviewed SQL only.
- Verification: one awarded quote; RFQ status/award fields match; compare
  page shows the award; `audit_logs` has the award row.
- Escalation: two awarded quotes, or an award visible to a non-owner
  company.

## 9. Cross-company/security incident

- Detection signal: RFQ, quote, document, or audit row from company A
  visible to company B; invite token reused across tenants; RLS anomaly.
- Immediate stop: freeze the affected routes; preserve logs and
  `audit_logs`; do not delete evidence.
- Owner: Product Owner. Application/operator captures host logs (no
  secrets). Database operator reviews RLS in console **read-only**.
- Containment: disable the leaking surface via app rollback if a release
  caused it. Do not disable RLS to “keep the site up.”
- Rollback/recovery: rollback the leaking SHA; rotation of invite tokens or
  secrets is Task 29+ and is not performed here.
- Verification: two-company check — each company sees only its RFQs/quotes.
  Unauthorized write routes remain 401/403.
- Escalation: confirmed isolation failure is a Task 28 No-Go.

## 10. Document/storage incident

- Detection signal: RFQ document upload/list failure; logo upload failure;
  Storage 4xx/5xx; missing objects in buckets `rfq-attachments` or
  `Company-logos`.
- Immediate stop: freeze uploads if objects land in the wrong company
  prefix or become public unexpectedly.
- Owner: application/operator (upload routes); database/Supabase operator
  (Storage policies and backup).
- Containment: a database dump does **not** restore Storage object bytes.
  Use the recorded local Storage copies in
  `TASK_28_OPERATOR_EVIDENCE.md`. PITR is not available.
- Rollback/recovery: app rollback if the upload route regresses; object
  restore is a Supabase Storage console action.
- Verification: authorized upload + list on one RFQ; other company cannot
  list those objects.
- Escalation: public bucket listing of procurement files.

---

## Migration discipline and history reconciliation (Task 15-03)

Task boundary: **15-03** covers migration history, migration discipline, and
migration-specific rollback considerations. It does **not** close **15-07**
(full deployment rollback procedure), **15-08** (backup/recovery capability),
or **15-09** (environment variable audit).

### Environment classification

| Item | Value |
| --- | --- |
| Active project | `nexus-pavilion-dev` |
| Project ref | `bzntqnwoytdakmstbtyh` |
| Current classification | DEVELOPMENT / LAUNCH-CANDIDATE BACKEND |
| Future intended role | May become launch/production backend only after Task 29 Go/No-Go / cutover |
| Second Supabase project | Not currently required (Product Owner decision) |
| Production migration state | **NO VERIFIED PRODUCTION MIGRATIONS EXECUTED** |

### Canonical repository migration model (Baseline V2)

Active apply order contains exactly one canonical migration:

1. `20260911000000_launch_candidate_baseline_v2.sql`

This baseline represents the **final intended** public schema plus curated
Storage bucket/policy contracts through historical state
`20260909090225`. It does **not** replay historical intermediate
transforms (including `20260904204031` text surgery / MD5 guards).

**Baseline SQL MUST NOT be pushed to active-dev.** Active-dev already embodies
this schema. On 2026-09-11, the separately authorized reconciliation gate
normalized only `supabase_migrations.schema_migrations`; Baseline V2 SQL was
**not** executed against active-dev.

### Historical archive (pre-baseline-v2)

| Item | Value |
| --- | --- |
| Archive location | `supabase/legacy-migrations/pre-baseline-v2/` |
| Archive range | `20260822000000` → `20260909090225` |
| File count | 33 SQL migrations (byte-preserved) |

Earlier pre-V1 history remains under
`supabase/legacy-migrations/pre-baseline/` (unchanged).

`20260904204031_populate_notification_rfq_source_from_trusted_writers.sql`
remains **immutable historical evidence** in the V2 archive. Do not edit
it. Do not restore it into active `supabase/migrations/`.

### Legacy development / launch-candidate ledger mapping (historical)

These timestamps remain preserved historical evidence in
`supabase/legacy-migrations/pre-baseline-v2/`. They are **not** active migration
execution filenames and are no longer active-dev ledger rows.

| Legacy version | Name | Historical archive (pre-baseline-v2) |
| --- | --- | --- |
| `20260831065829` | `company_logo_storage_contract` | `20260843000000` |
| `20260831070207` | `fix_company_logo_bound_delete_policy` | `20260845000000` |
| `20260831070506` | `company_governance_update_integrity` | `20260844000000` |
| `20260831143650` | `company_workspace_lifecycle_contract` | `20260846000000` |



### Active-dev Baseline V2 ledger normalization — completed 2026-09-11

Normalization was authorized only after both prerequisites passed:

- fresh Baseline V2 local reconstruction from zero: **PASS**
- schema/security equivalence: **11/11 fingerprint categories MATCH**

The active target was `nexus-pavilion-dev`
(`bzntqnwoytdakmstbtyh`). Reconciliation was metadata-only:

- `20260911000000` was marked `applied`
- the 33 preserved historical ledger versions were marked `reverted`
- no Baseline V2 SQL was executed against active-dev
- no schema, RLS, function, policy, grant, Storage contract, or business-data
  mutation was performed by the repair

Post-normalization verification showed the remote ledger contains only
`20260911000000 | launch_candidate_baseline_v2`, and all 11 schema/security
fingerprints remained unchanged and matched the fresh local Baseline V2.

`supabase migration repair` in this event was ledger reconciliation only; it was
not SQL rollback. The archived historical chain remains immutable evidence and
must not be restored to active `supabase/migrations/`.

### Company-logos provisioning

Canonical Baseline V2 owns reproducible provisioning of the
`Company-logos` Storage bucket (`public = true`, 5 MiB,
JPEG/PNG/WebP) together with `company-documents` and `rfq-attachments`.
Fresh environments must **not** require manual Dashboard bucket creation.
Manual provisioning is not the canonical path.

### Forward-only discipline

After Baseline V2 cutover, normal forward-only migration discipline
resumes. Once a migration is applied under its **canonical** version:

- **NEVER** edit it to fix a deployed environment
- use a **new forward corrective migration**
- never delete applied migration files to hide history
- never rename applied migration versions
- never manually alter migration tracking without an approved reconciliation
  gate
- never run casual Production SQL
- never infer Production state from development migration history
- every migration requires target-project verification before execution

### Migration-specific rollback model

| Model | Use when |
| --- | --- |
| **APPLICATION ROLLBACK** | Schema remains backward-compatible; restore prior app SHA |
| **FORWARD DATABASE CORRECTION** | Preferred for a bad applied schema migration (new corrective migration) |
| **DATA RECOVERY** | Destructive data loss cannot be corrected forward (dump / Storage copies) |
| **MIGRATION HISTORY REPAIR** | Metadata reconciliation only — **not** schema rollback |

`supabase migration repair` does **not** reverse SQL. It only adjusts
migration tracking metadata.

### Migration repair policy

`supabase migration repair` requires explicit Product Owner / ChatGPT gated
authorization. Use it only when:

1. actual schema state is independently verified, and
2. migration tracking metadata is known to be wrong/out-of-sync.

Never use repair blindly to make `migration list` look clean.

Baseline V2 repository cutover does **not** authorize automatic remote SQL
execution. The one-time active-dev ledger reconciliation was separately
authorized and completed on 2026-09-11 only after fresh reconstruction and
11/11 schema/security equivalence were proven.

Future `migration repair` operations require a new explicit reconciliation gate.
Do not use repair merely to make `migration list` appear clean, and do not run
`db reset --linked`, blind `db push`, or the Baseline V2 SQL against active-dev
as a substitute for metadata reconciliation.

### Migration execution preflight checklist

Before any migration execution:

1. Verify branch / commit
2. Verify target Supabase project / ref
3. Verify target environment classification
4. Run migration history comparison (local vs remote)
5. Identify the exact pending migration set
6. Review dependency order
7. Classify destructive / reversible impact
8. Review RLS / policy / grants / SECURITY DEFINER changes
9. Review Representative Verification / ownership impact when applicable
10. Confirm backup/recovery consideration for destructive changes
11. Require explicit execution approval
12. Record post-execution migration history
13. Verify affected application / runtime paths

### Migration stop conditions

Stop and escalate; do not “repair and continue” automatically when:

- local/remote migration history unexpectedly diverges
- target project/ref is ambiguous
- an applied canonical migration file was modified
- a destructive migration lacks recovery consideration
- RLS / ownership / SECURITY DEFINER change lacks explicit review
- remote schema was manually changed outside migration governance
- migration order differs from reviewed dependency order
- Production authorization is absent

### Production Migration Ledger

Current truthful state: **NO VERIFIED PRODUCTION MIGRATIONS EXECUTED**.

Future rows (do not fabricate historical Production entries):

| Migration version / name | Release / commit | Target environment | Execution status | Verification evidence | Rollback / recovery consideration |
| --- | --- | --- | --- | --- | --- |
| — | — | — | NO VERIFIED PRODUCTION MIGRATIONS EXECUTED | — | — |

---

## Post-launch monitoring (Task 29 stabilization)

Check these on a fixed cadence after Production cutover. Evidence is host
logs, `/api/health`, Supabase status, and authenticated UAT — not an
imaginary APM suite.

1. Deployment healthy — `/api/health` `ok: true`; `commitSha` matches the
   launched git SHA when the host provides it.
2. Auth/login — password login and callback continuation.
3. RFQ reads — list + detail for the owning company.
4. Quote submit — canonical submit succeeds once; duplicate is rejected or
   locked.
5. Award path — one award; RFQ state matches.
6. API 4xx/5xx trends — host logs for `/api/rfqs`, `/api/quotes`,
   `/api/award-contract`, `/api/invites`. 401/403 for anonymous callers is
   healthy; 5xx is not.
7. Application errors — `Nexus Pavilion application boundary` in browser
   logs; user sees retry, not a stack trace.
8. Supabase availability — dashboard/status; Auth + REST.
9. Database/storage health — table errors vs Storage object errors.
10. Permission/RLS anomalies — any successful cross-company read/write.
11. Latency symptoms — RFQ detail/dashboard spinning past loading
    boundaries.
12. Failed invites — email `skipped` vs delivery error; SITE_URL must be
    the Production origin, never a Codespace host.
13. Document failures — `rfq-attachments` upload/list.
14. Rollback triggers — health fail, auth outage, award dual-write,
    cross-company leak, missing manual dump/Storage-copy evidence.

## Remaining launch blockers

Launch backend identity and Task 28 schema apply are **closed**. Do not
re-open launch-backend identity or treat 280/290 as a pending apply.

Still open:

- Real public application origin
- Application deployment SHA on that origin
- Host `NEXT_PUBLIC_SITE_URL`
- Host `NEXT_PUBLIC_SUPABASE_URL`
- Auth redirect URL configuration
- Email / `CONTACT_EMAIL` configuration
- Final Product Owner Go/No-Go
- Still-binding D1–D6 and retention / legal-hold governance items unless
  the Product Owner explicitly changes those gates

## Production environment variable audit (Task 15-09)

Audit date: **2026-09-11**.

Audit target:

- Vercel team: `nexus-pavilion`
- Vercel project: `nexuspavilion-core`
- Vercel project ID: `prj_KMhk2Q5Gtm0cadrv7uX6IZkI99tg`
- Environment: **Production**

This audit validates configuration presence, target, classification, and
safe value shape where Vercel permits read-only runtime access. Secret
values are not copied into the repository, runbook, terminal evidence,
tests, or launch tracker.

| Variable | Classification | Production evidence | Validation |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Required public | Present as Production Config | HTTPS origin matches `bzntqnwoytdakmstbtyh.supabase.co`. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Required public | Present as Production Config | Non-empty publishable-key shape validated; value not recorded. |
| `NEXT_PUBLIC_SITE_URL` | Required public | Present as Production Config | HTTPS origin; not localhost; not `*.github.dev`; no credentials/path/query/hash. |
| `RESEND_API_KEY` | Required server-only secret | Present as Production Secret | Secret presence/type/target verified. Vercel intentionally refused to pull the Secret value, so the value was not inspected. |
| `CONTACT_EMAIL` | Required server-only | Present as Production Config | Email-address shape validated; value not recorded. |
| `EMAIL_FROM` | Server-only / operationally expected | Present as Production Config | Sender shape validated; value not recorded. |
| `NEXT_PUBLIC_SENTRY_DSN` | Optional / fail-open | Absent | Allowed by the current Sentry contract. |
| `SENTRY_DSN` | Optional / fail-open | Absent | Allowed by the current Sentry contract. |
| `SUPABASE_SERVICE_ROLE_KEY` | Forbidden in the Next.js application | Absent | Must remain absent from application configuration and Production source usage. |

Additional classification:

- `NEXT_PUBLIC_APP_URL` is present in Vercel Production but is not
  referenced by the current application `process.env` source audit.
  It is not part of the current launch-required environment contract and
  is left unchanged by Task 15-09.
- `NEXT_RUNTIME` and `NODE_ENV` are framework/runtime-managed markers,
  not application-managed environment configuration and are not required
  in `.env.example`.
- `VERCEL_GIT_COMMIT_SHA` and `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA` are
  host-provided deployment metadata used opportunistically by `/api/health`.

Task 15-09 performs no `vercel env pull`, secret-value export, environment
mutation, deployment, Supabase mutation, database/schema/RLS change, or
Production application behavior change.

## Environment notes (names only)

Required public: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`NEXT_PUBLIC_SITE_URL`.

Server-only: `RESEND_API_KEY`, `EMAIL_FROM`, `CONTACT_EMAIL`.

If `RESEND_API_KEY` or `NEXT_PUBLIC_SITE_URL` is missing, invitation email is
skipped (`skipped: true`). That is honest failure, not a silent send to a
wrong host.

The Next.js application must not use `SUPABASE_SERVICE_ROLE_KEY`.

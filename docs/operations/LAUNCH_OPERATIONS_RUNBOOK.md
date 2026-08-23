# Nexus Pavilion launch operations runbook

Status: Task 29 operator evidence recorded. This runbook describes
capabilities that exist in the Launch Candidate application and host
dashboards. It does not invent APM, paging, or backup products.

Launch backend (intentional): Supabase project `nexus-pavilion-dev`,
ref `bzntqnwoytdakmstbtyh`. This same project is the launch/production
backend. Do not use a retired project. A distinct Production Supabase
project is **not** a remaining requirement.

Migrations `20260828000000` and `20260829000000` are **already applied**
and live-validated on that backend. **DO NOT RE-APPLY 280 OR 290.**
Remaining launch work is application deployment, host configuration, and
Product Owner Go/No-Go — not another database migration apply.

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

## 2. Application rollback

- Detection signal: post-deploy functional failure (auth, RFQ, quote, award)
  with a healthy previous SHA.
- Immediate stop: freeze new Production deploys until Product Owner authorizes
  rollback or a forward fix.
- Owner: Product Owner authorizes; application/operator executes the host
  rollback.
- Containment: do not apply database migrations while rolling back the app.
- Rollback/recovery: restore the previous host deployment / previous git SHA.
  Application rollback does **not** undo Postgres migrations. If the failing
  release included a migration, follow Database migration rollback.
- Verification: health, login, RFQ read, and one non-destructive write path
  (or a Product Owner-approved synthetic check) succeed on the restored SHA.
- Escalation: rollback does not restore service, or database schema is ahead
  of the rolled-back application.

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

## Environment notes (names only)

Required public: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`NEXT_PUBLIC_SITE_URL`.

Server-only: `RESEND_API_KEY`, `EMAIL_FROM`, `CONTACT_EMAIL`.

If `RESEND_API_KEY` or `NEXT_PUBLIC_SITE_URL` is missing, invitation email is
skipped (`skipped: true`). That is honest failure, not a silent send to a
wrong host.

The Next.js application must not use `SUPABASE_SERVICE_ROLE_KEY`.

# Task 28 / Task 29 operator evidence (manual)

Task 27 cannot prove host-dashboard backup/restore from this repository.
This file records operator evidence captured outside git. Do not paste
secret values, service-role keys, JWTs, or invite URLs into tickets.
Record **project refs**, **plan names**, **filenames**, **byte sizes**,
**SHA-256 hashes**, **timestamps**, and **pass/fail** only.

Local database dumps and copied Storage objects live outside git (see
`/backups/` in `.gitignore`). Do not commit backup payloads.

## Launch backend (Task 29 decision)

The only active Supabase project for Nexus Pavilion launch is:

- Project name: `nexus-pavilion-dev`
- Project ref: `bzntqnwoytdakmstbtyh`
- Host: `bzntqnwoytdakmstbtyh.supabase.co`

This **same** project is the intended launch/production backend. Do not
reference or use any retired Supabase project. The earlier assumption that
launch required a second, distinct Supabase project is **superseded** by
this Product Owner decision. It is not a remaining launch requirement.

### Task 28 migrations on this backend

The following migrations are **already applied** and were live-validated
on `bzntqnwoytdakmstbtyh`:

- `20260828000000_enable_company_scoped_audit_and_notification_access.sql`
- `20260829000000_restrict_issuer_quote_select_until_commercial_unlock.sql`

**DO NOT RE-APPLY 280 OR 290.** Remaining launch work is application
deployment, host configuration, and operator evidence — not another
database migration apply.

Emergency reverse SQL remains in source and is **not** a forward
migration:

- `docs/operations/sql/task28_reverse_20260828000000.sql`
- `docs/operations/sql/task28_reverse_20260829000000.sql`

Normal rollback is **application rollback or forward-fix first**. Database
reverse SQL is emergency-only. The 290 reverse restores the known
pre-290 confidentiality/integrity weakness and is **not** normal rollback.

## A. Automated evidence (already in CI / local validation)

- `npm run test:launch`
- `npx vitest run`
- `npx eslint src`
- `npm run build`
- `GET /api/health` returns `{ ok: true }` without secrets
- Application source has no leftover `*.app.github.dev` SITE_URL fallback

## B. Manual authenticated UAT (Launch Candidate)

Use two companies. Do not treat an unconfigured public origin as a
completed production cutover.

1. Login / session continuation (password + confirmation callback).
2. Company settings: members, invitations, recent `audit_logs` actions
   visible to the owning workspace; metadata/tokens not shown on that
   summary.
3. RFQ create + RFQ detail + documents list.
4. Canonical quote submit (authorized supplier) — success once; in-flight
   double-click does not create a second navigation.
5. Invite-token quote submit (existing path) — user-safe error if JSON/API
   fails.
6. Quote compare + quote decision.
7. Award — one award; RFQ awarded state; user-safe failure if RPC fails.
8. Supplier invitation — copy-link relative URL works; email either sends
   with the configured `NEXT_PUBLIC_SITE_URL` or reports skipped. Email must
   not contain a Codespace host.
9. Company invitation create/resend/accept.
10. Error boundary: trigger a client render failure if a safe fixture
    exists; otherwise confirm `src/app/error.tsx` copy offers Try Again and
    Return to Dashboard without stack traces.
11. Cross-company: company B cannot read company A RFQs, quotes, addenda,
    or documents.

## C. Operator / Supabase-console evidence

Target `nexus-pavilion-dev` / `bzntqnwoytdakmstbtyh` only. Do not mutate
the launch backend from this documentation task.

### C1. Project identity

- [x] Launch backend project name and project ref recorded:
      `nexus-pavilion-dev` / `bzntqnwoytdakmstbtyh`
- [x] Development project ref recorded: `bzntqnwoytdakmstbtyh` (same
      project; intentional)
- [x] Distinct-Production-project requirement superseded (see Launch
      backend)
- [ ] Host `NEXT_PUBLIC_SUPABASE_URL` host matches
      `bzntqnwoytdakmstbtyh.supabase.co` on the **public application host**
- [ ] Host `NEXT_PUBLIC_SITE_URL` is the real public HTTPS application
      origin (not a parked domain, Codespace host, or localhost)
- [ ] `NEXT_PUBLIC_SITE_URL` is not a `*.app.github.dev` host
- [ ] Application uses anon key only (no service-role in Vercel env for the
      Next.js app)

### C2. Backup / PITR (Free Plan — do not claim PITR exists)

Supabase scheduled backups and Point-in-Time Recovery are plan features.
They are **not** enabled on this launch backend.

Recorded dashboard/plan facts:

- [x] Plan: Supabase Free Plan
- [x] Scheduled / daily backups: **unavailable** on Free Plan
- [x] Point-in-Time Recovery (PITR): **unavailable / not enabled**; Product
      Owner chose **not** to purchase PITR at this stage
- [x] Product Owner accepted a **manual pre-launch database + Storage
      backup** as the launch-stage recovery checkpoint
- [x] No restore into the live launch database was executed as part of this
      evidence capture (`pg_restore -l` is archive listing only)

Do **not** claim PITR exists. Do **not** invent a scheduled backup.

#### Manual database dump (accepted checkpoint)

- Filename: `backups/nexus-pavilion-dev-prelaunch-2026-08-22.dump`
- Size: `445004` bytes
- SHA-256:
  `6A7D76ACDE4E7D8C7CF7FA7761809639C2EDE38F10A2CD9D541D4D3F9621D687`
- Validation: `pg_restore -l` successfully read the archive
- Archive format: custom format, gzip compression
- TOC entries: `541`
- Database version: `17.6`
- Archive includes: `auth`, `public`, Storage metadata, and
  `supabase_migrations`
- Archive includes Task 28 functions/policies (280/290 already applied)

This dump is a **local operator artifact**. It is not stored in git.

### C3. Restore procedure (document, do not execute)

If a restore is ever required after launch:

1. Product Owner authorizes restore and names the checkpoint
   (`backups/nexus-pavilion-dev-prelaunch-2026-08-22.dump` unless a later
   authorized dump supersedes it).
2. Freeze application writes (application rollback or maintenance).
3. Restore Postgres from the authorized dump (`pg_restore`). Dashboard
   PITR is **not** available on Free Plan.
4. Restore Storage objects separately from the recorded local copies
   (database restore does not restore Storage bytes).
5. Confirm Auth users/sessions after restore (Auth is included in the dump
   metadata; live session continuity is still an operator check).
6. Redeploy the application SHA that matches the restored schema.
   **DO NOT RE-APPLY 280 OR 290** if they are already present in
   `supabase_migrations`.
7. Verify login, RFQ read, quote submit, award, and document list.
8. Record `audit_logs` continuity (gaps after the restore point are
   expected).

Normal rollback remains **application rollback / forward-fix**. Emergency
database reverse SQL (`task28_reverse_20260829000000.sql` then
`task28_reverse_20260828000000.sql`) is last-resort, Product Owner plus
security authorized, and the 290 reverse restores a known security
weakness.

### C4. Storage assets

Scheduled Storage backups are **unavailable** on Free Plan. The operator
copied currently visible Storage objects locally as the launch-stage
checkpoint.

Recorded object copies:

1. `branding/logo-horizontal-512.png`
   Size: `60026` bytes
   SHA-256:
   `526D1AA097B65BDA0B9F8C243EACC50663C3F3FC4218DBBF7D271ED90CE5EA98`
2. `Company-logos/293b1013-f488-48a5-ae63-e028569519ee-1785587789135.png`
   Size: `3696` bytes
   SHA-256:
   `23F1656A4FE72D62B81C8605DFE6006E17AB258EC626F08560B483A92FF0257D`
3. `Company-logos/logos/1779691535466-7d651ea6-3845-466f-8fb9-ea89f8038379.jpg`
   Size: `31282` bytes
   SHA-256:
   `06651FFB10077DBBDCA7F0206B91501B9F4F13F97E80C549A93ADFC65CD48591`

- [x] Manual Storage object copies recorded for the three paths above
- [x] Plan Storage backups: **unavailable** on Free Plan; manual copies are
      the accepted checkpoint
- [ ] Bucket `rfq-attachments` exists; not publicly listable (console
      confirmation not recorded in this evidence set)
- [ ] Bucket `Company-logos` exists; public URL pattern is intentional for
      logos only (console confirmation not recorded beyond the copied
      objects)

No other Storage object paths were provided. Do not claim a full
`rfq-attachments` copy.

### C5. Auth / email / host diagnostics

Still required before public cutover. Not completed by the backup
evidence capture.

- [ ] Auth URL configuration matches `NEXT_PUBLIC_SITE_URL`
- [ ] Redirect allow-list includes `/auth/callback`
- [ ] Resend configured **or** operators accept skipped email
- [ ] `CONTACT_EMAIL` is set on the public application host (do not rely
      on a personal fallback)
- [ ] `/api/health` from the **real public application origin** returns
      `ok: true` and the launched `commitSha` when the host injects it
- [ ] Previous host deployment can be rolled back without a new migration
      (**DO NOT RE-APPLY 280 OR 290**)

### C6. Rollback authority

- [ ] Named Product Owner who can authorize application rollback
- [ ] Named operator who can click host rollback
- [x] Product Owner accepted the manual dump + Storage copy as the
      launch-stage recovery checkpoint (Free Plan; PITR not purchased)
- [x] Reverse SQL artifacts exist; 280/290 already applied;
      **DO NOT RE-APPLY 280 OR 290**

## Remaining launch blockers

Do **not** treat launch-backend identity or Task 28 schema apply as open.

Still open:

- Real public application origin (not a parked domain, Codespace host, or
  localhost)
- Application deployment SHA on that origin
- Host `NEXT_PUBLIC_SITE_URL`
- Host `NEXT_PUBLIC_SUPABASE_URL` (must be `bzntqnwoytdakmstbtyh`)
- Auth redirect URL configuration
- Email / `CONTACT_EMAIL` configuration
- Final Product Owner Go/No-Go
- Still-binding Section 3 D1–D6 and retention / legal-hold governance
  items unless the Product Owner explicitly changes those gates

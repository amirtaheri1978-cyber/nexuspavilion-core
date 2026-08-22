# Task 28 operator evidence (manual)

Task 27 cannot prove Production backup/restore from this repository. No
Production console session, Production SQL, or Production configuration
change is performed here.

UAT after Task 27 is Launch Candidate evidence for Task 28 Go/No-Go.
Separate automated, authenticated UAT, and operator-console evidence.

Do not paste secret values, service-role keys, JWTs, or invite URLs into
tickets. Record **project refs**, **plan names**, **timestamps**, and
**pass/fail** only.

## A. Automated evidence (already in CI / local validation)

- `npm run test:launch`
- `npx vitest run`
- `npx eslint src`
- `npm run build`
- `GET /api/health` returns `{ ok: true }` without secrets
- Application source has no leftover `*.app.github.dev` SITE_URL fallback

## B. Manual authenticated UAT (Launch Candidate)

Use two companies. Do not use Production.

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

## C. Operator / Supabase-console evidence (required for Task 28)

Target the **Production** project only for **read-only** confirmation. Do
not mutate Production.

### C1. Project identity

- [ ] Production project name and project ref recorded
- [ ] Development project ref recorded
- [ ] Production ref ≠ Development ref
- [ ] Host `NEXT_PUBLIC_SUPABASE_URL` host matches the Production ref
- [ ] Host `NEXT_PUBLIC_SITE_URL` is the public Production origin (https,
      no trailing-slash requirement beyond one canonical value)
- [ ] `NEXT_PUBLIC_SITE_URL` is not a `*.app.github.dev` host
- [ ] Application uses anon key only (no service-role in Vercel env for the
      Next.js app)

### C2. Backup / PITR (do not claim until checked)

Supabase backup capability depends on plan (Daily backups and Point-in-Time
Recovery are plan features; they are **not** proven by this repo).

In the Production project dashboard:

- [ ] Open **Database → Backups** (or current equivalent)
- [ ] Record whether **daily backups** are listed, with the newest backup
      timestamp
- [ ] Record whether **Point-in-Time Recovery (PITR)** is enabled, and the
      stated recovery window
- [ ] Record the plan name that includes that backup product
- [ ] Confirm no restore was executed (Task 28 is verification, not a
      restore drill against Production data)

If backups/PITR are not enabled: Task 28 is **No-Go** for recoverability
until Product Owner accepts residual risk or upgrades the plan. Do not
invent a backup.

### C3. Restore procedure (document, do not execute)

If a restore is ever required after Task 29:

1. Product Owner authorizes restore and names the restore point.
2. Freeze application writes (rollback or maintenance).
3. Restore Database via the Supabase dashboard to the authorized point.
4. Restore Storage separately if the incident includes
   `rfq-attachments` or `Company-logos` (database PITR does not by itself
   prove object restore).
5. Confirm Auth users/sessions after restore (Auth is a Supabase-managed
   schema; record whether it is included in the backup product in use).
6. Redeploy the application SHA that matches the restored schema.
7. Verify login, RFQ read, quote submit, award, and document list.
8. Record `audit_logs` continuity (gaps after the restore point are
   expected).

### C4. Storage assets that need separate recovery consideration

- [ ] Bucket `rfq-attachments` exists; not publicly listable
- [ ] Bucket `Company-logos` exists; public URL pattern is intentional for
      logos only
- [ ] Operator records whether Storage backups are included on the plan

### C5. Auth / email / host diagnostics

- [ ] Auth URL configuration matches `NEXT_PUBLIC_SITE_URL`
- [ ] Redirect allow-list includes `/auth/callback`
- [ ] Resend configured **or** operators accept skipped email
- [ ] `CONTACT_EMAIL` is set in Production (do not rely on a personal
      fallback)
- [ ] `/api/health` from the Production host returns `ok: true` and the
      launched `commitSha` when the host injects it
- [ ] Previous host deployment can be rolled back without a new migration

### C6. Rollback authority

- [ ] Named Product Owner who can authorize application rollback
- [ ] Named operator who can click host rollback
- [ ] Named operator who can view Supabase backups (read-only)
- [ ] Agreement that Production SQL/migrations wait for Task 29

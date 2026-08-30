# 7-06 Company Documents — Browser QA Checklist

Run after the `20260842000000_company_documents_contract.sql` migration is applied to the target database.

Company Documents is an **internal-only** company-owned governance evidence registry. It is self-declared file evidence and must never appear on the public company profile.

Do not treat this as a second Qualifications or Compliance fact registry.

## Preconditions

- Authenticated workspace users for each role: Owner, Admin, Member, Viewer
- At least one approved or verified company with a public slug (to prove public absence)
- Local app running at `http://localhost:3000`
- Record the exact pre-QA `company_documents` row count for the authenticated workspace
- Record any pre-existing `company-documents` Storage objects for the same company prefix

## Desktop Surfaces

### `http://localhost:3000/company/settings`

- [ ] "Company Documents" section renders below Company Compliance
- [ ] Fields are exactly Document Type, Title, File, Issued Date, Expiry Date
- [ ] Types are exactly Insurance, Workers' Compensation, Safety, Qualification, Other
- [ ] No notes, issuer/provider, credential/policy identifier, coverage, or public visibility control appears
- [ ] No qualification or compliance record selector appears
- [ ] Owner/Admin can upload, edit metadata, replace file, delete, and download
- [ ] Member/Viewer sees read-only cards with Download only
- [ ] Upload shows a loading state, then a success message
- [ ] Reload persists saved metadata
- [ ] Self-declared notice is present: "Documents are maintained by this organization and have not been independently verified by Nexus Pavilion."

#### Validation

- [ ] Blank title is rejected
- [ ] Title longer than 160 characters is rejected
- [ ] MIME/extension mismatch is rejected
- [ ] Unsupported extensions (`.svg`, `.zip`, `.docx`, `.exe`) are rejected
- [ ] Files larger than 10 MiB are rejected
- [ ] Zero-byte files are rejected
- [ ] Expiry before issued date is rejected
- [ ] Issued date in the future does **not** create a "Not yet effective" state

#### Editing an existing record

- [ ] Each saved card shows Download, Edit Metadata, Replace File, and Delete for Owner/Admin
- [ ] `Edit Metadata` opens inline fields for Type, Title, Issued Date, Expiry Date
- [ ] `Cancel` restores the original card
- [ ] `Update` persists metadata without creating a second file
- [ ] `Replace File` uploads a new object path and leaves the previous object unreadable
- [ ] `Delete` removes metadata and the Storage object
- [ ] Derived expiry state updates after metadata save

### `http://localhost:3000/company`

- [ ] Company Documents renders below Company Compliance
- [ ] Cards show type, title, original filename, size, issued/expiry dates, and derived status
- [ ] Download works for active members
- [ ] No Edit / Replace / Delete / Upload controls appear
- [ ] Empty state is truthful (`Not provided`)
- [ ] Trust copy is present
- [ ] No horizontal overflow

### Public profile

- [ ] Anonymous `/company/[slug]` has no Company Documents section
- [ ] No QA titles, filenames, or document dates appear
- [ ] Anonymous GET/POST document APIs return 401
- [ ] Do not change `/company/[slug]` behavior

## Authorization

- [ ] Signed-out invalid POST/PATCH/DELETE => 401 before payload validation
- [ ] Owner/Admin invalid payload => 400
- [ ] Owner/Admin valid create => 200
- [ ] Member/Viewer invalid POST => 403
- [ ] Member/Viewer can GET metadata and download
- [ ] Inactive => 403
- [ ] Cross-company => 403
- [ ] If no legitimate Member/Viewer/Inactive identity exists, mark NOT TESTABLE

## Derived status

Exercise all four states where practical:

- [ ] No expiry recorded
- [ ] Current
- [ ] Expiring soon
- [ ] Expired

Do not expect a persisted status field.

No record should be described as verified, approved, validated, certified, or independently confirmed by Nexus Pavilion.

## Download / signed URL

- [ ] Download is minted server-side
- [ ] Signed URL TTL is 60 seconds
- [ ] Signed URL is not persisted in the database
- [ ] After delete or replace, the old object cannot be downloaded

## Audit

For every successful create, update, and delete, record:

- local timestamp
- UTC timestamp
- company ID
- document_count
- purpose of the mutation

Expected:

- exactly one `COMPANY_DOCUMENT_UPLOADED` event per successful create
- exactly one `COMPANY_DOCUMENT_UPDATED` event per successful update/replace
- exactly one `COMPANY_DOCUMENT_DELETED` event per successful delete
- no audit for upload intent alone, failed upload, failed finalize, 401, 403, or 400

Do not query `audit_logs` with service-role credentials.

## Console / network

- [ ] No application console errors
- [ ] No unexpected failed requests
- [ ] Successful writes => 200
- [ ] Rejected invalid authorized writes => 400
- [ ] Signed-out => 401
- [ ] No raw Postgres/Supabase/Storage error object exposed
- [ ] No title, file name, file path, or signed URL leaked through logs

## Mobile / accessibility

At approximately 390px, check `/company/settings` and `/company`:

- [ ] No horizontal overflow
- [ ] Controls reachable
- [ ] Date inputs usable
- [ ] Upload/Edit/Replace/Delete/Download/Cancel/Update targets >= 44px
- [ ] Visible keyboard focus states
- [ ] Keyboard navigation works
- [ ] No public-profile documents section on mobile either

## Cleanup — mandatory

- [ ] Remove ALL transient Company Documents QA records created in this run
- [ ] Confirm corresponding Storage objects are removed or unreadable
- [ ] Reload
- [ ] Confirm final `company_documents` row count equals the exact pre-QA baseline
- [ ] Confirm no QA document text remains on settings, `/company`, or the anonymous public profile
- [ ] Do not remove unrelated existing data

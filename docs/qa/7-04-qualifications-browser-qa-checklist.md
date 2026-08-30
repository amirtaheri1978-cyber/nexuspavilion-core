# 7-04 Company Qualifications — Browser QA Checklist

Run after the `20260840000000_company_qualifications_contract.sql` migration is applied to the target database.

## Preconditions

- Authenticated workspace users for each role: Owner, Admin, Member, Viewer
- At least one approved or verified company with a public slug
- Local app running at `http://localhost:3000`

## Desktop Surfaces

### `http://localhost:3000/company/settings`

- [ ] "Company Qualifications" section renders below Company Capabilities
- [ ] Four groups visible: Licenses, Certifications, Accreditations, Registrations
- [ ] Owner/Admin can add, remove, and save qualifications
- [ ] Member/Viewer sees read-only cards with no editable inputs or Save button
- [ ] Duplicate qualifications are blocked within a group
- [ ] Save shows loading state, then success message
- [ ] Reload persists saved values
- [ ] Date validation blocks expiry before issued date
- [ ] Public visibility checkbox wording is clear and credential identifiers remain workspace-only
- [ ] Cards with no expiry date show a single "No expiry recorded" state (never "Not provided · No expiry recorded")

#### Editing an existing qualification

- [ ] Each saved card shows both `Edit` and `Remove` for Owner/Admin
- [ ] `Edit` opens inline fields for Name, Issuer, Credential Identifier, Issued Date, Expiry Date, and Public visibility
- [ ] `Cancel` discards the edit and restores the original card
- [ ] `Update Qualification` applies the edit to the card in place
- [ ] Editing a record and keeping its identity unchanged does **not** trigger "This qualification is already listed."
- [ ] Editing a record into an identity that matches another card in the same group **is** blocked as a duplicate
- [ ] Add-form validation rules (name required, strict date format, expiry on/after issued) apply identically in edit mode
- [ ] `Save Qualifications` persists the edit; reload shows the edited values
- [ ] Public -> Workspace only is achievable via `Edit` alone, with no delete/re-enter
- [ ] Workspace only -> Public is achievable via `Edit` alone, with no delete/re-enter
- [ ] Edit and Remove controls have visible keyboard focus rings and >=44px touch targets

### `http://localhost:3000/company`

- [ ] Internal read-only qualifications section appears
- [ ] Credential identifier is visible internally
- [ ] Public/private indicator is visible internally
- [ ] Empty groups show "Not provided"
- [ ] Long values wrap without horizontal overflow

### `http://localhost:3000/company/[slug]` (approved/verified company)

- [ ] Public qualifications render read-only for anonymous visitors
- [ ] Only `is_public=true` qualifications appear
- [ ] Credential identifier is never shown publicly
- [ ] Empty groups and the entire section are omitted when no public qualifications exist
- [ ] No private workspace data is exposed
- [ ] Public wording reads "Public qualifications are details this organization has chosen to publish."
- [ ] No wording implies an individual qualification is verified, approved, validated, or eligible
- [ ] The phrase "credential evidence" does not appear anywhere on the public profile

#### Visibility round trip

- [ ] Set a qualification to Workspace only via `Edit`, save, reload: it is absent from `/company/[slug]`
- [ ] Set the same qualification back to Public via `Edit`, save, reload: it is present on `/company/[slug]`
- [ ] The credential identifier of that qualification is never present in the public page HTML or network payloads in either state

## Mobile (~390px)

Repeat the three surfaces above and verify:

- [ ] No horizontal overflow or clipped cards
- [ ] Inputs and buttons remain reachable
- [ ] Focus states are visible for keyboard navigation
- [ ] Date inputs remain usable on narrow screens

## Authorization Matrix

| Role   | Settings editable | Save allowed | Internal read | Public read |
| ------ | ----------------- | ------------ | ------------- | ----------- |
| Owner  | Yes               | Yes          | Yes           | Public only |
| Admin  | Yes               | Yes          | Yes           | Public only |
| Member | No                | No           | Yes           | Public only |
| Viewer | No                | No           | Yes           | Public only |

## Network / Console Checks

- [ ] `PUT /api/companies/{id}/qualifications` returns 401 when signed out, including with an invalid payload
- [ ] Member/Viewer `PUT` returns 403, including with an invalid payload
- [ ] Inactive membership `PUT` returns 403; cross-company `PUT` returns 403
- [ ] Owner/Admin `PUT` with an invalid payload returns 400 (authorization is resolved first)
- [ ] Owner/Admin `PUT` returns 200 and creates `COMPANY_QUALIFICATIONS_UPDATED` audit event
- [ ] Audit metadata contains counts only, not names, issuers, or credential identifiers
- [ ] Audit metadata contains no `membership_type`
- [ ] Server logs for a failed replace contain only `companyId`, `userId`, and a safe `errorCode`
- [ ] Public page loads from `company_qualifications_public` only
- [ ] No console errors on any surface
- [ ] No failed network requests after successful save/reload

## Cleanup

- [ ] Remove transient QA qualification records after validation
- [ ] Confirm private qualification does not appear on public profile
- [ ] Confirm public qualification appears on public profile after save/reload

## Regression Guardrails

- [ ] RFQ, quote, award, invitation, and procurement flows unchanged
- [ ] Existing company profile fields (`category`, `location`, `network_role`) unchanged
- [ ] Company Capabilities behavior unchanged

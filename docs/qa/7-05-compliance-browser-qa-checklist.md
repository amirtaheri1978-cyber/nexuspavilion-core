# 7-05 Company Compliance — Browser QA Checklist

Run after the `20260841000000_company_compliance_contract.sql` migration is applied to the target database.

Company Compliance is an **internal-only** company-owned registry. It is self-declared and must never appear on the public company profile.

## Preconditions

- Authenticated workspace users for each role: Owner, Admin, Member, Viewer
- At least one approved or verified company with a public slug (to prove public absence)
- Local app running at `http://localhost:3000`
- Record the exact pre-QA `company_compliance` row count for the authenticated workspace

## Desktop Surfaces

### `http://localhost:3000/company/settings`

- [ ] "Company Compliance" section renders below Company Qualifications
- [ ] Three groups visible: Insurance, Workers' Compensation, Safety
- [ ] Fields are exactly Name, Provider / Authority, Effective Date, Expiry Date
- [ ] No identifier, policy number, coverage limit, notes, or public visibility control appears
- [ ] Owner/Admin can add, edit, remove, and save compliance records
- [ ] Member/Viewer sees read-only cards with no editable inputs and no Save button
- [ ] `Save Compliance` shows a loading state, then a success message
- [ ] Reload persists saved values
- [ ] Self-declared notice is present: "Compliance information is maintained by this organization and has not been independently verified by Nexus Pavilion."

#### Validation

- [ ] Blank name is rejected
- [ ] Name longer than 160 characters is rejected
- [ ] Blank provider saves as empty (stored as NULL) without error
- [ ] Non-ISO dates (`2026-6-15`, `06-15-2026`, `2026/06/15`) are rejected
- [ ] Invalid calendar dates (`2026-02-30`, `2026-13-01`) are rejected
- [ ] Expiry before effective date is rejected
- [ ] Expiry equal to effective date is accepted
- [ ] Duplicate name + provider within the same group is rejected
- [ ] The same name + provider in two different groups is accepted
- [ ] Adding a 41st record to one group is blocked with the 40-record message

#### Editing an existing record

- [ ] Each saved card shows both `Edit` and `Remove` for Owner/Admin
- [ ] `Edit` opens inline fields for Name, Provider / Authority, Effective Date, Expiry Date
- [ ] `Cancel` discards the edit and restores the original card
- [ ] `Update Record` applies the edit to the card in place
- [ ] Editing a record and keeping its identity unchanged does **not** trigger "This compliance record is already listed."
- [ ] Editing a record into an identity matching another card in the same group **is** blocked as a duplicate
- [ ] Add-form validation rules apply identically in edit mode
- [ ] `Save Compliance` persists the edit; reload shows the edited values
- [ ] No modal opens at any point; editing is inline only

#### Derived status states

Create one record per state and confirm the rendered Status value:

- [ ] Effective date in the future => `Not yet effective`
- [ ] Expiry more than 30 days away => `Current`
- [ ] Expiry within the next 30 days => `Expiring soon`
- [ ] Expiry in the past => `Expired`
- [ ] No expiry date => `No expiry recorded`
- [ ] No card, badge, or heading claims a record is verified, approved, validated, certified, or compliant

### `http://localhost:3000/company`

- [ ] Internal read-only compliance section appears below the qualifications section
- [ ] Group/type, name, provider (when present), effective date (when present), expiry date (when present), and derived status all render
- [ ] Empty groups show "Not provided"
- [ ] Fully empty registry shows a truthful "Not provided" empty state
- [ ] Self-declared notice is present
- [ ] Long values wrap without horizontal overflow
- [ ] No Edit, Remove, or Save controls appear on this surface

### `http://localhost:3000/company/[slug]` (approved/verified company, anonymous)

- [ ] No compliance section renders at all
- [ ] Page source contains no compliance record name
- [ ] Page source contains no provider/carrier value
- [ ] Page source contains no effective or expiry date from a compliance record
- [ ] Page source contains no `company_compliance` reference
- [ ] Repeat the check while signed out in a private window

## Authorization Matrix

Exercise `PUT /api/companies/{id}/compliance` and confirm the status code:

- [ ] Signed out + invalid payload => `401`
- [ ] Signed out + valid payload => `401`
- [ ] Member + invalid payload => `403`
- [ ] Member + valid payload => `403`
- [ ] Viewer + invalid payload => `403`
- [ ] Viewer + valid payload => `403`
- [ ] Cross-company id + valid payload => `403`
- [ ] Owner/Admin + invalid payload => `400`
- [ ] Owner/Admin + valid payload => `200`
- [ ] An unauthorized caller never receives a payload-validation error message

Exercise `GET /api/companies/{id}/compliance`:

- [ ] Signed out => `401`
- [ ] Inactive/non-member => `403`
- [ ] Cross-company id => `403`
- [ ] Active Member => `200` with grouped compliance
- [ ] Active Viewer => `200` with grouped compliance
- [ ] Active Owner/Admin => `200` with grouped compliance

## Audit

- [ ] One successful save produces exactly **one** `COMPANY_COMPLIANCE_UPDATED` row
- [ ] `entity_type` is `company` and `company_id` matches the workspace
- [ ] Metadata contains only `compliance_count`, `counts_by_type`, `updated_by.id`, `updated_by.workspace_role`, and `updated_at`
- [ ] Metadata contains no record name, provider, effective date, expiry date, or payload array
- [ ] A failed save produces no audit row
- [ ] No duplicate audit row is written by the API route

## Mobile / Accessibility (~390px)

- [ ] `/company/settings` compliance section has no horizontal overflow
- [ ] `/company` compliance section has no horizontal overflow
- [ ] All Add / Edit / Remove / Cancel / Update / Save controls are >=44px tall
- [ ] Every interactive control shows a visible keyboard focus ring
- [ ] Tab order through the compliance section is logical
- [ ] Date inputs are usable on a touch viewport
- [ ] Group headings are readable and not truncated

## Console / Network

- [ ] No console errors originating from the compliance section
- [ ] No React hydration warnings from the compliance components
- [ ] Failed saves log only safe tokens (no raw error message, details, hint, stack, or record values)
- [ ] No network request exposes compliance data to an unauthenticated context
- [ ] No request is made to `company_compliance_public` (it must not exist)

## Cleanup

- [ ] Remove every transient QA compliance record
- [ ] Save and confirm the registry returns to the exact pre-QA row count
- [ ] `/company` compliance section shows the truthful empty state again
- [ ] Public profile remains free of compliance data
- [ ] No membership, company status, or company identity was modified during QA

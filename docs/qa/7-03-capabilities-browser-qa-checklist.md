# 7-03 Company Capabilities — Browser QA Checklist

Run after the `20260839000000_company_capabilities_contract.sql` migration is applied to the target database.

## Preconditions

- Authenticated workspace users for each role: Owner, Admin, Member, Viewer
- At least one approved or verified company with a public slug
- Local app running at `http://localhost:3000`

## Desktop Surfaces

### `/company/settings`

- [ ] "Company Capabilities" section renders below Professional Identity
- [ ] Four groups visible: Trades, Services, Products, Regions Served
- [ ] Owner/Admin can add, remove, and save capabilities
- [ ] Member/Viewer sees read-only chips with no editable inputs or Save button
- [ ] Duplicate labels are blocked within a group
- [ ] Save shows loading state, then success message
- [ ] Reload persists saved values

### `/company`

- [ ] Compact read-only capabilities section appears
- [ ] Empty groups show "Not provided"
- [ ] Long labels wrap without horizontal overflow

### `/company/[slug]` (approved/verified company)

- [ ] Capabilities render read-only for public visitors
- [ ] Empty groups are omitted entirely
- [ ] No private workspace data is exposed

## Mobile (~390px)

Repeat the three surfaces above and verify:

- [ ] No horizontal overflow or clipped chips
- [ ] Inputs and buttons remain reachable
- [ ] Focus states are visible for keyboard navigation

## Authorization Matrix

| Role   | Settings editable | Save allowed |
| ------ | ----------------- | ------------ |
| Owner  | Yes               | Yes          |
| Admin  | Yes               | Yes          |
| Member | No                | No           |
| Viewer | No                | No           |

## Network / Console Checks

- [ ] `PUT /api/companies/{id}/capabilities` returns 401 when signed out
- [ ] Member/Viewer `PUT` returns 403
- [ ] Owner/Admin `PUT` returns 200 and creates `COMPANY_CAPABILITIES_UPDATED` audit event
- [ ] No console errors on any surface
- [ ] No failed network requests after successful save/reload

## Regression Guardrails

- [ ] RFQ, quote, award, invitation, and procurement flows unchanged
- [ ] Existing company profile fields (`category`, `location`, `network_role`) unchanged

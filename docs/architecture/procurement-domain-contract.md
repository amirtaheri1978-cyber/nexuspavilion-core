# Nexus Pavilion Procurement Domain Contract

## Purpose

This document defines the authoritative business meaning, access semantics, and platform usage of procurement concepts across Nexus Pavilion.

It is the single source of truth for Sidebar metrics, Executive Dashboard metrics, Supplier Dashboard metrics, RFQ Marketplace visibility, Analytics, Company Workspace, Board reporting, Notifications, and AI-generated procurement intelligence.

No page, API route, component, or report may redefine these concepts locally.

## 1. Core Identity Model

### User Identity

A user identity represents the authenticated person. Authoritative fields are `user.id` and `user.email`.

Identity does not determine procurement experience by itself.

### Profile Role

`profile.role` determines authorization inside the current company.

Examples: `owner`, `admin`, `buyer`, `manager`, `member`, `viewer`, `vendor`, `supplier`, `consultant`.

A profile role answers: **What may this person administer or approve?**

It does not independently answer: **Which procurement experience should this person see?**

### Company Network Role

`company.network_role` represents the company’s operating position in the network.

Examples: Buyer, Client, General Contractor, Supplier, Vendor, Manufacturer, Distributor, Trade Contractor, Consultant, Professional Services, Hybrid.

A company network role answers: **What commercial role does this organization perform?**

### Procurement Experience

The resolved procurement experience determines the semantic data model and presentation mode.

Supported modes:

- `buyer`
- `supplier`
- `consultant`
- `hybrid`

A procurement experience answers: **Which procurement context, metrics, labels, navigation, and access rules apply?**

## 2. RFQ Domain Definitions

### Owned RFQ

An RFQ created, governed, and commercially controlled by the current company.

Authoritative rule:

```text
rfqs.company_id = currentCompanyId
```

### Open Owned RFQ

An owned RFQ that is currently active.

```text
Owned RFQ
AND
status is null OR status = "open"
```

### Public Opportunity

An open RFQ available to qualified supplier organizations without a direct invitation.

```text
status is null OR status = "open"
AND
sourcing_method = "open"
```

### Restricted Opportunity

An RFQ that requires explicit supplier access.

Restricted sourcing methods:

- `invited`
- `sealed_bid`

A restricted RFQ is not discoverable by unrelated suppliers.

### Accessible Opportunity

An open RFQ that the current supplier organization is authorized to discover or access.

```text
Public Opportunity
OR
Direct invitation to the authenticated user
OR
Invitation to the current supplier company
OR
Existing authorized participation by the current supplier company
```

Existing participation may preserve access to an RFQ that the supplier already quoted, but it must not automatically grant access to unrelated restricted RFQs.

### Open Opportunity

An accessible opportunity that remains open.

```text
Accessible Opportunity
AND
status is null OR status = "open"
```

### Invited Opportunity

A restricted opportunity accessible because the current user or company was explicitly invited.

### Sealed Bid Opportunity

A restricted opportunity using `sealed_bid`. Visibility may be granted to the invited supplier, but competitor pricing, commercial comparisons, and sealed information must remain protected until the applicable opening event.

### Framework Agreement

`contract_framework = "framework"` describes the commercial structure of the RFQ. It does not determine marketplace visibility.

Correct combinations:

```text
framework + open
framework + invited
framework + sealed_bid
```

Visibility is determined by `sourcing_method`, not by `contract_framework`.

## 3. Quote Domain Definitions

### Supplier Submitted Quote

A quote submitted by the current supplier company.

```text
quotes.company_id = currentSupplierCompanyId
```

### Buyer Received Quote

A quote submitted against an RFQ owned by the current buyer company.

```text
quotes.rfq_id belongs to an Owned RFQ
```

These two concepts must never share one metric label without an explicit experience-specific definition.

### Pending Supplier Decision

```text
Supplier Submitted Quote
AND
decision is null OR decision = "pending"
```

### Pending Buyer Evaluation

An owned RFQ with supplier responses requiring evaluation or award action.

### Supplier Award

A supplier-submitted quote with `decision = "awarded"`.

### Buyer Issued Award

An awarded quote against an RFQ owned by the current buyer company.

### Unsuccessful Supplier Quote

A supplier-submitted quote with a final non-award decision such as `rejected` or `not_awarded`. The production status set must be standardized before launch.

## 4. Metric Definitions

### Supplier Open Opportunities

Count of `Open Opportunity` records accessible to the current supplier company.

This value must be identical in Supplier Sidebar, RFQ Marketplace, Supplier Dashboard, Supplier Analytics, and Executive Dashboard in supplier mode.

### Supplier Submitted Quotes

Count of `Supplier Submitted Quote` records.

### Supplier Pending Decisions

Count of supplier-submitted quotes without a final decision.

### Supplier Awards

Count of supplier-submitted quotes with `decision = "awarded"`.

### Supplier Active Bid Value

Sum of active supplier-submitted quote amounts that remain pending.

### Supplier Awarded Revenue

Sum of awarded supplier-submitted quote amounts.

### Supplier Win Rate

```text
Supplier Awards / Supplier Submitted Quotes
```

If there are no submitted quotes, the value is `0`, accompanied by `Insufficient Data` where appropriate.

### Buyer Open RFQs

Count of `Open Owned RFQ` records.

### Buyer Received Quotes

Count of quotes submitted against buyer-owned RFQs.

### Buyer Pending Evaluations

Count of buyer-owned RFQs with responses requiring evaluation.

### Buyer Issued Awards

Count of awarded quotes against buyer-owned RFQs.

### Buyer Planned Budget

Sum of budgets across the defined buyer RFQ portfolio.

### Buyer Awarded Spend

Sum of awarded quote amounts against buyer-owned RFQs.

## 5. Experience-Specific Presentation Contract

### Buyer Experience

Preferred labels:

- Owned RFQs
- Open RFQs
- Supplier Responses
- Pending Evaluations
- Issued Awards
- Planned Budget
- Awarded Spend

### Supplier Experience

Preferred labels:

- Open Opportunities
- My Quotes
- Pending Decisions
- Awards
- Active Bid Value
- Awarded Revenue
- Win Rate

### Consultant Experience

Preferred labels must distinguish Advisory Opportunities, Service RFQs, Submitted Proposals, Active Engagements, and Awarded Services.

Consultant semantics must not be inferred from supplier metrics without an explicit contract.

### Hybrid Experience

Hybrid organizations must use an explicit workspace mode:

- Buyer Workspace
- Supplier Workspace
- Consultant Workspace, where applicable

Metrics from different modes must not be merged into one ambiguous KPI.

## 6. Access Reasons

Every supplier-visible RFQ should expose an internal access reason:

```ts
type RfqAccessReason =
  | "public"
  | "direct_invitation"
  | "company_invitation"
  | "existing_participation";
```

This supports auditability, debugging, access reviews, role-specific badges, and consistency testing.

## 7. Invitation Contract

The enterprise target model is organization-first.

Required target fields:

- `rfq_id`
- `company_id`
- `invited_user_id`
- `email`
- `status`
- `invited_by`
- `invited_at`
- `viewed_at`
- `accepted_at`
- `declined_at`
- `revoked_at`
- `expires_at`

Organizational access should be granted through `company_id`. Email and user identifiers provide recipient identity and audit trail.

Target invitation statuses:

- `sent`
- `viewed`
- `accepted`
- `declined`
- `revoked`
- `expired`

Legacy statuses must be normalized before production launch.

## 8. Platform Consistency Rules

1. A metric name must have one authoritative definition.
2. Sidebar and destination page counts must agree for the same experience and session.
3. Supplier opportunity counts must be based on accessible opportunities, not owned RFQs.
4. Supplier quote counts must be based on supplier-company submissions.
5. Buyer quote counts must be based on responses received on buyer-owned RFQs.
6. Restricted RFQs must never be visible to unrelated supplier companies.
7. Framework classification must not override sourcing visibility.
8. Historical participation must remain separate from open opportunity counts.
9. Pages may format metrics, but may not redefine them.
10. All AI and executive intelligence must consume the same domain metrics as the source pages.

## 9. Required Shared Architecture

```text
Authentication
→ Identity
→ Profile Authorization
→ Company Capability
→ Procurement Experience Resolver
→ Procurement Access Repository
→ Procurement Metrics Engine
→ Role-Specific View Model
→ Presentation
```

No page or component may bypass this flow for procurement metrics after migration is complete.

## 10. Migration Order

1. Procurement Experience Resolver
2. RFQ Access Contract
3. Shared Procurement Context Repository
4. Shared Procurement Metrics Engine
5. RFQ Marketplace and Sidebar
6. Supplier Dashboard
7. Executive Dashboard
8. Analytics
9. Company Workspace
10. Board Reports and AI Intelligence

## 11. Definition of Done

The platform is consistent when:

- Supplier Sidebar `Open Opportunities` equals RFQ Marketplace `Open Opportunities`.
- Supplier Dashboard uses the same opportunity set.
- Supplier Analytics uses the same opportunity and quote definitions.
- Buyer metrics use owned RFQs and received quotes.
- Hybrid companies use an explicit workspace mode.
- Restricted RFQs are visible only to authorized users or companies.
- Same-name metrics have the same definition and value everywhere.
- Cross-page consistency tests pass.
- No consumer defines procurement semantics locally.
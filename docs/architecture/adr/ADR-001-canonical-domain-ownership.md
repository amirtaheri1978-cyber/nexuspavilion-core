# ADR-001: Canonical Domain Ownership

- **Status:** Accepted
- **Date:** 2026-07-23
- **Decision owners:** Nexus Pavilion product and engineering
- **Scope:** Repository-wide

## Context

Nexus Pavilion contains multiple feature areas with related executive, procurement, analytics, supplier, RFQ, and company concepts.

Similar file names do not necessarily indicate duplicate implementations. Some modules operate at an individual procurement-event level, while others operate at portfolio or enterprise level.

Without explicit ownership, future changes could create:

- duplicate engines;
- competing type definitions;
- business logic inside UI components;
- page-specific implementations of shared concepts;
- ambiguous imports;
- circular dependencies;
- broad migrations that require later reversal.

## Decision

Each business concept must have one canonical owner.

A new file, type, engine, component, utility, or API contract may be created only after confirming that an equivalent implementation does not already exist.

## Canonical Ownership Map

### RFQ

| Responsibility | Canonical owner |
|---|---|
| RFQ route orchestration | `src/app/rfq` |
| RFQ detail page orchestration | `src/app/rfq/[slug]/page.tsx` |
| RFQ feature compositions | `src/components/rfq-workspace` |
| RFQ access and capabilities | `src/lib/procurement/rfq-access-contract.ts` |
| RFQ commercial intelligence | `src/lib/procurement/rfq-commercial-intelligence.ts` |
| RFQ procurement health | `src/lib/procurement/rfq-procurement-health.ts` |
| RFQ metadata and status | `src/lib/procurement/rfq-metadata.ts` |
| RFQ executive guidance | `src/lib/procurement/rfq-executive-guidance.ts` |
| Single-RFQ opportunity intelligence | `src/lib/procurement/rfq-executive-opportunity-intelligence.ts` |

### Executive Intelligence

| Responsibility | Canonical owner |
|---|---|
| Generic executive decision engine | `src/lib/executive` |
| Executive domain types | `src/lib/executive/executive-types.ts` |
| Executive risk | `src/lib/executive/executive-risk.ts` |
| Executive recommendations | `src/lib/executive/executive-recommendation.ts` |
| Executive actions | `src/lib/executive/executive-actions.ts` |
| Executive scenarios | `src/lib/executive/executive-scenarios.ts` |
| Executive board output | `src/lib/executive/executive-board.ts` |
| Executive summary | `src/lib/executive/executive-summary.ts` |
| Reusable executive UI primitives | `src/components/executive` |
| Executive workspace primitives | `src/components/executive/workspace` |

### Analytics

| Responsibility | Canonical owner |
|---|---|
| Analytics route orchestration | `src/app/analytics` |
| Analytics feature compositions | `src/components/analytics` |
| Analytics executive compositions | `src/components/analytics/executive` |
| Analytics-specific executive engines | `src/lib/analytics/executive` |
| Portfolio intelligence | `src/lib/analytics/portfolio` |
| Analytics narratives | `src/lib/analytics/narrative` |
| Analytics source-data loading | `src/lib/analytics/source-data` |
| Portfolio opportunity intelligence | `src/lib/analytics/executive/opportunity-intelligence.ts` |
| Portfolio supplier intelligence | `src/lib/analytics/supplier-intelligence.ts` |

### Supplier and Vendor Intelligence

| Responsibility | Canonical owner |
|---|---|
| Procurement-event supplier assessment | `src/lib/procurement/supplier-intelligence.ts` |
| Portfolio supplier intelligence | `src/lib/analytics/supplier-intelligence.ts` |
| Vendor decision composition | `src/components/vendor-intelligence` |
| Supplier workspace composition | `src/components/vendor-workspace` |
| Vendor-specific display mapping | `src/components/vendor-intelligence/vendor-display-utils.ts` |

The two supplier-intelligence modules must not be merged solely because their filenames are similar. Their inputs, outputs, scoring scope, and consumers must be compared before any consolidation.

### Company

| Responsibility | Canonical owner |
|---|---|
| Company routes | `src/app/company` |
| Company UI compositions | Existing company components |
| Company API boundary | Existing company API routes |
| Authorization and permissions | Existing permission modules |

A new `src/lib/company` domain must not be created until repeated company business logic is demonstrated in the existing pages, components, or routes.

### Email

| Responsibility | Canonical owner |
|---|---|
| Email delivery | `src/lib/email/send-email.ts` |
| Email templates | `src/lib/email/templates` |
| Contact submission boundary | `src/app/api/contact/route.ts` |

### Infrastructure

| Responsibility | Canonical owner |
|---|---|
| Browser Supabase client | `src/lib/supabase/client.ts` |
| Server Supabase client | `src/lib/supabase/server.ts` |
| Legacy direct Supabase client | `src/lib/supabase.ts` — deprecated |

## ExecutiveQuote Decision

`ExecutiveQuote` is a compact executive input contract stored in:

```text
src/types/executive.ts
```

It is intentionally separate from database rows and full procurement quote models.

It may be consumed by executive engines and RFQ executive presentation components.

`src/lib/executive/executive-types.ts` remains the canonical owner of the broader executive domain model and may import `ExecutiveQuote`.

This is an accepted dependency, not a duplicate type definition.

## Rules

- Similar names do not prove duplicate responsibility.
- Domain ownership is determined by scope, inputs, outputs, and consumers.
- Page files must not become canonical owners of reusable business calculations.
- UI primitives must not own canonical scoring, ranking, risk, or recommendation logic.
- Database row types must not automatically become domain models.
- API DTOs, domain models, view models, form inputs, and presentation props may remain separate when their responsibilities differ.
- Shared types must be genuinely cross-domain.
- New executive domain types belong in `src/lib/executive/executive-types.ts` unless they are deliberately small cross-domain contracts.
- New RFQ business logic belongs in `src/lib/procurement`.
- New portfolio analytics logic belongs in `src/lib/analytics`.

## Consequences

### Positive

- Reduced duplicate implementation risk.
- Clearer ownership.
- Safer refactoring.
- Smaller page files.
- More reliable testing boundaries.
- Better onboarding for future contributors.

### Trade-offs

- Some similarly named files remain separate.
- Architecture work requires an inspection step before implementation.
- Cross-domain extraction may occur later rather than immediately.

## Compliance Check

Before creating or moving a file:

- [ ] Search the repository for equivalent concepts.
- [ ] Identify the current owner and consumers.
- [ ] Distinguish individual-RFQ scope from portfolio scope.
- [ ] Distinguish domain logic from presentation logic.
- [ ] Confirm the proposed dependency direction.
- [ ] Preserve current business behavior.
- [ ] Update this ADR when ownership changes.

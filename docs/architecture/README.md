# Nexus Pavilion Architecture Foundation

## Status

**Active**

This directory contains the canonical architecture decisions and domain-language rules for Nexus Pavilion.

The purpose of these documents is to prevent duplicate implementations, unclear ownership, circular dependencies, inconsistent executive terminology, and repeated architecture decisions.

## Authority

When implementation choices conflict with these documents:

1. Verify the current repository architecture.
2. Prefer the existing canonical owner.
3. Extend an existing implementation before creating a new file.
4. Preserve current business logic unless a separate approved change explicitly modifies it.
5. Update the relevant ADR when an architectural decision changes.

## Documents

### Architecture Decision Records

- [`ADR-001 — Canonical Domain Ownership`](./adr/ADR-001-canonical-domain-ownership.md)
- [`ADR-002 — Dependency Direction and Import Rules`](./adr/ADR-002-dependency-direction-and-import-rules.md)
- [`ADR-003 — Supabase Client Boundaries`](./adr/ADR-003-supabase-client-boundaries.md)

### Domain Language

- [`Executive Procurement Domain Taxonomy`](./executive-procurement-domain-taxonomy.md)

### Execution Control

- [`Architecture Change Checklist`](./architecture-change-checklist.md)

## Canonical Layer Model

```text
src/app
  Route handling
  Authentication entry
  Authorization orchestration
  Data loading
  Page composition

src/components
  UI rendering
  User interaction
  Feature composition
  Presentation-only utilities

src/lib
  Domain decisions
  Scoring
  Ranking
  Recommendation
  Data transformation
  Repositories
  Integrations

src/types
  Small cross-domain contracts only
```

## Core Principle

```text
Pages orchestrate.
Components present.
Domain libraries decide.
Repositories fetch and persist.
Shared utilities remain domain-neutral.
```

## Mandatory Workflow

Every architecture or code revision must follow:

```text
Inspect
→ Search for an equivalent implementation
→ Identify the canonical owner
→ Define the smallest coherent scope
→ Preserve business logic
→ Implement
→ npm run lint
→ npm run build
→ Visual verification
→ Console review
→ Git diff review
→ Commit
→ Push
→ Update roadmap and ADR status
```

## Current Decisions

- RFQ business logic belongs to `src/lib/procurement`.
- RFQ feature composition belongs to `src/components/rfq-workspace`.
- Reusable executive decision logic belongs to `src/lib/executive`.
- Reusable executive UI primitives belong to `src/components/executive`.
- Analytics-specific intelligence belongs to `src/lib/analytics`.
- Vendor-specific presentation logic belongs to the vendor feature boundary.
- Browser Supabase access uses `src/lib/supabase/client.ts`.
- Server Supabase access uses `src/lib/supabase/server.ts`.
- `src/lib/supabase.ts` is deprecated and must not receive new consumers.
- Similar names do not prove duplicate responsibility.
- No shared abstraction may be introduced before a repository-wide equivalent search.

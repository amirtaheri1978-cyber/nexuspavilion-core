# ADR-002: Dependency Direction and Import Rules

- **Status:** Accepted
- **Date:** 2026-07-23
- **Scope:** Repository-wide

## Context

Nexus Pavilion has multiple layers that must remain independently understandable and testable.

Uncontrolled imports could cause:

- circular dependencies;
- server-only code entering client bundles;
- UI code becoming the owner of business decisions;
- page files accumulating reusable logic;
- analytics modules depending on RFQ implementations;
- shared utilities becoming an unstructured dumping ground.

## Decision

The canonical dependency direction is:

```text
app
  ↓
feature components
  ↓
domain libraries
  ↓
repositories and integrations
  ↓
domain-neutral utilities
```

Types may be imported across these layers only when the import does not reverse ownership or introduce runtime coupling.

## Layer Responsibilities

### `src/app`

May own:

- route handling;
- authentication entry;
- authorization orchestration;
- server data loading;
- page composition;
- redirect decisions;
- route-specific metadata.

Must not own:

- reusable scoring;
- reusable recommendation logic;
- reusable risk formulas;
- reusable ranking formulas;
- canonical formatting utilities;
- canonical domain types.

### `src/components`

May own:

- rendering;
- interaction;
- feature composition;
- local UI state;
- presentation-specific mapping;
- accessibility behavior.

Must not own:

- canonical business scoring;
- database persistence;
- reusable authorization policy;
- server-only repositories;
- canonical procurement recommendations.

### `src/lib`

May own:

- domain rules;
- scoring;
- ranking;
- risk evaluation;
- recommendations;
- transformations;
- repository access;
- integrations;
- reusable server behavior.

Must not import:

- React pages;
- route implementations;
- feature UI compositions;
- client-only hooks unless the module is explicitly client infrastructure.

### Shared utilities

May own:

- generic currency formatting;
- generic date-time formatting;
- generic number formatting;
- generic percentages;
- domain-neutral transformations.

Must not import:

- RFQ types;
- executive types;
- analytics types;
- React components;
- Supabase clients;
- route handlers.

## Import Rules

### Mandatory

- Use `import type` for type-only dependencies.
- Server Components, Server Actions, Route Handlers, and repositories use server infrastructure.
- Client Components use browser infrastructure.
- Domain libraries must not import feature components.
- Analytics engines must not import RFQ page implementations.
- RFQ components may consume executive contracts but must not redefine executive engine behavior.
- API routes may orchestrate domain functions but must not duplicate their formulas.
- Presentation utilities remain inside their feature when they contain domain-specific labels, statuses, or mappings.
- Barrel exports may be introduced only after circular-dependency risk is checked.

### Prohibited

```text
src/lib/procurement → src/components/*
src/lib/executive   → src/components/*
src/lib/analytics   → src/app/*
src/lib/shared      → RFQ, Executive, Analytics, Company domain types
server modules      → browser Supabase client
client components   → server Supabase client
```

## Server and Client Boundary

A file containing `"use client"` must not import:

```text
@/lib/supabase/server
next/headers
server-only repositories
private environment variables
```

A server repository or route must not import:

```text
@/lib/supabase/client
browser-only APIs
client hooks
```

## Page Orchestration Standard

A healthy page should primarily:

1. resolve authentication;
2. resolve authorization;
3. load data;
4. build or invoke domain models;
5. compose feature components;
6. handle route-level errors and redirects.

A page should not contain large reusable calculation blocks.

## Shared-Layer Admission Test

A utility may move into a shared layer only when all answers are **yes**:

- [ ] Is it independent of one business domain?
- [ ] Does it avoid domain-specific labels and statuses?
- [ ] Can it run without Supabase or React?
- [ ] Is there more than one legitimate consumer?
- [ ] Has the repository been searched for equivalent behavior?
- [ ] Will extraction reduce, rather than hide, complexity?

## Exceptions

Any exception requires:

- a documented reason;
- a narrow scope;
- no circular dependency;
- an ADR update when the exception becomes permanent.

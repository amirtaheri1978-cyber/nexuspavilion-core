# Nexus Pavilion Architecture Change Checklist

Use this checklist for every architecture, refactor, domain-engine, component-extraction, shared-utility, or cross-cutting change.

## 1. Inspection

- [ ] Inspect the current implementation.
- [ ] Search the repository for equivalent files, exports, hooks, routes, types, utilities, and components.
- [ ] Identify all consumers.
- [ ] Identify server and client boundaries.
- [ ] Identify the current canonical owner.
- [ ] Review relevant ADRs.
- [ ] Review the Executive Procurement Domain Taxonomy.

## 2. Scope

- [ ] Define one small, coherent, release-safe change.
- [ ] Exclude unrelated redesign or cleanup.
- [ ] Confirm the change will reduce future work.
- [ ] Confirm no duplicate file is being introduced.
- [ ] Confirm whether the change is RFQ-level, supplier-level, company-level, or portfolio-level.

## 3. Architecture

- [ ] Dependency direction remains valid.
- [ ] Page remains orchestration-focused.
- [ ] Component remains presentation-focused.
- [ ] Business logic remains in the canonical domain library.
- [ ] Repository access remains server-side when appropriate.
- [ ] Shared utilities remain domain-neutral.
- [ ] Type-only imports use `import type`.
- [ ] No circular dependency is introduced.
- [ ] No server-only module enters a client bundle.

## 4. Business Integrity

- [ ] Current behavior is preserved unless explicitly changed.
- [ ] Authorization is preserved.
- [ ] Blind-bidding rules are preserved.
- [ ] Commercial evaluation controls are preserved.
- [ ] Quote visibility is preserved.
- [ ] Owner and respondent behavior is preserved.
- [ ] Database queries and mutation semantics are preserved.
- [ ] Data limitations remain explicit.

## 5. Executive and Procurement Language

- [ ] Terms match the canonical taxonomy.
- [ ] Recommendation is not presented as a decision.
- [ ] Missing data is not presented as adverse performance.
- [ ] Score and confidence are distinct.
- [ ] Severity and priority are distinct.
- [ ] Risk, issue, gap, and constraint are used correctly.
- [ ] Copy is credible, precise, and enterprise-appropriate.
- [ ] No demo-like or exaggerated wording is introduced.

## 6. Experience Quality

- [ ] Responsive behavior is reviewed.
- [ ] Keyboard navigation is reviewed.
- [ ] Focus states are reviewed.
- [ ] Loading state is reviewed.
- [ ] Empty state is reviewed.
- [ ] Error state is reviewed.
- [ ] Reduced-motion behavior is preserved where applicable.
- [ ] Console remains clean.

## 7. Validation

- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Perform visual verification.
- [ ] Review browser console.
- [ ] Review Git diff.
- [ ] Confirm no unrelated changes.
- [ ] Confirm no accidental file duplication.
- [ ] Confirm no import-path regression.

## 8. Release

- [ ] Commit one coherent change.
- [ ] Use a clear professional commit message.
- [ ] Push only after validation is complete.
- [ ] Update roadmap status.
- [ ] Update an ADR when ownership or dependency rules changed.

## Definition of Done

A change is complete only when:

```text
Architecture reuse
+ Business logic preservation
+ Executive Design System consistency
+ Procurement terminology
+ Responsive behavior
+ Accessibility
+ Loading/empty/error states
+ Performance
+ Security and authorization
+ Console cleanliness
+ Lint
+ Build
+ Visual verification
+ Diff review
+ Commit
+ Push
```

are all satisfied within the agreed scope.

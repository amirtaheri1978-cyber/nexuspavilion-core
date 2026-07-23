# Nexus Pavilion Executive Procurement Domain Taxonomy

- **Status:** Active
- **Date:** 2026-07-23
- **Scope:** Product language, domain models, engine outputs, UI labels, reports, alerts, and executive narratives

## Purpose

This taxonomy defines the canonical meaning of Nexus Pavilion's executive and procurement concepts.

It prevents overlapping terms from being used interchangeably and reduces future renaming across RFQ, Analytics, Vendor, Company, Dashboard, CEO, Board, and reporting experiences.

## Canonical Decision Chain

```text
Source Data
→ Evidence
→ Signal
→ Assessment
→ Insight
→ Risk or Opportunity
→ Recommendation
→ Action
→ Decision
→ Outcome
→ Board Summary
```

Every engine output should map clearly to one or more stages of this chain.

---

## 1. Source Data

### Definition

Raw or normalized facts obtained from system records, submissions, documents, activity history, supplier records, or external integrations.

### Examples

- quote amount;
- delivery date;
- supplier category;
- compliance record;
- number of submitted quotes;
- RFQ budget;
- addenda acknowledgement;
- previous award history.

### Rules

- Source data is not an insight.
- Source data should not contain interpretation unless explicitly normalized.
- Missing source data must not be treated as negative evidence.

---

## 2. Evidence

### Definition

A traceable fact used to support a signal, assessment, risk, recommendation, or decision.

### Examples

- “The supplier acknowledged all three addenda.”
- “The bid is 8.4% below the approved budget.”
- “No verified quality history is available.”

### Rules

- Evidence must be explainable and traceable.
- Evidence should avoid promotional language.
- Evidence must distinguish absent data from adverse data.

---

## 3. Signal

### Definition

A focused, measurable indication derived from one or more evidence points.

### Examples

- commercial competitiveness;
- delivery reliability;
- compliance readiness;
- category alignment;
- procurement risk;
- response reliability.

### Required properties

```text
key
label
availability
score
tone
summary
evidence
```

### Rules

- A signal is narrow.
- A signal should not itself prescribe an action.
- A signal may be unavailable when evidence is insufficient.

---

## 4. Assessment

### Definition

A structured evaluation of one subject, control area, supplier, RFQ, or portfolio dimension.

### Examples

- procurement readiness assessment;
- supplier capability assessment;
- commercial evaluation assessment;
- governance assessment.

### Rules

- An assessment may combine multiple signals.
- An assessment should state scope.
- An assessment should not be called an insight when it is primarily a scored evaluation.

---

## 5. Insight

### Definition

A decision-relevant interpretation that explains why a pattern, condition, or change matters.

### Examples

- “Bid dispersion indicates a potentially inconsistent scope interpretation.”
- “Supplier concentration is increasing in a category with limited contingency capacity.”

### Rules

- An insight must explain significance.
- An insight is broader than one signal.
- An insight should not automatically prescribe a specific decision.
- Avoid using “insight” as a generic label for every card.

---

## 6. Risk

### Definition

A plausible adverse condition that may affect cost, time, quality, compliance, continuity, governance, or decision confidence.

### Required distinctions

#### Risk

A future or unresolved adverse possibility.

#### Issue

A condition that has already occurred or is currently active.

#### Gap

A missing control, capability, evidence set, or required condition.

#### Constraint

A known limitation that restricts available actions.

### Examples

- Risk: insufficient competitive tension may increase award cost.
- Issue: the submission deadline has passed with no compliant bid.
- Gap: no verified insurance evidence is available.
- Constraint: only approved vendors may be considered.

### Rules

- Do not label missing data as high risk without supporting logic.
- Severity and priority are separate.
- Risk descriptions should include impact and rationale.

---

## 7. Opportunity

### Definition

A credible condition that may improve cost, time, quality, resilience, supplier performance, governance, or strategic value.

### Examples

- negotiation opportunity;
- supplier consolidation opportunity;
- schedule acceleration opportunity;
- improved competition opportunity.

### Rules

- An opportunity must have evidence.
- An opportunity is not marketing language.
- Opportunity impact and confidence should be distinguishable.
- RFQ-level and portfolio-level opportunities must remain separate in ownership.

---

## 8. Recommendation

### Definition

A reasoned proposal for what should be considered next.

### Examples

- proceed to commercial clarification;
- request revised delivery commitments;
- defer award pending compliance evidence;
- advance the highest-ranked supplier to negotiation.

### Rules

- A recommendation is not an automatic decision.
- It must include rationale.
- It should reflect confidence and data availability.
- It must not overstate certainty.
- It should identify the decision owner when applicable.

---

## 9. Action

### Definition

A concrete, executable next step assigned or presented to a user.

### Required properties

```text
title
priority
category
rationale
outcome
actionLabel
href or anchorHref when applicable
```

### Rules

- Actions must be specific.
- Actions should describe a clear outcome.
- “Review” alone is usually too vague.
- Priority reflects urgency and business consequence, not visual emphasis.

---

## 10. Decision

### Definition

A recorded selection, approval, rejection, deferral, escalation, or award made by an authorized decision owner.

### Examples

- approve supplier award;
- reject bid;
- defer evaluation;
- escalate governance exception;
- request resubmission.

### Rules

- Recommendations support decisions but do not replace them.
- Decisions should be auditable.
- Decision status must distinguish proposed, pending, approved, rejected, and deferred.

---

## 11. Outcome

### Definition

The observed or expected result of a decision or completed action.

### Examples

- awarded value;
- expected savings;
- schedule impact;
- risk reduction;
- supplier performance result.

### Rules

- Expected outcomes must be labeled as forecasts or estimates.
- Observed outcomes must be based on actual recorded results.

---

## 12. Board Summary

### Definition

A compressed, governance-ready explanation of decision status, material risk, confidence, recommendation, and required executive action.

### Required characteristics

- concise;
- evidence-based;
- materially focused;
- clear about uncertainty;
- suitable for CEO or Board consumption;
- free from operational detail unless material.

### Rules

- A Board Summary is not a long report.
- It should not introduce unsupported conclusions.
- It should identify material exceptions and decisions required.

---

# Scoring Vocabulary

## Score

A numerical evaluation produced by defined logic.

Rules:

- Define its scale.
- Define what higher and lower values mean.
- Do not present false precision.
- Never confuse score with confidence.

## Confidence

The degree of reliability in an assessment, recommendation, or forecast.

Canonical levels:

```text
high
medium
low
unavailable
```

Confidence must consider:

- data coverage;
- source quality;
- consistency;
- recency;
- model or rule limitations.

## Priority

The urgency and business importance of addressing an action or condition.

Canonical levels:

```text
critical
high
medium
low
```

## Severity

The magnitude of adverse impact if a risk or issue materializes or remains unresolved.

Severity is not interchangeable with priority.

## Impact

The expected material effect of a risk, opportunity, action, or scenario.

Impact may include:

- financial;
- schedule;
- quality;
- compliance;
- continuity;
- governance;
- reputation.

## Availability

Whether sufficient data exists to produce a responsible result.

Canonical values:

```text
available
insufficient_data
not_operational
```

### Meaning

- `available`: sufficient evidence exists for the stated output.
- `insufficient_data`: the capability exists, but evidence is inadequate.
- `not_operational`: the capability or required workflow is not active.

Do not substitute `coming_soon` for a capability that exists but lacks evidence.

---

# Status Vocabulary

Use explicit operational statuses.

## Preferred

```text
Available
Insufficient Data
Not Operational
Ready to Ship
Coming Soon
Rejected
Pending Review
Approved
Deferred
Awarded
Closed
```

## Avoid

```text
Smart
Magic
AI-powered
Best
Perfect
Guaranteed
Instant intelligence
World-class result
```

These may be used in marketing only when substantiated and approved, not as operational product states.

---

# Tone Vocabulary

Canonical internal tones:

```text
success
info
warning
risk
neutral
```

Tone is a presentation classification, not a business decision.

Do not use tone as a substitute for:

- severity;
- priority;
- status;
- availability;
- confidence.

---

# Naming Rules

## Use “Signal” when

The output is narrow, measurable, and evidence-backed.

## Use “Assessment” when

The output evaluates a defined subject or control area.

## Use “Insight” when

The output interprets why a pattern or condition matters.

## Use “Risk” when

The output describes a plausible adverse condition.

## Use “Opportunity” when

The output describes credible potential value.

## Use “Recommendation” when

The output proposes a course of action.

## Use “Action” when

The output is directly executable.

## Use “Decision” when

An authorized choice has been made or is awaiting formal resolution.

## Use “Brief” when

The content is a concise decision-oriented synthesis.

## Use “Narrative” when

The content explains context and relationships in prose.

## Use “Summary” when

The content compresses a broader body of information without adding new reasoning.

---

# Product Copy Rules

- Use precise procurement terminology.
- Avoid generic dashboard language.
- State data limitations.
- Distinguish forecast from actual result.
- Distinguish recommendation from decision.
- Distinguish missing data from negative performance.
- Prefer clear operational language over promotional language.
- Use executive language only where materiality and decision relevance justify it.
- Every risk, recommendation, and action should answer “why this matters.”
- Every unavailable result should explain whether the cause is insufficient data or inactive capability.

---

# Engine Output Review Checklist

Before approving a new engine or output type:

- [ ] What stage of the decision chain does it represent?
- [ ] Is the term already defined here?
- [ ] Is its scope RFQ-level, supplier-level, company-level, or portfolio-level?
- [ ] Is it evidence-backed?
- [ ] Does it distinguish score from confidence?
- [ ] Does it distinguish severity from priority?
- [ ] Does it distinguish missing data from adverse data?
- [ ] Is the output explanatory without overstating certainty?
- [ ] Does it duplicate an existing engine or contract?
- [ ] Is its canonical owner documented?

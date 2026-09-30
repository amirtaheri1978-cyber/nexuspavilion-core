# Intelligent Procurement — Evaluate Responses

**Status:** Launch documentation  
**Task:** 20-08 — Evaluate Responses  
**Product:** Intelligent Procurement  
**Corporate parent:** Nexus Pavilion Inc.

## Purpose

The evaluation workflow gives the issuing organization a governed post-deadline view of submitted quotations.

For launch, issuer-side commercial evaluation is **deadline-controlled for every current sourcing method**:

- Open RFQ
- Invited / Selective RFQ
- Sealed Bid RFQ

Open sourcing controls market access. It does **not** enable rolling commercial evaluation.

Before the submission deadline, the issuer may see safe participation counts where supported, but commercial amounts, comparative pricing, rankings, recommendations, and award controls remain locked.

## 1. When commercial evaluation opens

Commercial opening is determined by the RFQ submission deadline.

The current commercial-opening rule is:

- if the RFQ has no valid deadline, commercial evaluation remains locked;
- while the current time is at or before the deadline, commercial evaluation remains locked;
- after the deadline has passed, commercial evaluation becomes eligible to open.

The same rule applies regardless of whether the RFQ is Open, Invited / Selective, or Sealed Bid.

The application evaluates this rule on the server before loading issuer-side quote rows.

## 2. Pre-deadline visibility

Before commercial opening, Intelligent Procurement deliberately limits issuer visibility.

The issuer can see:

- RFQ status and deadline context;
- safe quotation participation count where supported; and
- commercial lock status.

The issuer does **not** receive the quotation rows used for commercial comparison.

The pre-deadline Quote Workspace therefore presents a **Commercial Submission Lock** rather than comparative evaluation.

Protected commercial fields include:

- supplier quotation amount;
- pricing-derived scoring;
- ranking;
- comparative variance;
- recommendation;
- commercial note content used in evaluation;
- award controls.

This protects the procurement process from premature commercial evaluation.

## 3. Open the comparison workspace

After commercial opening, the issuing organization can open:

`/rfq/[slug]/compare`

The comparison route requires:

- an authenticated user;
- an active profile with a Company Workspace; and
- the current profile company to be the company that owns the RFQ.

Users from another company are redirected away from the issuer comparison workspace.

Authorization to perform later decision or award mutations is separately governed by the relevant API/RPC rules.

## 4. What the comparison workspace shows

After commercial opening, the issuer can review the submitted quotation set.

The comparison surface can show:

- supplier identity;
- commercial offer;
- delivery timeline;
- quotation validity;
- evaluation score;
- price score;
- timeline score;
- performance score;
- risk-readiness score;
- risk level;
- budget variance;
- variance versus the lowest decision-ready quote;
- decision state;
- recommendation state; and
- material-amendment revalidation status.

The interface also provides respondent search and pagination for larger quote sets.

## 5. Decision-ready versus Requires Review

Not every submitted quotation is automatically decision-ready.

A quotation is excluded from the current recommendation and award-eligibility path when it requires material RFQ amendment revalidation.

A quotation marked **Requires Review** remains visible as commercial evidence after opening, but it is excluded from:

- decision-ready ranking;
- decision-ready average;
- lowest/highest decision-ready quote metrics;
- recommendation selection; and
- award eligibility.

The respondent must complete the required Addendum acknowledgement and reconfirm or resubmit the quotation against the current RFQ basis.

This prevents stale commercial terms from being treated as current decision evidence.

## 6. Current evaluation model

Intelligent Procurement uses configured deterministic evaluation criteria. The scoring engine does not make an autonomous procurement decision.

The current weighted evaluation is:

| Evaluation factor | Current weight |
| --- | ---: |
| Price | 38% |
| Timeline | 22% |
| Performance signals | 18% |
| Risk readiness | 14% |
| Quote validity | 8% |

The weighted result is normalized to a total evaluation score out of 100.

These weights are current procurement decision policy in the launch implementation. Changing them is a business-rule change and requires controlled review.

## 7. Price score

The current price score is relative to the lowest **decision-ready** quotation.

A lower commercial amount therefore receives a stronger price score, while higher-priced submissions receive a proportionally lower price score.

Price is only one component of the configured evaluation.

The lowest quotation is not automatically the recommended quotation.

## 8. Timeline score

Timeline scoring is derived from the submitted delivery-timeline text using the configured launch rules.

The engine recognizes common schedule expressions such as:

- Q1 / Q2 / Q3 / Q4;
- weeks;
- month-based durations; and
- terms such as fast or quick.

Shorter interpreted delivery periods produce stronger timeline scores under the current deterministic rules.

The timeline score is decision support. Procurement professionals remain responsible for determining whether the proposed schedule is realistic and acceptable.

## 9. Performance score

The current performance signal is derived from the respondent's Commercial Note.

Configured positive signals include terms associated with areas such as:

- project experience;
- healthcare / hospital context;
- infection control;
- phased or occupied-site execution;
- quality assurance;
- project management;
- firestopping;
- commissioning;
- warranty;
- certification;
- COR; and
- WSIB.

Longer substantive notes can also contribute to the configured performance score.

This score is a structured heuristic based on submitted text. It is not external supplier verification and does not prove actual performance history.

## 10. Risk-readiness score

The current risk score is semantically a **risk-readiness** score: higher values represent a stronger, lower-risk position.

Configured factors can reduce the score when, for example:

- the quotation is above budget;
- the quotation is unusually far below budget;
- the proposed timeline is long; or
- the Commercial Note does not include configured readiness signals such as warranty, quality, or project-management context.

The resulting risk level is presented as:

- Low Risk
- Medium Risk
- High Risk

This is decision support, not a guarantee of supplier risk.

## 11. Quote-validity score

Quotation validity contributes to the weighted evaluation.

The current configured validity scoring gives progressively stronger scores to longer supported validity periods, with the current launch values based on 30 / 60 / 90 / 120-day quotation validity.

Validity does not override commercial, schedule, or governance concerns.

## 12. Ranking and recommendation

Decision-ready quotations are ranked by total evaluation score.

The current recommended quotation is the decision-ready quotation with the highest current evaluation score.

The recommendation is explicitly **decision evidence, not a guaranteed award**.

A recommendation does not:

- constitute acceptance;
- create a contract;
- override issuer authority;
- bypass verification or procurement governance;
- bypass material-revalidation requirements; or
- force the issuer to award to the highest-ranked quotation.

The issuing organization remains responsible for professional review and the final commercial decision.

## 13. Comparison metrics

The comparison workspace can also show decision-support metrics such as:

- lowest decision-ready quotation;
- highest decision-ready quotation;
- average decision-ready quotation;
- quote spread;
- position relative to budget;
- position relative to the decision-ready quote set; and
- potential savings versus the average decision-ready quotation.

When no decision-ready quotations are available, the interface reports **Insufficient Data** or **Requires Review** instead of manufacturing a recommendation.

## 14. Supplier identity

After commercial opening, the issuer comparison can resolve supplier organization names from the current company directory where available.

If a supplier name cannot be resolved, the UI uses a bounded supplier-quote label rather than exposing unsupported identity assumptions.

Supplier identity shown in evaluation does not grant that supplier any Company Workspace membership or issuer-side permissions.

## 15. Decision states

Quotation decision data is separate from the calculated recommendation.

A quotation can carry a recorded decision state such as:

- Pending
- Approved
- Rejected
- Awarded

Decision mutations are separately authorized.

The quote-decision API permits **approved** or **rejected** updates only to authorized issuing-company decision users. The current server rule limits that mutation to active issuing-company workspace owners and administrators.

After the RFQ is awarded:

- quotation decision changes are blocked; and
- an awarded quotation cannot be changed to approved or rejected.

Decision state and evaluation rank are therefore related evidence, not the same business field.

## 16. Award is a separate action

Evaluation does not equal Contract Award.

A decision-ready quotation may expose **Award contract** only when the award path is still open and the quotation is eligible.

A quotation requiring material revalidation cannot be awarded.

Once an RFQ is awarded, award actions close for the remaining quotations.

The award workflow is documented separately in **20-09 — Award**.

## 17. Respondent confidentiality

Respondents do not receive the issuer comparison workspace.

The respondent Quote Workspace states that a responding organization can review only its own submission.

Competing supplier pricing, comparative evaluation, ranking, recommendation, and award controls remain restricted to the issuing organization after commercial opening.

## 18. Troubleshooting

| Situation | Required action |
| --- | --- |
| Comparison shows Locked | Confirm the RFQ submission deadline has actually passed |
| Submissions count is visible but prices are not | This is expected before commercial opening |
| No quotations are available after opening | Review RFQ participation and sourcing status |
| All quotes show Requires Review | Respondents must acknowledge applicable Addenda and reconfirm or resubmit against the current RFQ basis |
| Recommended quote is not the lowest quote | Review the full configured weighted evaluation; price is 38% of the current total |
| A performance or risk score appears unexpected | Review the submitted timeline and Commercial Note against the configured deterministic scoring rules |
| No recommendation is shown | Confirm at least one decision-ready quotation exists |
| Quote decision update is denied | Confirm the user is an active issuing-company owner or administrator and that the RFQ is not already awarded |
| Award action is unavailable | Confirm commercial opening, quotation revalidation status, RFQ award state, and award authorization |
| Respondent asks to see competitor pricing | Do not expose issuer-only comparative commercial evidence |

For unresolved evaluation-access or governance issues, use the **Support** link in the application footer or the Nexus Pavilion Inc. corporate contact channel.

## 19. Governance boundary

Commercial evaluation does not:

- open before the RFQ deadline;
- become rolling merely because sourcing is Open;
- treat a stale quotation as decision-ready;
- prove supplier performance through text heuristics;
- make an autonomous award decision;
- guarantee that the recommended quotation should win;
- expose competing commercial submissions to respondents; or
- replace the separate Contract Award authorization and transaction.

Workspace Membership, RFQ Invitation, Quotation, evaluation, quote decision, and Contract Award remain distinct business and governance states.

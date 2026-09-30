# Intelligent Procurement — Award

**Status:** Launch documentation  
**Task:** 20-09 — Award  
**Product:** Intelligent Procurement  
**Corporate parent:** Nexus Pavilion Inc.

## Purpose

The Award workflow records the issuing organization's final RFQ award outcome against one eligible quotation.

An award is a governed procurement decision. It is separate from:

- quotation evaluation and recommendation;
- quote decision status;
- contract execution;
- signatures;
- purchase-order issuance; and
- downstream commercial administration.

Intelligent Procurement records the award outcome and closes the RFQ award state. Contract execution and external commercial completion remain outside the current RFQ workspace.

## 1. Award is available only after commercial opening

For launch, an RFQ cannot be awarded before the submission deadline has passed.

The server requires a valid RFQ deadline and verifies that the deadline is already in the past before allowing an award.

This applies to all current sourcing methods:

- Open RFQ
- Invited / Selective RFQ
- Sealed Bid RFQ

Open sourcing does not enable early award or rolling commercial decisioning.

## 2. Who can award

The award transaction is server-authorized.

To complete an award, the acting user must:

- be authenticated;
- have a Company Workspace profile;
- belong to the issuing company;
- have an **active** organization membership;
- have workspace role **owner** or **admin**;
- act for a Company Workspace whose workspace status is active; and
- act for a company whose verification status is verified.

Buyer procurement function by itself is not sufficient to complete the award transaction.

The server-side award command remains authoritative even if a user can view post-opening evaluation evidence.

## 3. Which quotation can be awarded

The selected quotation must satisfy the governed award conditions.

The quotation must:

- exist;
- belong to the RFQ being awarded;
- belong to a responding company different from the issuing company;
- not already be rejected;
- be on an RFQ that is still in the `open` lifecycle state before award;
- be evaluated only after the valid submission deadline has passed;
- have every required RFQ Addendum acknowledged by the selected responding company; and
- not require material-amendment quotation revalidation.

A materially stale quotation is not award-eligible.

If an RFQ Addendum changed the governing commercial basis, the respondent must complete the required acknowledgement and reconfirm or resubmit the quotation before that quotation can be awarded.

## 4. Recommendation is not the award

The evaluation engine can identify a **Recommended** quotation based on the current deterministic weighted evaluation.

That recommendation is decision evidence only.

The award transaction does not require the selected quotation to be the current recommendation. The issuing organization retains the authority and responsibility to select an eligible quotation based on its governed procurement decision.

The platform therefore distinguishes:

- evaluation score;
- rank;
- recommendation;
- quote decision status; and
- Contract Award.

These are related but separate business states.

## 5. Quote decision status is separate

The comparison workflow can record quote decision states such as Approved or Rejected.

A rejected quotation cannot be awarded.

An Approved decision is not, by itself, a Contract Award.

The governed award command is the transaction that moves the RFQ into its terminal awarded state.

After the RFQ has been awarded, ordinary quote decision changes are blocked.

## 6. Confirm the award

From the post-opening comparison workspace:

`/rfq/[slug]/compare`

select **Award contract** for the intended eligible quotation.

Before the transaction is sent, Intelligent Procurement opens a confirmation dialog showing:

- RFQ;
- supplier;
- quoted amount; and
- the effect of the action.

The confirmation states that awarding the selected quotation will reject the other quotations for the RFQ and mark the RFQ as awarded.

Use **Confirm award** only after verifying the selected supplier and commercial amount.

## 7. What the award transaction does

The database award command is atomic and locks the relevant RFQ / quotation set during the transaction.

When the award succeeds, Intelligent Procurement:

1. sets the RFQ status to `awarded`;
2. records the selected quotation as `awarded_quote_id`;
3. records the RFQ award timestamp;
4. marks the selected quotation decision as `awarded`;
5. records the same award timestamp on the selected quotation;
6. marks the other quotations on that RFQ as `rejected`, except any already-awarded state protected by the transaction;
7. records governed RFQ award workspace activity; and
8. returns the updated awarded quotation and RFQ state.

The RFQ award fields and selected quotation award state are enforced as a consistent terminal relationship.

## 8. Award is terminal

Once an RFQ has entered the awarded state:

- the awarded quotation cannot be replaced by another quotation;
- the RFQ cannot leave the awarded status through the normal award mutation path;
- duplicate award attempts are rejected; and
- later quote decision changes are blocked.

Concurrent or repeated award attempts are protected by the governed database transaction and award constraints.

Do not attempt to reverse an award by manually changing quote decisions or RFQ status.

A future award-reversal or contract-variation capability would require its own explicitly governed business flow; it is not part of the current launch award workflow.

## 9. Material Addenda and award eligibility

Award eligibility is tied to the current procurement basis.

The selected supplier must have acknowledged every required Addendum.

In addition, if the latest structured material Addendum makes the quotation stale, the quotation must have current-basis evidence through the governed quotation revalidation workflow.

A quotation can remain visible in post-opening commercial evidence while still being marked **Requires Review**.

Such a quotation cannot be recommended as decision-ready or awarded until its material-revalidation requirement is resolved.

## 10. Buyer and supplier notifications

After the award transaction succeeds, Intelligent Procurement attempts award notification emails.

### Buyer notification

The system attempts to send an award confirmation to the authenticated awarding user's email address when:

- the user email is available;
- the public application URL is configured safely; and
- email delivery is operational.

### Supplier notification

The system separately resolves the awarded quotation's supplier notification recipient and attempts to send the supplier award notification.

### Important delivery rule

The award transaction and notification delivery are separate outcomes.

If either email is:

- skipped;
- unavailable; or
- failed,

the completed award is **not rolled back**.

The API returns notification warnings when appropriate.

The RFQ workspace remains the authoritative award record.

## 11. What happens to other quotations

A successful award marks the non-selected quotations for that RFQ as rejected.

This is part of the atomic award transaction, not a separate manual cleanup step.

The selected quotation becomes Awarded and the RFQ itself becomes Awarded.

Respondent-facing state is then driven by the recorded RFQ / quotation outcome and the participant's permitted access.

## 12. Post-award RFQ workspace

After award, the RFQ workspace presents the recorded award outcome.

The issuer can use that outcome as the commercial handoff reference.

For a Project-Specific RFQ, the next business step is described as project-specific commercial administration.

For a Framework RFQ, the next business step is described as framework commercial administration.

The current product explicitly keeps the following outside the RFQ award workspace:

- contract execution;
- contract signatures;
- purchase-order status;
- downstream ERP / external-system completion; and
- full mobilization / contract-administration lifecycle.

Do not treat the recorded RFQ award as proof that an external contract or PO has been executed.

## 13. Common award rejection states

The governed award command can reject the transaction when conditions are not satisfied.

Typical conditions include:

| Condition | Meaning / required action |
| --- | --- |
| Authentication required | Sign in again before attempting the award |
| Company profile required | Resolve the acting Company Workspace context |
| Award not permitted | Verify award role, company status, RFQ state, deadline, selected quotation, Addenda, and revalidation eligibility |
| Quote not found | Return to the current RFQ comparison and verify the quotation |
| RFQ not found | Return to Procurement Center and confirm the active RFQ |
| RFQ already awarded | The RFQ has a terminal award outcome; do not attempt a second award |
| Quote already awarded | Refresh the RFQ workspace and review the recorded award |
| Quote ineligible / award not permitted | Review rejected state, self-award prohibition, Addenda acknowledgement, and material revalidation |
| Notification warning after success | The award is recorded; use the RFQ workspace as the source of truth and resolve email delivery separately |

The award API intentionally returns a bounded **Award is not permitted** response for several ineligible quote conditions instead of disclosing sensitive internal distinctions through the award command.

## 14. Self-award prohibition

The issuing company cannot award a quotation belonging to itself.

The award command verifies that the selected quotation's company is different from the issuing RFQ company.

This is enforced in the database award boundary and cannot be bypassed by client-side navigation.

## 15. Relationship to evaluation

Before awarding, review:

- current quotation basis;
- material Addenda;
- acknowledgement / revalidation status;
- quoted amount;
- timeline;
- quotation validity;
- evaluation score;
- risk-readiness signal;
- budget position;
- comparative evidence; and
- any procurement exceptions that require professional review.

The platform may surface a recommendation, but the authorized issuing organization makes the final award decision.

## 16. Troubleshooting

| Situation | Required action |
| --- | --- |
| Award contract is not available before deadline | Wait for the governed commercial opening; early award is prohibited |
| Award request returns "Award is not permitted." | Verify owner/admin authority, verified active issuing company, RFQ open state, deadline, supplier identity, rejected state, Addenda acknowledgements, and material revalidation |
| Buyer can evaluate but cannot complete award | Evaluation access and award authority are separate; award requires active owner/admin authority |
| Selected quote shows Requires Review | Respondent must acknowledge/revalidate against the current material Addendum basis before award |
| Selected quote is Rejected | A rejected quote is not award-eligible |
| RFQ already awarded | Treat the existing recorded award as terminal |
| Award succeeded but buyer email failed | Award remains recorded; use the RFQ workspace as the authoritative state |
| Award succeeded but supplier email failed | Award remains recorded; resolve supplier communication separately |
| External contract or PO is not shown as executed | This is expected; contract execution and PO completion are outside the current RFQ workspace |

For unresolved award authorization or recorded-state issues, use the **Support** link in the application footer or the Nexus Pavilion Inc. corporate contact channel.

## 17. Governance boundary

The RFQ Award workflow does not:

- override the submission deadline;
- allow rolling award on an Open RFQ;
- permit a buyer-only role to complete the award;
- permit self-award;
- permit award of a rejected quotation;
- permit award of a materially stale quotation;
- bypass required Addenda acknowledgement;
- automatically award the recommended quotation;
- create an executed legal contract;
- record contract signatures;
- create or confirm a purchase order; or
- complete downstream mobilization or external-system administration.

Workspace Membership, RFQ Invitation, Quotation, evaluation, quote decision, RFQ Award, and downstream Contract / PO administration remain distinct business and governance states.

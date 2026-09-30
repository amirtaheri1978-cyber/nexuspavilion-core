# Intelligent Procurement — Respond to RFQ

**Status:** Launch documentation  
**Task:** 20-05 — Respond to RFQ  
**Product:** Intelligent Procurement  
**Corporate parent:** Nexus Pavilion Inc.

## Purpose

This guide explains how a responding organization gains access to an RFQ, reviews the procurement package, and moves into the quotation workflow.

Respondent access is governed by the RFQ sourcing method, the organization's relationship to the RFQ, authentication, Company Workspace context, and the RFQ lifecycle. Access to one RFQ does not grant access to unrelated procurement opportunities.

RFQ participation is separate from Company Workspace membership. A user must have the appropriate organization context and the RFQ-specific relationship required for the opportunity.

## 1. How a respondent can reach an RFQ

A responding organization can encounter an RFQ through the Procurement Center at `/rfq` or through a secure RFQ Invitation link.

Current respondent access paths include:

- **Open Marketplace** — an open-sourcing RFQ can be available to authenticated responding organizations while it remains open.
- **Direct Invitation** — a supplier contact can receive a secure RFQ Invitation tied to the specific RFQ.
- **Existing Participation** — an organization with an existing quotation on an RFQ remains associated with that procurement context.

Restricted sourcing methods such as **Invited / Selective** and **Sealed Bid** require governed RFQ-specific access. The quotation submit route verifies that restricted access before allowing submission.

## 2. Authentication and Company Workspace requirements

The authenticated quotation route is:

`/rfq/[slug]/submit`

If the user is not signed in, Intelligent Procurement redirects to login and preserves the safe RFQ submit continuation.

If the signed-in profile does not yet have a Company Workspace, the product routes the user through company onboarding and preserves the valid RFQ continuation.

After successful onboarding, the user can return to the same RFQ submit path.

Company creation does not itself grant RFQ access. Restricted RFQs still require the applicable RFQ-specific relationship.

## 3. Issuer and respondent roles are different

The company that owns the RFQ is the **Issuing Organization**.

A different authorized company participating in the RFQ is the **Responding Organization**.

An issuing organization cannot submit a quotation to its own RFQ. If an issuer opens the respondent submit path, the product blocks submission and directs the user back to the RFQ workspace.

This separation preserves the commercial boundary between the buying organization and the responding organization.

## 4. Review the opportunity in Procurement Center

Open the Procurement Center:

`/rfq`

Each accessible RFQ is presented in the context of the current company relationship.

For a respondent, the Procurement Center can indicate the access relationship, such as:

- Open Marketplace
- Direct Invitation
- Existing Participation

Before preparing a quotation, open the RFQ workspace at:

`/rfq/[slug]`

Do not rely only on an invitation email or summary card. The RFQ workspace is the current governed source for the procurement opportunity.

## 5. Review the RFQ before responding

Before submitting commercial terms, review the available RFQ context, including:

- RFQ title and scope;
- procurement category / trade;
- project location;
- procurement scope;
- sourcing method;
- contract framework;
- submission deadline and timezone;
- RFI / clarification deadline where provided;
- procurement documents;
- Addenda;
- acknowledgement requirements; and
- current RFQ lifecycle status.

The RFQ workspace may also show the respondent's current participation state, such as whether a quotation has already been submitted or whether review is required.

## 6. Review documents and Addenda

The RFQ document workspace is part of the governed procurement package.

Respondents should review the available documents before pricing, including applicable:

- drawings;
- specifications;
- BOQs;
- photos;
- Addenda; and
- supporting documents.

Formal Addenda are the governed mechanism for material procurement changes that affect respondents.

When an Addendum requires acknowledgement, the responding organization must satisfy the applicable acknowledgement requirements before the related workflow can proceed.

A material Addendum can also cause an existing quotation to require reconfirmation or resubmission. Do not assume a previously submitted quotation remains decision-ready after a governed material change.

## 7. Use the correct clarification channel

If a respondent needs a bilateral clarification and the RFI window remains open, use **Private RFI** in the RFQ workspace.

Private RFIs are visible only to:

- the issuing procurement team; and
- the originating respondent company.

A clarification that materially affects all respondents must be issued by the issuer through the formal **Addendum** workflow rather than remaining only in a private exchange.

Detailed RFI rules are covered in the dedicated **Submit RFI** launch guide.

## 8. Understand sourcing-method access

### Open RFQ

Open sourcing permits market access to the RFQ while the opportunity remains open.

Open sourcing does **not**:

- make the respondent part of the issuer's Company Workspace;
- bypass respondent authentication or company context;
- bypass the submission deadline; or
- expose issuer-side commercial evaluation before commercial opening.

### Invited / Selective RFQ

Respondent quotation access requires a governed restricted-access relationship.

A secure direct RFQ Invitation is one supported path.

### Sealed Bid RFQ

Sealed Bid uses the restricted-access path and preserves the applicable sealed-bid confidentiality model.

Do not infer additional commercial visibility from the invitation itself. The RFQ workspace and authorization rules determine what information the responding organization may see.

## 9. Continue to quotation submission

When the RFQ is available for response, continue to:

`/rfq/[slug]/submit`

The submit route verifies:

1. authenticated user;
2. Company Workspace context;
3. RFQ existence;
4. that the current company is not the issuer;
5. the sourcing-method access requirement; and
6. the organization's existing quotation state.

If the RFQ is restricted and the current user does not have valid respondent access, the product shows **Quotation access unavailable** rather than exposing the submission workspace.

Detailed quotation preparation, completeness, deadlines, revalidation, and submission behavior are covered in **20-07 — Submit Quote**.

## 10. Existing quotation state

If the responding company already has a quotation for the RFQ, Intelligent Procurement loads that company's existing submission state rather than treating the opportunity as a new unrelated quotation.

The product also checks:

- material Addenda;
- Addendum acknowledgements; and
- quotation revalidation evidence.

An existing quotation can therefore be:

- current; or
- marked for review/revalidation because the procurement package changed materially.

This is intentional. A material procurement change must not be silently applied to a supplier's existing commercial commitment.

## 11. Deadline and lifecycle boundaries

Respondents should treat the RFQ submission deadline as a hard procurement boundary.

A quotation cannot be treated as open-ended merely because the RFQ page remains visible.

The product also distinguishes RFQ lifecycle and submission eligibility. An RFQ can become closed, awarded, cancelled, or unavailable for new quotation activity.

Use the RFQ workspace's current status and submission controls rather than relying on an older invitation email or browser tab.

## 12. Commercial confidentiality

Respondents can review their own permitted RFQ and quotation context, but issuer-side commercial evaluation is a separate protected capability.

For launch:

- commercial evaluation remains deadline-controlled;
- Open sourcing does not create rolling issuer-side commercial visibility;
- respondents do not gain access to competing suppliers' confidential commercial submissions through the respondent workflow; and
- buyer executive intelligence remains issuer-side.

The respondent workflow exists to review the procurement opportunity, clarify requirements, maintain acknowledgement/revalidation state, and submit the organization's own quotation.

## 13. Troubleshooting

| Situation | Required action |
| --- | --- |
| RFQ does not appear in Procurement Center | Confirm the RFQ is still open and that your organization has the required sourcing relationship |
| Secure invite opens but submit asks for login | Sign in; the product preserves the safe RFQ submit continuation |
| Submit route sends you to company onboarding | Complete the required Company Workspace setup, then continue back to the RFQ |
| "Issuer organizations cannot submit quotes" | Use the issuer RFQ workspace; the issuing company cannot respond to its own RFQ |
| "Quotation access unavailable" | Confirm the RFQ sourcing method and your organization's invitation/access relationship |
| RFQ is not found | Return to Procurement Center and confirm the current RFQ link |
| Existing quote now requires review | Review material Addenda, acknowledgements, and the required quotation revalidation action |
| Invitation appears expired | Confirm the RFQ deadline and ask the issuing organization to verify the current invitation |
| A clarification affects all respondents | Request formal Addendum handling rather than relying only on a Private RFI response |

For unresolved access issues, use the **Support** link in the application footer or the Nexus Pavilion Inc. corporate contact channel.

## 14. Governance boundary

Responding to an RFQ does not:

- make the respondent a member of the issuing Company's Workspace;
- grant access to unrelated RFQs;
- grant issuer-side management or executive-intelligence permissions;
- expose competitors' confidential commercial submissions;
- bypass Addendum acknowledgement or revalidation requirements;
- bypass the submission deadline; or
- make or guarantee an award decision.

Workspace Membership, RFQ Invitation, RFQ participation, Quotation, evaluation, and Contract Award remain distinct business domains with separate authorization and lifecycle controls.

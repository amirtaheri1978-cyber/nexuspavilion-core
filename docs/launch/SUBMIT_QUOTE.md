# Intelligent Procurement — Submit Quote

**Status:** Launch documentation  
**Task:** 20-07 — Submit Quote  
**Product:** Intelligent Procurement  
**Corporate parent:** Nexus Pavilion Inc.

## Purpose

The quotation workflow is the governed commercial-response path for a responding organization.

The current launch product uses the canonical **Quote / Quotation** submission surface across RFQ scopes. Professional-service procurements may describe the response commercially as a proposal in business practice, but Intelligent Procurement does not provide a separate proposal submission endpoint at launch.

A quotation is submitted by the responding organization against one RFQ and remains subject to RFQ access, deadline, Addendum acknowledgement, material-amendment revalidation, confidentiality, and lifecycle controls.

## 1. Open the canonical quotation workspace

The respondent submission route is:

`/rfq/[slug]/submit`

A respondent can reach this route from:

- the Procurement Center;
- the RFQ workspace;
- a valid secure RFQ Invitation continuation; or
- a previously established RFQ participation relationship.

If the user is not authenticated, the product redirects to login and preserves the safe internal submit continuation.

If the authenticated profile has no Company Workspace, the product routes through company onboarding and then returns to the permitted RFQ submit path.

## 2. Access is verified before the form is available

Before showing the governed quotation state, Intelligent Procurement verifies:

1. the authenticated user;
2. the current Company Workspace;
3. the RFQ;
4. that the acting company is not the RFQ issuer;
5. the RFQ sourcing method; and
6. restricted RFQ access where the sourcing method requires it.

An issuing organization cannot submit a quotation to its own RFQ.

For **Invited / Selective** and **Sealed Bid** RFQs, the server checks the governed respondent-access relationship.

For an **Open RFQ**, market access can permit participation while the RFQ remains open, but authentication, Company Workspace context, deadline, quotation-state, and governance controls still apply.

## 3. Review the RFQ before entering commercial terms

Before submitting, return to the RFQ workspace and review the current procurement basis:

- RFQ scope and description;
- procurement documents;
- Addenda;
- required acknowledgements;
- submission deadline and timezone;
- sourcing method;
- project and delivery requirements; and
- any respondent-specific clarification relevant to your offer.

Do not rely on an older invitation email, downloaded document, or previously opened browser tab if the RFQ package may have changed.

## 4. Required quotation inputs

The launch quotation form requires three commercial inputs:

1. **Quote amount**
2. **Delivery timeline**
3. **Commercial note**

### Quote amount

Enter the full contract value.

The standard UI completeness rule treats amounts below **1,000** as incomplete and prompts the respondent to enter the full contract value.

The amount field is normalized before submission so common formatting such as commas does not become part of the stored numeric value.

### Delivery timeline

Enter a practical delivery or execution timeline, for example:

- `16 months`
- `Q3 2027`
- another clear schedule statement appropriate to the procurement.

The field cannot be blank.

### Commercial note

Use the Commercial Note to summarize the commercial basis of the response, such as:

- scope assumptions;
- delivery approach;
- relevant experience;
- exclusions;
- commercial qualifications; and
- quotation-validity context.

The field cannot be blank.

## 5. Submission completeness

The quotation workspace reports **Submission completeness** for the three required inputs.

The completeness indicator covers quotation-input preparation only.

It does **not** replace the independent controls for:

- authentication;
- RFQ access;
- active Company Workspace membership;
- submission deadline;
- RFQ lifecycle;
- required Addendum acknowledgement;
- duplicate quotation prevention; or
- material-amendment revalidation.

A 3/3 completeness state therefore means the commercial fields are prepared; it does not guarantee that the server will accept the submission.

## 6. Deadline enforcement

The RFQ submission deadline is a hard commercial boundary.

The workspace presents deadline awareness such as:

- low risk;
- approaching;
- urgent; or
- expired.

When the deadline has passed:

- the quotation form is closed;
- late quotation submission is rejected; and
- material-amendment reconfirmation or resubmission is also unavailable.

The server independently checks the deadline during quotation creation. Client-side status is not the authoritative control.

An RFQ that is no longer open, has been awarded, or otherwise no longer accepts responses is also closed to new quotation submission.

## 7. Required Addenda acknowledgement

Before a new quotation is accepted, the server checks all RFQ Addenda that require acknowledgement.

If any required Addendum has not been acknowledged by the responding company, submission is blocked.

The respondent must return to the RFQ workspace, review the Addendum, complete the required acknowledgement, and then return to the quotation workflow.

Do not treat a Private RFI response as a substitute for required formal Addendum acknowledgement.

## 8. One current quotation per responding company

For an initial submission, Intelligent Procurement prevents a second independent quotation record from being created for the same responding company and RFQ.

If the company has already submitted a quotation, the API rejects another new-submission attempt.

Subsequent changes caused by a material RFQ amendment use the governed **reconfirmation / resubmission** workflow rather than creating an unrelated duplicate quotation.

## 9. Submit the initial quotation

When the RFQ is open, access is valid, required Addenda are acknowledged, and the commercial inputs are complete, select **Submit quote**.

The server verifies the current state again and then creates the quotation with:

- RFQ relationship;
- responding company;
- submitting user;
- amount;
- delivery timeline;
- commercial note;
- quotation validity;
- submitted status; and
- pending decision state.

The current new-quotation API defaults quotation validity to **30 days** when no supported validity value is supplied by the initial submission surface.

After a successful submission:

- trusted procurement activity is recorded;
- the product attempts a quotation-confirmation email when recipient and public-site configuration permit it; and
- the user returns to the RFQ workspace.

Quotation persistence and email delivery are separate outcomes. A valid quotation is not rolled back merely because confirmation email delivery is skipped or fails.

## 10. Confidentiality after submission

A respondent's quotation remains its own confidential commercial submission.

Respondent users can review their own permitted quotation state. They do not receive access to:

- competing supplier prices;
- comparative rankings;
- issuer commercial scoring;
- issuer recommendation;
- award controls; or
- buyer executive intelligence.

For the issuing organization, commercial quote detail remains protected until the governed commercial opening after the submission deadline.

Open sourcing does not create rolling commercial evaluation.

## 11. Material RFQ amendment after submission

A formal material Addendum can change the governing basis of an already submitted quotation.

When the latest material Addendum is not yet covered by the respondent's quotation basis, Intelligent Procurement marks the quotation **Requires Review**.

The existing quotation remains confidential, but it is not decision-ready for Contract Award until the governed revalidation requirement is satisfied.

The respondent must first complete any outstanding required Addendum acknowledgement.

Then there are two controlled paths.

## 12. Reconfirm existing quote

Use **Reconfirm existing quote** when the commercial terms remain unchanged after reviewing the material RFQ amendment.

Reconfirmation is available only when:

- the quotation requires material revalidation;
- the RFQ still accepts respondent actions;
- all required Addenda have been acknowledged; and
- the commercial terms have not been edited.

If amount, timeline, Commercial Note, or quotation validity has been changed in the form, unchanged-term reconfirmation is blocked.

Restore the previously submitted terms to reconfirm unchanged terms, or use **Resubmit revised quote**.

## 13. Resubmit revised quote

Use **Resubmit revised quote** when the material RFQ amendment requires a commercial change.

A revised resubmission includes complete commercial terms:

- amount;
- delivery timeline;
- Commercial Note; and
- a supported quotation-validity period.

The current supported validity values for revised submissions are:

- 30 days
- 60 days
- 90 days
- 120 days

The governed quote-revalidation command determines whether the quotation is eligible for resubmission and records the revalidation against the applicable Addendum basis.

This is an update/revalidation of the existing company quotation relationship, not a second unrelated quotation.

## 14. Quote current state

When the quotation is already current against the latest governed material RFQ amendment basis, the submit workspace shows **Quote current**.

No reconfirmation or revised resubmission is required in that state.

The user should return to the RFQ workspace and continue monitoring formal Addenda, lifecycle state, and the eventual procurement outcome.

## 15. Confirmation email

After a new quotation is successfully saved, Intelligent Procurement attempts to send a confirmation email to the authenticated user's email address.

The email depends on:

- a resolvable user email;
- a safe configured public site URL; and
- operational email-provider configuration.

Possible outcomes include:

- email sent;
- email skipped; or
- email failed.

The stored quotation and RFQ workspace remain authoritative. The confirmation email is not proof that the issuer has opened, evaluated, or accepted the quotation.

## 16. Troubleshooting

| Situation | Required action |
| --- | --- |
| "Quotation access unavailable" | Confirm the RFQ sourcing method and your organization's RFQ-specific access |
| "Issuer organizations cannot submit quotes" | Use the issuer RFQ workspace; an issuer cannot quote its own procurement |
| "No company linked to profile" | Complete or recover the Company Workspace |
| "You must belong to an active company to submit a quotation." | Confirm active non-viewer membership in the acting company |
| Quote amount appears too low | Enter the full contract value; the standard UI requires at least 1,000 |
| Delivery timeline missing | Enter a clear delivery/execution timeline |
| Commercial note missing | Add the commercial basis, assumptions, exclusions, or other relevant note |
| RFQ deadline has passed | Late submissions are not accepted |
| RFQ no longer accepting quotes | Review the RFQ lifecycle; do not attempt to bypass closure |
| Required Addenda acknowledgement missing | Return to the RFQ workspace and acknowledge all required Addenda |
| Company already submitted a quote | Review the existing quotation state instead of creating a duplicate |
| Quotation shows Requires Review | Review the material Addendum and complete acknowledgement/reconfirmation or revised resubmission |
| Reconfirm existing quote is disabled | Restore unchanged submitted terms and complete any required Addendum acknowledgement |
| Revised terms are required | Use **Resubmit revised quote** with complete commercial terms |
| Confirmation email did not arrive | Treat the RFQ workspace as authoritative; email delivery is separate from quotation persistence |

For unresolved access or submission issues, use the **Support** link in the application footer or the Nexus Pavilion Inc. corporate contact channel.

## 17. Governance boundary

Quotation submission does not:

- create Company Workspace membership;
- create or replace an RFQ Invitation;
- bypass sourcing-method authorization;
- bypass the RFQ deadline;
- bypass required Addendum acknowledgement;
- expose competing respondents' commercial information;
- unlock issuer-side commercial evaluation before the deadline;
- make an award decision; or
- guarantee that a submitted quotation will be recommended or awarded.

Workspace Membership, RFQ Invitation, Private RFI, Addendum, Quotation, evaluation, and Contract Award remain distinct business domains with separate authorization and lifecycle controls.

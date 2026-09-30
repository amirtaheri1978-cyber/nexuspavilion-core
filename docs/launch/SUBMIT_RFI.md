# Intelligent Procurement — Submit RFI

**Status:** Launch documentation  
**Task:** 20-06 — Submit RFI  
**Product:** Intelligent Procurement  
**Corporate parent:** Nexus Pavilion Inc.

## Purpose

A **Private RFI** is the governed clarification channel for a responding organization to ask a question that applies to its own RFQ response.

Private RFIs are intended to remain visible only to:

- the issuing procurement team; and
- the originating respondent company.

A clarification that materially changes the procurement basis for all respondents must not remain only in a private exchange. The issuing organization must use the formal **Addendum** workflow for material clarifications or revisions that affect the wider respondent group.

## 1. Where to find Private RFI

Open the relevant RFQ workspace:

`/rfq/[slug]`

Within the controlled procurement package, open **Clarifications & Addenda**.

The **Private RFI** section shows:

- the effective RFI deadline;
- whether the RFI window is open, approaching, closed, or unavailable;
- the respondent's permitted private RFI history; and
- issuer responses where available.

The RFI status indicator refreshes while the workspace is open.

## 2. Who can submit an RFI

A Private RFI can be submitted only by a responding organization with valid RFQ participation access.

The current user must:

- be authenticated;
- have a Company Workspace connected to the profile;
- have an active, non-viewer membership in the acting company; and
- be authorized to participate in the RFQ under its sourcing method.

The issuing company cannot submit a private respondent RFI on its own RFQ.

### Open RFQ

For an Open RFQ, the sourcing method itself can provide respondent access while the RFQ remains open, subject to the normal authenticated Company Workspace and lifecycle controls.

### Invited / Selective and Sealed Bid RFQs

Restricted sourcing methods require a valid RFQ-specific respondent-access relationship. The server verifies that access before accepting the RFI.

If access cannot be verified, the RFI is rejected rather than recorded.

## 3. RFI deadline

An RFQ may have a dedicated **RFI / Clarification Deadline**.

When a valid dedicated RFI deadline exists, that deadline governs new Private RFI submissions.

When no dedicated RFI deadline is configured, Intelligent Procurement falls back to the RFQ submission deadline as the effective RFI deadline.

If neither deadline can be resolved safely, new Private RFI submission is blocked.

### Deadline states

The RFI workspace presents the current state as:

- **RFI window open**
- **RFI window closes within 72 hours**
- **RFI window closed**
- **RFI deadline unavailable**

When the window is closed or unavailable, the UI disables new Private RFI submission.

The server independently verifies the effective deadline. Client-side appearance is not the authoritative control.

Late RFI submissions are not accepted.

## 4. Submit a Private RFI

To submit a clarification:

1. Open the correct RFQ workspace.
2. Review the current RFQ documents and existing Addenda first.
3. Confirm the RFI window is open.
4. Enter the question in **Submit private RFI**.
5. Select **Submit Private RFI**.

The question must not be empty.

The API verifies the RFQ, Company Workspace, membership, respondent relationship, RFQ status, sourcing access, and effective RFI deadline before inserting the RFI.

When accepted, the question appears in the Private RFI history and trusted procurement activity is recorded.

## 5. What belongs in a Private RFI

Use Private RFI for a clarification that is specific to your organization's preparation of its response, for example:

- interpretation of a scope point that applies to your proposed approach;
- confirmation of a respondent-specific administrative detail;
- a clarification request that does not change the common procurement basis for competitors.

Do **not** use Private RFI as the final mechanism for a clarification that changes what all respondents are expected to price, acknowledge, or perform.

If the answer materially affects:

- scope;
- drawings;
- specifications;
- commercial basis;
- dates;
- quantities;
- required documents;
- evaluation basis; or
- another procurement condition shared by respondents,

the issuing organization should issue the change through the formal **Addendum** workflow.

## 6. Privacy boundary

The Private RFI workflow is designed as a bilateral clarification channel between the issuing procurement team and the originating respondent company.

It is not intended to publish one respondent's question to competing respondents.

The respondent should still avoid placing unnecessary sensitive personal information, credentials, or unrelated confidential data in an RFI. Use the field only for procurement clarification required for the RFQ response.

## 7. Issuer response

Authorized issuing-organization users can answer an open Private RFI from the same RFQ workspace.

The answering user must belong to the issuing company and have the same governed level of sourcing authority used for issuer RFQ operations:

- workspace owner;
- workspace admin; or
- authorized buyer.

The response text is required.

Only an open RFI can receive a response.

After the response is saved:

- trusted procurement activity is recorded; and
- Intelligent Procurement attempts to notify the originating respondent by email when the recipient and public application URL can be resolved and email delivery is configured.

Saving the RFI response and delivering the notification email are separate outcomes.

A saved response is not rolled back merely because the email notification is skipped or fails.

## 8. Response notification email

The RFI response email is best-effort operational notification.

Email can be skipped or fail when:

- the respondent recipient cannot be resolved;
- the public application URL is not configured safely;
- email delivery is not configured; or
- the provider cannot complete delivery.

The RFQ workspace remains the governed source of truth for the Private RFI and issuer response.

Do not treat an email notification as the authoritative RFI record.

## 9. RFI history

The Private RFI history shows the procurement clarification record available to the current participant.

Typical states include:

- **Open** — awaiting issuer response;
- **Answered** — an issuer response has been recorded.

The history includes the submitted question, timestamps where available, and the issuer response when present.

Use **Refresh** when you need to reload the current RFI state without leaving the RFQ workspace.

## 10. Relationship to Addenda

Private RFI and Addendum are related but different governance mechanisms.

| Private RFI | Addendum |
| --- | --- |
| Bilateral clarification | Formal procurement revision / clarification |
| Originating respondent + issuer | Intended to govern the affected respondent population |
| Appropriate for respondent-specific questions | Required for material changes affecting the common procurement basis |
| Does not itself revise the RFQ package | Can revise controlled procurement requirements |
| Does not replace required acknowledgement | Can require respondent acknowledgement and quotation revalidation |

A material response should be converted into a formal Addendum where the procurement basis for other respondents is affected.

## 11. Effect on quotations

Submitting a Private RFI does not automatically modify an existing quotation.

If the issuer later publishes a material Addendum, the quotation workflow may require:

- Addendum acknowledgement;
- review of changed procurement terms; and
- quotation reconfirmation or revalidation.

That behavior is governed by the Addendum and quotation controls, not by the Private RFI record alone.

## 12. Troubleshooting

| Situation | Required action |
| --- | --- |
| "RFQ ID and question are required." | Confirm the RFQ workspace and enter the clarification question |
| "No company linked to profile." | Complete or recover the Company Workspace before participating |
| "You must belong to an active company to submit an RFI." | Confirm active non-viewer membership in the acting company |
| "This RFQ is not open for RFI submissions." | Review the current RFQ lifecycle state |
| "Issuing companies cannot submit private respondent RFIs on their own RFQ." | Use the issuer response controls instead of respondent submission |
| "You do not have access to submit an RFI for this RFQ." | Confirm the RFQ sourcing method and your organization's invitation/participation relationship |
| "The RFI deadline has passed..." | Late Private RFIs are not accepted; contact the issuer through the appropriate support/procurement channel if clarification is still required |
| RFI deadline unavailable | The system cannot establish a safe clarification window; new submission remains blocked |
| Issuer cannot answer | Confirm the RFI is still open and the user has issuer owner/admin/buyer authorization |
| Response saved but email failed/skipped | Treat the RFQ workspace response as authoritative; email is notification only |
| Clarification affects all respondents | Issue or request a formal Addendum rather than relying solely on Private RFI |

For unresolved access or workflow issues, use the **Support** link in the application footer or the Nexus Pavilion Inc. corporate contact channel.

## 13. Governance boundary

Private RFI does not:

- grant Company Workspace membership;
- create RFQ Invitation access;
- bypass restricted-sourcing authorization;
- extend the RFI or submission deadline;
- revise the formal procurement package by itself;
- satisfy an Addendum acknowledgement requirement;
- automatically revalidate a quotation;
- expose competing respondents' commercial submissions; or
- make an award or evaluation decision.

Workspace Membership, RFQ Invitation, Private RFI, Addendum, Quotation, evaluation, and Contract Award remain distinct business and governance states with separate authorization and lifecycle controls.

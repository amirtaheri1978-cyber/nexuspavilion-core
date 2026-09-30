# Intelligent Procurement — FAQ & Support

**Status:** Launch documentation  
**Task:** 20-11 — FAQ & Support  
**Product:** Intelligent Procurement  
**Corporate parent:** Nexus Pavilion Inc.

## Purpose

This guide provides a single launch-facing reference for common Intelligent Procurement questions and the current support route.

For detailed workflow instructions, use the dedicated launch guides in `docs/launch`. This FAQ does not replace the product's authorization, deadline, confidentiality, or database controls.

## Support path

Authenticated Intelligent Procurement pages include a **Support** link in the application footer.

The current product support route is:

`/contact`

That page is the Nexus Pavilion Inc. corporate contact channel and includes **Technical Support** as an inquiry type.

Direct corporate contact:

`contact@nexuspavilion.com`

When requesting help, include enough context to identify the problem without sharing credentials or unnecessary confidential information.

Useful context includes:

- the affected Intelligent Procurement area;
- RFQ title or slug when relevant;
- whether you are acting as Issuer or Respondent;
- the exact on-screen error message;
- what action you were attempting;
- whether the issue affects access, invitation, RFI, quotation, evaluation, award, or email delivery; and
- the approximate time the issue occurred.

Do not send passwords, authentication secrets, secure invitation tokens, or unrelated sensitive information through support.

## Account and Company Workspace

### Why am I being sent to sign in?

Protected product routes require an authenticated Intelligent Procurement session.

When the application can preserve the requested internal destination safely, login continuation returns you to that route after authentication.

### Why am I being sent to Create Company?

The signed-in profile does not currently have the Company Workspace context required by that product workflow.

Complete or recover the Company Workspace first. For RFQ submit continuation, the product preserves the safe RFQ path where applicable.

### I already created a company. Should I create another one?

No, not as a recovery workaround.

Company onboarding contains duplicate/recovery protection. If the account is already connected to a workspace, or a prior owned company can be recovered, use the existing workspace state instead of creating another organization.

If recovery cannot be completed, use Support.

### What are the current workspace Access Levels?

The current launch-facing Access Levels are:

- Owner
- Administrator
- Standard
- Read Only

Workspace Access Level is separate from Procurement Function and from RFQ participant role.

### Why can I view a workspace but not perform an action?

Sensitive actions apply additional authorization rules.

Examples include active-membership requirements, Owner/Admin authority, Buyer Procurement Function, RFQ ownership, respondent access, company verification, lifecycle state, deadline state, Addenda acknowledgement, or quotation revalidation.

Viewing a page does not itself grant mutation authority.

## Workspace invitations

### Is a Company Workspace invitation the same as an RFQ Invitation?

No.

A Company Workspace invitation controls membership in an organization.

An RFQ Invitation controls participation in a specific procurement opportunity.

Accepting one does not automatically create the other.

### Why does a workspace invitation say the recipient does not match?

Workspace invitation acceptance validates the authenticated email against the invited email.

Sign in with the account that matches the invited recipient.

### Why is a workspace invitation unavailable or expired?

The invitation may no longer be pending, may have expired, may have been revoked, or may be invalid.

Ask an authorized workspace Owner or Administrator to review the invitation state and create or resend access where appropriate.

## RFQ access

### Why can I see some RFQs but not others?

RFQ access is relationship-specific.

Current paths include:

- Company Managed
- Open Marketplace
- Direct Invitation
- Existing Participation

Restricted RFQs require the applicable governed access relationship.

Company Workspace membership does not grant access to unrelated RFQs.

### Why can I not submit to my own company's RFQ?

The issuing organization and responding organization are intentionally separate procurement roles.

An issuing company cannot submit a quotation or private respondent RFI to its own RFQ.

### Does Open RFQ mean the issuer can evaluate quotes immediately?

No.

Open sourcing controls market access. It does not enable rolling commercial evaluation.

For launch, commercial evaluation remains deadline-locked across Open, Invited / Selective, and Sealed Bid RFQs.

## RFQ Invitations

### I received an RFQ Invitation. Why do I still need to sign in?

The secure invitation establishes an RFQ-specific relationship, not a complete authenticated product session.

The canonical quotation workflow still verifies authentication, Company Workspace context, respondent relationship, sourcing method, and RFQ state.

### The RFQ Invitation email did not arrive. Is the invitation lost?

Not necessarily.

Invitation creation and email delivery are separate outcomes.

If the invitation record exists, the issuer can use the existing secure invite link or retry the same RFQ/email combination. The current flow reuses the existing invitation rather than creating a duplicate relationship.

### The secure RFQ Invitation says invalid or expired. What should I do?

Confirm with the issuer that:

- the RFQ is still open;
- the submission deadline has not passed;
- the invited email is correct; and
- you are using the current invitation link.

If the RFQ is still eligible, the issuer can retry the same invitation relationship.

## RFQ creation

### Why can I not publish an RFQ?

RFQ publication requires the required creation baseline plus the final **Ready to Publish** acknowledgement.

Common blockers include:

- missing title;
- incomplete scope;
- missing category/trade;
- missing project location;
- invalid submission deadline;
- incomplete procurement strategy;
- RFI deadline after submission closing; or
- invalid project schedule.

Server-side validation remains authoritative.

### Do I need all documents uploaded before publishing?

No. The current creation workflow treats supporting documents as non-blocking at creation time.

After publication, use the RFQ workspace to manage drawings, specifications, BOQs, photos, Addenda, and supporting documents.

The issuer remains responsible for providing sufficient procurement information before respondents price the work.

## Private RFI

### Why can I not submit a Private RFI?

Common causes include:

- the user is not authenticated;
- no active non-viewer Company Workspace membership;
- the current company is the RFQ issuer;
- the RFQ is not open;
- the sourcing relationship does not permit access;
- the RFI deadline has passed; or
- the effective RFI deadline cannot be resolved safely.

Late Private RFIs are not accepted.

### What happens when no separate RFI deadline is configured?

The RFQ submission deadline becomes the effective RFI deadline.

### Who can see a Private RFI?

The Private RFI workflow is intended for:

- the issuing procurement team; and
- the originating respondent company.

A material clarification affecting the common procurement basis must use a formal Addendum.

## Quotations

### What is required to submit a quotation?

The current submission UI requires:

- full quote amount;
- delivery timeline; and
- Commercial Note.

The standard UI completeness rule treats amounts below 1,000 as incomplete.

Separate access, deadline, Addenda, duplicate-submission, and revalidation controls still apply.

### Why does the system say my company already submitted a quote?

The launch workflow maintains one current quotation relationship per responding company and RFQ.

Do not create another independent quotation.

If a material Addendum changes the commercial basis, use the governed reconfirmation or revised-resubmission flow.

### Why does my quotation show Requires Review?

A material RFQ Addendum changed the governing basis after the quotation was submitted.

Review the latest Addendum, complete any required acknowledgement, and then either:

- **Reconfirm existing quote** if commercial terms are unchanged; or
- **Resubmit revised quote** if the commercial terms changed.

### Why is quotation submission closed?

Submission is closed when the RFQ no longer accepts responses, including after the governed submission deadline.

Late quotation submissions are rejected.

## Addenda

### Why must I acknowledge an Addendum?

Some formal Addenda require respondent acknowledgement before quotation submission, revalidation, or award eligibility.

Private RFI responses do not replace formal Addendum acknowledgement.

### Can an existing quote still be visible after a material Addendum?

Yes.

After commercial opening, stale quotation evidence can remain visible to the issuer as historical commercial evidence, but a quotation marked **Requires Review** is excluded from decision-ready ranking, recommendation, and award eligibility until revalidated.

## Evaluation

### Why can the issuer see submission count but not pricing?

Before commercial opening, the safe aggregate path can expose only participation count where authorized.

Commercial quotation rows, supplier identity tied to commercial evidence, pricing, ranking, recommendation, and award controls remain locked until the deadline.

### Why is the recommended quote not the lowest quote?

The current deterministic evaluation uses weighted factors:

- Price — 38%
- Timeline — 22%
- Performance signals — 18%
- Risk readiness — 14%
- Quote validity — 8%

The recommendation reflects the highest current decision-ready weighted score, not lowest price alone.

### Does the recommendation automatically decide the winner?

No.

Recommendation is decision support. The authorized issuing organization makes the procurement decision.

## Award

### Why is Award contract unavailable?

Common causes include:

- the submission deadline has not passed;
- the RFQ is no longer in an award-eligible open state;
- the user lacks Owner/Admin award authority;
- the issuing Company Workspace is not active/verified as required;
- the quotation is rejected;
- required Addenda have not been acknowledged;
- the quotation requires material revalidation; or
- the RFQ has already been awarded.

### Can a Buyer award the RFQ?

Buyer Procurement Function alone is not enough.

The current award transaction requires active Owner or Administrator authority in the verified, active issuing Company Workspace, plus the RFQ/quotation eligibility conditions.

### Can I undo an award from the normal RFQ workspace?

The current award state is terminal in the launch workflow.

Do not attempt to reverse it by changing quote decisions or RFQ status manually.

If a recorded award is believed to be wrong, stop further commercial processing and contact Support.

### Does Awarded mean the legal contract or PO is executed?

No.

The RFQ award records the procurement outcome.

Contract execution, signatures, purchase-order status, and downstream external-system administration remain outside the current RFQ workspace.

## Email delivery

### Why did an action succeed even though email failed?

For several workflows, business-state persistence and notification delivery are deliberately separate.

Examples include:

- RFQ Invitation creation;
- RFI response persistence;
- quotation submission; and
- Contract Award.

The product workspace is the authoritative state.

An email warning does not necessarily mean the underlying procurement action failed.

### What can cause email delivery to be skipped?

Current operational causes can include:

- email provider not configured;
- missing recipient;
- public application URL not configured safely; or
- delivery-provider failure.

Support can investigate the operational configuration without requiring the procurement transaction to be repeated blindly.

## Contact form

### How do I open a Technical Support request?

Open:

`/contact`

Select **Technical Support** under Inquiry Type.

The contact form requires:

- full name;
- valid email address; and
- a message of at least 20 characters.

Company is optional.

### What if the contact form says delivery is not configured or unavailable?

The contact endpoint depends on the configured `CONTACT_EMAIL` destination and email-delivery service.

If the form is unavailable, use the published corporate contact email:

`contact@nexuspavilion.com`

Do not repeatedly perform procurement mutations simply to test whether support email is working.

## Privacy and security questions

For current privacy information, use:

`/privacy`

For current service terms, use:

`/terms`

Privacy concerns, unexpected information exposure, or access concerns should be reported through the corporate contact channel.

## When to stop and contact Support

Contact Support rather than attempting workarounds when:

- you suspect unauthorized workspace or commercial-data access;
- the wrong company appears in your account;
- ownership state is inconsistent;
- an award appears incorrect;
- a required invitation cannot be recovered;
- the product repeatedly reports an authorization state that does not match your expected membership;
- procurement evidence appears missing or exposed to the wrong participant; or
- a workflow reports a persistent server/database error.

Do not create duplicate companies, duplicate RFQ Invitations, duplicate quotations, or replacement procurement records merely to work around an access or state problem.

## Support boundary

Support can help investigate product access, workflow state, configuration, and operational errors.

Support does not replace the participating organizations' responsibility for:

- procurement scope;
- commercial judgment;
- supplier due diligence;
- evaluation decisions;
- Contract Award decisions;
- executed contract terms; or
- downstream purchase-order / contract administration.

# Intelligent Procurement — Invite Companies

**Status:** Launch documentation  
**Task:** 20-04 — Invite Companies  
**Product:** Intelligent Procurement  
**Corporate parent:** Nexus Pavilion Inc.

## Purpose

RFQ Invitations give an external supplier or other responding organization a controlled path into a specific procurement opportunity.

This is an **RFQ Procurement** flow. It is not the same as a Company Workspace invitation:

- **Company Workspace invitation** governs membership, workspace roles, and access inside one organization.
- **RFQ Invitation** governs participation in one RFQ.

An RFQ Invitation does not create Company Workspace membership automatically, and Company Workspace membership does not grant access to unrelated RFQs automatically.

## 1. Who can invite respondents

Supplier invitations are available only to an authorized member of the issuing organization.

The current user must:

- be authenticated;
- belong to the company that owns the RFQ;
- have an active membership for that company; and
- be a workspace **owner**, **admin**, or authorized **buyer**.

Viewer access is not sufficient.

The RFQ itself must belong to the current company. A user cannot invite suppliers to another company's RFQ.

## 2. When invitations are available

Invitations can be created only while the RFQ is open for participation.

The RFQ must:

- have lifecycle status `open`; and
- not have passed its submission deadline.

If the RFQ is closed, awarded, cancelled, or past the governed submission deadline, the invitation endpoint rejects the request.

Invitation availability does not change commercial-opening governance. Commercial quote content remains deadline-controlled according to the RFQ rules.

## 3. Open the Supplier Invitations area

Open the issuing organization's RFQ workspace at:

`/rfq/[slug]`

When the current user has invitation authority, the RFQ workspace exposes the supplier-invitation controls.

The launch workflow supports **controlled direct email invitations**.

The Approved Vendor List interface is present in the product architecture, but approved-vendor management is currently disabled in the active launch environment. The UI therefore states that approved-vendor management is unavailable and that **Invite by email remains available**.

Do not represent AVL selection as an active launch dependency while this domain is disabled.

## 4. Send a secure RFQ invitation

To invite a respondent by email:

1. Open the correct RFQ owned by your organization.
2. Locate **Supplier Invitations**.
3. Enter the authorized supplier contact email.
4. Review that the email belongs to the intended responding organization.
5. Select **Send Supplier Invitation**.

The API validates:

- RFQ ID;
- supplier email presence;
- email format;
- authentication;
- current company;
- active membership and invitation authority;
- RFQ ownership; and
- RFQ open/deadline state.

If any of these checks fail, the invitation is not created.

## 5. Invitation record and secure link

For a new RFQ/email combination, Intelligent Procurement creates an RFQ Invitation record with:

- the RFQ ID;
- normalized supplier email;
- a secure opaque token;
- invitation status; and
- creation metadata.

The resulting secure path is:

`/rfq/invite/[token]`

The invitation remains associated with that RFQ.

The issuing user can use **Copy Invite Link** as a controlled fallback when email delivery is unavailable.

The secure token is an access credential for the invitation path. Share it only with the intended supplier contact.

## 6. Duplicate invitation behavior

If an invitation already exists for the **same RFQ and supplier email**, Intelligent Procurement does not create another invitation record.

Instead, it reuses the existing secure invitation link and retries email delivery.

This behavior prevents duplicate invitation identities while still allowing the issuer to resend access.

The result is reported as an **Existing Invitation Reused** state.

## 7. Email delivery states

Creating the RFQ Invitation record and delivering the email are separate outcomes.

### Invitation Email Sent

The invitation exists and the configured email provider accepted delivery.

The secure copy link remains available as a fallback.

### Invitation Created, Email Not Sent

The invitation record exists, but delivery was skipped.

Examples include:

- email delivery is not configured; or
- the canonical public site URL required for the invitation email is not configured safely.

Use the secure copy link as the fallback rather than creating another invitation.

### Invitation Created, Email Failed

The invitation record exists, but the email provider rejected or could not complete delivery.

Again, do not create a duplicate invitation solely because email failed. Use the existing secure link or retry the same supplier email so the existing invitation is reused.

### Existing Invitation, Email Retry Failed / Skipped

The original invitation remains valid subject to RFQ availability. The email retry did not create a new invitation identity.

Use the existing secure link as the fallback.

## 8. Public site URL and email configuration

An absolute invitation email link requires a safe configured public origin through `NEXT_PUBLIC_SITE_URL`.

The public-site helper rejects unsafe origins such as:

- unsupported URL schemes;
- credentials embedded in the URL;
- Codespace / `.github.dev` hosts;
- URLs with unexpected path, query, or fragment content.

Email delivery also depends on the configured server-side email provider.

If the public site URL or email provider is unavailable, the RFQ Invitation record can still exist even though email delivery is skipped or fails.

The UI deliberately reports these states separately so an issuer does not mistake invitation creation for confirmed email delivery.

## 9. What the invited respondent sees

The secure invitation landing page resolves the token through the governed RFQ invitation-context function.

When the invitation is valid and the RFQ deadline remains open, the page shows:

- RFQ title;
- description;
- category;
- location;
- budget where available under the invitation context;
- submission deadline; and
- the supplier email to which the invitation was issued.

The page provides:

- **Continue to Submit Quote**
- **Open RFQ Page**

Quotation submission is **not completed on the invitation landing page**.

The respondent continues into the authenticated supplier workflow at:

`/rfq/[slug]/submit`

Authentication, Company Workspace context, RFQ relationship, and respondent authorization remain separate checks.

## 10. Invalid or expired invitation

The invitation page shows **Invalid or Expired Invitation** when the token cannot resolve to a valid invitation context or when the RFQ submission deadline has expired.

Do not attempt to bypass this state by manually changing the URL or creating unrelated Company Workspace records.

The issuing organization should confirm:

1. the RFQ is still open;
2. the submission deadline has not passed;
3. the intended supplier email is correct; and
4. the existing invitation link is being used.

If appropriate, the issuer can resend the same RFQ/email invitation while the RFQ remains open. The existing invitation link will be reused.

## 11. Approved Vendor List boundary

The invitation architecture supports a governed AVL relationship where that product domain is enabled.

In the current launch environment:

- Approved Vendor management is **not enabled**;
- supplier compliance data is **not available**; and
- controlled direct email invitation remains available.

Do not claim active AVL approval or supplier-compliance validation when those domains are unavailable.

If AVL capability is enabled in a future environment, only approved or conditionally approved suppliers may pass the corresponding AVL validation path.

## 12. Troubleshooting

| Situation | Required action |
| --- | --- |
| "RFQ ID and supplier email are required." | Confirm the RFQ context and enter the supplier contact email |
| "Please enter a valid supplier email address." | Correct the email format |
| "Unauthorized." | Sign in again |
| "Company profile is required to invite suppliers." | Resolve the issuing user's Company Workspace context |
| "Only organization owners, administrators, or buyers can invite suppliers." | Confirm active membership and invitation authority |
| "RFQ not found." | Return to the Procurement Center and open the correct RFQ |
| "You can only invite suppliers to RFQs owned by your company." | Use the RFQ owned by the current issuing organization |
| "Supplier invitations are only available while the RFQ is open." | Confirm RFQ lifecycle and submission deadline |
| Invitation created but email skipped | Use the secure copy link and verify public-site/email configuration |
| Invitation created but email failed | Reuse the same invitation/link; do not create a duplicate RFQ invitation |
| Existing invitation reused | This is expected for the same RFQ/email; the secure link remains the same |
| Invitation page says invalid or expired | Confirm the correct token and that the RFQ deadline is still open |
| Approved Vendor List says unavailable | Continue with controlled direct email invitation |

For unresolved delivery or access issues, use the **Support** link in the application footer or the Nexus Pavilion Inc. corporate contact channel.

## 13. Governance boundary

RFQ Invitation is a procurement-access mechanism for a specific RFQ.

It does not:

- add the supplier contact as a member of the issuing Company's Workspace;
- change Company Workspace roles;
- grant access to unrelated RFQs;
- bypass respondent authentication or company onboarding;
- bypass sourcing-method restrictions;
- bypass the submission deadline;
- expose issuer-side commercial evaluation before commercial opening; or
- create, submit, evaluate, or award a quotation automatically.

Workspace Membership, RFQ Invitation, Quotation, evaluation, and Contract Award remain distinct business domains with separate authorization and lifecycle controls.

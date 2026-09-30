# Intelligent Procurement — Privacy & Security Overview

**Status:** Launch documentation  
**Task:** 20-12 — Privacy/Security Overview  
**Product:** Intelligent Procurement  
**Corporate parent:** Nexus Pavilion Inc.

## Purpose

This document summarizes the current launch implementation's privacy, confidentiality, and access-control model at a high level.

It is an operational overview, not a replacement for the published Nexus Pavilion Inc. Privacy page, Terms, or organization-specific legal/security review.

Current public privacy information is available at:

`/privacy`

Current service terms are available at:

`/terms`

Privacy, access, or unexpected information-exposure concerns should be reported through:

`/contact`

or:

`contact@nexuspavilion.com`

## 1. Product and corporate boundary

Nexus Pavilion Inc. is the corporate parent.

Intelligent Procurement is a separate product surface with product-specific authentication, Company Workspaces, RFQ workflows, procurement records, and authorization rules.

Product-specific procurement data and access rules should not be generalized into claims about every Nexus Pavilion Inc. activity or future product.

## 2. Authentication and session boundary

Intelligent Procurement uses Supabase authentication through server/browser clients and authenticated session cookies.

Protected application routes require a signed-in session before the user can enter the applicable Company Workspace or RFQ experience.

Middleware provides an early route guard and safe internal login continuation for protected areas, but middleware is not the sole authorization boundary.

Sensitive actions perform their own server/database authorization checks.

A visible page, navigation item, or client-side control is therefore not proof of permission to perform the underlying mutation.

## 3. Company Workspace authorization

Company Workspace access is governed primarily through `organization_memberships`.

The authorization model separates:

- Membership Status
- Workspace Role
- Procurement Function
- Membership Type
- Company Workspace state
- RFQ relationship
- action-specific lifecycle rules

Sensitive Company Workspace and procurement writes generally require an active membership plus the role/function requirements for that action.

Legacy `profiles.company_id` and `profiles.role` remain in some migration-compatibility paths, but protected mutations must not treat those legacy fields alone as sufficient authority.

For the detailed access model, see:

`docs/launch/WORKSPACE_ACCESS_MODEL.md`

## 4. RFQ relationship boundary

Company Workspace membership does not grant universal procurement access.

RFQ access depends on the current company's relationship to the specific RFQ.

Examples include:

- Issuing Organization / Company Managed
- Open Marketplace
- Direct RFQ Invitation
- Existing Participation

A Company Workspace invitation is not an RFQ Invitation.

An RFQ Invitation does not make the recipient a member of the issuing organization's Company Workspace.

## 5. Commercial confidentiality

Commercial quotation evidence receives additional access protection.

For launch, all current sourcing methods are deadline-locked for issuer-side commercial evaluation:

- Open RFQ
- Invited / Selective RFQ
- Sealed Bid RFQ

Before the submission deadline:

- issuer-side quote rows are not loaded for commercial comparison;
- safe participation count may be available through a purpose-limited aggregate path;
- quotation amounts remain protected;
- supplier identity tied to commercial quote evidence remains protected;
- pricing-derived scores and rankings remain protected;
- recommendation and comparative variance remain protected; and
- award controls remain unavailable.

Open sourcing controls who may participate. It does not create rolling commercial evaluation.

After the valid submission deadline has passed, issuer commercial access is still subject to Company Workspace membership, RFQ ownership, database policy, quotation state, and action-specific authorization.

## 6. Respondent confidentiality

Respondents are limited to their own permitted procurement relationship and quotation state.

The respondent workflow does not expose:

- competing supplier pricing;
- competitor Commercial Notes;
- comparative rankings;
- issuer recommendation;
- issuer executive intelligence; or
- award controls.

Private RFI is also designed as a bilateral clarification channel between the issuing procurement team and the originating respondent company.

Material clarifications that affect the common procurement basis must move through formal Addendum governance.

## 7. Addenda and current commercial basis

Formal Addenda can require acknowledgement.

A material Addendum can also make an existing quotation require review and revalidation.

A quotation marked **Requires Review** may remain visible after commercial opening as historical commercial evidence, but it is excluded from decision-ready recommendation and award eligibility until the respondent satisfies the governed current-basis requirements.

This prevents stale commercial terms from being treated as current award evidence.

## 8. Database authorization and RLS

The current Supabase data model uses Row Level Security and purpose-specific database policies/functions across protected workflow areas.

Examples include:

- Company Workspace membership-scoped access;
- deadline-controlled issuer access to commercial quotation evidence;
- respondent access to own quotation/revalidation evidence;
- RFQ participation controls;
- restricted quote decision writes;
- governed Contract Award;
- purpose-limited audit-log visibility; and
- protected storage access.

Some sensitive workflows use `SECURITY DEFINER` functions as narrowly scoped server/database commands. Those functions validate the authenticated actor and the business invariants for the operation rather than trusting caller-supplied ownership or role claims.

## 9. Procurement audit evidence

Sensitive procurement and workspace actions write governed activity or audit evidence where the current workflow provides it.

Audit access is itself controlled.

Current quote-related audit visibility preserves the commercial-opening boundary: issuer-side quote audit evidence is not intended to become a pre-deadline commercial side channel.

Audit evidence should not be treated as a substitute for the authoritative RFQ, quotation, membership, or award record.

## 10. Storage model

The launch database defines separate storage contracts for different content types.

### RFQ attachments

`rfq-attachments` is configured as a private bucket.

Read access is tied to authenticated RFQ participant context.

Issuer upload/delete controls require the applicable active issuing-company procurement authority.

### Company documents

`company-documents` is configured as a private bucket.

Company document reads are tied to Company Workspace membership and the corresponding document record.

Upload/delete controls require active Owner or Administrator authority.

The document-finalization commands validate expected path structure, file type, file size, and stored-object metadata before accepting the document record.

### Company logos

`Company-logos` is intentionally configured as a public branding bucket.

Logo objects are therefore not treated as confidential Company Workspace documents.

Write/delete controls remain governed, and the product validates the company-scoped branding path and supported image metadata.

Do not place confidential procurement or governance evidence in the public logo bucket.

## 11. Invitation links and tokens

Workspace invitations and RFQ Invitations use secure tokenized links.

Treat invitation links as sensitive access artifacts.

Do not post or forward them to unauthorized recipients.

Workspace invitation acceptance adds an identity check: the authenticated email must match the invited recipient before the membership is provisioned.

RFQ Invitation landing context remains RFQ-specific; downstream quotation submission still performs authentication, Company Workspace, sourcing-access, and lifecycle checks.

## 12. Error monitoring and token redaction

The current application includes limited Sentry error monitoring.

The configured error-monitoring contract disables:

- default PII transmission;
- Sentry logs;
- performance tracing;
- user information collection;
- cookie collection;
- request and response header collection;
- HTTP body collection;
- URL query-parameter collection;
- GraphQL document/variable collection;
- generative-AI input/output collection;
- database-query data collection;
- stack-frame variable collection; and
- source context lines.

Invitation-token path segments are sanitized before request-error capture:

- `/invite/[token]`
- `/rfq/invite/[token]`

The monitoring layer is intended to be observational and fail-open: monitoring failure must not change procurement API behavior.

No technical monitoring configuration should be described as eliminating all security or privacy risk.

## 13. Critical API failure reporting

Caught critical API failures use a sanitized reporting path.

The current helper records bounded operational context such as:

- domain;
- operation;
- failure stage;
- static route;
- HTTP method;
- normalized error name; and
- short code-like provider code where safe.

It deliberately avoids logging raw exception text or objects through that reporting path.

This reduces the chance that procurement content or credentials become part of operational error telemetry.

## 14. Corporate analytics boundary

Google Analytics 4 is limited to the anonymous/public Corporate shell and is optional.

The current implementation:

- defaults analytics consent to denied;
- loads the GA script only after explicit acceptance;
- disables advertising storage and ad-personalization signals;
- keeps the stored analytics preference in browser local storage; and
- revokes runtime analytics when leaving the public Corporate shell.

Authenticated Intelligent Procurement product routes do not mount the Corporate analytics component.

The Corporate analytics configuration is separate from the product's necessary authentication/session technologies.

## 15. Browser local storage

The product uses browser local storage for limited client-side state in some workflows.

Examples include:

- Corporate analytics consent; and
- RFQ creation draft autosave.

Browser-stored draft data should be treated as local working state on that browser/device, not as the authoritative published RFQ record.

A successfully published RFQ clears the local RFQ draft used by the creation workflow.

Users on shared or untrusted devices should avoid leaving sensitive working data unattended.

## 16. Email delivery and external processing

Transactional email delivery currently uses Resend through the shared email-delivery service.

Product and corporate workflows can transmit purpose-specific content to the configured recipient, including:

- Company Workspace invitations;
- RFQ Invitations;
- quotation confirmations;
- RFI response notifications;
- award notifications; and
- corporate contact inquiries.

For several procurement workflows, email delivery is intentionally separate from the underlying business transaction.

A skipped or failed notification does not necessarily mean that the invitation, quotation, RFI response, or award failed to persist.

The product workspace remains the authoritative state.

## 17. Public-site URL validation

Absolute product links used in emails depend on the configured public site origin.

The current URL helper rejects unsafe or unsupported origins such as:

- unsupported protocols;
- credentials embedded in the URL;
- `.github.dev` hosts;
- unexpected path content;
- query content; or
- fragments.

When a safe public origin is unavailable, supported workflows may skip email delivery rather than fabricate an unsafe public link.

## 18. Contact-form data

The corporate contact form handles:

- full name;
- email address;
- company where supplied;
- inquiry type; and
- message.

The contact endpoint validates the request, escapes submitted values for HTML email output, and forwards the inquiry to the configured `CONTACT_EMAIL` destination through the email provider.

The form also uses a hidden honeypot field as a basic anti-automation control.

If the destination or email delivery is unavailable, the endpoint returns a failure state rather than claiming successful delivery.

## 19. Decision-support boundary

Intelligent Procurement may present analytics, scores, evidence summaries, reports, and deterministic procurement guidance.

These outputs support professional judgment; they do not replace it.

The current commercial ranking engine is deterministic/rule-based. It does not autonomously make an RFQ award.

Recommendation and Contract Award are distinct business states.

The issuing organization remains responsible for evaluation, supplier due diligence, commercial judgment, and the final procurement decision.

## 20. What users should protect

Users and organizations should:

- protect account credentials;
- maintain correct Company Workspace membership;
- remove or revoke access that is no longer appropriate;
- protect invitation links;
- review RFQ participant relationships before sharing procurement material;
- avoid placing credentials or unrelated sensitive personal information in RFIs, Commercial Notes, or support messages;
- verify Addenda and acknowledgement state before commercial decisions; and
- report unexpected access or data exposure promptly.

## 21. What to report immediately

Use the corporate support channel promptly if you observe:

- another organization's Company Workspace in your account;
- commercial quotation information before the RFQ deadline;
- competitor commercial data visible to a respondent;
- an RFQ Invitation or Workspace Invitation resolving to the wrong identity/context;
- unexplained ownership or membership changes;
- a suspected unauthorized award;
- missing or incorrectly scoped procurement documents;
- an unexpected information-exposure event; or
- a persistent authorization error inconsistent with the user's verified membership.

Do not create duplicate records or manually alter procurement state as a security troubleshooting technique.

## 22. Current limitations

This overview describes the current launch implementation and should not be read as a claim that the system is risk-free or independently security-certified.

It does not claim:

- perfect prevention of security incidents;
- third-party compliance certification not evidenced by the product;
- guaranteed availability;
- automatic supplier verification;
- autonomous procurement decisioning; or
- complete legal compliance for every organization or jurisdiction.

Organizations remain responsible for their own procurement, legal, regulatory, and information-governance obligations.

## 23. Security/privacy boundary summary

The launch model is layered:

**Authentication → Company Workspace membership → role/function authorization → RFQ relationship → lifecycle/deadline rules → database/storage policy → action-specific command validation.**

Important separations remain:

- Workspace Membership ≠ RFQ Invitation
- Company Workspace access ≠ access to every RFQ
- RFQ participation ≠ competitor commercial visibility
- Open sourcing ≠ rolling commercial evaluation
- evaluation recommendation ≠ Contract Award
- RFQ Award ≠ executed legal contract or purchase order
- public company branding assets ≠ private procurement/governance documents

For questions or suspected access problems, use `/contact` and select **Technical Support**, or contact `contact@nexuspavilion.com`.

# Intelligent Procurement — Getting Started

**Status:** Launch documentation  
**Task:** 20-01 — Getting Started  
**Product:** Intelligent Procurement  
**Corporate parent:** Nexus Pavilion Inc.

## Purpose

Intelligent Procurement is a Nexus Pavilion Inc. product for governed procurement work. It brings company context, RFQ activity, supplier participation, commercial evaluation, and decision support into one controlled workspace.

The product is organized around two connected areas:

- **Company Workspace** — your organization's identity, access, membership, operating context, and workspace governance.
- **Procurement Center** — the RFQ environment where authorized participants create, access, respond to, evaluate, and govern procurement activity.

This guide explains the product structure and the first actions a new user should understand. Detailed procedures for individual workflows are documented separately in the Phase 20 launch documentation.

## 1. Sign in and enter the correct workspace

Sign in with your Intelligent Procurement account.

After authentication:

- If your account is already connected to a Company Workspace, you continue into that workspace.
- If your account is not yet connected to a company, the product routes you through company onboarding before protected workspace activity is available.
- If you joined through an authorized invitation or RFQ continuation, the product preserves the permitted continuation path after authentication and onboarding.

Do not create a second company when your account is already connected to an existing workspace.

## 2. Start from the Company Workspace

The Company Workspace is the operating context for your organization. The **Executive Overview** at `/dashboard` summarizes the current procurement portfolio, including company-owned RFQs, supplier quote activity, recorded award outcomes, and budget context where available.

For a newly established workspace, review the company readiness items before expanding procurement activity. Typical first checks include:

1. Confirm the company identity and regional hub.
2. Confirm the organization role recorded for the workspace.
3. Add or verify the official company logo where appropriate.
4. Review workspace membership and governance.
5. Confirm that the people performing procurement work have the appropriate authorization.

Company settings are available under `/company/settings`.

## 3. Open the Procurement Center

The Procurement Center at `/rfq` is the shared RFQ environment.

What you can see and do depends on your company relationship to each RFQ and your authorization:

- An **Issuing Organization** can manage company-owned RFQs and perform permitted sourcing, clarification, evaluation, and award actions.
- A **Responding Organization** can access RFQs made available through the applicable sourcing relationship, including direct invitation, company invitation, open-marketplace access where supported, or existing participation.

An RFQ can therefore appear in the same Procurement Center with different permitted actions for different organizations.

## 4. Understand the RFQ lifecycle

A typical governed RFQ journey is:

1. **Define the RFQ** — the issuing organization establishes procurement scope, sourcing method, contract framework, deadlines, and the procurement package.
2. **Provide respondent access** — suppliers or other responding organizations gain access through the sourcing path permitted for that RFQ.
3. **Clarify requirements** — respondents may use **Private RFI** for bilateral clarification. Material clarifications that affect all respondents must be issued through the formal **Addendum** workflow.
4. **Submit the commercial response** — authorized respondents prepare and submit a quotation or applicable proposal before the governed deadline.
5. **Open commercial evaluation** — commercial quote content remains deadline-controlled. Evaluation evidence becomes available only when the RFQ's commercial opening rules permit it.
6. **Review decision evidence** — eligible quotations can be compared using commercial offer, timeline, evaluation, and risk or exception context.
7. **Record the award decision** — the issuing organization remains responsible for the award. Product recommendations and scores support professional judgment; they do not make the decision automatically.

## 5. Your first actions

For most users, the safest starting sequence is:

### If you manage procurement for the issuing organization

1. Open **Executive Overview** and review current portfolio status.
2. Confirm the Company Workspace is ready for procurement activity.
3. Open **Procurement Center**.
4. Review an existing RFQ before creating a new one.
5. Create or configure a new RFQ only when your role permits it.
6. Use the appropriate invitation, RFI, Addendum, evaluation, and award controls as the procurement progresses.

### If you are responding to an RFQ

1. Open the RFQ through the access path provided to your organization.
2. Review scope, procurement package, sourcing method, deadlines, and Addenda.
3. Use Private RFI when a bilateral clarification is required and the RFI window is open.
4. Prepare the required quotation or proposal.
5. Submit before the governed deadline.
6. Return to the same RFQ to review subsequent Addenda, revalidation requirements, or recorded outcome where available.

## 6. What the product does not do

Intelligent Procurement provides workflow, governance, analytics, and decision support. It does not:

- make autonomous procurement or award decisions for an organization;
- guarantee that a recommended quotation is the correct commercial choice;
- bypass RFQ deadlines, authorization, confidentiality, or commercial-opening controls;
- turn Company Workspace membership into RFQ participation automatically;
- treat a Company Workspace invitation and an RFQ invitation as the same business flow.

Professional judgment and organizational authority remain with the participating organizations.

## 7. Where to go next

The Phase 20 launch documentation expands this overview into dedicated guides for:

- Create Company
- Create RFQ
- Invite Companies
- Respond to RFQ
- Submit RFI
- Submit Quote
- Evaluate Responses
- Award
- Roles & Permissions
- FAQ & Support
- Privacy / Security Overview

For support, use the **Support** link in the Intelligent Procurement application footer or the Nexus Pavilion Inc. corporate contact channel.

## Quick reference

| Need | Primary location |
| --- | --- |
| Executive portfolio overview | `/dashboard` |
| Company profile, membership, and governance | `/company/settings` |
| Procurement Center / RFQ portfolio | `/rfq` |
| Create a new RFQ | `/rfq/new` |
| Open an RFQ workspace | `/rfq/[slug]` |
| Compare eligible quotations after commercial opening | `/rfq/[slug]/compare` |
| Notifications | `/notifications` |

Access to a route or action is governed by authentication, Company Workspace context, RFQ relationship, lifecycle state, and the applicable authorization rules.

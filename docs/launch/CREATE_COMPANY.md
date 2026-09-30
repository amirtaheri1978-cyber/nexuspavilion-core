# Intelligent Procurement — Create Company

**Status:** Launch documentation  
**Task:** 20-02 — Create Company  
**Product:** Intelligent Procurement  
**Corporate parent:** Nexus Pavilion Inc.

## Purpose

A Company Workspace is the organization-level operating context for Intelligent Procurement. It establishes the company identity, initial workspace role, professional identity, and the organizational context used by protected procurement workflows.

Company creation is not the same business flow as an RFQ Invitation. Creating or joining a Company Workspace establishes organizational access; RFQ participation is governed separately by the relevant RFQ relationship and authorization rules.

## 1. When company onboarding appears

Company onboarding is available at `/create-company`.

A signed-in user is routed to onboarding when the account does not yet have a usable Company Workspace context.

If the account is already connected to a Company Workspace, the product does **not** require a second company. The active workspace guard redirects the user away from `/create-company` to a safe continuation destination when one exists, otherwise to `/dashboard`.

If you believe your account already belongs to a company, do not create another company to work around an access problem.

## 2. Before you begin

Have the following information ready:

- official company name;
- regional hub or primary operating location;
- organization type;
- your first name and last name;
- your job title in the workspace.

Company name and regional hub must each contain at least two characters. The product also applies bounded length validation to company, location, professional-name, and job-title fields.

## 3. Complete Company Identity

The first onboarding step is **Company Identity**.

Enter:

1. **Company name** — the organization name that will appear in Intelligent Procurement.
2. **Regional hub** — the location used for company context, supplier discovery, market context, procurement reporting, and regional intelligence.

Review spelling and organizational naming before continuing. The company name becomes part of the workspace identity and is used to generate the internal company slug.

## 4. Select Organization Type

The second step is **Organization Type**. Choose the option that best describes the organization.

| Organization type | Initial workspace context |
| --- | --- |
| **Owner / Developer** | Project-owner procurement context for RFQs, consultant engagement, supplier participation, awards, and executive reporting |
| **General Contractor** | Contractor procurement context for trade packages, supplier outreach, quote comparison, package awards, and procurement visibility |
| **Consultant** | Professional-consultant context for advisory participation, project requirements, technical evaluation, and collaboration |
| **Service Provider** | Construction-service context for service RFQs, proposals, opportunities, and awarded work |
| **Building Products Supplier** | Supplier context for RFQ access, quotation submission, company visibility, opportunities, and procurement reputation |

The selected organization type establishes the corresponding account classification and approved network role used during workspace bootstrap.

For an RFQ quotation continuation, onboarding preselects **Building Products Supplier** because the user is continuing a respondent quotation flow. The user may still choose another supported organization type if that better represents the company.

## 5. Review professional identity

Before activation, confirm the founder professional identity:

- **First name**
- **Last name**
- **Job title**

Existing professional names may be prefilled from the signed-in account and can be corrected before activation.

For a newly created Company Workspace, the founder job title is required before activation.

## 6. Review and activate

The final step is **Review & Activate**.

Review:

- Company
- Regional Hub
- Organization Type
- Network Role
- Founder Professional Identity

When the information is correct, use **Launch Workspace**.

The product then performs the governed workspace bootstrap. For a new company this includes:

1. creating the company record;
2. connecting the signed-in profile to that company;
3. establishing the initial workspace membership and role through the protected bootstrap command;
4. recording the initial company context;
5. returning the user to the appropriate post-onboarding destination.

The normal post-create destination is `/company/settings`.

## 7. RFQ continuation behavior

Company onboarding can be entered while a user is continuing an RFQ quotation journey.

When a valid internal RFQ submit continuation is present, Intelligent Procurement preserves that continuation through onboarding. After successful workspace activation, the user returns to the permitted RFQ submit path instead of being forced to start over.

External URLs, protocol-relative URLs, and other unsafe continuation values are rejected by the product's continuation controls.

Company onboarding does not itself grant RFQ participation. The respondent must still satisfy the RFQ-specific access and authorization rules.

## 8. Duplicate and recovery protection

The onboarding workflow includes duplicate-workspace protection.

### Account already connected

If the profile is already connected to a company, creation is rejected with:

> This account is already connected to a company.

Do not create another company.

### One existing owned company is recoverable

If the account owns one existing company but the profile connection is incomplete, the backend can recover that owned company and finish the workspace bootstrap instead of creating a duplicate company.

### More than one owned company requires recovery

If the account already owns more than one company while the workspace connection is unresolved, automatic creation is blocked. Workspace recovery is required before continuing.

Do not create another organization to bypass this state.

### Company saved but workspace bootstrap incomplete

If the company record is saved but workspace bootstrap cannot be completed, the product explicitly instructs the user not to create another company. Sign in again or use the support path if the condition persists.

## 9. After activation

After a normal company creation, continue to `/company/settings` and review the Company Workspace before starting wider procurement activity.

Recommended first checks:

1. confirm company profile details;
2. add the official company logo where appropriate;
3. review the regional hub and organization role;
4. review workspace membership and governance;
5. add capabilities, qualifications, compliance information, or controlled company documents where relevant;
6. invite additional Company Workspace members only when authorized;
7. open the Procurement Center when the organization is ready for RFQ activity.

A Company Workspace invitation adds or governs a person within an organization. It must not be confused with an RFQ Invitation, which governs access to a particular procurement opportunity.

## 10. Troubleshooting

| Situation | Required action |
| --- | --- |
| You are already connected to a company | Do not create another company; return to the existing workspace |
| Onboarding says workspace recovery is required | Stop company creation and use the support/recovery path |
| The company was saved but workspace setup did not finish | Do not retry by creating another company; sign in again or contact support |
| Authentication is no longer valid | Sign in again, then resume the permitted onboarding or continuation path |
| Network request cannot complete | Confirm connectivity and retry the same onboarding request |
| A similar company may already exist | Review the company name and your existing organizational access before proceeding |
| You entered onboarding from an RFQ response | Complete only the required Company Workspace setup; RFQ authorization remains a separate check |

For unresolved access or recovery issues, use the **Support** link in the application footer or the Nexus Pavilion Inc. corporate contact channel.

## 11. Governance boundary

Company creation establishes organization context; it does not override procurement authorization.

Access to RFQs, invitations, quotations, evaluation, and award actions continues to depend on authentication, active Company Workspace context, RFQ relationship, lifecycle state, and the applicable authorization rules.

Never create a duplicate Company Workspace as a workaround for an RFQ access problem.

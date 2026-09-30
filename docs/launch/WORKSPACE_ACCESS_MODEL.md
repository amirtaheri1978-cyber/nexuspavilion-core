# Intelligent Procurement — Workspace Access Model

**Status:** Launch documentation  
**Task:** 20-10 — Roles & Permissions  
**Product:** Intelligent Procurement  
**Corporate parent:** Nexus Pavilion Inc.

## Purpose

Intelligent Procurement uses two separate but related access models:

1. **Company Workspace membership** — who belongs to an organization and what workspace authority they hold.
2. **RFQ relationship** — whether that organization is the issuer or an authorized respondent for a specific procurement.

A Company Workspace invitation is not an RFQ Invitation, and a Workspace Role is not an RFQ participant role.

## Company Workspace membership

The authoritative membership record is `organization_memberships`. It carries four distinct dimensions:

- **Workspace Role:** `owner`, `admin`, `member`, `viewer`
- **Procurement Function:** `buyer`, `supplier`, `consultant`, `none`
- **Membership Type:** `founder`, `employee`, `external_consultant`, `procurement_agent`, `temporary_staff`
- **Membership Status:** `pending`, `active`, `archived`, `suspended`, `revoked`

Legacy `profiles.company_id` and `profiles.role` remain for migration compatibility, but protected operations rely on active membership plus the applicable domain rule.

## Workspace Roles

| Role | Product label | Current meaning |
| --- | --- | --- |
| `owner` | Owner | Highest Company Workspace governance authority |
| `admin` | Administrator | Workspace administration and member/access management |
| `member` | Standard | Day-to-day participation within separately permitted workflows |
| `viewer` | Read Only | Review access without operational write authority |

### Owner

An active Owner can manage the Company Workspace, invite members, manage non-owner member access, manage owner/admin-controlled organization settings, archive the workspace, and initiate ownership transfer.

Owner access is protected. Ordinary member controls cannot remove the Owner or assign/demote the Owner role. Ownership changes use the dedicated ownership-transfer workflow.

### Administrator

An active Administrator can manage Company Workspace settings, invite members, manage non-owner members, change non-owner Access Levels, and perform procurement actions for which Administrator authority is accepted.

An Administrator cannot transfer ownership or archive the Company Workspace.

### Standard

A Standard member does not manage workspace membership or settings by role alone.

Operational procurement depends on separate rules. For example, a Standard member can participate in a respondent quotation/RFI workflow when the company has the required RFQ access. A Standard member with Procurement Function `buyer` can satisfy issuer RFQ creation and supplier-invitation rules.

### Read Only

A Viewer is excluded from operational procurement writes. Viewer membership does not satisfy quotation submission, Private RFI submission, RFQ creation, supplier invitation, or workspace administration requirements.

## Procurement Function is separate

Procurement Function does not replace Workspace Role.

Examples:

- `member + buyer` remains Standard workspace access, while the Buyer function can authorize selected issuer procurement operations.
- `owner + none` remains Owner and can perform owner-authorized issuer operations.
- `member + supplier` remains Standard workspace access; respondent access still depends on the RFQ relationship.
- `viewer + buyer` still fails the non-viewer operational-write requirement.

Changing a member's Access Level does not automatically change Procurement Function, Job Title, RFQ relationship, or procurement capability.

## Current workspace invitation model

The current Company Workspace invitation UI offers:

- **Read Only** → `viewer`
- **Standard** → `member`
- **Administrator** → `admin`

Only active Owners and Administrators can invite Company Workspace users.

Acceptance requires a valid pending invitation, non-expired token, authenticated identity, invited-email match, and required professional identity fields.

For the current three Access Levels, invitation acceptance creates or reactivates an active membership with Procurement Function `none`.

Historical `buyer` and `vendor` invitation-role values remain supported in the backend for migration compatibility, but they are not the current launch-facing Access Level model.

## Member management protections

Owners and Administrators can manage non-owner members.

Current protections include:

- a user cannot remove their own membership from the member-management panel;
- the Owner cannot be removed through the generic removal flow;
- ordinary role editing cannot assign `owner`;
- ordinary role editing does not change Procurement Function; and
- removal changes the membership to `revoked` rather than deleting its history.

Editable member Access Levels are Administrator, Standard, and Read Only.

## Ownership transfer

Ownership transfer is a dedicated governance workflow.

Only the current active Owner can initiate it. The proposed owner must be another active member of the same Company Workspace.

The previous Owner selects their post-transfer role: Administrator, Standard, or Read Only. The recipient must accept the transfer before completion.

The transfer changes Workspace Roles atomically and preserves each person's Procurement Function.

## RFQ participant role

RFQ participant role is calculated independently from Workspace Role:

- current company owns RFQ → **Issuer**
- current company does not own RFQ → **Respondent**

An Owner in one Company Workspace can therefore be a Respondent on another company's RFQ. An Administrator in a respondent company does not become an issuer administrator for someone else's RFQ.

## RFQ access relationships

The current RFQ model uses these access reasons:

- **Company Managed** — current company owns the RFQ
- **Open Marketplace** — Open RFQ access
- **Direct Invitation** — governed RFQ Invitation
- **Existing Participation** — the company already participates through its quotation relationship

The access contract also defines a `company_invitation` relationship type, but the current launch Procurement Context does not populate it as a separate active source. It should not be presented as an additional launch pathway.

RFQ access never adds the respondent to the issuer's Company Workspace.

## Issuer procurement access

### Create RFQ / invite suppliers

The current operational rule requires an active non-viewer membership and one of:

- Workspace Role Owner
- Workspace Role Administrator
- Procurement Function Buyer

### Pre-deadline quote participation

Authorized issuer Owner/Admin/Buyer relationships can use the safe aggregate quote-count path.

That path returns only a count. It does not return quotation rows, supplier identity, or commercial fields before commercial opening.

### Commercial evaluation

Commercial quote rows remain locked until the RFQ deadline has passed.

After opening, qualifying issuer membership relationships can read the commercial evidence allowed by the database policy. The database deadline and membership controls remain authoritative.

### Quote decisions

Updating quotation decision state to Approved or Rejected requires an active issuing-company Owner or Administrator.

### Contract Award

Contract Award requires an active Owner or Administrator of the verified, active issuing company, plus the separate award eligibility conditions.

Buyer Procurement Function alone is not sufficient for Contract Award.

## Respondent procurement access

Quotation and Private RFI submission require:

- active Company Workspace membership;
- a Workspace Role other than Viewer;
- a company different from the RFQ issuer; and
- an RFQ relationship permitted by the sourcing method.

Procurement Function is not a global respondent switch. A `supplier` label alone does not create RFQ access.

For Open RFQs, the sourcing method can satisfy the market-access branch while the RFQ is open.

For Invited / Selective and Sealed Bid RFQs, the company needs a governed restricted-access relationship such as a valid Direct RFQ Invitation or Existing Participation.

## Commercial confidentiality

Workspace Role does not override RFQ confidentiality.

Before the submission deadline, issuer commercial amounts, ranking, recommendation, and award controls remain locked.

After the deadline, issuer commercial evidence is available only through the applicable issuer relationship and database policy.

Respondents remain limited to their own permitted quotation state and do not receive competitor commercial submissions or issuer executive intelligence.

## Access matrix

| Capability | Owner | Administrator | Standard | Read Only |
| --- | --- | --- | --- | --- |
| View permitted Company Workspace | Yes | Yes | Yes | Yes |
| Manage workspace settings | Yes | Yes | No | No |
| Invite workspace members | Yes | Yes | No | No |
| Change/remove non-owner member access | Yes | Yes | No | No |
| Transfer ownership | Yes | No | No | No |
| Archive workspace | Yes | No | No | No |
| Create RFQ | Yes | Yes | With Buyer Procurement Function | No |
| Invite RFQ suppliers | Yes | Yes | With Buyer Procurement Function | No |
| Submit quotation as an authorized respondent | Yes | Yes | Yes | No |
| Submit Private RFI as an authorized respondent | Yes | Yes | Yes | No |
| Update quote decision | Yes | Yes | No | No |
| Complete Contract Award | Yes | Yes | No | No |

Every RFQ action also depends on RFQ ownership/relationship, sourcing method, lifecycle, deadline, Addenda, quotation state, Company Workspace state, and the specific server/database rule.

## Legacy compatibility

Some older modules still expose profile-level labels such as `owner`, `admin`, `buyer`, and `vendor`.

Those legacy labels are migration compatibility, not the preferred launch-facing access model.

Use the layered model:

**Membership Status → Workspace Role → Procurement Function → Company state → RFQ relationship → lifecycle/action rule.**

## Governance boundaries

- **Workspace Membership** ≠ **RFQ Invitation**
- **Workspace Role** ≠ **Procurement Function**
- **Workspace Role** ≠ **RFQ Participant Role**
- **RFQ access** ≠ **Company Workspace membership**
- **Evaluation access** ≠ **Award authority**
- **Recommendation** ≠ **Contract Award**
- **RFQ Award** ≠ **Executed Contract / Purchase Order**

No single role label should be used as a shortcut across these separate business domains.

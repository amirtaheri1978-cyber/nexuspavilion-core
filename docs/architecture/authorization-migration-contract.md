# Nexus Pavilion Authorization Migration Contract

## Status

- Architecture: Approved
- Migration strategy: Expand → Adopt → Contract
- Current phase: Adopt
- Legacy fields remain operational until migration completion:
  - `profiles.role`
  - `profiles.company_id`

## 1. Architectural Boundaries

### Authentication

Answers:

> Who is the authenticated user?

Implemented through Supabase Auth.

### Membership

Answers:

> Which organization does this person belong to, and what is their relationship with it?

Authoritative model:

- `organization_memberships.user_id`
- `organization_memberships.company_id`
- `organization_memberships.membership_type`
- `organization_memberships.membership_status`

### Workspace Role

Answers:

> What administrative authority does this person have inside the organization workspace?

Supported roles:

- `owner`
- `admin`
- `member`
- `viewer`

Workspace roles must not represent the organization’s commercial position.

### Company Network Role

Answers:

> What commercial position does this organization perform in the procurement network?

Examples:

- Owner / Developer
- General Contractor
- Supplier
- Consultant
- Service Provider

Company network role belongs to `companies`, not to the individual user.

### Professional Identity

Answers:

> What does this person do professionally?

Examples:

- Job title
- Job function
- Department

Professional identity must not independently grant permissions.

## 2. Authorization Decision Model

Every sensitive action must evaluate the applicable layers:

```text
Authenticated Identity
→ Active Organization Membership
→ Workspace Role
→ Company Scope
→ Organization Capability
→ Verification Requirement
→ Business Workflow State
→ Mutation
→ Audit
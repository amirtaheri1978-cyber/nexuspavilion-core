# Section 3 migration order

Apply these existing migrations in this dependency-safe order after the base schema. This is a review manifest, not an execution script.

1. `20260801_create_organization_memberships.sql`
   - Requires: `companies`, `profiles`, `audit_logs`.
   - Creates/alters: membership table, indexes, baseline membership RLS and backfill.
   - Position: first; later membership changes and RPCs require this table.

2. `20260801_add_membership_procurement_function.sql`
   - Requires: `organization_memberships`.
   - Creates/alters: `procurement_function` and its validation.
   - Position: before invitation acceptance and ownership workflows that preserve or set this field.

3. `20260801_harden_company_rls.sql`
   - Requires: `companies`, `profiles`.
   - Creates/alters: company RLS policies.
   - Position: before the application exercises company access under the Section 3 security model.

4. `20260801_create_get_organization_members_rpc.sql`
   - Requires: memberships and procurement function.
   - Creates/alters: membership read RPC.
   - Position: after membership shape is complete.

5. `20260801_create_update_organization_member_role_rpc.sql`
   - Requires: memberships and audit logs.
   - Creates/alters: membership role-update RPC.
   - Position: after the canonical membership table exists.

6. `20260801_create_remove_organization_member_rpc.sql`
   - Requires: memberships and audit logs.
   - Creates/alters: membership removal RPC.
   - Position: after the canonical membership table exists.

7. `20260801_create_accept_organization_invitation_rpc.sql`
   - Requires: invitations, profiles, notifications, audit logs, memberships, procurement function, and Supabase Auth.
   - Creates/alters: invitation-acceptance RPC.
   - Position: after the entire membership shape is available.

8. `20260802_add_company_workspace_status.sql`
   - Requires: `companies`.
   - Creates/alters: `companies.workspace_status`.
   - Position: before ownership workflow RPCs that enforce workspace state.

9. `20260802_create_ownership_transfer_requests.sql`
   - Requires: companies, profiles, memberships, audit logs.
   - Creates/alters: transfer-request table, constraints, indexes, RLS.
   - Position: before transfer RPCs.

10. `20260802_enforce_single_active_owner.sql`
    - Requires: memberships.
    - Creates/alters: active-owner invariant index.
    - Position: before atomic acceptance, which relies on this invariant.

11. `20260802_create_request_company_ownership_transfer_rpc.sql`
    - Requires: transfer requests, memberships, companies, audit logs.
    - Creates/alters: request RPC.
    - Position: after expiration-supporting request storage exists.

12. `20260802_create_accept_company_ownership_transfer_rpc.sql`
    - Requires: transfer requests, single-owner invariant, memberships, companies, audit logs.
    - Creates/alters: atomic acceptance/completion RPC.
    - Position: after every ownership invariant and dependency exists.

13. `20260802_create_reject_company_ownership_transfer_rpc.sql`
    - Requires: transfer requests, memberships, audit logs.
    - Creates/alters: rejection RPC.
    - Position: after transfer-request storage exists.

14. `20260808_fix_request_company_ownership_transfer_expiration_audit.sql`
    - Requires: request RPC, transfer requests, audit logs.
    - Creates/alters: request RPC to audit request-time expiration.
    - Position: replaces the baseline request RPC behavior.

15. `20260808_add_ownership_transfer_accepted_audit.sql`
    - Requires: accept RPC, transfer requests, memberships, companies, audit logs.
    - Creates/alters: accept RPC to emit Accepted immediately before Completed audit evidence.
    - Position: last; it is the current-head replacement of acceptance behavior.

Do not substitute lexical filename order for this manifest. The listed order resolves the documented table, column, invariant, and RPC dependencies.

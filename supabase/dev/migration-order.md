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

4. `20260808_correct_company_rls_membership_authorization.sql`
   - Requires: `public.companies`, `public.organization_memberships`, and canonical membership columns.
   - Creates/alters: explicitly enables companies RLS and replaces legacy `profiles.role` update/delete authorization with active owner/admin membership authorization.
   - Position: immediately after the historical company-RLS migration and before membership RPCs.
   - Reason: additive correction that preserves reproducible migration history while making company authorization canonical.

5. `20260808_restrict_company_ownership_sensitive_updates.sql`
   - Requires: `public.companies` and the canonical company RLS policy set.
   - Creates/alters: revokes generic authenticated company UPDATE and grants only ordinary profile/logo columns; excludes `companies.user_id`.
   - Position: immediately after the company-RLS correction and before membership RPCs.
   - Reason: ownership projection changes must remain controlled by transactional ownership commands.

6. `20260801_create_get_organization_members_rpc.sql`
   - Requires: memberships and procurement function.
   - Creates/alters: membership read RPC.
   - Position: after membership shape is complete.

7. `20260801_create_update_organization_member_role_rpc.sql`
   - Requires: memberships and audit logs.
   - Creates/alters: membership role-update RPC.
   - Position: after the canonical membership table exists.

8. `20260801_create_remove_organization_member_rpc.sql`
   - Requires: memberships and audit logs.
   - Creates/alters: membership removal RPC.
   - Position: after the canonical membership table exists.

9. `20260801_create_accept_organization_invitation_rpc.sql`
   - Requires: invitations, profiles, notifications, audit logs, memberships, procurement function, and Supabase Auth.
   - Creates/alters: invitation-acceptance RPC.
   - Position: after the entire membership shape is available.

10. `20260802_add_company_workspace_status.sql`
   - Requires: `companies`.
   - Creates/alters: `companies.workspace_status`.
   - Position: before ownership workflow RPCs that enforce workspace state.

11. `20260802_create_ownership_transfer_requests.sql`
   - Requires: companies, profiles, memberships, audit logs.
   - Creates/alters: transfer-request table, constraints, indexes, RLS.
   - Position: before transfer RPCs.

12. `20260802_enforce_single_active_owner.sql`
    - Requires: memberships.
    - Creates/alters: active-owner invariant index.
    - Position: before atomic acceptance, which relies on this invariant.

13. `20260802_create_request_company_ownership_transfer_rpc.sql`
    - Requires: transfer requests, memberships, companies, audit logs.
    - Creates/alters: request RPC.
    - Position: after expiration-supporting request storage exists.

14. `20260802_create_accept_company_ownership_transfer_rpc.sql`
    - Requires: transfer requests, single-owner invariant, memberships, companies, audit logs.
    - Creates/alters: atomic acceptance/completion RPC.
    - Position: after every ownership invariant and dependency exists.

15. `20260802_create_reject_company_ownership_transfer_rpc.sql`
    - Requires: transfer requests, memberships, audit logs.
    - Creates/alters: rejection RPC.
    - Position: after transfer-request storage exists.

16. `20260808_fix_request_company_ownership_transfer_expiration_audit.sql`
    - Requires: request RPC, transfer requests, audit logs.
    - Creates/alters: request RPC to audit request-time expiration.
    - Position: replaces the baseline request RPC behavior.

17. `20260808_add_ownership_transfer_accepted_audit.sql`
   - Requires: accept RPC, transfer requests, memberships, companies, audit logs.
   - Creates/alters: accept RPC to emit Accepted immediately before Completed audit evidence.
   - Position: last; it is the current-head replacement of acceptance behavior.

18. `20260809_reconcile_section3_client_table_privileges.sql`
   - Requires: companies, ownership transfer requests, and the completed Section 3 privilege definitions.
   - Creates/alters: reproducible client table privileges for company discovery/self-creation, ownership-safe company updates, and select-only browser access to transfer requests.
   - Position: last; reconciles the final verified privilege baseline after all affected tables and RPCs exist.

Do not substitute lexical filename order for this manifest. The listed order resolves the documented table, column, invariant, and RPC dependencies.

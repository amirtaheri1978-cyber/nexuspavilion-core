# Synthetic seed plan

Create only synthetic records after the base schema and migrations are approved and applied to a Development project. Do not add seed rows to this package. Use generated IDs, reserved test email domains, and scenario labels; never use real people, Production IDs, or customer data.

## Deterministic actor matrix

| Actor | Company | Membership status | Workspace role | Procurement function | Purpose / expected use |
| --- | --- | --- | --- | --- | --- |
| User A | Company A | active | owner | buyer | Canonical owner and authorized request initiator; `companies.user_id` equals User A before a successful transfer. |
| User B | Company A | active | admin | supplier | The only normal valid ownership-transfer recipient; acceptance, rejection, and procurement-preservation tests. |
| User C | Company A | active | member | consultant | Non-owner negative authorization tests. |
| User D | Company A | active | workspace_role = viewer | none | Viewer read/authorization negative tests. |
| User E | Company A | suspended | member | buyer | Inactive-target and inactive-actor tests. |
| User F | Company B | active | member | supplier | Cross-company target and unrelated-actor tests. |

Company A is the primary lifecycle test company. Company B is isolated and must never share memberships with Company A.

## Test data rules

- Give each scenario a deterministic label and a fresh synthetic company where terminal state would interfere with a later scenario.
- Use a distinct transfer request for each acceptance, rejection, and expiration case.
- Reuse a terminal request only for its corresponding replay case.
- Seed cancelled state only as an explicitly manual test fixture for replay behavior; do not create or test a cancellation command.
- For ownership acceptance, record User A and User B procurement functions before and after the transition.
- Scope audit assertions by transfer request ID and company ID.
- Keep concurrency scenarios isolated from ordinary lifecycle scenarios.

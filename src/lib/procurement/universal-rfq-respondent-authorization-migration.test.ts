import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const migrationPath =
  "supabase/migrations/20260833000000_universal_rfq_respondent_authorization.sql";
const historicalSourcingPath =
  "supabase/legacy-migrations/pre-baseline/20260819_restrict_rfq_sourcing_access_rls.sql";
const historicalActivityPath =
  "supabase/migrations/20260828000000_enable_company_scoped_audit_and_notification_access.sql";
const quotesRoutePath = "src/app/api/quotes/route.ts";
const quotesAuthPath = "src/lib/procurement/procurement-write-authorization.ts";
const accessContractPath = "src/lib/procurement/rfq-access-contract.ts";
const bootstrapPath =
  "supabase/migrations/20260832000000_bootstrap_vendor_supplier_founder_capability.sql";
const commercialUnlockPath =
  "supabase/migrations/20260829000000_restrict_issuer_quote_select_until_commercial_unlock.sql";

const sql = readSource(migrationPath);
const normalized = sql.replace(/\s+/g, " ").trim().toLowerCase();
const historicalSourcing = readSource(historicalSourcingPath);
const historicalActivity = readSource(historicalActivityPath);
const quotesRoute = readSource(quotesRoutePath);
const quotesAuth = readSource(quotesAuthPath);
const accessContract = readSource(accessContractPath);
const bootstrap = readSource(bootstrapPath);
const commercialUnlock = readSource(commercialUnlockPath);

function policyBlock(source: string, policyName: string) {
  const lowerSql = source.toLowerCase();
  const marker = `create policy "${policyName.toLowerCase()}"`;
  const start = lowerSql.lastIndexOf(marker);
  expect(start, `missing policy ${policyName}`).toBeGreaterThan(-1);
  const rest = source.slice(start);
  const lowerRest = rest.toLowerCase();
  const candidates = [
    lowerRest.indexOf("\ndrop policy", marker.length),
    lowerRest.indexOf("\ncreate policy", marker.length),
    lowerRest.indexOf("\ncreate or replace function", marker.length),
    lowerRest.indexOf("\ncommit;", marker.length),
    rest.length,
  ].filter((value) => value > 0);
  return rest.slice(0, Math.min(...candidates));
}

function helperFunctionSql(source: string) {
  const start = source
    .toLowerCase()
    .indexOf(
      "create or replace function public.current_user_has_supplier_rfq_access(p_rfq_id uuid)",
    );
  expect(start).toBeGreaterThan(-1);
  const dropAt = source.toLowerCase().indexOf("drop policy if exists", start);
  expect(dropAt).toBeGreaterThan(start);
  return source.slice(start, dropAt);
}

const selectPolicy = policyBlock(
  sql,
  "Authenticated users can read permitted RFQs",
);
const insertPolicy = policyBlock(
  sql,
  "Supplier members can submit company quotes",
);
const normalizedSelect = selectPolicy.replace(/\s+/g, " ").toLowerCase();
const normalizedInsert = insertPolicy.replace(/\s+/g, " ").toLowerCase();
const helper = helperFunctionSql(sql).replace(/\s+/g, " ").toLowerCase();
const activityStart = sql.indexOf(
  "create or replace function public.record_procurement_activity(",
);
const activityComment = sql.indexOf(
  "comment on function public.record_procurement_activity(text, uuid)",
);
const activityBody = sql.slice(activityStart, activityComment).toLowerCase();

describe("Task 33E universal RFQ respondent RLS migration", () => {
  it("is a forward-only overlay and does not rewrite historical migrations", () => {
    expect(sql).toContain("begin;");
    expect(sql).toContain("commit;");
    expect(sql).toContain("drop policy if exists");
    expect(normalized).not.toContain("update public.organization_memberships");
    expect(normalized).not.toContain("update public.rfq_invites");
    expect(normalized).not.toContain("update public.quotes");
    expect(normalized).not.toContain("drop table");
    expect(historicalSourcing).toContain(
      "om.procurement_function in ('supplier', 'consultant')",
    );
    expect(historicalSourcing).toContain(
      "om.procurement_function = 'supplier'",
    );
    expect(historicalActivity).toContain(
      "om.procurement_function in ('supplier', 'consultant')",
    );
  });

  it("stops using procurement_function as the respondent authorization primitive", () => {
    expect(normalizedSelect).not.toContain(
      "om.procurement_function in ('supplier', 'consultant')",
    );
    expect(normalizedInsert).not.toContain(
      "om.procurement_function = 'supplier'",
    );
    expect(helper).not.toContain(
      "om.procurement_function in ('supplier', 'consultant')",
    );
    expect(quotesAuth).not.toContain(
      'membership.procurementFunction === "supplier"',
    );
    expect(bootstrap).toContain(
      "elsif normalized_account_type = 'vendor_supplier' then\n    derived_procurement_function := 'supplier';",
    );
    expect(bootstrap).toContain(
      "derived_procurement_function := 'none';",
    );
  });

  it("keeps RFQ SELECT issuer-owned, open-marketplace, and invitation-bound", () => {
    expect(normalizedSelect).toContain("for select");
    expect(normalizedSelect).toContain("to authenticated");
    expect(normalizedSelect).toContain("om.company_id = rfqs.company_id");
    expect(normalizedSelect).toContain("om.membership_status = 'active'");
    expect(normalizedSelect).toContain("rfqs.status = 'open'");
    expect(normalizedSelect).toContain("rfqs.sourcing_method = 'open'");
    expect(normalizedSelect).toContain(
      "public.current_user_has_supplier_rfq_access(rfqs.id)",
    );
    expect(normalizedSelect).toContain(
      "rfqs.sourcing_method = 'open' or public.current_user_has_supplier_rfq_access(rfqs.id)",
    );
    expect(normalizedSelect).not.toContain("to anon");
  });

  it("keeps quote INSERT identity, membership, open-state, self-quote, and sourcing checks", () => {
    expect(normalizedInsert).toContain("for insert");
    expect(normalizedInsert).toContain("user_id = auth.uid()");
    expect(normalizedInsert).toContain("om.company_id = quotes.company_id");
    expect(normalizedInsert).toContain("om.membership_status = 'active'");
    expect(normalizedInsert).toContain("r.status = 'open'");
    expect(normalizedInsert).toContain("r.company_id <> quotes.company_id");
    expect(normalizedInsert).toContain("r.sourcing_method = 'open'");
    expect(normalizedInsert).toContain(
      "public.current_user_has_supplier_rfq_access(quotes.rfq_id)",
    );
    expect(normalizedInsert).toContain(
      "r.sourcing_method = 'open' or public.current_user_has_supplier_rfq_access(quotes.rfq_id)",
    );
  });

  it("preserves invitation email binding and never treats the token as a quote credential", () => {
    expect(helper).toContain("from public.rfq_invites i");
    expect(helper).toContain("i.email = v_email");
    expect(helper).toContain("i.status in ('sent', 'invited')");
    expect(helper).toContain("auth.jwt() ->> 'email'");
    expect(helper).not.toContain("token");
    expect(quotesRoute).not.toContain("get_rfq_invitation_context");
    expect(quotesRoute).not.toContain("p_token");
    expect(quotesRoute).not.toContain("invite_token");
    expect(quotesRoute).not.toContain("body.isInvited");
  });

  it("does not widen quote SELECT or commercial-unlock policies", () => {
    expect(sql).not.toContain("Company members can read own company quotes");
    expect(sql).not.toContain(
      "Issuing buyers can read quotes after commercial unlock",
    );
    expect(commercialUnlock).toContain(
      'create policy "Company members can read own company quotes"',
    );
    expect(commercialUnlock).toContain(
      'create policy "Issuing buyers can read quotes after commercial unlock"',
    );
  });

  it("aligns quote_submitted activity recording to active membership without changing issuer writes", () => {
    expect(activityBody).toContain("activity_kind = 'rfq_created'");
    expect(activityBody).toContain("om.workspace_role in ('owner', 'admin')");
    expect(activityBody).toContain("om.procurement_function = 'buyer'");
    expect(activityBody).not.toContain(
      "om.procurement_function in ('supplier', 'consultant')",
    );
    expect(activityBody).toContain("q.user_id = actor_user_id");
    expect(activityBody).toContain("om.membership_status = 'active'");
  });
});

describe("Task 33E API / RLS respondent parity", () => {
  it("encodes the same sourcing contract in POST /api/quotes and quote INSERT RLS", () => {
    expect(quotesRoute).toContain("canSubmitCompanyQuote");
    expect(quotesRoute).toContain("canRespondToRfqSourcing");
    expect(quotesRoute).toContain("isPublicSourcingMethod");
    expect(quotesRoute).toContain("current_user_has_supplier_rfq_access");
    expect(quotesRoute).toContain("sourcing_method");
    expect(accessContract).toContain(
      "isPublicSourcingMethod(sourcingMethod) || hasRestrictedRfqAccess === true",
    );
    expect(normalizedInsert).toContain(
      "r.sourcing_method = 'open' or public.current_user_has_supplier_rfq_access(quotes.rfq_id)",
    );
    expect(quotesRoute).toContain(
      "You must belong to an active company to submit a quotation.",
    );
    expect(quotesRoute).toContain(
      "You do not have access to submit a quotation for this RFQ.",
    );
    expect(quotesRoute).not.toContain(
      "Only authorized supplier accounts can submit quotations.",
    );
  });

  it("allows invited non-supplier companies in both API and RLS", () => {
    expect(quotesAuth).toContain("isActiveMembershipForCompany(membership, companyId)");
    expect(quotesAuth).not.toContain(
      'membership.procurementFunction === "supplier"',
    );
    expect(normalizedInsert).not.toContain(
      "om.procurement_function = 'supplier'",
    );
    expect(normalizedSelect).not.toContain(
      "om.procurement_function in ('supplier', 'consultant')",
    );
    expect(quotesRoute).toContain(
      'hasRestrictedRfqAccess = restrictedAccess === true',
    );
    expect(normalizedInsert).toContain(
      "public.current_user_has_supplier_rfq_access(quotes.rfq_id)",
    );
  });

  it("denies non-invited companies on restricted RFQs in both API and RLS", () => {
    expect(accessContract).toContain(
      "isPublicSourcingMethod(sourcingMethod) || hasRestrictedRfqAccess === true",
    );
    expect(quotesRoute).toContain(
      "!canRespondToRfqSourcing(rfq.sourcing_method, hasRestrictedRfqAccess)",
    );
    expect(normalizedInsert).toContain(
      "r.sourcing_method = 'open' or public.current_user_has_supplier_rfq_access(quotes.rfq_id)",
    );
    expect(normalizedSelect).toContain(
      "rfqs.sourcing_method = 'open' or public.current_user_has_supplier_rfq_access(rfqs.id)",
    );
  });

  it("allows open RFQ responses for any active legitimate company in both API and RLS", () => {
    expect(quotesRoute).toContain("isPublicSourcingMethod(rfq.sourcing_method)");
    expect(normalizedInsert).toContain("r.sourcing_method = 'open'");
    expect(normalizedSelect).toContain("rfqs.sourcing_method = 'open'");
    expect(normalizedInsert).toContain("om.membership_status = 'active'");
    expect(normalizedSelect).toContain("om.membership_status = 'active'");
  });
});

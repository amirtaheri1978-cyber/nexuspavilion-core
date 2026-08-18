import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath =
  "supabase/migrations/20260826000000_enforce_atomic_rfq_award_integrity.sql";
const awardRoutePath = "src/app/api/award-contract/route.ts";
const quoteDecisionRoutePath = "src/app/api/quote-decision/route.ts";

const sql = readFileSync(resolve(process.cwd(), migrationPath), "utf8").replace(
  /\r\n/g,
  "\n",
);
const awardRoute = readFileSync(resolve(process.cwd(), awardRoutePath), "utf8");
const quoteDecisionRoute = readFileSync(
  resolve(process.cwd(), quoteDecisionRoutePath),
  "utf8",
);

const functionBody = sql.slice(
  sql.indexOf("create or replace function public.award_rfq_quote"),
  sql.indexOf("comment on function public.award_rfq_quote"),
);

describe("atomic RFQ award integrity migration", () => {
  it("adds a partial unique index of one awarded quote per RFQ", () => {
    expect(sql).toContain(
      "create unique index if not exists quotes_one_awarded_decision_per_rfq\n  on public.quotes (rfq_id)\n  where decision = 'awarded';",
    );
  });

  it("creates a SECURITY DEFINER award RPC with empty search_path and auth.uid actor", () => {
    expect(sql).toContain("create or replace function public.award_rfq_quote(p_quote_id uuid)");
    expect(functionBody).toContain("security definer");
    expect(functionBody).toContain("set search_path = ''");
    expect(functionBody).toContain("actor_user_id uuid := auth.uid();");
    expect(functionBody).not.toContain("p_company_id");
    expect(functionBody).not.toContain("p_user_id");
  });

  it("authorizes the RFQ company owner or admin and locks the RFQ row", () => {
    expect(functionBody).toContain("om.company_id = rfq_row.company_id");
    expect(functionBody).toContain("om.workspace_role in ('owner', 'admin')");
    expect(functionBody).toContain("company_workspace_status is distinct from 'active'");
    expect(functionBody).toContain("company_status is distinct from 'verified'");
    expect(functionBody).toContain("from public.rfqs r\n  where r.id = selected_quote.rfq_id\n  for update;");
    expect(functionBody).toContain("order by q.id\n  for update;");
  });

  it("awards RFQ and quotes in one transaction without resetting quotes to pending", () => {
    const rfqUpdate = functionBody.indexOf("update public.rfqs");
    const rejectUpdate = functionBody.indexOf("set decision = 'rejected'");
    const awardUpdate = functionBody.indexOf("decision = 'awarded',\n    awarded_at = v_awarded_at");

    expect(rfqUpdate).toBeGreaterThan(-1);
    expect(rejectUpdate).toBeGreaterThan(rfqUpdate);
    expect(awardUpdate).toBeGreaterThan(rejectUpdate);
    expect(functionBody).not.toContain("decision = 'pending'");
    expect(functionBody).toContain("and awarded_quote_id is null");
  });

  it("revokes anonymous execute", () => {
    expect(sql).toContain(
      "revoke all\non function public.award_rfq_quote(uuid)\nfrom public;",
    );
    expect(sql).toContain(
      "revoke all\non function public.award_rfq_quote(uuid)\nfrom anon;",
    );
    expect(sql).toContain(
      "grant execute\non function public.award_rfq_quote(uuid)\nto authenticated, service_role;",
    );
  });

  it("does not distinguish missing quotes from foreign-company quotes", () => {
    const tenantLookup = functionBody.slice(
      functionBody.indexOf("if actor_company_id is null"),
      functionBody.indexOf("from public.rfqs r\n  where r.id = selected_quote.rfq_id"),
    );

    expect(tenantLookup).toContain("join public.rfqs r");
    expect(tenantLookup).toContain("on r.id = q.rfq_id");
    expect(tenantLookup).toContain("r.company_id = actor_company_id");
    expect(tenantLookup).toContain("'error_code', 'QUOTE_NOT_FOUND'");
    expect(tenantLookup).not.toMatch(
      /from public\.quotes q\s+where q\.id = p_quote_id;/,
    );
    expect(tenantLookup).not.toContain("NOT_RFQ_COMPANY");

    const quoteNotFoundIndex = functionBody.indexOf(
      "'error_code', 'QUOTE_NOT_FOUND'",
    );
    const notRfqCompanyIndex = functionBody.indexOf(
      "'error_code', 'NOT_RFQ_COMPANY'",
    );

    expect(quoteNotFoundIndex).toBeGreaterThan(-1);
    expect(notRfqCompanyIndex).toBeGreaterThan(quoteNotFoundIndex);
  });

  it("blocks direct awarded-quote replacement and decision disagreement", () => {
    expect(sql).toContain(
      "An awarded RFQ cannot replace its awarded quote.",
    );
    expect(sql).toContain("An awarded quote cannot change decision.");
    expect(sql).toContain(
      "A quote can be awarded only when it is the RFQ awarded_quote_id.",
    );
    expect(sql).toContain("tg_op = 'UPDATE'");
    expect(sql).toContain("tg_op = 'INSERT'");
    expect(sql).toContain("deferrable initially deferred");
  });
});

describe("award API uses the atomic RPC", () => {
  it("calls award_rfq_quote instead of three independent UPDATEs", () => {
    expect(awardRoute).toContain('.rpc(');
    expect(awardRoute).toContain('"award_rfq_quote"');
    expect(awardRoute).toContain("p_quote_id: quoteId");
    expect(awardRoute).not.toContain('.from("rfqs")');
    expect(awardRoute).not.toContain('.from("quotes")');
    expect(awardRoute).not.toContain('decision: "pending"');
    expect(awardRoute).not.toContain('decision: "rejected"');
    expect(awardRoute).not.toContain('decision: "awarded"');
  });

  it("keeps session auth, bounded errors, and post-commit email", () => {
    expect(awardRoute).toContain("supabase.auth.getUser()");
    expect(awardRoute).toContain("ERROR_STATUS_BY_CODE");
    expect(awardRoute).toContain("RFQ_ALREADY_AWARDED");
    expect(awardRoute).toContain("sendEmail");
    expect(awardRoute).not.toContain("SERVICE_ROLE");
    expect(awardRoute).not.toContain("service_role");
  });

  it("maps missing and foreign quotes to the same bounded 404 shape", () => {
    expect(awardRoute).toContain("QUOTE_NOT_FOUND: 404");
    expect(awardRoute).toContain("NOT_RFQ_COMPANY: 403");
    expect(awardRoute).toContain("result.error_message");
    expect(awardRoute).toContain("ERROR_STATUS_BY_CODE[errorCode]");
    expect(awardRoute).not.toContain("error_code: result.error_code");
    expect(awardRoute).not.toContain("rfq_id: result");
    expect(awardRoute).not.toContain("company_id: result");
  });
});

describe("quote-decision cannot mutate awarded state", () => {
  it("rejects awarded RFQ and awarded quote mutations", () => {
    expect(quoteDecisionRoute).toContain("awarded_quote_id, awarded_at");
    expect(quoteDecisionRoute).toContain(
      'String(rfq.status || "").trim().toLowerCase() === "awarded"',
    );
    expect(quoteDecisionRoute).toContain(
      'String(quote.decision || "").trim().toLowerCase() === "awarded"',
    );
    expect(quoteDecisionRoute).toContain(
      "Quote decisions cannot be changed after the RFQ has been awarded.",
    );
    expect(quoteDecisionRoute).toContain(
      "Awarded quotes cannot be approved or rejected.",
    );
  });
});

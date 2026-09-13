import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath =
  "supabase/legacy-migrations/pre-baseline-v2/20260826000000_enforce_atomic_rfq_award_integrity.sql";
const deadlineLockedAwardMigrationPath =
  "supabase/migrations/20260913082925_enforce_deadline_locked_rfq_award.sql";
const awardRoutePath = "src/app/api/award-contract/route.ts";
const quoteDecisionRoutePath = "src/app/api/quote-decision/route.ts";

const sql = readFileSync(resolve(process.cwd(), migrationPath), "utf8").replace(
  /\r\n/g,
  "\n",
);
const deadlineLockedAwardSql = readFileSync(
  resolve(process.cwd(), deadlineLockedAwardMigrationPath),
  "utf8",
).replace(/\r\n/g, "\n");
const awardRoute = readFileSync(resolve(process.cwd(), awardRoutePath), "utf8");
const quoteDecisionRoute = readFileSync(
  resolve(process.cwd(), quoteDecisionRoutePath),
  "utf8",
);

const functionBody = sql.slice(
  sql.indexOf("create or replace function public.award_rfq_quote"),
  sql.indexOf("comment on function public.award_rfq_quote"),
);

function currentFunctionBody(name: string) {
  const marker = `create or replace function public.${name}`;
  const start = deadlineLockedAwardSql.toLowerCase().indexOf(marker);
  expect(start, `missing current function ${name}`).toBeGreaterThan(-1);
  const nextFunction = deadlineLockedAwardSql
    .toLowerCase()
    .indexOf("\ncreate or replace function public.", start + marker.length);
  return deadlineLockedAwardSql.slice(
    start,
    nextFunction === -1 ? deadlineLockedAwardSql.length : nextFunction,
  );
}

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

describe("deadline-locked RFQ award forward migration", () => {
  const awardFunction = currentFunctionBody("award_rfq_quote");
  const authorizationFunction = currentFunctionBody(
    "enforce_rfq_award_authorization",
  );
  const consistencyFunction = currentFunctionBody(
    "enforce_rfq_award_terminal_consistency",
  );
  const normalizedAward = awardFunction.replace(/\s+/g, " ").toLowerCase();
  const normalizedAuthorization = authorizationFunction
    .replace(/\s+/g, " ")
    .toLowerCase();
  const normalizedConsistency = consistencyFunction
    .replace(/\s+/g, " ")
    .toLowerCase();

  it("replaces all three existing functions without adding grants or helpers", () => {
    expect(awardFunction).toContain("security definer");
    expect(awardFunction).toContain("set search_path = ''");
    expect(authorizationFunction).toContain("security definer");
    expect(authorizationFunction).toContain("set search_path = ''");
    expect(consistencyFunction).toContain("security definer");
    expect(consistencyFunction).toContain("set search_path = ''");
    expect(deadlineLockedAwardSql.toLowerCase()).not.toContain("grant ");
    expect(deadlineLockedAwardSql.toLowerCase()).not.toContain("revoke ");
    expect(deadlineLockedAwardSql.toLowerCase()).not.toContain(
      "create trigger",
    );
  });

  it("uses only a valid parsed deadline strictly before now for award opening", () => {
    expect(normalizedAward).toContain(
      "public.parse_rfq_deadline_timestamptz(r.deadline) is not null",
    );
    expect(normalizedAward).toContain(
      "public.parse_rfq_deadline_timestamptz(r.deadline) < now()",
    );
    expect(normalizedAward).toContain(
      "not ( parsed_deadline is not null and parsed_deadline < now() )",
    );
    expect(normalizedAward).not.toContain("sourcing_method");
    expect(normalizedAward).not.toContain("contract_framework");
    expect(normalizedAward).not.toContain("<= now()");
    expect(normalizedAward).not.toContain("deadline = now()");
  });

  it("preserves owner/admin workspace authorization and denies buyer-only award", () => {
    expect(normalizedAward).toContain("actor_user_id uuid := auth.uid()");
    expect(normalizedAward).toContain("om.membership_status = 'active'");
    expect(normalizedAward).toContain("om.workspace_role in ('owner', 'admin')");
    expect(normalizedAward).toContain(
      "company_workspace_status is distinct from 'active'",
    );
    expect(normalizedAward).toContain("company_status is distinct from 'verified'");
    expect(normalizedAward).not.toContain("procurement_function");
    expect(normalizedAuthorization).toContain(
      "om.workspace_role in ('owner', 'admin')",
    );
    expect(normalizedAuthorization).not.toContain("procurement_function");
  });

  it("bounds unavailable quote identifiers and enforces selected-company addendum acknowledgement", () => {
    const boundedLookup = normalizedAward.slice(
      normalizedAward.indexOf("select r.id into candidate_rfq_id"),
      normalizedAward.indexOf("select r.* into rfq_row"),
    );
    expect(boundedLookup).toContain("r.company_id = actor_company_id");
    expect(boundedLookup).toContain("q.decision is distinct from 'rejected'");
    expect(boundedLookup).toContain("q.company_id is distinct from r.company_id");
    expect(boundedLookup).toContain("a.requires_acknowledgement = true");
    expect(boundedLookup).toContain("ack.addendum_id = a.id");
    expect(boundedLookup).toContain("ack.company_id = q.company_id");
    expect(normalizedAward.match(/'error_code', 'award_not_permitted'/g)?.length).toBeGreaterThanOrEqual(3);
    expect(normalizedAward).not.toContain("'error_code', 'quote_not_found'");
    expect(normalizedAward).not.toContain("'error_code', 'not_rfq_company'");
    expect(normalizedAward).not.toContain("'error_code', 'quote_ineligible'");
    expect(normalizedAward).not.toContain("'error_code', 'self_award_not_allowed'");
  });

  it("revalidates deadline, quote eligibility, and acknowledgements after row locking", () => {
    const lockAt = normalizedAward.indexOf("for update");
    const revalidationAt = normalizedAward.indexOf(
      "parsed_deadline := public.parse_rfq_deadline_timestamptz(rfq_row.deadline)",
    );
    const rfqUpdateAt = normalizedAward.indexOf("update public.rfqs");
    expect(lockAt).toBeGreaterThan(-1);
    expect(revalidationAt).toBeGreaterThan(lockAt);
    expect(rfqUpdateAt).toBeGreaterThan(revalidationAt);
    expect(normalizedAward.slice(revalidationAt, rfqUpdateAt)).toContain(
      "ack.company_id = selected_quote.company_id",
    );
  });

  it("guards direct award mutation with issuer, deadline, quote, and addendum checks", () => {
    expect(normalizedAuthorization).toContain(
      "new.company_id is distinct from old.company_id",
    );
    expect(normalizedAuthorization).toContain(
      "new.deadline is distinct from old.deadline",
    );
    expect(normalizedAuthorization).toContain("auth.uid() is null");
    expect(normalizedAuthorization).toContain("c.workspace_status = 'active'");
    expect(normalizedAuthorization).toContain("c.status = 'verified'");
    expect(normalizedAuthorization).toContain(
      "parsed_deadline := public.parse_rfq_deadline_timestamptz(new.deadline)",
    );
    expect(normalizedAuthorization).toContain(
      "not ( parsed_deadline is not null and parsed_deadline < now() )",
    );
    expect(normalizedAuthorization).toContain("q.rfq_id = new.id");
    expect(normalizedAuthorization).toContain(
      "selected_quote_company_id is not distinct from new.company_id",
    );
    expect(normalizedAuthorization).toContain(
      "selected_quote_decision is not distinct from 'rejected'",
    );
    expect(normalizedAuthorization).toContain(
      "ack.company_id = selected_quote_company_id",
    );
  });

  it("requires a fully coherent RFQ and Quote terminal award state", () => {
    expect(normalizedConsistency).toContain("new.status = 'awarded'");
    expect(normalizedConsistency).toContain("new.awarded_quote_id is not null");
    expect(normalizedConsistency).toContain("new.awarded_at is not null");
    expect(normalizedConsistency).toContain(
      "new.status is distinct from 'awarded' or new.awarded_quote_id is null or new.awarded_at is null",
    );
    expect(normalizedConsistency).toContain(
      "select q.decision, q.rfq_id, q.awarded_at",
    );
    expect(normalizedConsistency).toContain(
      "awarded_quote_rfq_id is distinct from new.id",
    );
    expect(normalizedConsistency).toContain(
      "awarded_quote_decision is distinct from 'awarded'",
    );
    expect(normalizedConsistency).toContain(
      "awarded_quote_awarded_at is distinct from new.awarded_at",
    );
  });

  it("preserves atomic writes, competing rejection, and the activity writer", () => {
    const rfqUpdateAt = normalizedAward.indexOf("update public.rfqs");
    const competingUpdateAt = normalizedAward.indexOf(
      "update public.quotes set decision = 'rejected'",
    );
    const selectedUpdateAt = normalizedAward.indexOf(
      "update public.quotes set decision = 'awarded', awarded_at = v_awarded_at",
    );
    const activityAt = normalizedAward.indexOf(
      "perform public.record_rfq_award_workspace_activity",
    );
    expect(rfqUpdateAt).toBeGreaterThan(-1);
    expect(competingUpdateAt).toBeGreaterThan(rfqUpdateAt);
    expect(selectedUpdateAt).toBeGreaterThan(competingUpdateAt);
    expect(activityAt).toBeGreaterThan(selectedUpdateAt);
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

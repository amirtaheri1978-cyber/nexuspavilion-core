import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath =
  "supabase/migrations/20260829000000_restrict_issuer_quote_select_until_commercial_unlock.sql";
const baselineMigrationPath =
  "supabase/migrations/20260822000000_dev_public_baseline.sql";
const auditMigrationPath =
  "supabase/migrations/20260828000000_enable_company_scoped_audit_and_notification_access.sql";
const sourcingFixPath =
  "supabase/legacy-migrations/pre-baseline/20260819_restrict_rfq_sourcing_access_rls.sql";
const detailPath = "src/app/rfq/[slug]/page.tsx";
const comparePath = "src/app/rfq/[slug]/compare/page.tsx";
const quoteRoutePath = "src/app/api/quotes/route.ts";
const quoteDecisionPath = "src/app/api/quote-decision/route.ts";
const awardRoutePath = "src/app/api/award-contract/route.ts";
const submitQuoteFormPath = "src/components/submit-quote-form.tsx";
const quoteWorkspacePath =
  "src/components/rfq-workspace/rfq-quote-workspace.tsx";
const metadataPath = "src/lib/procurement/rfq-metadata.ts";

const sql = readFileSync(resolve(process.cwd(), migrationPath), "utf8").replace(
  /\r\n/g,
  "\n",
);
const normalized = sql.replace(/\s+/g, " ").trim().toLowerCase();
const sqlWithoutComments = sql
  .replace(/--[^\n]*/g, " ")
  .replace(/\s+/g, " ")
  .trim()
  .toLowerCase();
const baseline = readFileSync(
  resolve(process.cwd(), baselineMigrationPath),
  "utf8",
).replace(/\r\n/g, "\n");
const auditMigration = readFileSync(
  resolve(process.cwd(), auditMigrationPath),
  "utf8",
).replace(/\r\n/g, "\n");
const sourcingFix = readFileSync(
  resolve(process.cwd(), sourcingFixPath),
  "utf8",
).replace(/\r\n/g, "\n");
const detail = readFileSync(resolve(process.cwd(), detailPath), "utf8").replace(
  /\r\n/g,
  "\n",
);
const compare = readFileSync(
  resolve(process.cwd(), comparePath),
  "utf8",
).replace(/\r\n/g, "\n");
const quoteRoute = readFileSync(
  resolve(process.cwd(), quoteRoutePath),
  "utf8",
).replace(/\r\n/g, "\n");
const quoteDecision = readFileSync(
  resolve(process.cwd(), quoteDecisionPath),
  "utf8",
).replace(/\r\n/g, "\n");
const awardRoute = readFileSync(
  resolve(process.cwd(), awardRoutePath),
  "utf8",
).replace(/\r\n/g, "\n");
const submitQuoteForm = readFileSync(
  resolve(process.cwd(), submitQuoteFormPath),
  "utf8",
).replace(/\r\n/g, "\n");
const quoteWorkspace = readFileSync(
  resolve(process.cwd(), quoteWorkspacePath),
  "utf8",
).replace(/\r\n/g, "\n");
const metadata = readFileSync(
  resolve(process.cwd(), metadataPath),
  "utf8",
).replace(/\r\n/g, "\n");

function policyBlock(source: string, policyName: string) {
  const lowerSql = source.toLowerCase();
  const marker = `create policy "${policyName.toLowerCase()}"`;
  const start = lowerSql.indexOf(marker);
  expect(start, `missing policy ${policyName}`).toBeGreaterThan(-1);
  const rest = source.slice(start);
  const lowerRest = rest.toLowerCase();
  const candidates = [
    lowerRest.indexOf("\ndrop policy", marker.length),
    lowerRest.indexOf("\ncreate policy", marker.length),
    lowerRest.indexOf("\ncreate or replace function", marker.length),
    lowerRest.indexOf("\ncomment on function", marker.length),
    lowerRest.indexOf("\ncommit;", marker.length),
    rest.length,
  ].filter((value) => value > 0);
  return rest.slice(0, Math.min(...candidates));
}

function countRpcSql() {
  const start = sql
    .toLowerCase()
    .indexOf(
      "create or replace function public.count_rfq_quote_submissions(p_rfq_id uuid)",
    );
  expect(start).toBeGreaterThan(-1);
  const commentAt = sql
    .toLowerCase()
    .indexOf("comment on function public.count_rfq_quote_submissions", start);
  expect(commentAt).toBeGreaterThan(start);
  return sql.slice(start, commentAt);
}

function parseDeadlineSql() {
  const start = sql
    .toLowerCase()
    .indexOf(
      "create or replace function public.parse_rfq_deadline_timestamptz(p_deadline text)",
    );
  expect(start).toBeGreaterThan(-1);
  const commentAt = sql
    .toLowerCase()
    .indexOf(
      "comment on function public.parse_rfq_deadline_timestamptz",
      start,
    );
  expect(commentAt).toBeGreaterThan(start);
  return sql.slice(start, commentAt);
}

describe("issuer quote SELECT commercial unlock migration", () => {
  it("does not rewrite historical baseline quote SELECT policy", () => {
    expect(baseline).toContain(
      'CREATE POLICY "Company members can read permitted quotes" ON "public"."quotes" FOR SELECT',
    );
    expect(sql).not.toContain(
      "20260822000000_dev_public_baseline",
    );
    expect(normalized).toContain(
      'drop policy if exists "company members can read permitted quotes" on public.quotes',
    );
  });

  it("keeps supplier own-company quote SELECT without a deadline predicate", () => {
    const policy = policyBlock(
      sql,
      "Company members can read own company quotes",
    );
    const normalizedPolicy = policy.replace(/\s+/g, " ").toLowerCase();

    expect(normalizedPolicy).toContain("for select");
    expect(normalizedPolicy).toContain("to authenticated");
    expect(normalizedPolicy).toContain("om.company_id = quotes.company_id");
    expect(normalizedPolicy).toContain("om.user_id = auth.uid()");
    expect(normalizedPolicy).toContain("om.membership_status = 'active'");
    expect(normalizedPolicy).not.toContain("deadline");
    expect(normalizedPolicy).not.toContain("sourcing_method");
    expect(normalizedPolicy).not.toContain("contract_framework");
    expect(normalizedPolicy).not.toContain("from public.rfqs");
  });

  it("does not let issuer membership alone permit quote SELECT", () => {
    const issuer = policyBlock(
      sql,
      "Issuing buyers can read quotes after commercial unlock",
    );
    const normalizedIssuer = issuer.replace(/\s+/g, " ").toLowerCase();

    expect(normalizedIssuer).toContain("for select");
    expect(normalizedIssuer).toContain("to authenticated");
    expect(normalizedIssuer).toContain("om.company_id = r.company_id");
    expect(normalizedIssuer).toContain(
      "om.workspace_role in ('owner', 'admin')",
    );
    expect(normalizedIssuer).toContain("om.procurement_function = 'buyer'");
    expect(normalizedIssuer).toContain("r.id = quotes.rfq_id");
    expect(normalizedIssuer).toContain(
      "coalesce(r.sourcing_method, 'invited') = 'open'",
    );
    expect(normalizedIssuer).toContain(
      "coalesce(r.contract_framework, 'project_specific') <> 'framework'",
    );
    expect(normalizedIssuer).toContain(deadlineUnlock);
    expect(normalizedIssuer).not.toContain("r.deadline < now()");
    expect(normalizedIssuer).not.toContain("deadline <= now()");
    expect(normalizedIssuer).not.toContain("deadline is null");
  });

  it("keeps invited, sealed, framework, future, and null deadlines locked", () => {
    const issuer = policyBlock(
      sql,
      "Issuing buyers can read quotes after commercial unlock",
    );
    const normalizedIssuer = issuer.replace(/\s+/g, " ").toLowerCase();

    expect(metadata).toContain('sourcingMethod === "invited"');
    expect(metadata).toContain('sourcingMethod === "sealed_bid"');
    expect(metadata).toContain('contractFramework === "framework"');
    expect(metadata).toContain('return "invited"');
    expect(metadata).toContain('return "project_specific"');
    expect(normalizedIssuer).toContain(
      "coalesce(r.sourcing_method, 'invited') = 'open'",
    );
    expect(normalizedIssuer).toContain(deadlineUnlock);
    expect(normalizedIssuer).not.toContain("r.deadline < now()");
    expect(normalizedIssuer).not.toContain("status = 'closed'");
    expect(normalizedIssuer).not.toContain("status = 'awarded'");
  });

  it("permits issuer SELECT after a legitimate deadline unlock", () => {
    const issuer = policyBlock(
      sql,
      "Issuing buyers can read quotes after commercial unlock",
    );
    const normalizedIssuer = issuer.replace(/\s+/g, " ").toLowerCase();

    expect(normalizedIssuer).toContain(`or ( ${deadlineUnlock} )`);
  });

  it("preserves open non-framework issuer quote access without waiting for a deadline", () => {
    const issuer = policyBlock(
      sql,
      "Issuing buyers can read quotes after commercial unlock",
    );
    const normalizedIssuer = issuer.replace(/\s+/g, " ").toLowerCase();

    expect(normalizedIssuer).toContain(
      "coalesce(r.sourcing_method, 'invited') = 'open' and coalesce(r.contract_framework, 'project_specific') <> 'framework'",
    );
  });

  it("creates an integer-only count RPC with issuer-company authorization", () => {
    const helper = countRpcSql().replace(/\s+/g, " ").toLowerCase();

    expect(helper).toContain("returns integer");
    expect(helper).toContain("security definer");
    expect(helper).toContain("set search_path = ''");
    expect(helper).toContain("stable");
    expect(helper).not.toContain("returns table");
    expect(helper).not.toContain("returns jsonb");
    expect(helper).not.toContain("returns setof");
    expect(helper).toContain("om.company_id = r.company_id");
    expect(helper).toContain("r.id = p_rfq_id");
    expect(helper).toContain("om.user_id = actor_user_id");
    expect(helper).toContain("om.workspace_role in ('owner', 'admin')");
    expect(helper).toContain("om.procurement_function = 'buyer'");
    expect(helper).toContain("return 0");
    expect(helper).toContain("select count(*)::integer");
    expect(helper).toContain("from public.quotes q");
    expect(helper).toContain("q.rfq_id = p_rfq_id");
    expect(helper).not.toMatch(/\bq\.id\b/);
    expect(helper).not.toContain("q.company_id");
    expect(helper).not.toContain("q.user_id");
    expect(helper).not.toContain("quotes.company_id");
    expect(helper).not.toContain("amount");
    expect(helper).not.toContain("timeline");
    expect(helper).not.toContain("message");
    expect(helper).not.toContain("score");
    expect(normalized).toContain(
      "revoke all on function public.count_rfq_quote_submissions(uuid) from public",
    );
    expect(normalized).toContain(
      "revoke all on function public.count_rfq_quote_submissions(uuid) from anon",
    );
    expect(normalized).toContain(
      "grant execute on function public.count_rfq_quote_submissions(uuid) to authenticated",
    );
    expect(normalized).not.toContain(
      "grant execute on function public.count_rfq_quote_submissions(uuid) to anon",
    );
    expect(normalized).not.toContain(
      "grant execute on function public.count_rfq_quote_submissions(uuid) to service_role",
    );
    expect(normalized).not.toContain(
      "grant execute on function public.count_rfq_quote_submissions(uuid) to authenticated, service_role",
    );
  });

  it("does not change quote INSERT policy", () => {
    expect(normalized).not.toContain(
      'drop policy if exists "supplier members can submit company quotes"',
    );
    expect(normalized).not.toContain("for insert");
    expect(baseline).toContain(
      'CREATE POLICY "Supplier members can submit company quotes"',
    );
  });

  it("keeps RFQ detail on a count-only issuer path while locked", () => {
    expect(detail).toContain(
      "const loadIssuerQuoteRows = isOwner && commercialEvaluationUnlocked;",
    );
    expect(detail).toContain(
      "const loadIssuerQuoteCount = isOwner && !commercialEvaluationUnlocked;",
    );
    expect(detail).toContain(
      'supabase.rpc("count_rfq_quote_submissions", { p_rfq_id: rfq.id })',
    );
    expect(detail).toContain(
      '.eq("company_id", profile.company_id)',
    );
    expect(detail).toContain("shouldEnforceBlindBidding");
    expect(detail).toContain("submissionCount={quoteCount}");
    expect(detail.indexOf("loadIssuerQuoteRows")).toBeLessThan(
      detail.indexOf('.from("quotes")'),
    );
    expect(detail).toContain("from(\"company_directory\")");
    expect(detail).toContain("supplierCompanyIds.length > 0");
    expect(detail).toContain("getRfqSupplierCompanyIds(scoredQuotes)");
  });

  it("keeps compare on a count-only issuer path while locked and uses canonical unlock helpers", () => {
    expect(compare).toContain(
      'from "@/lib/procurement/rfq-metadata"',
    );
    expect(compare).toContain("shouldEnforceBlindBidding");
    expect(compare).toContain("getBlindBiddingMessage");
    expect(compare).not.toContain("function shouldEnforceBlindBidding");
    expect(compare).not.toContain("function getBlindBiddingMessage");
    expect(compare).toContain("if (commercialEvaluationUnlocked)");
    expect(compare).toContain('.from("quotes")');
    expect(compare).toContain('.select("*")');
    expect(compare).toContain(
      'rpc(\n"count_rfq_quote_submissions"',
    );
    expect(compare).toContain("value={`${quoteCount} received`}");
    expect(compare).toContain(
      "{quoteCount} quote{quoteCount === 1 ? \"\" : \"s\"} received.",
    );
    expect(compare).toContain("from(\"company_directory\")");
    expect(compare).toContain("supplierCompanyIds.length > 0");
    expect(compare.indexOf("if (commercialEvaluationUnlocked)")).toBeLessThan(
      compare.indexOf('.from("quotes")'),
    );
    expect(compare.indexOf('.from("quotes")')).toBeLessThan(
      compare.indexOf("count_rfq_quote_submissions"),
    );
  });

  it("does not resolve supplier identity on the locked issuer path", () => {
    expect(quoteWorkspace).toContain("submissionCount ?? quoteList.length");
    expect(quoteWorkspace).toContain("commercialEvaluationUnlocked");
    expect(detail).toContain("buildCommercialIntelligence({");
    expect(detail).toContain("quoteList,");
    expect(compare).toContain(
      "const scoredQuotesUnranked = commercialEvaluationUnlocked",
    );
    expect(compare.indexOf("supplierCompanyIds")).toBeGreaterThan(
      compare.indexOf("quoteList = (quotes ?? []) as Quote[]"),
    );
  });

  it("retains full quote evaluation after unlock", () => {
    expect(detail).toContain("loadIssuerQuoteRows");
    expect(detail).toContain('.order("amount", { ascending: true })');
    expect(detail).toContain("buildCommercialIntelligence({");
    expect(compare).toContain('.order("amount", { ascending: true })');
    expect(compare).toContain(
      "priceScore * 0.6 + validityScore * 0.2 + budgetDisciplineScore * 0.2",
    );
    expect(compare).toContain("<RfqQuoteComparison");
  });

  it("leaves POST /api/quotes and quote_submitted activity intact", () => {
    expect(quoteRoute).toContain("recordTrustedProcurementActivity");
    expect(quoteRoute).toContain('"quote_submitted"');
    expect(quoteRoute).toContain('.from("quotes")');
    expect(quoteRoute).toContain(".insert({");
    expect(quoteRoute).toContain(".select()");
    expect(quoteRoute).toContain(".single()");
    expect(quoteRoute).not.toContain("count_rfq_quote_submissions");
    expect(quoteRoute).not.toContain("loadIssuerQuoteRows");
    expect(auditMigration).toContain("'QUOTE_SUBMITTED'");
    expect(auditMigration).toContain("'Quote Submitted'");
    expect(auditMigration).toContain("quote_row.company_id");
    expect(auditMigration).toContain("buyer_company_id");
    expect(auditMigration).toContain(
      "'A new quote was submitted for '",
    );
  });

  it("leaves existing sourcing and invite authorization intact", () => {
    expect(sourcingFix).toContain(
      "current_user_has_supplier_rfq_access",
    );
    expect(sourcingFix).toContain(
      "create policy \"Supplier members can submit company quotes\"",
    );
    expect(normalized).not.toContain("current_user_has_supplier_rfq_access");
    expect(normalized).not.toContain("rfq_invites");
    expect(baseline).toContain(
      "current_user_has_supplier_rfq_access",
    );
  });
});

const unlockPredicate =
  "coalesce(r.sourcing_method, 'invited') = 'open' and coalesce(r.contract_framework, 'project_specific') <> 'framework'";
const deadlineUnlock =
  "public.parse_rfq_deadline_timestamptz(r.deadline) is not null and public.parse_rfq_deadline_timestamptz(r.deadline) < now()";
const awardDeadlineUnlock =
  "parsed_deadline is not null and parsed_deadline < now()";

function splitUpdateExpressions(policy: string) {
  const normalizedPolicy = policy.replace(/\s+/g, " ").toLowerCase();
  const usingIndex = normalizedPolicy.indexOf(" using (");
  const withCheckIndex = normalizedPolicy.indexOf(" with check (");

  expect(usingIndex).toBeGreaterThan(-1);
  expect(withCheckIndex).toBeGreaterThan(usingIndex);

  return {
    using: normalizedPolicy.slice(usingIndex, withCheckIndex),
    withCheck: normalizedPolicy.slice(withCheckIndex),
  };
}

function awardRpcSql() {
  const start = sql
    .toLowerCase()
    .indexOf(
      "create or replace function public.award_rfq_quote(p_quote_id uuid)",
    );
  expect(start).toBeGreaterThan(-1);
  const commentAt = sql
    .toLowerCase()
    .indexOf("comment on function public.award_rfq_quote", start);
  expect(commentAt).toBeGreaterThan(start);
  return sql.slice(start, commentAt);
}

describe("issuer quote UPDATE commercial unlock", () => {
  const policy = policyBlock(
    sql,
    "Workspace administrators can update RFQ quote decisions",
  );
  const normalizedPolicy = policy.replace(/\s+/g, " ").toLowerCase();
  const { using, withCheck } = splitUpdateExpressions(policy);

  it("does not let issuer owner/admin membership alone permit quote UPDATE", () => {
    expect(normalizedPolicy).toContain("for update");
    expect(normalizedPolicy).toContain("to authenticated");
    expect(normalizedPolicy).toContain("om.workspace_role in ('owner', 'admin')");
    expect(normalizedPolicy).toContain(unlockPredicate);
    expect(normalizedPolicy).toContain(deadlineUnlock);
    expect(sql).toContain(
      'drop policy if exists "Workspace administrators can update RFQ quote decisions"',
    );
  });

  it("applies the commercial-unlock predicate to UPDATE USING and WITH CHECK", () => {
    expect(using).toContain(unlockPredicate);
    expect(using).toContain(deadlineUnlock);
    expect(withCheck).toContain(unlockPredicate);
    expect(withCheck).toContain(deadlineUnlock);
  });

  it("keeps invited, sealed, framework, future, and null deadlines locked for UPDATE", () => {
    expect(normalizedPolicy).toContain(
      "coalesce(r.sourcing_method, 'invited') = 'open'",
    );
    expect(normalizedPolicy).toContain(deadlineUnlock);
    expect(normalizedPolicy).not.toContain("r.deadline < now()");
    expect(normalizedPolicy).not.toContain("deadline <= now()");
    expect(normalizedPolicy).not.toContain("deadline is null");
  });

  it("permits issuer UPDATE after a legitimate deadline unlock", () => {
    expect(using).toContain(`or ( ${deadlineUnlock} )`);
    expect(withCheck).toContain(`or ( ${deadlineUnlock} )`);
  });

  it("does not grant UPDATE to buyer-only procurement membership", () => {
    expect(normalizedPolicy).not.toContain("procurement_function = 'buyer'");
    expect(normalizedPolicy).not.toContain("om.procurement_function");
  });

  it("preserves open non-framework issuer quote UPDATE without waiting for a deadline", () => {
    expect(normalizedPolicy).toContain(unlockPredicate);
  });
});

describe("award_rfq_quote commercial unlock", () => {
  const helper = awardRpcSql();
  const normalizedHelper = helper.replace(/\s+/g, " ").toLowerCase();
  const historicalAward = readFileSync(
    resolve(
      process.cwd(),
      "supabase/migrations/20260826000000_enforce_atomic_rfq_award_integrity.sql",
    ),
    "utf8",
  ).replace(/\r\n/g, "\n");

  it("redefines award_rfq_quote in the forward migration without rewriting history", () => {
    expect(sql).toContain(
      "create or replace function public.award_rfq_quote(p_quote_id uuid)",
    );
    expect(historicalAward).toContain(
      "create or replace function public.award_rfq_quote(p_quote_id uuid)",
    );
    expect(historicalAward).not.toContain(
      "Commercial evaluation remains locked until the RFQ deadline.",
    );
    expect(historicalAward).not.toContain(
      "coalesce(rfq_row.sourcing_method, 'invited')",
    );
  });

  it("retains SECURITY DEFINER, empty search_path, and existing authorization", () => {
    expect(normalizedHelper).toContain("security definer");
    expect(normalizedHelper).toContain("set search_path = ''");
    expect(normalizedHelper).toContain("actor_user_id uuid := auth.uid()");
    expect(normalizedHelper).toContain("om.workspace_role in ('owner', 'admin')");
    expect(normalizedHelper).toContain(
      "company_workspace_status is distinct from 'active'",
    );
    expect(normalizedHelper).toContain(
      "company_status is distinct from 'verified'",
    );
    expect(normalizedHelper).toContain("'error_code', 'self_award_not_allowed'");
    expect(normalizedHelper).toContain("'error_code', 'rfq_already_awarded'");
    expect(normalizedHelper).toContain("'error_code', 'quote_already_awarded'");
    expect(normalizedHelper).not.toContain("p_company_id");
  });

  it("checks commercial unlock with the same predicate before any UPDATE", () => {
    const unlockAt = normalizedHelper.indexOf(
      "coalesce(rfq_row.sourcing_method, 'invited') = 'open'",
    );
    const rfqUpdateAt = normalizedHelper.indexOf("update public.rfqs");
    const quoteUpdateAt = normalizedHelper.indexOf("update public.quotes");

    expect(unlockAt).toBeGreaterThan(-1);
    expect(rfqUpdateAt).toBeGreaterThan(unlockAt);
    expect(quoteUpdateAt).toBeGreaterThan(rfqUpdateAt);
    expect(normalizedHelper).toContain(
      "coalesce(rfq_row.contract_framework, 'project_specific') <> 'framework'",
    );
    expect(normalizedHelper).toContain(
      "public.parse_rfq_deadline_timestamptz(rfq_row.deadline)",
    );
    expect(normalizedHelper).toContain(awardDeadlineUnlock);
    expect(normalizedHelper).not.toContain("rfq_row.deadline < now()");
    expect(normalizedHelper).toContain("'error_code', 'award_not_permitted'");
    expect(helper).toContain(
      "Commercial evaluation remains locked until the RFQ deadline.",
    );
  });

  it("keeps open non-framework awardability and post-deadline award path", () => {
    expect(normalizedHelper).toContain(
      "coalesce(rfq_row.sourcing_method, 'invited') = 'open' and coalesce(rfq_row.contract_framework, 'project_specific') <> 'framework'",
    );
    expect(normalizedHelper).toContain(
      `or ( ${awardDeadlineUnlock} )`,
    );
    expect(normalizedHelper).toContain("decision = 'awarded'");
    expect(normalizedHelper).toContain("awarded_at = v_awarded_at");
  });

  it("does not introduce a service-role browser workaround", () => {
    expect(normalized).toContain(
      "grant execute on function public.award_rfq_quote(uuid) to authenticated, service_role",
    );
    expect(normalized).toContain(
      "revoke all on function public.award_rfq_quote(uuid) from public",
    );
    expect(normalized).toContain(
      "revoke all on function public.award_rfq_quote(uuid) from anon",
    );
    expect(quoteRoute).not.toContain("service_role");
    expect(detail).not.toContain("award_rfq_quote");
    expect(compare).not.toContain("award_rfq_quote");
  });
});

const forbiddenAuthenticatedQuoteUpdateColumns = [
  "amount",
  "timeline",
  "message",
  "company_id",
  "user_id",
  "rfq_id",
  "validity_days",
  "status",
  "score",
  "awarded_at",
  "id",
  "created_at",
] as const;

function quoteDecisionUpdatePayload() {
  const updateAt = quoteDecision.indexOf(".update({");
  expect(updateAt).toBeGreaterThan(-1);
  const start = quoteDecision.indexOf("{", updateAt);
  const end = quoteDecision.indexOf("}", start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return quoteDecision.slice(start, end + 1);
}

function quotesInsertPayload(source: string) {
  const insertAt = source.indexOf(".insert({");
  expect(insertAt).toBeGreaterThan(-1);
  const start = source.indexOf("{", insertAt);
  const end = source.indexOf("}", start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end + 1);
}

describe("authenticated quote column UPDATE grants", () => {
  it("revokes broad authenticated UPDATE on public.quotes", () => {
    expect(sqlWithoutComments).toContain(
      "revoke update on table public.quotes from authenticated",
    );
    expect(sqlWithoutComments).not.toContain(
      "grant update on table public.quotes to authenticated",
    );
    expect(sqlWithoutComments).not.toContain(
      "grant all on table public.quotes to authenticated",
    );
    expect(sqlWithoutComments).not.toContain(
      "revoke update on table public.quotes from service_role",
    );
  });

  it("grants authenticated UPDATE(decision) only", () => {
    const columnGrants = [
      ...sqlWithoutComments.matchAll(
        /grant update \(([^)]+)\) on table public\.quotes to authenticated/g,
      ),
    ];

    expect(columnGrants).toHaveLength(1);
    expect(columnGrants[0]?.[1]?.replace(/\s+/g, "")).toBe("decision");
    expect(sqlWithoutComments).toContain(
      "grant update (decision) on table public.quotes to authenticated",
    );
  });

  it.each(forbiddenAuthenticatedQuoteUpdateColumns)(
    "does not grant authenticated UPDATE(%s)",
    (column) => {
      expect(sqlWithoutComments).not.toContain(`grant update (${column})`);
      expect(sqlWithoutComments).not.toContain(
        `grant update (decision, ${column}`,
      );
      expect(sqlWithoutComments).not.toContain(`grant update (${column},`);
    },
  );

  it("preserves authenticated SELECT and INSERT table grants", () => {
    expect(baseline.replace(/\s+/g, " ")).toContain(
      'GRANT SELECT,INSERT,UPDATE ON TABLE "public"."quotes" TO "authenticated"',
    );
    expect(sqlWithoutComments).not.toContain(
      "revoke select on table public.quotes",
    );
    expect(sqlWithoutComments).not.toContain(
      "revoke insert on table public.quotes",
    );
    expect(sqlWithoutComments).not.toContain(
      "revoke all on table public.quotes",
    );
  });

  it("leaves quote-decision updating decision only", () => {
    const payload = quoteDecisionUpdatePayload().replace(/\s+/g, " ").trim();

    expect(quoteDecision).toContain('.from("quotes")');
    expect(payload).toBe("{ decision, }");
    expect(quoteDecision).toContain(".update({\n        decision,\n      })");

    for (const column of forbiddenAuthenticatedQuoteUpdateColumns) {
      expect(payload).not.toContain(column);
    }
  });

  it("keeps award_rfq_quote as the only legitimate path writing awarded_at", () => {
    const helper = awardRpcSql();
    const quoteRouteInsert = quotesInsertPayload(quoteRoute);
    const submitInsert = quotesInsertPayload(submitQuoteForm);

    expect(helper).toContain("awarded_at = v_awarded_at");
    expect(helper.toLowerCase()).toContain("security definer");
    expect(awardRoute).toContain(".rpc(");
    expect(awardRoute).toContain('"award_rfq_quote"');
    expect(awardRoute).not.toContain('.from("quotes")');
    expect(quoteDecisionUpdatePayload()).not.toContain("awarded_at");
    expect(quoteRoute).not.toContain(".update(");
    expect(quoteRouteInsert).not.toContain("awarded_at");
    expect(submitQuoteForm).not.toContain(".update(");
    expect(submitInsert).not.toContain("awarded_at");
  });

  it("leaves the supplier INSERT path unchanged", () => {
    expect(sqlWithoutComments).not.toContain(
      'drop policy if exists "supplier members can submit company quotes"',
    );
    expect(sqlWithoutComments).not.toContain("for insert");
    expect(baseline).toContain(
      'CREATE POLICY "Supplier members can submit company quotes"',
    );
    expect(quoteRoute).toContain('.from("quotes")');
    expect(quoteRoute).toContain(".insert({");
    expect(quotesInsertPayload(quoteRoute)).toContain("rfq_id:");
    expect(quotesInsertPayload(quoteRoute)).toContain("company_id:");
    expect(quotesInsertPayload(quoteRoute)).toContain("amount,");
    expect(submitQuoteForm).toContain('supabase.from("quotes").insert({');
    expect(normalized).not.toContain(
      'create policy "supplier members can submit company quotes"',
    );
  });
});

describe("text deadline fail-closed commercial unlock parsing", () => {
  const helper = parseDeadlineSql();
  const normalizedHelper = helper.replace(/\s+/g, " ").toLowerCase();
  const issuerSelect = policyBlock(
    sql,
    "Issuing buyers can read quotes after commercial unlock",
  ).replace(/\s+/g, " ").toLowerCase();
  const updatePolicy = policyBlock(
    sql,
    "Workspace administrators can update RFQ quote decisions",
  );
  const { using, withCheck } = splitUpdateExpressions(updatePolicy);
  const awardHelper = awardRpcSql().replace(/\s+/g, " ").toLowerCase();
  const countHelper = countRpcSql().replace(/\s+/g, " ").toLowerCase();

  it("treats rfqs.deadline as text and does not convert the column", () => {
    expect(baseline).toContain('"deadline" "text" NOT NULL');
    expect(helper).toContain("p_deadline text");
    expect(sqlWithoutComments).not.toContain("alter table public.rfqs");
    expect(sqlWithoutComments).not.toContain("alter column deadline");
    expect(sqlWithoutComments).not.toContain("deadline type timestamptz");
  });

  it("creates a fail-closed text-to-timestamptz helper", () => {
    expect(normalizedHelper).toContain("returns timestamptz");
    expect(normalizedHelper).toContain("stable");
    expect(normalizedHelper).toContain("set search_path = ''");
    expect(normalizedHelper).not.toContain("security definer");
    expect(normalizedHelper).toContain("nullif(trim(p_deadline), '')");
    expect(normalizedHelper).toContain("normalized::timestamptz");
    expect(normalizedHelper).toContain("invalid_datetime_format");
    expect(normalizedHelper).toContain("datetime_field_overflow");
    expect(normalizedHelper).toContain("return null");
    expect(normalizedHelper).not.toContain("from public.");
    expect(normalizedHelper).not.toContain("insert ");
    expect(normalizedHelper).not.toContain("update ");
    expect(normalized).toContain(
      "grant execute on function public.parse_rfq_deadline_timestamptz(text) to authenticated",
    );
    expect(normalized).toContain(
      "revoke all on function public.parse_rfq_deadline_timestamptz(text) from public",
    );
    expect(normalized).toContain(
      "revoke all on function public.parse_rfq_deadline_timestamptz(text) from anon",
    );
  });

  it("omits raw deadline < now() comparisons", () => {
    expect(sqlWithoutComments).not.toContain("r.deadline < now()");
    expect(sqlWithoutComments).not.toContain("rfq_row.deadline < now()");
    expect(sqlWithoutComments).not.toContain("r.deadline::timestamptz");
    expect(sqlWithoutComments).not.toContain("rfq_row.deadline::timestamptz");
    expect(sqlWithoutComments).not.toContain("deadline <= now()");
  });

  it("fails closed for malformed deadlines", () => {
    expect(normalizedHelper).toContain("when invalid_datetime_format");
    expect(normalizedHelper).toContain("or datetime_field_overflow");
    expect(normalizedHelper).toContain("then return null");
    expect(issuerSelect).toContain(
      "public.parse_rfq_deadline_timestamptz(r.deadline) is not null",
    );
    expect(awardHelper).toContain("parsed_deadline is not null");
  });

  it("fails closed for null deadlines", () => {
    expect(normalizedHelper).toContain("nullif(trim(p_deadline), '')");
    expect(normalizedHelper).toContain("if normalized is null then return null");
    expect(issuerSelect).not.toContain("r.deadline is null");
    expect(using).toContain(deadlineUnlock);
    expect(awardHelper).toContain(awardDeadlineUnlock);
  });

  it("fails closed for empty deadlines", () => {
    expect(normalizedHelper).toContain("nullif(trim(p_deadline), '')");
    expect(normalizedHelper).toContain("if normalized is null then return null");
  });

  it("keeps a valid future timestamp locked", () => {
    expect(issuerSelect).toContain(
      "public.parse_rfq_deadline_timestamptz(r.deadline) < now()",
    );
    expect(issuerSelect).not.toContain("<= now()");
    expect(using).toContain(
      "public.parse_rfq_deadline_timestamptz(r.deadline) < now()",
    );
    expect(withCheck).toContain(
      "public.parse_rfq_deadline_timestamptz(r.deadline) < now()",
    );
    expect(awardHelper).toContain("parsed_deadline < now()");
    expect(awardHelper).not.toContain("parsed_deadline <= now()");
  });

  it("unlocks only a valid past timestamp", () => {
    expect(issuerSelect).toContain(`or ( ${deadlineUnlock} )`);
    expect(using).toContain(`or ( ${deadlineUnlock} )`);
    expect(withCheck).toContain(`or ( ${deadlineUnlock} )`);
    expect(awardHelper).toContain(`or ( ${awardDeadlineUnlock} )`);
  });

  it("uses the helper consistently in SELECT, UPDATE USING, UPDATE WITH CHECK, and award_rfq_quote", () => {
    expect(issuerSelect).toContain(
      "public.parse_rfq_deadline_timestamptz(r.deadline)",
    );
    expect(using).toContain(
      "public.parse_rfq_deadline_timestamptz(r.deadline)",
    );
    expect(withCheck).toContain(
      "public.parse_rfq_deadline_timestamptz(r.deadline)",
    );
    expect(awardHelper).toContain(
      "parsed_deadline := public.parse_rfq_deadline_timestamptz(rfq_row.deadline)",
    );
    const parseAt = awardHelper.indexOf(
      "public.parse_rfq_deadline_timestamptz(rfq_row.deadline)",
    );
    expect(parseAt).toBeGreaterThan(-1);
    expect(awardHelper.indexOf("update public.rfqs")).toBeGreaterThan(parseAt);
  });

  it("preserves open non-framework RFQ immediate read/write/award", () => {
    expect(issuerSelect).toContain(unlockPredicate);
    expect(using).toContain(unlockPredicate);
    expect(withCheck).toContain(unlockPredicate);
    expect(awardHelper).toContain(
      "coalesce(rfq_row.sourcing_method, 'invited') = 'open' and coalesce(rfq_row.contract_framework, 'project_specific') <> 'framework'",
    );
  });

  it("keeps prior column-integrity grants intact", () => {
    expect(sqlWithoutComments).toContain(
      "revoke update on table public.quotes from authenticated",
    );
    expect(sqlWithoutComments).toContain(
      "grant update (decision) on table public.quotes to authenticated",
    );
    expect(sqlWithoutComments).not.toContain(
      "grant update on table public.quotes to authenticated",
    );
    for (const column of forbiddenAuthenticatedQuoteUpdateColumns) {
      expect(sqlWithoutComments).not.toContain(`grant update (${column})`);
    }
  });

  it("leaves count_rfq_quote_submissions unchanged", () => {
    expect(countHelper).toContain("returns integer");
    expect(countHelper).toContain("security definer");
    expect(countHelper).not.toContain("parse_rfq_deadline_timestamptz");
    expect(countHelper).not.toContain("deadline");
    expect(normalized).toContain(
      "grant execute on function public.count_rfq_quote_submissions(uuid) to authenticated",
    );
  });

  it("leaves the supplier INSERT path unchanged", () => {
    expect(sqlWithoutComments).not.toContain(
      'drop policy if exists "supplier members can submit company quotes"',
    );
    expect(sqlWithoutComments).not.toContain("for insert");
    expect(baseline).toContain(
      'CREATE POLICY "Supplier members can submit company quotes"',
    );
  });
});

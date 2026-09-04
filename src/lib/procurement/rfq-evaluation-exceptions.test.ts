import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

function normalizeWhitespace(source: string) {
  return source.replace(/\s+/g, " ").trim().toLowerCase();
}

const accessContract = readSource(
  "src/lib/procurement/rfq-access-contract.ts",
);
const detailPage = readSource("src/app/rfq/[slug]/page.tsx");
const comparePage = readSource("src/app/rfq/[slug]/compare/page.tsx");
const quoteWorkspace = readSource(
  "src/components/rfq-workspace/rfq-quote-workspace.tsx",
);
const quoteComparison = readSource(
  "src/components/rfq-workspace/rfq-quote-comparison.tsx",
);
const issuerUnlockMigration = readSource(
  "supabase/migrations/20260829000000_restrict_issuer_quote_select_until_commercial_unlock.sql",
);

const normalizedAccessContract = normalizeWhitespace(accessContract);
const normalizedDetailPage = normalizeWhitespace(detailPage);
const normalizedComparePage = normalizeWhitespace(comparePage);
const normalizedQuoteWorkspace = normalizeWhitespace(quoteWorkspace);
const normalizedQuoteComparison = normalizeWhitespace(quoteComparison);
const normalizedUnlockMigration = normalizeWhitespace(issuerUnlockMigration);

describe("Master Plan 8-09 evaluation exception lifecycle contract", () => {
  it("anchors commercial evaluation visibility to issuer participation plus lifecycle unlock", () => {
    expect(normalizedAccessContract).toContain(
      'const canmanagerfq = participantrole === "issuer";',
    );
    expect(normalizedAccessContract).toContain(
      "const canviewcommercialevaluation = canmanagerfq && commercialevaluationunlocked;",
    );
    expect(normalizedAccessContract).toContain("canviewcommercialevaluation,");
    expect(normalizedAccessContract).toContain(
      "canviewrecommendedawardpath: canviewcommercialevaluation && hasrecommendedquote",
    );
  });

  it("keeps the RFQ detail issuer path count-only until commercial evaluation unlock", () => {
    expect(normalizedDetailPage).toContain(
      "const loadissuerquoterows = isowner && commercialevaluationunlocked;",
    );
    expect(normalizedDetailPage).toContain(
      "const loadissuerquotecount = isowner && !commercialevaluationunlocked;",
    );
    expect(normalizedDetailPage).toContain(
      'supabase.rpc("count_rfq_quote_submissions", { p_rfq_id: rfq.id })',
    );

    const issuerRowGate = normalizedDetailPage.indexOf(
      "const loadissuerquoterows = isowner && commercialevaluationunlocked;",
    );
    const issuerQuoteSelect = normalizedDetailPage.indexOf(
      '.from("quotes")',
      issuerRowGate,
    );
    const issuerCountGate = normalizedDetailPage.indexOf(
      "const loadissuerquotecount = isowner && !commercialevaluationunlocked;",
    );
    const countRpc = normalizedDetailPage.indexOf(
      "count_rfq_quote_submissions",
      issuerCountGate,
    );

    expect(issuerRowGate).toBeGreaterThan(-1);
    expect(issuerQuoteSelect).toBeGreaterThan(issuerRowGate);
    expect(issuerCountGate).toBeGreaterThan(-1);
    expect(countRpc).toBeGreaterThan(issuerCountGate);
  });

  it("keeps respondent quote access limited to its own organization and excludes issuer evaluation computation", () => {
    expect(normalizedDetailPage).toContain(
      "!isowner && profile?.company_id ? supabase .from(\"quotes\")",
    );
    expect(normalizedDetailPage).toContain(
      '.eq("company_id", profile.company_id)',
    );
    expect(normalizedDetailPage).toContain(
      "} = isowner ? buildcommercialintelligence({",
    );
    expect(normalizedDetailPage).toContain("scoredquotes: [],");
    expect(normalizedDetailPage).toContain("recommendedquote: null,");
  });

  it("mounts exception-bearing owner comparison only after the detail lifecycle lockbox branch", () => {
    expect(normalizedQuoteWorkspace).toContain(
      "{isowner && !commercialevaluationunlocked ? (",
    );
    expect(normalizedQuoteWorkspace).toContain(") : isowner ? (");
    expect(normalizedQuoteWorkspace).toContain("<rfqownerquotes");
    expect(normalizedQuoteWorkspace).toContain(
      "commercial submissions remain protected until the rfq deadline.",
    );

    const lockedIssuerBranch = normalizedQuoteWorkspace.indexOf(
      "{isowner && !commercialevaluationunlocked ? (",
    );
    const ownerComparisonMount = normalizedQuoteWorkspace.indexOf(
      "<rfqownerquotes",
    );

    expect(lockedIssuerBranch).toBeGreaterThan(-1);
    expect(ownerComparisonMount).toBeGreaterThan(lockedIssuerBranch);
  });

  it("keeps standalone comparison quote rows behind issuer tenancy and the same lifecycle unlock", () => {
    expect(normalizedComparePage).toContain(
      "if (!profile?.company_id || profile.company_id !== rfq.company_id) { redirect(\"/rfq\"); }",
    );
    expect(normalizedComparePage).toContain(
      "const commercialevaluationunlocked = !blindbiddingenabled || deadlinepassed;",
    );
    expect(normalizedComparePage).toContain(
      "if (commercialevaluationunlocked) {",
    );
    expect(normalizedComparePage).toContain('.from("quotes")');
    expect(normalizedComparePage).toContain('.select("*")');
    expect(normalizedComparePage).toContain(
      'supabase.rpc( "count_rfq_quote_submissions",',
    );
    expect(normalizedComparePage).toContain(
      "pricing, ranking, and award controls remain locked until the rfq deadline.",
    );
    expect(normalizedComparePage).toContain("<rfqquotecomparison");

    const unlockGate = normalizedComparePage.indexOf(
      "if (commercialevaluationunlocked) {",
    );
    const quoteSelect = normalizedComparePage.indexOf(
      '.from("quotes")',
      unlockGate,
    );
    const countFallback = normalizedComparePage.indexOf(
      "count_rfq_quote_submissions",
      quoteSelect,
    );
    const comparisonMount = normalizedComparePage.indexOf(
      "<rfqquotecomparison",
    );

    expect(unlockGate).toBeGreaterThan(-1);
    expect(quoteSelect).toBeGreaterThan(unlockGate);
    expect(countFallback).toBeGreaterThan(quoteSelect);
    expect(comparisonMount).toBeGreaterThan(countFallback);
  });

  it("keeps evaluation exception signals evidence-derived and free of independent data access", () => {
    expect(normalizedQuoteComparison).toContain("risk and exceptions");
    expect(normalizedQuoteComparison).toContain("function exceptionbadges");
    expect(normalizedQuoteComparison).toContain("quote.isbelowaverage");
    expect(normalizedQuoteComparison).toContain("quote.timelinescore >= 84");
    expect(normalizedQuoteComparison).toContain("quote.ishighest");
    expect(normalizedQuoteComparison).toContain("below average");
    expect(normalizedQuoteComparison).toContain("strong timeline");
    expect(normalizedQuoteComparison).toContain("highest bid");
    expect(normalizedQuoteComparison).not.toContain('.from("quotes")');
    expect(normalizedQuoteComparison).not.toContain("createclient(");
    expect(normalizedQuoteComparison).not.toContain("fetch(");
  });

  it("retains database defense-in-depth for authorized issuer evaluation visibility", () => {
    expect(normalizedUnlockMigration).toContain(
      'create policy "issuing buyers can read quotes after commercial unlock" on public.quotes for select to authenticated',
    );
    expect(normalizedUnlockMigration).toContain(
      "om.membership_status = 'active'",
    );
    expect(normalizedUnlockMigration).toContain(
      "om.workspace_role in ('owner', 'admin')",
    );
    expect(normalizedUnlockMigration).toContain(
      "or om.procurement_function = 'buyer'",
    );
    expect(normalizedUnlockMigration).toContain(
      "coalesce(r.sourcing_method, 'invited') = 'open'",
    );
    expect(normalizedUnlockMigration).toContain(
      "coalesce(r.contract_framework, 'project_specific') <> 'framework'",
    );
    expect(normalizedUnlockMigration).toContain(
      "public.parse_rfq_deadline_timestamptz(r.deadline) is not null",
    );
    expect(normalizedUnlockMigration).toContain(
      "public.parse_rfq_deadline_timestamptz(r.deadline) < now()",
    );
  });

  it("keeps the pre-unlock issuer fallback integer-only and free of commercial evidence", () => {
    const functionStart = issuerUnlockMigration.indexOf(
      "create or replace function public.count_rfq_quote_submissions(p_rfq_id uuid)",
    );
    const functionEnd = issuerUnlockMigration.indexOf(
      "comment on function public.count_rfq_quote_submissions(uuid)",
      functionStart,
    );

    expect(functionStart).toBeGreaterThan(-1);
    expect(functionEnd).toBeGreaterThan(functionStart);

    const countFunction = issuerUnlockMigration.slice(functionStart, functionEnd);
    const normalizedCountFunction = normalizeWhitespace(countFunction);

    expect(normalizedCountFunction).toContain("returns integer");
    expect(normalizedCountFunction).toContain("select count(*)::integer");
    expect(normalizedCountFunction).toContain("from public.quotes q");
    expect(normalizedCountFunction).toContain("q.rfq_id = p_rfq_id");
    expect(normalizedCountFunction).not.toContain("q.amount");
    expect(normalizedCountFunction).not.toContain("q.timeline");
    expect(normalizedCountFunction).not.toContain("q.message");
    expect(normalizedCountFunction).not.toContain("q.company_id");
    expect(normalizedCountFunction).not.toContain("q.user_id");
  });
});

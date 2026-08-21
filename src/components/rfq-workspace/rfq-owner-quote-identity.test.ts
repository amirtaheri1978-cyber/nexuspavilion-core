import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const ownerQuotes = readSource(
  "src/components/rfq-workspace/rfq-owner-quotes.tsx",
);
const comparison = readSource(
  "src/components/rfq-workspace/rfq-quote-comparison.tsx",
);
const workspace = readSource(
  "src/components/rfq-workspace/rfq-quote-workspace.tsx",
);
const detail = readSource("src/app/rfq/[slug]/page.tsx");
const compare = readSource("src/app/rfq/[slug]/compare/page.tsx");
const identity = readSource(
  "src/lib/procurement/rfq-owner-supplier-identity.ts",
);
const visualQa = readSource("src/app/dev/rfq-visual-qa/page.tsx");
const command = readSource(
  "src/components/rfq-workspace/rfq-command-center.tsx",
);
const ranking = readSource(
  "src/components/executive/executive-opportunity-ranking.tsx",
);
const award = readSource("src/components/award-contract-button.tsx");
const metric = readSource(
  "src/components/rfq-workspace/rfq-executive-metric-wrapping.test.ts",
);

describe("Task 24-RFQ-13 owner quote identity and readability", () => {
  it("uses the existing company_directory name instead of rank-derived supplier labels", () => {
    expect(detail).toContain(
      '.select("id, name, category, location, network_role")',
    );
    expect(detail).toContain(".from(\"company_directory\")");
    expect(detail).toContain("supplierCompanies={supplierCompanies}");
    expect(detail).not.toContain('.select("id, name, category, location, network_role, first_name');
    expect(workspace).toContain("supplierCompanies={supplierCompanies}");
    expect(ownerQuotes).toContain("resolveRfqOwnerSupplierLabel");
    expect(ownerQuotes).toContain("quote.company_id");
    expect(ownerQuotes).toContain("rank: quote.rank");
    expect(ownerQuotes).not.toContain("supplierLabel: `Supplier quote #${quote.rank}`");
    expect(identity).toContain("company.name?.trim()");
    expect(identity).toContain("`Supplier quote #${rank}`");
    expect(identity).not.toContain("Named supplier");
    expect(identity).not.toContain("Unverified Supplier");
    expect(identity).not.toContain("first_name");
    expect(identity).not.toContain("last_name");
    expect(identity).not.toContain("user_id");
    expect(compare).toContain("supplierNames.get(quote.company_id)");
    expect(compare).toContain(".from(\"company_directory\")");
  });

  it("does not change queries, award controls, scoring, or frozen RFQ regions", () => {
    expect(detail).toContain("buildCommercialIntelligence({");
    expect(detail).toContain("buildRfqSupplierRecommendationInput({");
    expect(detail).toContain("getRfqSupplierCompanyIds(scoredQuotes)");
    expect(comparison).toContain("AwardContractButton");
    expect(comparison).toContain("quoteId={quote.id}");
    expect(comparison).toContain("supplierLabel={quote.supplierLabel}");
    expect(comparison).toContain("{quote.rank}");
    expect(comparison).toContain("Rank #{quote.rank}");
    expect(award).toContain('fetch("/api/award-contract"');
    expect(ownerQuotes).not.toContain("award_rfq_quote");
    expect(ownerQuotes).not.toContain('.from("quotes")');
    expect(identity).not.toContain("createClient");
    expect(identity).not.toContain(".rpc(");
    expect(command).toContain('data-rfq-command-center="true"');
    expect(ranking).toContain('data-rfq-priority-decision="true"');
    expect(metric).toContain("Task 24-RFQ-12 executive metric wrapping closeout");
  });

  it("wraps canonical supplier identity at word boundaries without nested panels", () => {
    expect(comparison).toContain("whitespace-normal");
    expect(comparison).toContain("text-pretty");
    expect(comparison).toContain("min-w-0");
    expect(comparison).toContain("@container");
    expect(comparison).not.toContain("break-words");
    expect(comparison).not.toContain("break-all");
    expect(comparison).not.toContain("overflow-wrap:anywhere");
    expect(comparison).not.toContain("[overflow-wrap:anywhere]");
    expect(ownerQuotes).not.toContain("ExecutivePanel");
    expect(ownerQuotes).toContain("embedded");
    expect(visualQa).toContain('data-rfq-owner-quote-identity-shell-width="1110"');
    expect(visualQa).toContain("owner quote identity wrapping");
    expect(visualQa).toContain(
      "Harbor Steel Co. North American Refrigeration Division",
    );
    expect(visualQa).toContain("supplierCompanies={ownerSupplierCompanies}");
    expect(visualQa).toContain("scoredQuotes={ownerIdentityQuotes}");
    expect(visualQa).toContain("isOwner");
    expect(visualQa).toContain('company_id: "harbor-steel"');
  });
});

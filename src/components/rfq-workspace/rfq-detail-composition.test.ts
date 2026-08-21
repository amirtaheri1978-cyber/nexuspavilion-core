import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { buildRfqExecutiveOpportunityIntelligence } from "@/lib/procurement/rfq-executive-opportunity-intelligence";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const detail = readSource("src/app/rfq/[slug]/page.tsx");
const actions = readSource(
  "src/components/rfq-workspace/rfq-executive-actions.tsx",
);
const ranking = readSource(
  "src/components/executive/executive-opportunity-ranking.tsx",
);
const command = readSource(
  "src/components/rfq-workspace/rfq-command-center.tsx",
);
const documents = readSource(
  "src/components/rfq-workspace/rfq-document-workspace.tsx",
);
const quotes = readSource(
  "src/components/rfq-workspace/rfq-quote-workspace.tsx",
);

describe("Task 24-RFQ-04 RFQ detail structural composition", () => {
  it("does not nest a second main inside the authenticated RFQ detail page", () => {
    expect(detail).toContain('data-rfq-detail-layout="true"');
    expect(detail).toContain("min-w-0");
    expect(detail).toContain("EXECUTIVE_PAGE_CLASS");
    expect(detail).not.toMatch(/<main[\s>]/);
  });

  it("renders ranking as a sibling region instead of nesting it in Priority Actions", () => {
    expect(actions).not.toContain("ExecutiveOpportunityRanking");
    expect(actions).not.toContain("opportunities");
    expect(actions).not.toContain("intelligence");
    expect(actions).toContain('data-rfq-priority-actions="true"');
    expect(actions).toContain("Priority Actions");
    expect(actions).toContain("Submit Quote");
    expect(actions).toContain("Open Compare View");

    const rankingMount = detail.indexOf("<ExecutiveOpportunityRanking");
    const actionsMount = detail.indexOf("<RFQExecutiveActions");
    expect(rankingMount).toBeGreaterThan(0);
    expect(actionsMount).toBeGreaterThan(rankingMount);

    expect(detail).toContain("opportunities={executiveOpportunities}");
    expect(detail).toContain("intelligence={executiveOpportunityIntelligence}");
    expect(detail).toContain("np-region-major");
    expect(detail).toContain("minmax(0,1fr)");
  });

  it("keeps RFQ-01/02/03 ranking presentation contracts intact", () => {
    expect(ranking).toContain('data-rfq-priority-decision="true"');
    expect(ranking).toContain('data-rfq-opportunity-queue="true"');
    expect(ranking).toContain('data-rfq-intelligence-profiles="true"');
    expect(ranking).not.toContain("overflow-wrap:anywhere");
    expect(ranking).not.toContain("function TopOpportunitySignal");
  });

  it("does not alter RFQ business data generation or frozen neighbor internals", () => {
    const { opportunities, intelligence } =
      buildRfqExecutiveOpportunityIntelligence({
        isOwner: true,
        potentialSavings: 40000,
        commercialEvaluationUnlocked: true,
        quoteCount: 3,
        documentCount: 4,
        recommendedAwardConfidence: 88,
      });

    expect(opportunities.map((item) => item.title)).toEqual([
      "Commercial Savings Opportunity",
      "Award Readiness",
      "Supplier Competition Expansion",
      "Documentation Readiness",
    ]);
    expect(intelligence[0].ceoRecommendation).toBe(
      "Validate the bid spread and prepare negotiation strategy before final award.",
    );

    expect(detail).toContain("buildRfqExecutiveOpportunityIntelligence({");
    expect(detail).toContain("buildCommercialIntelligence({");
    expect(detail).toContain('from("quotes")');
    expect(detail).not.toContain("award_rfq_quote");

    expect(command).toContain('data-rfq-command-center="true"');
    expect(documents).toContain('id="document-center"');
    expect(quotes).toContain('id="quote-intelligence"');
    expect(actions).not.toContain("hover:scale");
    expect(detail).not.toContain("hover:scale");
  });
});

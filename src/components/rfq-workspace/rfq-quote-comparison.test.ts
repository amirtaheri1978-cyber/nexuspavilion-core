import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const comparison = readSource(
  "src/components/rfq-workspace/rfq-quote-comparison.tsx",
);
const ownerQuotes = readSource(
  "src/components/rfq-workspace/rfq-owner-quotes.tsx",
);
const workspace = readSource(
  "src/components/rfq-workspace/rfq-quote-workspace.tsx",
);
const command = readSource(
  "src/components/rfq-workspace/rfq-command-center.tsx",
);
const ranking = readSource(
  "src/components/executive/executive-opportunity-ranking.tsx",
);
const visualQa = readSource("src/app/dev/rfq-visual-qa/page.tsx");

describe("Task 24-RFQ-06 owner quote comparison density", () => {
  it("keeps quote comparison semantics, scoring fields, and award destinations intact", () => {
    expect(comparison).toContain("{quote.supplierLabel}");
    expect(comparison).toContain("{quote.amountLabel}");
    expect(comparison).toContain("{quote.evaluationScore}");
    expect(comparison).toContain("{quote.awardProbability}");
    expect(comparison).toContain("{quote.riskLevel}");
    expect(comparison).toContain("AwardContractButton");
    expect(comparison).toContain("quoteId={quote.id}");
    expect(comparison).toContain("rfqTitle={rfqTitle}");
    expect(comparison).toContain("supplierLabel={quote.supplierLabel}");
    expect(comparison).toContain("amountLabel={quote.amountLabel}");
    expect(comparison).toContain("Contract awarded");
    expect(comparison).toContain("Award closed");
    expect(comparison).toContain("highest current evaluation score");
    expect(ownerQuotes).toContain("RfqQuoteComparison");
    expect(ownerQuotes).toContain("recommendedQuoteId === quote.id");
    expect(workspace).toContain('href={`/rfq/${rfqSlug}/compare`}');
    expect(workspace).toContain('href={`/rfq/${rfqSlug}/submit`}');
    expect(comparison).not.toContain("award_rfq_quote");
    expect(comparison).not.toContain('.from("quotes")');
  });

  it("does not force a seven-column lg table under the authenticated shell width", () => {
    expect(comparison).toContain('data-rfq-quote-comparison="true"');
    expect(comparison).toContain("@container");
    expect(comparison).toContain("@min-[1500px]:block");
    expect(comparison).toContain("@min-[1500px]:hidden");
    expect(comparison).toContain("table-fixed");
    expect(comparison).not.toContain("@7xl:block");
    expect(comparison).not.toContain("@7xl:hidden");
    expect(comparison).not.toContain("lg:block");
    expect(comparison).not.toContain("lg:hidden");
    expect(comparison).not.toContain("overflow-x-auto");
    expect(comparison).not.toContain("min-w-[920px]");
    expect(comparison).toContain('data-rfq-quote-comparison-cards="true"');
    expect(comparison).toContain('data-rfq-quote-comparison-table="true"');
  });

  it("separates identity, commercial terms, intelligence, and owner actions without nested comparison panels on the RFQ detail path", () => {
    expect(ownerQuotes).toContain("embedded");
    expect(comparison).toContain("embedded = false");
    expect(comparison).toContain("Commercial terms");
    expect(comparison).toContain("Comparison intelligence");
    expect(comparison).toContain("Owner action");
    expect(comparison).toContain("<article");
    expect(comparison).toContain("<h3");
    expect(comparison).toContain("<table");
    expect(comparison).toContain("<caption");
    expect(workspace).toContain('id="quote-intelligence"');
    expect(workspace).toContain("@4xl:flex-row");
    expect(workspace).toContain("@4xl:max-w-xl");
    expect(workspace).toContain("@sm:grid-cols-2");
    expect(comparison).toContain("@md:flex-row");
    expect(comparison).toContain("Commercial terms");
    expect(workspace).not.toContain("gap-6 xl:flex-row");
    expect(workspace).not.toContain("xl:grid-cols-3");
    expect(workspace).not.toContain("xl:max-w-xl xl:justify-end");
    expect(workspace).not.toContain("lg:flex-row lg:items-start");
  });

  it("wraps supplier names and values at word boundaries", () => {
    expect(comparison).toContain("text-pretty");
    expect(comparison).toContain("min-w-0");
    expect(comparison).not.toContain("overflow-wrap:anywhere");
    expect(comparison).not.toContain("break-all");
    expect(comparison).not.toContain("break-words");
    expect(workspace).not.toContain("break-words");
    expect(workspace).toContain("text-pretty");
    expect(visualQa).toContain(
      "Harbor Steel Co. North American Refrigeration Division",
    );
    expect(visualQa).toContain("seven-column lg table");
    expect(visualQa).toContain('data-rfq-quote-shell-width="1110"');
  });

  it("does not alter frozen RFQ-01 through RFQ-05 regions", () => {
    expect(command).toContain('data-rfq-command-center="true"');
    expect(command).toContain(
      "@7xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]",
    );
    expect(ranking).toContain('data-rfq-priority-decision="true"');
    expect(ranking).toContain('data-rfq-opportunity-queue="true"');
    expect(ranking).toContain('data-rfq-intelligence-profiles="true"');
  });
});

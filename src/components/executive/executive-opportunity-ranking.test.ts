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

const ranking = readSource(
  "src/components/executive/executive-opportunity-ranking.tsx",
);
const intelligenceSource = ranking.slice(
  ranking.indexOf("function IntelligenceCard"),
  ranking.indexOf("function TopOpportunitySignal"),
);
const intelligenceSection = ranking.slice(
  ranking.indexOf('aria-labelledby="opportunity-intelligence-heading"'),
  ranking.indexOf("function OpportunityCard"),
);

describe("Task 24-RFQ-01 intelligence profile presentation", () => {
  it("keeps the four intelligence profiles and recommendation copy unchanged", () => {
    const { intelligence } = buildRfqExecutiveOpportunityIntelligence({
      isOwner: true,
      potentialSavings: 40000,
      commercialEvaluationUnlocked: true,
      quoteCount: 3,
      documentCount: 4,
      recommendedAwardConfidence: 88,
    });

    expect(intelligence.map((item) => item.title)).toEqual([
      "Commercial Savings Opportunity",
      "Award Readiness",
      "Supplier Competition Expansion",
      "Documentation Readiness",
    ]);
    expect(intelligence.map((item) => item.rank)).toEqual([1, 2, 3, 4]);
    expect(intelligence[0].businessImpact).toContain("cost control");
    expect(intelligence[0].ceoRecommendation).toBe(
      "Validate the bid spread and prepare negotiation strategy before final award.",
    );
  });

  it("does not force four dense cards at ordinary desktop xl", () => {
    expect(intelligenceSection).toContain(
      'data-rfq-intelligence-profiles="true"',
    );
    expect(intelligenceSection).toContain("grid-cols-1");
    expect(intelligenceSection).toContain("md:grid-cols-2");
    expect(intelligenceSection).not.toContain("xl:grid-cols-4");
    expect(intelligenceSection).not.toContain("md:grid-cols-4");
    expect(intelligenceSection).not.toContain("min-[1800px]:grid-cols-4");
  });

  it("stops mid-word title fragmentation and nested metadata boxes", () => {
    expect(intelligenceSource).not.toContain("overflow-wrap:anywhere");
    expect(intelligenceSource).not.toContain("break-all");
    expect(intelligenceSource).not.toContain("break-words");
    expect(intelligenceSource).not.toContain("InfoBlock");
    expect(intelligenceSource).toContain("text-xl font-black leading-[1.25]");
    expect(intelligenceSource).toContain("Execution Horizon");
    expect(intelligenceSource).toContain("Board Priority");
    expect(intelligenceSource).toContain("CEO Recommendation");
    expect(intelligenceSource).toContain("<dl");
  });

  it("keeps title and recommendation dominant without encoding rank by color alone", () => {
    expect(intelligenceSource).toContain("Rank {rankLabel}");
    expect(intelligenceSource).toContain("[{rankLabel}] Intelligence Position");
    expect(intelligenceSource).toContain("<h4");
    expect(intelligenceSection).toContain("<h3");
    expect(intelligenceSource).not.toContain("hover:scale");
    expect(intelligenceSource).not.toContain("hover:-translate");
  });
});

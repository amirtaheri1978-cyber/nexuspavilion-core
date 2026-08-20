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
  ranking.indexOf("function EmptyState"),
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

describe("Task 24-RFQ-02 opportunity queue presentation", () => {
  const queueSection = ranking.slice(
    ranking.indexOf('aria-labelledby="opportunity-queue-heading"'),
    ranking.indexOf('aria-labelledby="opportunity-intelligence-heading"'),
  );
  const opportunityCard = ranking.slice(
    ranking.indexOf("function OpportunityCard"),
    ranking.indexOf("function IntelligenceCard"),
  );

  it("keeps queue opportunity order, ranks, and wording intact", () => {
    const { opportunities } = buildRfqExecutiveOpportunityIntelligence({
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
    expect(opportunities.map((item) => item.priority)).toEqual([
      "High",
      "High",
      "Medium",
      "Medium",
    ]);
    expect(opportunityCard).toContain("{opportunity.priority} Priority");
    expect(opportunityCard).toContain("[{rankLabel}] Ranked Opportunity");
    expect(opportunityCard).toContain("{opportunity.title}");
    expect(opportunityCard).toContain("{opportunity.summary}");
    expect(opportunityCard).toContain("{opportunity.impact}");
    expect(opportunityCard).toContain("{opportunity.value}");
  });

  it("does not force four dense queue cards at ordinary desktop xl", () => {
    expect(queueSection).toContain('data-rfq-opportunity-queue="true"');
    expect(queueSection).toContain("grid-cols-1");
    expect(queueSection).toContain("md:grid-cols-2");
    expect(queueSection).not.toContain("xl:grid-cols-4");
    expect(queueSection).not.toContain("md:grid-cols-4");
  });

  it("stops mid-word queue title fragmentation and nested peer boxes", () => {
    expect(opportunityCard).not.toContain("overflow-wrap:anywhere");
    expect(opportunityCard).not.toContain("break-all");
    expect(opportunityCard).not.toContain("break-words");
    expect(opportunityCard).toContain("text-xl font-black leading-[1.25]");
    expect(opportunityCard).toContain("<dl");
    expect(opportunityCard).toContain("Enterprise Impact");
    expect(opportunityCard).toContain("Opportunity Value");
    expect(opportunityCard).not.toContain("max-w-[46%] shrink-0");
  });

  it("keeps ranking visible in text and avoids hover-scale gimmicks", () => {
    expect(opportunityCard).toContain("<h4");
    expect(queueSection).toContain("<h3");
    expect(opportunityCard).not.toContain("hover:scale");
    expect(opportunityCard).not.toContain("hover:-translate");
    expect(opportunityCard).not.toContain("bg-orange-500");
  });
});

describe("Task 24-RFQ-03 priority decision position presentation", () => {
  const decisionSection = ranking.slice(
    ranking.indexOf('aria-labelledby="top-opportunity-position-heading"'),
    ranking.indexOf('aria-labelledby="opportunity-queue-heading"'),
  );

  it("keeps the lead opportunity values and signal order unchanged", () => {
    const { opportunities, intelligence } =
      buildRfqExecutiveOpportunityIntelligence({
        isOwner: true,
        potentialSavings: 40000,
        commercialEvaluationUnlocked: true,
        quoteCount: 3,
        documentCount: 4,
        recommendedAwardConfidence: 88,
      });

    expect(opportunities[0].title).toBe("Commercial Savings Opportunity");
    expect(opportunities[0].priority).toBe("High");
    expect(opportunities[0].impact).toBe("Financial");
    expect(opportunities[0].value).toBe("$40,000");
    expect(intelligence[0].executionHorizon).toBe("Immediate");
    expect(intelligence[0].boardPriority).toBe("Board-Level");
    expect(intelligence[0].rank).toBe(1);
    expect(intelligence[0].ceoRecommendation).toBe(
      "Validate the bid spread and prepare negotiation strategy before final award.",
    );

    const signalBlock = decisionSection.slice(
      decisionSection.indexOf("data-rfq-priority-decision-signals"),
      decisionSection.indexOf("CEO action directive"),
    );
    const labels = [
      "Priority",
      "Enterprise Impact",
      "Value Potential",
      "Execution Horizon",
      "Board Priority",
      "Intelligence Position",
    ];
    let cursor = 0;
    for (const label of labels) {
      const next = signalBlock.indexOf(label, cursor);
      expect(next).toBeGreaterThanOrEqual(0);
      cursor = next + label.length;
    }
  });

  it("stops unsafe wrapping and competing nested signal cards", () => {
    expect(decisionSection).toContain('data-rfq-priority-decision="true"');
    expect(decisionSection).not.toContain("overflow-wrap:anywhere");
    expect(decisionSection).not.toContain("break-all");
    expect(decisionSection).not.toContain("break-words");
    expect(decisionSection).not.toContain("TopOpportunitySignal");
    expect(decisionSection).not.toContain("xl:grid-cols-3");
    expect(decisionSection).toContain("<dl");
    expect(decisionSection).toContain("Priority Position Active");
    expect(decisionSection).toContain("CEO action directive");
    expect(decisionSection).toContain("{topOpportunity?.title");
    expect(decisionSection).toContain("{topOpportunity?.summary");
    expect(decisionSection).toContain('data-rfq-priority-decision-title="true"');
    expect(decisionSection).toContain("min-w-0");
    expect(decisionSection).toContain("text-pretty");
  });

  it("does not alter RFQ business data generation and leaves RFQ-01/02 blocks intact", () => {
    expect(ranking).not.toContain("buildRfqExecutiveOpportunityIntelligence");
    expect(ranking).toContain('data-rfq-intelligence-profiles="true"');
    expect(ranking).toContain('data-rfq-opportunity-queue="true"');
    expect(ranking).toContain("Business Impact and Executive Direction");
    expect(ranking).toContain("Executive Opportunity Queue");
    expect(ranking).not.toContain("function TopOpportunitySignal");
  });

  it("keeps heading hierarchy and does not encode status by color alone", () => {
    expect(decisionSection).toContain("<h3");
    expect(decisionSection).toContain("Priority Decision Position");
    expect(decisionSection).toContain("[01] Highest commercial priority");
    expect(decisionSection).not.toContain("hover:scale");
    expect(decisionSection).not.toContain("hover:-translate");
    expect(decisionSection).not.toContain("bg-orange-500");
  });
});

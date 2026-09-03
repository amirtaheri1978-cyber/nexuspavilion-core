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

const command = readSource(
  "src/components/rfq-workspace/rfq-command-center.tsx",
);
const detail = readSource("src/app/rfq/[slug]/page.tsx");
const actions = readSource(
  "src/components/rfq-workspace/rfq-executive-actions.tsx",
);
const ranking = readSource(
  "src/components/executive/executive-opportunity-ranking.tsx",
);
const visualQa = readSource("src/app/dev/rfq-visual-qa/page.tsx");
const procurementHealth = readSource(
  "src/lib/procurement/rfq-procurement-health.ts",
);
const deadlineRisk = readSource("src/lib/datetime/rfq-deadline-risk.ts");

describe("Task 24-RFQ-05 command center density closeout", () => {
  it("keeps command-center copy, destinations, and award distinction intact", () => {
    expect(command).toContain("Return to Procurement Center");
    expect(command).toContain('backHref = "/rfq"');
    expect(command).toContain("RFQ workspace");
    expect(command).toContain("Executive brief");
    expect(command).toContain("Executive procurement summary");
    expect(command).toContain("Recommended executive action");
    expect(command).toContain("{statusLabel}");
    expect(command).toContain("{title}");
    expect(command).toContain("{description}");
    expect(command).toContain("{executiveBrief}");
    expect(command).toContain("{nextBestAction}");
    expect(command).toContain('tone="awarded"');
    expect(command).toContain("{award.label}");
    expect(command).toContain("{award.value}");
    expect(command).not.toContain("href={`/rfq/");
    expect(command).not.toContain("award_rfq_quote");
    expect(detail).toContain("<RFQCommandCenter");
    expect(detail).toContain("getExecutiveBrief({");
    expect(detail).toContain("getNextBestAction({");
  });

  it("surfaces shared RFQ deadline risk without duplicating command-center architecture", () => {
    expect(detail).toContain(
      'from "@/lib/datetime/rfq-deadline-risk"',
    );
    expect(detail).toContain("getCurrentRfqDeadlineRisk(rfq.deadline)");

    expect(detail).toContain("getRfqDeadlineRisk(deadline, new Date())");
    expect(detail).toContain("deadlineRiskStatus: deadlineRisk.status");
    expect(detail).toContain("value: deadlineMetric.value");
    expect(detail).toContain(
      "accentClassName: deadlineMetric.accentClassName",
    );
    expect(procurementHealth).toContain(
      "Submission deadline is within 72 hours",
    );
    expect(procurementHealth).toContain(
      "Submission deadline is within 7 days",
    );
    expect(deadlineRisk).toContain(
      "RFQ_DEADLINE_APPROACHING_WINDOW_HOURS = 168",
    );
    expect(deadlineRisk).toContain(
      "RFQ_DEADLINE_URGENT_WINDOW_HOURS = 72",
    );
    expect(visualQa).toContain("4 Days / Approaching");
  });

  it("does not force a two-column command center under the authenticated shell width", () => {
    expect(command).toContain('data-rfq-command-center="true"');
    expect(command).toContain("@container");
    expect(command).toContain(
      "@7xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]",
    );
    expect(command).not.toContain("lg:grid-cols-[1.25fr_0.75fr]");
    expect(command).not.toContain("xl:grid-cols-6");
    expect(command).not.toContain("md:grid-cols-3");
    expect(command).toContain("@sm:grid-cols-2");
    expect(command).toContain("@4xl:grid-cols-3");
  });

  it("removes nested brief/action boxes without flattening status or decision labels", () => {
    expect(command).toContain('data-rfq-command-brief="true"');
    expect(command).toContain('data-rfq-command-recommended-action="true"');
    expect(command).toContain('data-rfq-command-award="true"');
    expect(command).toContain("border-t border-nexus-gold/25");
    expect(command).toContain("border-t border-emerald-400/25");
    expect(command).not.toContain(
      "rounded-executive border border-white/10 bg-white/[0.04] p-6",
    );
    expect(command).not.toContain(
      "rounded-executive border border-nexus-gold/20 bg-nexus-gold/[0.08] p-5",
    );
    expect(command).not.toContain(
      "rounded-executive border border-emerald-400/20 bg-emerald-400/10 p-5",
    );
    expect(command).toContain("<h1");
    expect(command).toContain("<h2");
    expect(command).toContain("<h3");
    expect(command).toContain("<dl");
  });

  it("wraps long titles and recommendations at word boundaries", () => {
    expect(command).toContain("text-pretty");
    expect(command).toContain("min-w-0");
    expect(command).toContain("flex-wrap");
    expect(command).not.toContain("overflow-wrap:anywhere");
    expect(command).not.toContain("break-all");
    expect(command).not.toContain("break-words");
    expect(command).not.toContain("overflow-x-auto");
    expect(command).not.toContain("hover:scale");
    expect(visualQa).toContain("command center long copy");
    expect(visualQa).toContain("330px");
    expect(visualQa).toContain(
      "Long-cycle industrial refrigeration replacement and commissioning for the North Harbor distribution campus",
    );
  });

  it("does not alter RFQ-01/02/03/04 composition or RFQ business data generation", () => {
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

    expect(ranking).toContain('data-rfq-priority-decision="true"');
    expect(ranking).toContain('data-rfq-opportunity-queue="true"');
    expect(ranking).toContain('data-rfq-intelligence-profiles="true"');
    expect(actions).toContain('data-rfq-priority-actions="true"');
    expect(actions).toContain('data-rfq-lifecycle-nav="true"');
    expect(actions).toContain("Open quote comparison");
    expect(detail).toContain("<ExecutiveOpportunityRanking");
    expect(detail).toContain("<RFQExecutiveActions");
    expect(detail).not.toContain("award_rfq_quote");
    expect(command).not.toContain("buildCommercialIntelligence");
    expect(command).not.toContain('.from("quotes")');
  });
});

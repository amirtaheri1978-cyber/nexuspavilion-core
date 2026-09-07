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

  it("surfaces the awarded respondent in the authorized command-center outcome", () => {
    expect(detail).toContain(
      'from "@/lib/procurement/rfq-owner-supplier-identity"',
    );
    expect(detail).toContain(
      "buildRfqOwnerSupplierNameById(supplierCompanies)",
    );
    expect(detail).toContain("resolveRfqOwnerSupplierLabel({");
    expect(detail).toContain("companyId: awardedQuote.company_id");
    expect(detail).toContain("rank: awardedQuote.rank");
    expect(detail).toContain("supplierNameById");
    expect(detail).toContain("awardedSupplierLabel &&");
    expect(detail).toContain("Awarded to ");
    expect(detail).toContain("awardedQuote.amountNumber");
    expect(visualQa).toContain(
      "Awarded to Harbor Steel Co. North American Refrigeration Division at $1,240,000",
    );
    expect(visualQa.match(/rfqId="00000000-0000-4000-8000-000000000011"/g) ?? []).toHaveLength(2);
    expect(visualQa).toContain('embedded rfqId="visual-qa-rfq"');
    expect(detail.match(/\.from\("company_directory"\)/g) ?? []).toHaveLength(1);
    expect(command).toContain("{award.value}");
    expect(command).toContain("text-pretty");
  });

  it("keeps the awarded command-center summary in a post-award commercial handoff state", () => {
    expect(detail).toContain(
      'const awardRecorded = isOwner && rfqStatus === "awarded";',
    );
    expect(detail).toContain('awardRecorded\n            ? "Award Recorded"');
    expect(detail).toContain(
      '"Commercial decision recorded for downstream handoff"',
    );
    expect(detail).toContain("awardRecorded,");
    expect(detail).toContain(
      'rfqStatus === "awarded"\n      ? getRFQStatusLabel(rfq.status)',
    );
    expect(visualQa).toContain('value: "Award Recorded"');
    expect(visualQa).toContain(
      "Commercial decision recorded for downstream handoff",
    );
    expect(visualQa).toContain(
      "The commercial decision is complete in Nexus Pavilion",
    );
    expect(visualQa).toContain(
      "Proceed with downstream commercial handoff using the recorded award outcome.",
    );
    expect(visualQa).not.toContain(
      "board brief still needs a final award confirmation before supplier notification",
    );
    expect(visualQa).not.toContain(
      "confirm the Harbor Steel award if the commercial evidence remains acceptable for this refrigerated campus replacement program",
    );
  });

  it("surfaces a distinct post-award commercial handoff indicator after Award Complete", () => {
    expect(command).toContain("handoff = null");
    expect(command).toContain("handoff?:");
    expect(command).toContain('data-rfq-command-handoff="true"');
    expect(command).toContain("Downstream commercial handoff");
    expect(command).toContain("{handoff.label}");
    expect(command).toContain("{handoff.value}");
    expect(command).toContain("{handoff.detail}");
    expect(command).toContain('data-rfq-command-award="true"');
    expect(command).toContain("{award.label}");
    expect(command).toContain("{award.value}");
    expect(command.match(/<ExecutivePanel/g) ?? []).toHaveLength(1);
    expect(command).not.toContain("rounded-executive border border-white/10 bg-white/[0.04] p-6");

    expect(detail).toContain("handoff={commercialHandoff}");
    expect(detail).toContain(
      'rfq.contract_framework === "project_specific"',
    );
    expect(detail).toContain('rfq.contract_framework === "framework"');
    expect(detail).toContain("Project-specific commercial administration");
    expect(detail).toContain("Framework commercial administration");
    expect(detail).toContain(
      "Use the recorded award outcome as the commercial handoff reference. Contract execution, signatures, purchase-order status, and external-system completion remain outside this RFQ workspace.",
    );
    expect(detail).not.toContain("getContractFramework(rfq.contract_framework)");

    expect(visualQa).toContain("Project-specific commercial administration");
    expect(visualQa).toContain(
      "Use the recorded award outcome as the commercial handoff reference. Contract execution, signatures, purchase-order status, and external-system completion remain outside this RFQ workspace.",
    );
    expect(visualQa).toContain(
      "Awarded to Harbor Steel Co. North American Refrigeration Division at $1,240,000",
    );
    expect(visualQa).toContain('label: "Award Complete"');
    expect(visualQa).toContain('label: "Next Commercial Step"');

    const openFixtureStart = visualQa.indexOf('statusLabel="Open"');
    const awardedFixtureStart = visualQa.indexOf('statusLabel="Awarded"');
    const openFixture = visualQa.slice(openFixtureStart, awardedFixtureStart);
    expect(openFixtureStart).toBeGreaterThan(-1);
    expect(awardedFixtureStart).toBeGreaterThan(openFixtureStart);
    expect(openFixture).not.toContain("Next Commercial Step");
    expect(openFixture).not.toContain(
      "Project-specific commercial administration",
    );
    expect(openFixture).not.toContain("handoff={{");
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

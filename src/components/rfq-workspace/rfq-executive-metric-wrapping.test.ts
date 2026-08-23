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

const metric = readSource(
  "src/components/executive/executive-metric-card.tsx",
);
const commandMetric = readSource(
  "src/components/executive/workspace/executive-command-metric.tsx",
);
const command = readSource(
  "src/components/rfq-workspace/rfq-command-center.tsx",
);
const documents = readSource(
  "src/components/rfq-workspace/rfq-document-workspace.tsx",
);
const quoteWorkspace = readSource(
  "src/components/rfq-workspace/rfq-quote-workspace.tsx",
);
const procurementContext = readSource(
  "src/components/rfq-workspace/rfq-procurement-context.tsx",
);
const procurementHealth = readSource(
  "src/components/rfq-workspace/rfq-procurement-health.tsx",
);
const governance = readSource(
  "src/components/rfq-workspace/rfq-governance-controls.tsx",
);
const awardPath = readSource(
  "src/components/rfq-workspace/rfq-recommended-award-path.tsx",
);
const decisionCenter = readSource(
  "src/components/rfq-workspace/executive-decision-center.tsx",
);
const compare = readSource("src/app/rfq/[slug]/compare/page.tsx");
const submit = readSource("src/app/rfq/[slug]/submit/page.tsx");
const visualQa = readSource("src/app/dev/rfq-visual-qa/page.tsx");
const kpiRow = readSource("src/components/dashboard/executive-kpi-row.tsx");
const ranking = readSource(
  "src/components/executive/executive-opportunity-ranking.tsx",
);
const actions = readSource(
  "src/components/rfq-workspace/rfq-executive-actions.tsx",
);
const comparison = readSource(
  "src/components/rfq-workspace/rfq-quote-comparison.tsx",
);
const supplierQuotes = readSource(
  "src/components/rfq-workspace/rfq-supplier-quotes.tsx",
);
const invite = readSource("src/components/invite-vendor-form.tsx");
const addenda = readSource("src/components/rfq-addenda-manager.tsx");
const appShell = readSource("src/components/app-shell.tsx");
const sidebar = readSource("src/components/sidebar.tsx");

function assertSafeWrapping(source: string) {
  expect(source).toContain("text-pretty");
  expect(source).toContain("min-w-0");
  expect(source).not.toContain("break-words");
  expect(source).not.toContain("break-all");
  expect(source).not.toContain("overflow-wrap:anywhere");
  expect(source).not.toContain("[overflow-wrap:anywhere]");
}

describe("Task 24-RFQ-12 executive metric wrapping closeout", () => {
  it("removes unsafe wrapping from shared metric primitives", () => {
    assertSafeWrapping(metric);
    assertSafeWrapping(commandMetric);
    expect(metric).toContain("whitespace-nowrap");
    expect(metric).toContain("isCompactValue");
    expect(metric).toContain("aria-label={`${label}: ${value}`}");
    expect(metric).toContain('radius="tile"');
    expect(metric).toContain("np-type-kpi");
    expect(metric).toContain("tabular-nums");
    expect(commandMetric).toContain("rounded-3xl border border-white/10");
    expect(commandMetric).toContain("{title}");
    expect(commandMetric).toContain("{value}");
    expect(commandMetric).toContain("{detail}");
  });

  it("keeps frozen RFQ consumers on the shared primitives without redesign", () => {
    expect(command).toContain("<ExecutiveCommandMetric");
    expect(command).toContain("@sm:grid-cols-2");
    expect(command).toContain("@4xl:grid-cols-3");
    expect(command).toContain("{metric.value}");
    expect(command).toContain("{metric.title}");
    expect(command).toContain("{metric.detail}");
    expect(documents).toContain("<ExecutiveMetricCard");
    expect(documents).toContain('label="Documents"');
    expect(documents).toContain("value={String(documents.length)}");
    expect(quoteWorkspace).toContain("<ExecutiveMetricCard");
    expect(quoteWorkspace).toContain('value="Locked"');
    expect(quoteWorkspace).toContain('value="Pending"');
    expect(procurementContext).toContain("<ExecutiveMetricCard");
    expect(procurementHealth).toContain("<ExecutiveMetricCard");
    expect(governance).toContain("<ExecutiveMetricCard");
    expect(awardPath).toContain("<ExecutiveMetricCard");
    expect(awardPath).toContain("value={`${recommendation.priceScore}/100`}");
    expect(decisionCenter).toContain("<ExecutiveMetricCard");
    expect(compare).toContain("<ExecutiveMetricCard");
    expect(compare).toContain("value={formatDateTime(rfq.deadline)}");
    expect(compare).toContain("value={`${quoteCount} received`}");
    expect(submit).not.toContain("ExecutiveMetricCard");
  });

  it("does not change RFQ metric values, formulas, or frozen composition", () => {
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

    expect(appShell).toContain("lg:ml-[330px]");
    expect(sidebar).toContain("w-[330px]");
    expect(command).toContain('data-rfq-command-center="true"');
    expect(ranking).toContain('data-rfq-priority-decision="true"');
    expect(actions).toContain('data-rfq-priority-actions="true"');
    expect(documents).toContain('data-rfq-document-workspace="true"');
    expect(invite).toContain('data-rfq-invite-vendor-form="true"');
    expect(addenda).toContain('data-rfq-addenda-manager="true"');
    expect(comparison).toContain("@min-[1500px]:block");
    expect(supplierQuotes).toContain('data-rfq-supplier-quotes="true"');
    expect(command).not.toContain("award_rfq_quote");
    expect(metric).not.toContain('.from("quotes")');
    expect(commandMetric).not.toContain("buildCommercialIntelligence");
  });

  it("exposes a production-faithful wrapping fixture and non-RFQ KPI row", () => {
    expect(visualQa).toContain("executive metric wrapping");
    expect(visualQa).toContain('data-rfq-metric-wrapping="true"');
    expect(visualQa).toContain('data-rfq-metric-wrapping-shell-width="1110"');
    expect(visualQa).toContain('data-rfq-metric-card-grid="true"');
    expect(visualQa).toContain('data-rfq-command-metric-grid="true"');
    expect(visualQa).toContain('data-non-rfq-kpi-row="true"');
    expect(visualQa).toContain("Harbor Steel Co. North American Refrigeration Division");
    expect(visualQa).toContain("$1,280,000");
    expect(visualQa).toContain("August 21, 2026, 06:00 PM");
    expect(visualQa).toContain("88%");
    expect(visualQa).toContain("Healthy");
    expect(visualQa).toContain("#1");
    expect(visualQa).toContain("Commercial Evaluation");
    expect(visualQa).toContain('label: "Open Opportunities"');
    expect(visualQa).toContain('label: "Pipeline Value"');
    expect(kpiRow).toContain("<ExecutiveMetricCard");
    expect(kpiRow).toContain("grid gap-4 sm:grid-cols-2 xl:grid-cols-4");
    expect(kpiRow).toContain("{metric.value}");
  });
});

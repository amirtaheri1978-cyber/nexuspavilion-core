import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  buildRfqCapabilities,
  type RfqCapabilities,
} from "@/lib/procurement/rfq-access-contract";
import {
  RFQ_BUYER_ONLY_INTELLIGENCE_MARKERS,
  canExposeRfqBuyerExecutiveIntelligence,
  selectRfqDetailCommandMetrics,
  serializeRfqBuyerExecutiveIntelligenceForViewer,
} from "@/lib/procurement/rfq-detail-intelligence-boundary";
import {
  getExecutiveBrief,
  getNextBestAction,
} from "@/lib/procurement/rfq-executive-guidance";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const detailPage = readSource("src/app/rfq/[slug]/page.tsx");
const decisionCenter = readSource(
  "src/components/rfq-workspace/executive-decision-center.tsx",
);
const procurementHealth = readSource(
  "src/components/rfq-workspace/rfq-procurement-health.tsx",
);
const quoteWorkspace = readSource(
  "src/components/rfq-workspace/rfq-quote-workspace.tsx",
);
const supplierQuotes = readSource(
  "src/components/rfq-workspace/rfq-supplier-quotes.tsx",
);
const documents = readSource(
  "src/components/rfq-workspace/rfq-document-workspace.tsx",
);
const quotesRoute = readSource("src/app/api/quotes/route.ts");
const middleware = readSource("middleware.ts");
const intelligenceProvider = readSource(
  "src/components/rfq-workspace/shared/executive-intelligence-context.tsx",
);

function issuerCapabilities(
  overrides: Partial<RfqCapabilities> = {},
): RfqCapabilities {
  return {
    ...buildRfqCapabilities({
      participantRole: "issuer",
      isOpen: true,
      blindBiddingEnabled: true,
      commercialEvaluationUnlocked: false,
      hasMyQuote: false,
      hasRecommendedQuote: false,
    }),
    ...overrides,
  };
}

function supplierCapabilities(
  overrides: Partial<RfqCapabilities> = {},
): RfqCapabilities {
  return {
    ...buildRfqCapabilities({
      participantRole: "respondent",
      isOpen: true,
      blindBiddingEnabled: true,
      commercialEvaluationUnlocked: false,
      hasMyQuote: true,
      hasRecommendedQuote: false,
    }),
    ...overrides,
  };
}

const procurementHealthMetric = {
  title: "Procurement Health",
  value: "82/100",
  detail: "Healthy",
  accentClassName: "text-emerald-300",
};

const sharedMetrics = [
  {
    title: "Deadline",
    value: "12 Days",
    detail: "August 30, 2026, 05:00 PM EDT",
    accentClassName: "text-cyan-300",
  },
  {
    title: "Participation Status",
    value: "Quote Submitted",
    detail: "Organization-level confidential access",
    accentClassName: "text-[#C8A646]",
  },
] as const;

const buyerIntelligenceFixture = {
  title: "Executive Decision Center",
  awardReadiness: 91,
  potentialSavings: 42000,
  supplierCoverage: 4,
  procurementHealth: 82,
  healthBreakdown: ["Competition", "Governance"],
  recommendation: "Validate the recommended award path",
};

describe("Task 33C RFQ buyer executive intelligence isolation", () => {
  it("exposes buyer executive intelligence only to the RFQ issuer", () => {
    expect(
      canExposeRfqBuyerExecutiveIntelligence(issuerCapabilities()),
    ).toBe(true);
    expect(
      canExposeRfqBuyerExecutiveIntelligence(supplierCapabilities()),
    ).toBe(false);
    expect(issuerCapabilities().canViewExecutiveIntelligence).toBe(true);
    expect(supplierCapabilities().canViewExecutiveIntelligence).toBe(false);
    expect(supplierCapabilities().canViewOwnSubmission).toBe(true);
    expect(supplierCapabilities().canSubmitQuote).toBe(false);
    expect(
      buildRfqCapabilities({
        participantRole: "respondent",
        isOpen: true,
        blindBiddingEnabled: true,
        commercialEvaluationUnlocked: false,
        hasMyQuote: false,
        hasRecommendedQuote: false,
      }).canSubmitQuote,
    ).toBe(true);
  });

  it("omits buyer health metrics from the supplier command center payload", () => {
    const issuerMetrics = selectRfqDetailCommandMetrics({
      canViewExecutiveIntelligence: true,
      procurementHealthMetric,
      sharedMetrics,
    });
    const supplierMetrics = selectRfqDetailCommandMetrics({
      canViewExecutiveIntelligence: false,
      procurementHealthMetric,
      sharedMetrics,
    });

    expect(issuerMetrics.map((metric) => metric.title)).toEqual([
      "Procurement Health",
      "Deadline",
      "Participation Status",
    ]);
    expect(supplierMetrics.map((metric) => metric.title)).toEqual([
      "Deadline",
      "Participation Status",
    ]);
    expect(JSON.stringify(supplierMetrics)).not.toContain("82/100");
    expect(JSON.stringify(supplierMetrics)).not.toContain(
      "Procurement Health",
    );
    expect(JSON.stringify(supplierMetrics)).toContain("Quote Submitted");
    expect(JSON.stringify(supplierMetrics)).toContain(
      "August 30, 2026, 05:00 PM EDT",
    );
  });

  it("does not serialize buyer-only intelligence into a supplier-visible payload", () => {
    const supplierPayload = serializeRfqBuyerExecutiveIntelligenceForViewer(
      canExposeRfqBuyerExecutiveIntelligence(supplierCapabilities()),
      buyerIntelligenceFixture,
    );
    const issuerPayload = serializeRfqBuyerExecutiveIntelligenceForViewer(
      canExposeRfqBuyerExecutiveIntelligence(issuerCapabilities()),
      buyerIntelligenceFixture,
    );

    expect(supplierPayload).toBeNull();
    expect(JSON.stringify(supplierPayload)).toBe("null");
    expect(JSON.stringify(supplierPayload)).not.toContain("42000");
    expect(JSON.stringify(supplierPayload)).not.toContain(
      "Executive Decision Center",
    );
    expect(issuerPayload).toEqual(buyerIntelligenceFixture);
    expect(JSON.stringify(issuerPayload)).toContain("42000");
    expect(JSON.stringify(issuerPayload)).toContain("awardReadiness");
  });

  it("keeps supplier-safe briefs free of buyer award intelligence", () => {
    const supplierBrief = getExecutiveBrief({
      isOwner: false,
      isOpen: true,
      deadlinePassed: false,
      blindBiddingEnabled: true,
      commercialEvaluationUnlocked: false,
      quoteCount: 1,
      documentCount: 4,
      addendaCount: 1,
      healthScore: 82,
      recommendedQuote: { rank: 1, awardConfidence: 91 },
    });
    const supplierAction = getNextBestAction({
      isOwner: false,
      isOpen: true,
      canSubmitQuote: false,
      quoteCount: 1,
      documentCount: 4,
      addendaCount: 1,
      commercialEvaluationUnlocked: false,
      recommendedQuote: { rank: 1, awardConfidence: 91 },
    });
    const issuerBrief = getExecutiveBrief({
      isOwner: true,
      isOpen: true,
      deadlinePassed: false,
      blindBiddingEnabled: false,
      commercialEvaluationUnlocked: true,
      quoteCount: 3,
      documentCount: 4,
      addendaCount: 1,
      healthScore: 82,
      recommendedQuote: { rank: 1, awardConfidence: 91 },
    });

    for (const marker of RFQ_BUYER_ONLY_INTELLIGENCE_MARKERS) {
      expect(supplierBrief).not.toContain(marker);
      expect(supplierAction).not.toContain(marker);
    }
    expect(supplierBrief).toContain("confidential submission status");
    expect(supplierAction).toContain("Review the active RFQ package");
    expect(issuerBrief).toContain("award confidence");
    expect(issuerBrief).toContain("best-value option");
  });

  it("gates buyer-only RFQ detail surfaces behind the issuer capability", () => {
    const capabilityGate = detailPage.indexOf(
      "canExposeRfqBuyerExecutiveIntelligence(capabilities)",
    );
    const computeGate = detailPage.indexOf(
      "if (canViewBuyerExecutiveIntelligence)",
    );
    const healthMount = detailPage.indexOf("<RFQProcurementHealth");
    const riskMount = detailPage.indexOf("<RFQExecutiveRiskMatrix");
    const guidanceMount = detailPage.indexOf("<RFQExecutiveGuidance");
    const providerMount = detailPage.indexOf("<ExecutiveIntelligenceProvider");
    const decisionMount = detailPage.indexOf("<ExecutiveDecisionCenter");
    const readinessMount = detailPage.indexOf("<ExecutiveReadinessMeter");
    const savingsMount = detailPage.indexOf("potentialSavings={potentialSavings}");
    const advisorMount = detailPage.indexOf("<RFQAIAdvisor");
    const documentsMount = detailPage.indexOf("<RFQDocumentWorkspace");
    const quotesMount = detailPage.indexOf("<RFQQuoteWorkspace");
    const actionsMount = detailPage.indexOf("<RFQExecutiveActions");
    const governanceMount = detailPage.indexOf("<RFQGovernanceNotice");

    expect(capabilityGate).toBeGreaterThan(-1);
    expect(computeGate).toBeGreaterThan(capabilityGate);
    expect(healthMount).toBeGreaterThan(computeGate);
    expect(riskMount).toBeGreaterThan(capabilityGate);
    expect(guidanceMount).toBeGreaterThan(capabilityGate);
    expect(providerMount).toBeGreaterThan(capabilityGate);
    expect(decisionMount).toBeGreaterThan(providerMount);
    expect(readinessMount).toBeGreaterThan(providerMount);
    expect(savingsMount).toBeGreaterThan(providerMount);
    expect(advisorMount).toBeGreaterThan(capabilityGate);
    expect(documentsMount).toBeGreaterThan(decisionMount);
    expect(quotesMount).toBeGreaterThan(documentsMount);
    expect(actionsMount).toBeGreaterThan(-1);
    expect(governanceMount).toBeGreaterThan(-1);
    expect(detailPage).toContain("{canViewBuyerExecutiveIntelligence ? (");
    expect(detailPage).toContain("selectRfqDetailCommandMetrics({");
    expect(detailPage).not.toMatch(/display\s*:\s*none/);
    expect(detailPage).not.toMatch(/className=["'][^"']*\bhidden\b/);
    expect(intelligenceProvider).toContain('"use client"');
    expect(decisionCenter).toContain('label="Award Readiness"');
    expect(decisionCenter).toContain('label="Potential Savings"');
    expect(decisionCenter).toContain('label="Supplier Coverage"');
    expect(procurementHealth).toContain("Procurement Health Engine");
    expect(procurementHealth).toContain("Health Breakdown");
  });

  it("does not compute or serialize buyer executive intelligence for suppliers", () => {
    expect(detailPage).toContain("if (canViewBuyerExecutiveIntelligence)");
    expect(detailPage).toContain("buildExecutiveIntelligence({");
    expect(
      detailPage.indexOf("if (canViewBuyerExecutiveIntelligence)"),
    ).toBeLessThan(detailPage.indexOf("buildExecutiveIntelligence({"));
    expect(detailPage).toContain("isOwner\n  ? buildCommercialIntelligence");
    expect(detailPage).toContain("scoredQuotes: []");
    expect(detailPage).toContain("{executive ? (");
    expect(quoteWorkspace).toContain("<RFQSupplierQuotes");
    expect(quoteWorkspace).toContain('id="quote-intelligence"');
    expect(quoteWorkspace).toContain("Your organization\u2019s quote submission");
    expect(supplierQuotes).toContain('data-rfq-supplier-quotes="true"');
    expect(documents).toContain('id="document-center"');
    expect(detailPage).toContain("<RFQDocumentWorkspace");
    expect(detailPage).toContain("hasMyQuote={hasMyQuote}");
    expect(detailPage).toContain("quoteList={quoteList}");
    expect(detailPage).toContain(
      "participantRole === \"respondent\" &&\nquoteList.length > 0",
    );
  });

  it("keeps supplier-safe RFQ metadata and 32-series security contracts intact", () => {
    expect(detailPage).toContain('title={rfq.title || "Untitled RFQ"}');
    expect(detailPage).toContain(
      'description={rfq.description || "No description provided."}',
    );
    expect(detailPage).toContain(
      "formatDateTime(rfq.deadline, rfq.deadline_timezone)",
    );
    expect(detailPage).toContain('title: "Category"');
    expect(detailPage).toContain('title: "Location"');
    expect(detailPage).toContain("<RFQGovernanceNotice");
    expect(detailPage).toContain("canViewBlindBiddingControl");
    expect(detailPage).toContain(
      "const loadIssuerQuoteRows = isOwner && commercialEvaluationUnlocked;",
    );
    expect(quotesRoute).toContain(
      'return NextResponse.json({ error: "Unauthorized" }, { status: 401 });',
    );
    expect(quotesRoute).toContain("canSubmitCompanyQuote");
    expect(quotesRoute).not.toContain("get_rfq_invitation_context");
    expect(middleware).not.toContain('"/rfq"');
    expect(middleware).not.toContain('"/rfq/:path*"');
    expect(RFQ_BUYER_ONLY_INTELLIGENCE_MARKERS).toContain(
      "Executive Decision Center",
    );
  });
});

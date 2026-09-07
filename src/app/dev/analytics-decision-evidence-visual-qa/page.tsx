import { notFound } from "next/navigation";

import AIConfidenceEngine from "@/components/ai-confidence-engine";
import { RfqDecisionReadiness } from "@/components/analytics/award-probability-forecast";
import ExecutiveRiskCenter from "@/components/analytics/executive/executive-risk-center";
import BoardReportGenerator from "@/components/board-report-generator";
import BoardNarrativeGenerator from "@/components/ai-board-narrative-generator";
import type { RiskComplianceEvidence } from "@/lib/analytics/executive/risk-intelligence";
import { buildDecisionSupportReadiness } from "@/lib/analytics/executive/decision-support-readiness";
import { EXECUTIVE_PAGE_CLASS } from "@/lib/design-system/executive-contract";

const strongReadiness = buildDecisionSupportReadiness({
  dataQualityScore: 88,
  supplierEngagementScore: 81,
  benchmarkReadinessScore: 76,
});

const limitedReadiness = buildDecisionSupportReadiness({
  dataQualityScore: 34,
  supplierEngagementScore: 28,
  benchmarkReadinessScore: 31,
});

const visualQaRiskComplianceEvidence: RiskComplianceEvidence = {
  state: "limited",
  stateLabel: "Limited Evidence",
  narrative:
    "Static company-scoped evidence contains explainable compliance, RFQ, and supplier-response review indicators. These fixtures are for visual QA only and do not represent a universal enterprise risk rating, probability, regulatory determination, or third-party compliance verification.",
  indicators: [
    "1 self-declared compliance record is within the existing 30-day expiring-soon window.",
    "1 RFQ is missing one or more procurement classification fields.",
    "1 active RFQ has no submitted quotation evidence in the authorized analytics fixture.",
  ],
  limitations: [
    "Compliance information is maintained by this organization and has not been independently verified by Nexus Pavilion.",
    "Static development fixtures are deterministic visual-review evidence and are not production observations.",
  ],
  compliance: {
    evidenceState: "available",
    evidenceLabel: "Self-Declared",
    recordCount: 3,
    currentCount: 2,
    expiringSoonCount: 1,
    expiredCount: 0,
    notYetEffectiveCount: 0,
    noExpiryCount: 0,
    notice:
      "Compliance information is maintained by this organization and has not been independently verified by Nexus Pavilion.",
    summary:
      "3 self-declared compliance records are represented for visual QA: 2 current and 1 expiring soon.",
  },
  rfq: {
    evidenceState: "available",
    evidenceLabel: "Available",
    totalRfqs: 4,
    activeRfqs: 2,
    fullyClassifiedRfqs: 3,
    incompleteClassificationRfqs: 1,
    overdueOpenRfqs: 0,
    summary:
      "4 company-scoped RFQ fixtures are represented; 1 has incomplete classification evidence and none of the active fixtures is past its recorded deadline.",
  },
  supplier: {
    evidenceState: "limited",
    evidenceLabel: "Limited Evidence",
    distinctSuppliers: 3,
    rfqsWithQuoteEvidence: 2,
    activeRfqsWithoutQuoteEvidence: 1,
    summary:
      "3 distinct supplier fixtures appear in authorized quotation evidence; 2 RFQs have quote evidence and 1 active RFQ does not.",
  },
};

const rfqDecisionItems = [
  {
    title: "Central Plant Cooling Upgrade",
    scope: "Capital Equipment",
    sourcing: "Sealed Bid",
    quotes: 4,
    evaluationState: "Awarded",
    status: "Awarded",
  },
  {
    title: "Regional Logistics Services",
    scope: "Operational Services",
    sourcing: "Competitive RFQ",
    quotes: 3,
    evaluationState: "Evaluation Active",
    status: "Under Review",
  },
  {
    title: "Safety Equipment Framework",
    scope: "Indirect Procurement",
    sourcing: "Framework",
    quotes: 0,
    evaluationState: "Awaiting Quotes",
    status: "Published",
  },
  {
    title: "Facilities Preventive Maintenance",
    scope: "Operational Services",
    sourcing: "Competitive RFQ",
    quotes: 0,
    evaluationState: "No Submission Evidence",
    status: "Closed",
  },
];

export default function AnalyticsDecisionEvidenceVisualQaPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <main className={`${EXECUTIVE_PAGE_CLASS} min-h-screen overflow-x-hidden`}>
      <div className="mx-auto w-full max-w-[1600px] space-y-10 px-4 py-8 sm:px-6 lg:px-10">
        <header className="rounded-3xl border border-white/10 bg-[#061426]/80 p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-nexus-gold">
            Development Visual QA
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">
            Analytics Decision Evidence
          </h1>
          <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-slate-400 sm:text-base">
            Static deterministic fixtures for reviewing decision-support
            readiness, risk and compliance evidence, RFQ evaluation evidence,
            and truthful report gating.
          </p>
        </header>

        <section aria-labelledby="strong-evidence-heading" className="space-y-5">
          <h2 id="strong-evidence-heading" className="text-xl font-black text-white">
            Strong evidence state
          </h2>
          <AIConfidenceEngine
            decisionSupportReadiness={strongReadiness}
            supplierReliabilityScore={84}
          />
        </section>

        <section aria-labelledby="limited-evidence-heading" className="space-y-5">
          <h2 id="limited-evidence-heading" className="text-xl font-black text-white">
            Limited evidence state
          </h2>
          <AIConfidenceEngine
            decisionSupportReadiness={limitedReadiness}
            supplierReliabilityScore={39}
          />
        </section>

        <ExecutiveRiskCenter
          riskComplianceEvidence={visualQaRiskComplianceEvidence}
          procurementMaturityScore={62}
          decisionSupportReadinessScore={strongReadiness.score}
        />

        <RfqDecisionReadiness items={rfqDecisionItems} />

        <section aria-labelledby="report-ready-heading" className="space-y-5">
          <h2 id="report-ready-heading" className="text-xl font-black text-white">
            Report-ready evidence
          </h2>
          <BoardReportGenerator
            procurementRiskIndex={42}
            procurementMaturityScore={74}
            decisionSupportReadinessScore={strongReadiness.score}
            dataQualityScore={88}
            supplierDependencyRisk="Moderate"
            concentrationLevel="Balanced"
            benchmarkReadinessScore={76}
            boardHealthIndex={79}
            enterpriseProcurementScore={82}
            executiveReadinessScore={80}
            procurementEfficiencyScore={77}
            supplierEngagementScore={81}
            digitalMaturityScore={72}
          />
        </section>

        <section aria-labelledby="narrative-ready-heading" className="space-y-5">
          <h2 id="narrative-ready-heading" className="text-xl font-black text-white">
            Narrative-ready evidence
          </h2>
          <BoardNarrativeGenerator
            executiveBenchmarkStatus="Executive Ready"
            executiveStatus="Strong"
            boardHealthIndex={79}
            enterpriseProcurementScore={82}
            executiveReadinessScore={80}
            procurementRiskIndex={42}
            supplierEngagementScore={81}
            benchmarkReadinessScore={76}
            boardRecommendation="Maintain executive review while strengthening supplier participation and evidence coverage."
            procurementMaturityScore={74}
            decisionSupportReadinessScore={strongReadiness.score}
            decisionSupportReadinessLabel={strongReadiness.label}
          />
        </section>

        <section aria-labelledby="insufficient-report-heading" className="space-y-5">
          <h2 id="insufficient-report-heading" className="text-xl font-black text-white">
            Insufficient evidence gating
          </h2>
          <BoardReportGenerator
            procurementRiskIndex={71}
            procurementMaturityScore={32}
            decisionSupportReadinessScore={limitedReadiness.score}
            dataQualityScore={34}
            supplierDependencyRisk="High"
            concentrationLevel="Concentrated"
            benchmarkReadinessScore={31}
            boardHealthIndex={36}
            enterpriseProcurementScore={41}
            executiveReadinessScore={38}
            procurementEfficiencyScore={35}
            supplierEngagementScore={28}
            digitalMaturityScore={30}
          />
        </section>

        <section aria-labelledby="narrative-limited-heading" className="space-y-5">
          <h2 id="narrative-limited-heading" className="text-xl font-black text-white">
            Narrative insufficient evidence gating
          </h2>
          <BoardNarrativeGenerator
            executiveBenchmarkStatus="Insufficient Data"
            executiveStatus="Developing"
            boardHealthIndex={36}
            enterpriseProcurementScore={41}
            executiveReadinessScore={38}
            procurementRiskIndex={71}
            supplierEngagementScore={28}
            benchmarkReadinessScore={31}
            boardRecommendation="Strengthen procurement evidence before board-level action."
            procurementMaturityScore={32}
            decisionSupportReadinessScore={limitedReadiness.score}
            decisionSupportReadinessLabel={limitedReadiness.label}
          />
        </section>
      </div>
    </main>
  );
}

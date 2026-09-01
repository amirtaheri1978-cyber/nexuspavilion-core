import { notFound } from "next/navigation";

import AIConfidenceEngine from "@/components/ai-confidence-engine";
import { RfqDecisionReadiness } from "@/components/analytics/award-probability-forecast";
import ExecutiveRiskCenter from "@/components/analytics/executive/executive-risk-center";
import BoardReportGenerator from "@/components/board-report-generator";
import BoardNarrativeGenerator from "@/components/ai-board-narrative-generator";
import { EXECUTIVE_PAGE_CLASS } from "@/lib/design-system/executive-contract";
import { buildDecisionSupportReadiness } from "@/lib/analytics/executive/decision-support-readiness";

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
            readiness, procurement risk, RFQ evaluation evidence, and truthful
            report gating.
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
          procurementRiskIndex={68}
          supplierDependencyRisk="Elevated"
          concentrationLevel="High"
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

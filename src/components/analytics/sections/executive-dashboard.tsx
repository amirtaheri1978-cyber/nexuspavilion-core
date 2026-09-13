import AIConfidenceEngine from "@/components/ai-confidence-engine";
import { ExecutiveBenchmarkEngine } from "@/components/analytics/Executive-benchmark-engine";
import CEOMorningBriefing from "@/components/analytics/executive/ceo-briefing-intelligence";
import ExecutiveOperatingSystem from "@/components/analytics/executive/executive-operating-system";
import ExecutiveRiskCenter from "@/components/analytics/executive/executive-risk-center";
import { ExecutiveForecastEngine } from "@/components/analytics/executive-forecast-engine";
import { ExecutivePresentationCenter } from "@/components/analytics/executive-presentation-center";
import { ExecutiveScenarioCenter } from "@/components/analytics/executive-scenario-center";
import type { DecisionSupportReadiness } from "@/lib/analytics/executive/decision-support-readiness";
import type { RiskComplianceEvidence } from "@/lib/analytics/executive/risk-intelligence";
import type { CommercialEvidenceState } from "@/lib/analytics/commercial/commercial-insights";

type BenchmarkMatrixItem = {
  title: string;
  score: number | null;
};

type ExecutivePresentationExport = {
  title: string;
  status: string;
  audience: string;
};

type ExecutiveDashboardProps = {
  ceoMorningBrief: string;
  ceoReadinessScore: number | null;
  ceoPriorityLevel: string;
  ceoRiskLevel: string;
  ceoOpportunityLevel: string;
  ceoPriorityQueue: string[];
  ceoCriticalRisks: string[];
  ceoStrategicOpportunities: string[];

  boardHealthIndex: number | null;
  benchmarkReadinessScore: number | null;
  enterpriseCommandStatus: string;
  riskCommandStatus: string;
  opportunityCommandStatus: string;
  executiveCommandRecommendation: string;

  riskComplianceEvidence: RiskComplianceEvidence;
  procurementMaturityScore: number | null;
  decisionSupportReadiness: DecisionSupportReadiness | null;

  procurementOutlook: string;
  riskTrajectory: string;
  opportunityTrajectory: string;
  executiveForecastStatus: string;
  forecast30Days: string;
  forecast60Days: string;
  forecast90Days: string;
  boardForecastNarrative: string;

  bestCaseScenario: string;
  expectedCaseScenario: string;
  riskCaseScenario: string;
  forecastConfidenceLevel: string;
  executiveScenarioStatus: string;

  executivePresentationExports: ExecutivePresentationExport[];
  exportReadinessStatus: string;

  benchmarkMatrix: BenchmarkMatrixItem[];
  benchmarkPeerPosition: string;
  benchmarkStatus: string;
  benchmarkConfidence: string;
  benchmarkNarrative: string;
  benchmarkBoardRecommendation: string;

  supplierReliabilityScore: number | null;
  supplierCommercialEvidenceState: CommercialEvidenceState;
};

export function ExecutiveDashboard({
  ceoMorningBrief,
  ceoReadinessScore,
  ceoPriorityLevel,
  ceoRiskLevel,
  ceoOpportunityLevel,
  ceoPriorityQueue,
  ceoCriticalRisks,
  ceoStrategicOpportunities,
  boardHealthIndex,
  benchmarkReadinessScore,
  enterpriseCommandStatus,
  riskCommandStatus,
  opportunityCommandStatus,
  executiveCommandRecommendation,
  riskComplianceEvidence,
  procurementMaturityScore,
  decisionSupportReadiness,
  procurementOutlook,
  riskTrajectory,
  opportunityTrajectory,
  executiveForecastStatus,
  forecast30Days,
  forecast60Days,
  forecast90Days,
  boardForecastNarrative,
  bestCaseScenario,
  expectedCaseScenario,
  riskCaseScenario,
  forecastConfidenceLevel,
  executiveScenarioStatus,
  executivePresentationExports,
  exportReadinessStatus,
  benchmarkMatrix,
  benchmarkPeerPosition,
  benchmarkStatus,
  benchmarkConfidence,
  benchmarkNarrative,
  benchmarkBoardRecommendation,
  supplierReliabilityScore,
  supplierCommercialEvidenceState,
}: ExecutiveDashboardProps) {
  if (
    supplierCommercialEvidenceState !== "available" ||
    ceoReadinessScore === null ||
    boardHealthIndex === null ||
    benchmarkReadinessScore === null ||
    procurementMaturityScore === null ||
    decisionSupportReadiness === null ||
    supplierReliabilityScore === null ||
    benchmarkMatrix.some((item) => item.score === null)
  ) {
    const evidenceLabel =
      supplierCommercialEvidenceState === "access-restricted"
        ? "Access Restricted"
        : supplierCommercialEvidenceState === "policy-locked"
          ? "Policy Locked"
          : "Insufficient Data";

    return (
      <section className="mt-8 rounded-3xl border border-amber-300/15 bg-amber-400/[0.04] p-6 text-white">
        <p className="text-sm font-black">Executive Scores {evidenceLabel}</p>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
          Supplier and commercial inputs are unavailable under the current
          evidence controls. No composite executive score is reported from
          incomplete evidence.
        </p>
      </section>
    );
  }

  const availableBenchmarkMatrix = benchmarkMatrix.map((item) => ({
    ...item,
    score: item.score as number,
  }));

  return (
    <>
      <CEOMorningBriefing
        ceoMorningBrief={ceoMorningBrief}
        ceoReadinessScore={ceoReadinessScore}
        ceoPriorityLevel={ceoPriorityLevel}
        ceoRiskLevel={ceoRiskLevel}
        ceoOpportunityLevel={ceoOpportunityLevel}
        ceoPriorityQueue={ceoPriorityQueue}
        ceoCriticalRisks={ceoCriticalRisks}
        ceoStrategicOpportunities={ceoStrategicOpportunities}
      />

      <ExecutiveOperatingSystem
        boardHealthIndex={boardHealthIndex}
        benchmarkReadinessScore={benchmarkReadinessScore}
        enterpriseCommandStatus={enterpriseCommandStatus}
        riskCommandStatus={riskCommandStatus}
        opportunityCommandStatus={opportunityCommandStatus}
        executiveCommandRecommendation={executiveCommandRecommendation}
      />

      <ExecutiveRiskCenter
        riskComplianceEvidence={riskComplianceEvidence}
        procurementMaturityScore={procurementMaturityScore}
        decisionSupportReadinessScore={decisionSupportReadiness.score}
      />

      <ExecutiveForecastEngine
        procurementOutlook={procurementOutlook}
        riskTrajectory={riskTrajectory}
        opportunityTrajectory={opportunityTrajectory}
        executiveForecastStatus={executiveForecastStatus}
        forecast30Days={forecast30Days}
        forecast60Days={forecast60Days}
        forecast90Days={forecast90Days}
        boardForecastNarrative={boardForecastNarrative}
      />

      <ExecutiveScenarioCenter
        bestCaseScenario={bestCaseScenario}
        expectedCaseScenario={expectedCaseScenario}
        riskCaseScenario={riskCaseScenario}
        forecastConfidenceLevel={forecastConfidenceLevel}
        executiveScenarioStatus={executiveScenarioStatus}
      />

      <ExecutivePresentationCenter
        executivePresentationExports={executivePresentationExports}
        exportReadinessStatus={exportReadinessStatus}
      />

      <ExecutiveBenchmarkEngine
        benchmarkMatrix={availableBenchmarkMatrix}
        benchmarkPeerPosition={benchmarkPeerPosition}
        benchmarkStatus={benchmarkStatus}
        benchmarkConfidence={benchmarkConfidence}
        benchmarkNarrative={benchmarkNarrative}
        benchmarkBoardRecommendation={benchmarkBoardRecommendation}
      />

      <AIConfidenceEngine
        decisionSupportReadiness={decisionSupportReadiness}
        supplierReliabilityScore={supplierReliabilityScore}
      />
    </>
  );
}

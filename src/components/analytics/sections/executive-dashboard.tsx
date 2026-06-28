import AIConfidenceEngine from "@/components/ai-confidence-engine";
import { ExecutiveBenchmarkEngine} from  "@/components/analytics/Executive-benchmark-engine"
import CEOMorningBriefing from "@/components/analytics/executive/ceo-briefing-intelligence";
import ExecutiveOperatingSystem from "@/components/analytics/executive/executive-operating-system";
import ExecutiveRiskCenter from "@/components/analytics/executive/executive-risk-center";
import { ExecutiveForecastEngine } from "@/components/analytics/executive-forecast-engine";
import { ExecutivePresentationCenter } from "@/components/analytics/executive-presentation-center";
import { ExecutiveScenarioCenter } from "@/components/analytics/executive-scenario-center";

type BenchmarkMatrixItem = {
title: string;
score: number;
};

type ExecutivePresentationExport = {
title: string;
status: string;
audience: string;
};

type ExecutiveDashboardProps = {
ceoMorningBrief: string;
ceoReadinessScore: number;
ceoPriorityLevel: string;
ceoRiskLevel: string;
ceoOpportunityLevel: string;
ceoPriorityQueue: string[];
ceoCriticalRisks: string[];
ceoStrategicOpportunities: string[];

boardHealthIndex: number;
benchmarkReadinessScore: number;
enterpriseCommandStatus: string;
riskCommandStatus: string;
opportunityCommandStatus: string;
executiveCommandRecommendation: string;

procurementRiskIndex: number;
supplierDependencyRisk: string;
concentrationLevel: string;
procurementMaturityScore: number;
aiConfidenceScore: string;

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

dataQualityScore: number;
supplierReliabilityScore: number;
predictionAccuracy: number;
awardPredictionConfidence: string;
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
procurementRiskIndex,
supplierDependencyRisk,
concentrationLevel,
procurementMaturityScore,
aiConfidenceScore,
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
dataQualityScore,
supplierReliabilityScore,
predictionAccuracy,
awardPredictionConfidence,
}: ExecutiveDashboardProps) {
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
procurementRiskIndex={procurementRiskIndex}
supplierDependencyRisk={supplierDependencyRisk}
concentrationLevel={concentrationLevel}
procurementMaturityScore={procurementMaturityScore}
aiConfidenceScore={aiConfidenceScore}
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
benchmarkMatrix={benchmarkMatrix}
benchmarkPeerPosition={benchmarkPeerPosition}
benchmarkStatus={benchmarkStatus}
benchmarkConfidence={benchmarkConfidence}
benchmarkNarrative={benchmarkNarrative}
benchmarkBoardRecommendation={benchmarkBoardRecommendation}
/>

<AIConfidenceEngine
aiConfidenceScore={aiConfidenceScore}
dataQualityScore={dataQualityScore}
supplierReliabilityScore={supplierReliabilityScore}
predictionAccuracy={predictionAccuracy}
awardPredictionConfidence={awardPredictionConfidence}
/>
</>
);
}


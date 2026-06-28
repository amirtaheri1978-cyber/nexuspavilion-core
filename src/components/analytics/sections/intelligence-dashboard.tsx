import AIConfidenceEngine from "@/components/ai-confidence-engine";
import { ExecutiveAlertsCenter } from "@/components/analytics/executive-alerts-center";
import ExecutiveRecommendations from "@/components/analytics/executive-recommendations";
import DailyExecutiveBriefing from "@/components/executive/daily-executive-briefing";

type ExecutiveAlert = {
level: "healthy" | "opportunity" | "warning";
title: string;
message: string;
};

type ExecutiveRecommendation = {
role: string;
action: string;
};

type DailyBriefingItem = {
title: string;
message: string;
};

type IntelligenceDashboardProps = {
executiveAlerts: ExecutiveAlert[];
executiveRecommendations: ExecutiveRecommendation[];
dailyExecutiveBriefing: DailyBriefingItem[];

aiConfidenceScore: string;
dataQualityScore: number;
supplierReliabilityScore: number;
predictionAccuracy: number;
awardPredictionConfidence: string;
};

export function IntelligenceDashboard({
executiveAlerts,
executiveRecommendations,
dailyExecutiveBriefing,
aiConfidenceScore,
dataQualityScore,
supplierReliabilityScore,
predictionAccuracy,
awardPredictionConfidence,
}: IntelligenceDashboardProps) {
return (
<>
<ExecutiveAlertsCenter executiveAlerts={executiveAlerts} />

<ExecutiveRecommendations
executiveRecommendations={executiveRecommendations}
/>

<DailyExecutiveBriefing
dailyExecutiveBriefing={dailyExecutiveBriefing}
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

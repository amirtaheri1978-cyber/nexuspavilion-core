import Link from "next/link";
import AnalyticsChart from "@/components/analytics-chart";
import ExecutiveExportPanel from "@/components/executive-export-panel";
import { BoardroomSnapshot } from "@/components/analytics/boardroom-snapshot";
import { CEOActionCenter } from "@/components/analytics/ceo-action-center";
import { ExecutiveMetricCard } from "@/components/executive/executive-metric-card";
import BoardReportGenerator from "@/components/board-report-generator";
import AIBoardNarrativeGenerator from "@/components/ai-board-narrative-generator";
import ExecutiveRiskIntelligence from "@/components/executive-risk-intelligence";
import ProcurementCopilotIntelligence from "@/components/procurement-copilot-intelligence";
import { loadAnalyticsSourceData } from "@/lib/analytics/source-data/load-analytics-source-data";
import { ExecutiveOpportunityRanking } from "@/components/executive/executive-opportunity-ranking";
import { ExecutiveDashboard } from "@/components/analytics/sections/executive-dashboard";
import { BoardDashboard } from "@/components/analytics/sections/board-dashboard";
import { ProcurementDashboard } from "@/components/analytics/sections/procurement-dashboard";
import { buildAnalyticsNarrative } from "@/lib/analytics/narrative/analytics-narrative";
import { buildPortfolioIntelligence } from "@/lib/analytics/portfolio/portfolio-intelligence";
import { buildExecutiveBrief } from "@/lib/analytics/executive/executive-brief";
import { IntelligenceDashboard } from "@/components/analytics/sections/intelligence-dashboard";
import {
CONTRACT_FRAMEWORK_LABELS,
PROCUREMENT_SCOPE_LABELS,
SOURCING_METHOD_LABELS,
countByFramework,
countByScope,
countBySourcing,
getCompetitionLabel,
getContractFramework,
getHealthLabel,
getProcurementScope,
getSourcingMethod,
} from "@/lib/analytics/procurement-utils";
import { buildSupplierIntelligence } from "@/lib/analytics/supplier-intelligence";

import {
  calculateExecutiveScore,
  commandStatus,
} from "@/lib/analytics/executive-intelligence";

import {
  calculateBoardHealth,
} from "@/lib/executive/board-health";

import {
  calculateDigitalMaturity,
} from "@/lib/executive/digital-maturity";

import {
  calculateExecutiveReadiness,
} from "@/lib/executive/executive-readiness-score";

import { buildExecutiveNarrative } from "@/lib/analytics/executive/executive-narrative";

import {
  buildDecisionSupportReadiness,
} from "@/lib/analytics/executive/decision-support-readiness";

type ExecutiveAlert = {
level: "opportunity" | "healthy" | "warning";
title: string;
message: string;
};


export default async function AnalyticsPage() {
const {
  rfqList,
  quoteList,
  companyList,
} = await loadAnalyticsSourceData();

const {
vendorLeaderboard,
supplierRanking,
supplierRiskRadar,
strategicSuppliers,
preferredSuppliers,
highRiskSuppliers,
supplierDiversificationScore,
supplierReliabilityScore,
} = buildSupplierIntelligence({
quoteList,
companyList,
});

const {
  totalRfqs,
  activeRfqs,
  awardedContracts,
  supplierQuotes,
  procurementVolume,
  awardedVolume,
  averageQuote,
  
  potentialSavings,
  awardRate,
  avgQuotesPerRfq,
  budgetTotal,
  budgetUtilization,
  categoryCounts,
  topCategory,
} = buildPortfolioIntelligence({
  rfqList,
  quoteList,
});



const materialRfqs = countByScope(rfqList, "material");
const tradeRfqs = countByScope(rfqList, "subcontractor");
const equipmentRfqs = countByScope(rfqList, "equipment");
const serviceRfqs = countByScope(rfqList, "professional_service");

const openMarketRfqs = countBySourcing(rfqList, "open");
const invitedRfqs = countBySourcing(rfqList, "invited");
const sealedBidRfqs = countBySourcing(rfqList, "sealed_bid");

const projectSpecificRfqs = countByFramework(rfqList, "project_specific");
const frameworkRfqs = countByFramework(rfqList, "framework");

const constructionClassificationScore = Math.min(
100,
Math.round(
(totalRfqs > 0 ? 35 : 0) +
(materialRfqs > 0 ? 10 : 0) +
(tradeRfqs > 0 ? 10 : 0) +
(equipmentRfqs > 0 ? 10 : 0) +
(serviceRfqs > 0 ? 10 : 0) +
(openMarketRfqs > 0 ? 8 : 0) +
(invitedRfqs > 0 ? 8 : 0) +
(sealedBidRfqs > 0 ? 9 : 0),
),
);



const procurementMixStatus =
constructionClassificationScore >= 80
? "Mature RFQ Mix"
: constructionClassificationScore >= 60
? "Developing RFQ Mix"
: constructionClassificationScore >= 35
? "Early RFQ Mix"
: "No RFQ Mix Yet";


const supplierActivityScore = Math.min(100, supplierQuotes * 12);
const competitionScore = Math.min(100, avgQuotesPerRfq * 25);
const awardScore = Math.min(100, Math.round(awardRate * 1.5));
const savingsScore = potentialSavings > 0 ? 85 : 55;

const procurementHealthScore = Math.round(
supplierActivityScore * 0.25 +
competitionScore * 0.25 +
awardScore * 0.25 +
savingsScore * 0.25,
);

const procurementHealth = getHealthLabel(procurementHealthScore);
const competitionIndex = getCompetitionLabel(avgQuotesPerRfq);


const executiveProcurementHealth = Math.min(
100,
Math.round(awardRate * 0.4 + budgetUtilization * 0.3 + avgQuotesPerRfq * 10),
);
const forecastSavings = Math.round(potentialSavings * 1.2);
const dominantScope =
[
{ label: "Material", value: materialRfqs },
{ label: "Trade", value: tradeRfqs },
{ label: "Equipment", value: equipmentRfqs },
{ label: "Service", value: serviceRfqs },
].sort((a, b) => b.value - a.value)[0]?.label || "N/A";

const dominantSourcing =
[
{ label: "Open", value: openMarketRfqs },
{ label: "Invited", value: invitedRfqs },
{ label: "Sealed Bid", value: sealedBidRfqs },
].sort((a, b) => b.value - a.value)[0]?.label || "N/A";

const {
  executiveSummary,
  } = buildAnalyticsNarrative({
  totalRfqs,
  procurementHealth,
  competitionIndex,
  dominantScope,
  dominantSourcing,
  awardRate,
  supplierQuotes,
  potentialSavings,
  constructionClassificationScore,
  avgQuotesPerRfq,
  sealedBidRfqs,
  frameworkRfqs,
  budgetUtilization,
  topCategory,
});

const awardProbabilityForecast = rfqList
.map((rfq) => {
const rfqQuotes = quoteList.filter((quote) => quote.rfq_id === rfq.id);

const lowestBid =
rfqQuotes.length > 0
? Math.min(...rfqQuotes.map((quote) => Number(quote.amount || 0)))
: 0;

const scope = getProcurementScope(rfq.procurement_scope);
const sourcing = getSourcingMethod(rfq.sourcing_method);
const framework = getContractFramework(rfq.contract_framework);

const classificationBoost =
(scope ? 8 : 0) +
(sourcing === "sealed_bid" ? 8 : 0) +
(framework === "framework" ? 6 : 0);

const probability = Math.min(
95,
Math.max(
25,
Math.round(
rfqQuotes.length * 18 +
(rfq.status === "awarded" ? 35 : 0) +
(lowestBid > 0 ? 15 : 0) +
classificationBoost +
awardRate * 0.2,
),
),
);

return {
title: rfq.title || "Untitled RFQ",
category: rfq.category || "Procurement",
scope: PROCUREMENT_SCOPE_LABELS[scope],
sourcing: SOURCING_METHOD_LABELS[sourcing],
framework: CONTRACT_FRAMEWORK_LABELS[framework],
quotes: rfqQuotes.length,
probability,
status: rfq.status || "open",
};
})
.slice(0, 10);

const procurementRiskIndex = Math.max(0, 100 - procurementHealthScore);

const supplierDependencyRisk =
vendorLeaderboard.length <= 1
? "Critical"
: vendorLeaderboard.length <= 3
? "Medium"
: "Low";
const topVendorRevenue = vendorLeaderboard[0]?.revenue || 0;

const vendorConcentrationRisk =
awardedVolume > 0 ? Math.round((topVendorRevenue / awardedVolume) * 100) : 0;

const concentrationLevel =
vendorConcentrationRisk >= 70
? "High"
: vendorConcentrationRisk >= 40
? "Moderate"
: "Low";

const procurementMaturityScore = Math.min(
100,
Math.round(
procurementHealthScore * 0.45 +
competitionScore * 0.2 +
awardRate * 0.15 +
budgetUtilization * 0.1 +
constructionClassificationScore * 0.1,
),
);

const aiConfidenceScore =
procurementHealthScore >= 85
? "Very High"
: procurementHealthScore >= 70
? "High"
: procurementHealthScore >= 55
? "Moderate"
: "Low";

const dataQualityScore = Math.min(
100,
Math.round(
(totalRfqs > 0 ? 25 : 0) +
(supplierQuotes > 0 ? 25 : 0) +
(awardedContracts > 0 ? 20 : 0) +
(budgetTotal > 0 ? 15 : 0) +
(constructionClassificationScore >= 60 ? 15 : 0),
),
);

const predictionAccuracy =
procurementHealthScore >= 80
? 92
: procurementHealthScore >= 70
? 84
: procurementHealthScore >= 55
? 76
: 65;

const awardPredictionConfidence =
awardRate >= 50 ? "High" : awardRate >= 25 ? "Moderate" : "Low";

const { score: enterpriseProcurementScore, status: executiveStatus } =
calculateExecutiveScore(
procurementHealthScore,
predictionAccuracy,
dataQualityScore,
procurementRiskIndex,
constructionClassificationScore,
);

const procurementEfficiencyScore = Math.min(
100,
Math.round(
awardRate * 0.35 +
budgetUtilization * 0.25 +
avgQuotesPerRfq * 10 +
procurementHealthScore * 0.2 +
constructionClassificationScore * 0.1,
),
);

const supplierEngagementScore = Math.min(
100,
Math.round(supplierQuotes * 5 + avgQuotesPerRfq * 15 + supplierReliabilityScore * 0.3),
);

const executiveReadinessScore = calculateExecutiveReadiness(
enterpriseProcurementScore,
predictionAccuracy,
dataQualityScore,
);

const digitalMaturityScore = calculateDigitalMaturity(
procurementMaturityScore,
dataQualityScore,
supplierEngagementScore,
constructionClassificationScore,
);

const boardHealthIndex = calculateBoardHealth(
procurementEfficiencyScore,
executiveReadinessScore,
digitalMaturityScore,
procurementHealthScore,
);

const benchmarkReadinessScore = Math.min(
100,
Math.round(
procurementMaturityScore * 0.25 +
supplierEngagementScore * 0.2 +
executiveReadinessScore * 0.2 +
dataQualityScore * 0.2 +
predictionAccuracy * 0.15,
),
);

const executiveBenchmarkStatus =
benchmarkReadinessScore >= 85
? "Board Ready"
: benchmarkReadinessScore >= 70
? "Executive Ready"
: benchmarkReadinessScore >= 50
? "Operational"
: "Insufficient Data";

const supplierNetworkBenchmark =
supplierRanking.length >= 10
? "Scaled"
: supplierRanking.length >= 5
? "Developing"
: supplierRanking.length > 0
? "Early"
: "Insufficient Data";

const riskBenchmark =
procurementRiskIndex <= 25
? "Low Exposure"
: procurementRiskIndex <= 50
? "Moderate Exposure"
: procurementRiskIndex <= 75
? "Elevated Exposure"
: "Critical Exposure";

const procurementOpportunityScore = Math.min(
100,
Math.round(
potentialSavings / 1000 +
avgQuotesPerRfq * 15 +
awardRate * 0.3 +
budgetUtilization * 0.2 +
constructionClassificationScore * 0.15,
),
);

const enterpriseCommandStatus = commandStatus(enterpriseProcurementScore);

const riskCommandStatus =
procurementRiskIndex <= 25
? "Controlled"
: procurementRiskIndex <= 50
? "Managed"
: procurementRiskIndex <= 75
? "Elevated"
: "Critical";

const opportunityCommandStatus =
procurementOpportunityScore >= 80
? "High Opportunity"
: procurementOpportunityScore >= 60
? "Strong Opportunity"
: procurementOpportunityScore >= 40
? "Emerging Opportunity"
: "Limited Opportunity";

const governanceReadiness =
executiveReadinessScore >= 80
? "Board Ready"
: executiveReadinessScore >= 60
? "Executive Review"
: "Operational Review";

const financialVisibility =
dataQualityScore >= 80
? "High"
: dataQualityScore >= 60
? "Moderate"
: "Limited";

const riskVisibility =
procurementRiskIndex <= 25
? "Controlled"
: procurementRiskIndex <= 50
? "Monitored"
: "Escalated";

const boardReadinessScore = Math.min(
100,
Math.round(
boardHealthIndex * 0.3 +
executiveReadinessScore * 0.25 +
enterpriseProcurementScore * 0.2 +
benchmarkReadinessScore * 0.15 +
dataQualityScore * 0.1,
),
);



const ceoReadinessScore = Math.min(
100,
Math.round(
boardReadinessScore * 0.3 +
enterpriseProcurementScore * 0.25 +
executiveReadinessScore * 0.2 +
benchmarkReadinessScore * 0.15 +
supplierEngagementScore * 0.1,
),
);

const ceoPriorityLevel =
ceoReadinessScore >= 85
? "Strategic Expansion"
: ceoReadinessScore >= 70
? "Executive Optimization"
: ceoReadinessScore >= 55
? "Operational Stabilization"
: "Immediate Leadership Attention";

const ceoRiskLevel =
procurementRiskIndex <= 25
? "Low"
: procurementRiskIndex <= 50
? "Moderate"
: "High";

const ceoOpportunityLevel =
procurementOpportunityScore >= 80
? "High Opportunity"
: procurementOpportunityScore >= 60
? "Strong Opportunity"
: "Emerging Opportunity";

const ceoPriorityQueue = [
`Board Readiness: ${boardReadinessScore}/100`,
`Enterprise Score: ${enterpriseProcurementScore}/100`,
`Executive Readiness: ${executiveReadinessScore}/100`,
`Benchmark Status: ${executiveBenchmarkStatus}`,
];

const ceoCriticalRisks = [
`Risk Exposure: ${procurementRiskIndex}/100`,
`Supplier Dependency: ${supplierDependencyRisk}`,
`Vendor Concentration: ${concentrationLevel}`,
];

const ceoStrategicOpportunities = [
`Supplier Engagement: ${supplierEngagementScore}/100`,
`Procurement Opportunity: ${procurementOpportunityScore}/100`,
`Benchmark Readiness: ${benchmarkReadinessScore}/100`,
];

const ceoMorningBrief = `
Nexus Pavilion executive intelligence indicates a CEO readiness score
of ${ceoReadinessScore}/100. Current board readiness is
${boardReadinessScore}/100 with ${executiveBenchmarkStatus}
benchmark status. Enterprise procurement performance is
${enterpriseProcurementScore}/100 while procurement risk exposure
remains ${ceoRiskLevel.toLowerCase()}.
`;

const bestProcurementCategory = topCategory;



const savingsOpportunityLevel =
potentialSavings > 50000
? "Major Savings"
: potentialSavings > 10000
? "Strong Savings"
: potentialSavings > 0
? "Moderate Savings"
: "Low Savings";

const executiveCommandRecommendation =
boardHealthIndex >= 85 &&
benchmarkReadinessScore >= 80 &&
procurementRiskIndex <= 35
? "Board-ready environment. Accelerate strategic procurement initiatives."
: procurementRiskIndex >= 70
? "High risk exposure detected. Prioritize mitigation before expansion."
: supplierDependencyRisk === "Critical"
? "Supplier concentration risk detected. Diversify supplier network."
: procurementOpportunityScore >= 70
? "Strong opportunity signals detected. Increase procurement leverage."
: "Continue operational optimization and monitor performance.";

const boardPresentationStatus =
boardHealthIndex >= 85 && benchmarkReadinessScore >= 80
? "Ready For Board Review"
: boardHealthIndex >= 70
? "Executive Review Required"
: "Operational Improvement Required";

const boardRiskPosition =
procurementRiskIndex <= 25
? "Low Risk"
: procurementRiskIndex <= 50
? "Moderate Risk"
: "Elevated Risk";

const boardStrategicPosition =
procurementOpportunityScore >= 70
? "Growth Opportunity"
: supplierDependencyRisk === "Critical"
? "Supplier Diversification Required"
: "Operational Optimization";

const executiveAlerts: ExecutiveAlert[] = [];
if (constructionClassificationScore < 60) {
executiveAlerts.push({
level: "warning",
title: "RFQ Classification Maturity Is Low",
message:
"Improve material, trade, equipment, service, sourcing, and framework classification to strengthen intelligence quality.",
});
}

if (procurementOpportunityScore >= 80) {
executiveAlerts.push({
level: "opportunity",
title: "Major Savings Opportunity",
message:
"Category and RFQ mix analysis indicates significant procurement savings potential.",
});
}

if (predictionAccuracy >= 75) {
executiveAlerts.push({
level: "healthy",
title: "Forecast Accuracy Above Target",
message: "Prediction models are performing above the target threshold.",
});
}

if (procurementRiskIndex >= 35) {
executiveAlerts.push({
level: "warning",
title: "Supplier Dependency Risk",
message: "Vendor concentration should be reviewed to reduce exposure.",
});
}

if (supplierRanking.length <= 3) {
executiveAlerts.push({
level: "warning",
title: "Limited Supplier Participation",
message: "Expand supplier coverage to improve competition and pricing.",
});
}

const executiveRecommendations = [
{
role: "CEO Action",
action:
procurementOpportunityScore >= 80
? `Prioritize ${bestProcurementCategory} and ${dominantScope} procurement as strategic growth and savings areas.`
: "Maintain procurement discipline while scaling executive visibility and classified RFQ activity.",
},
{
role: "CFO Action",
action:
forecastSavings > 0
? `Review ${forecastSavings.toLocaleString()} dollars in forecast savings opportunity.`
: "Monitor spend performance and improve budget-to-award visibility.",
},
{
role: "Procurement Director",
action:
supplierRanking.length <= 3
? "Expand supplier participation to reduce vendor dependency risk."
: `Continue strengthening supplier performance, ${dominantSourcing.toLowerCase()} workflows, and category coverage.`,
},
{
role: "Board Priority",
action:
boardHealthIndex >= 70
? "Scale procurement intelligence adoption across enterprise stakeholders."
: "Improve procurement data maturity, supplier coverage, RFQ classification, and award conversion.",
},
];

const categoryIntelligence = Object.entries(categoryCounts)
.map(([category, count]) => {
const categoryRfqs = rfqList.filter(
(rfq) => (rfq.category || "Uncategorized") === category,
);

const categoryRfqIds = categoryRfqs.map((rfq) => rfq.id);

const categoryQuotes = quoteList.filter((quote) =>
categoryRfqIds.includes(quote.rfq_id),
);

const categoryAwards = categoryQuotes.filter(
(quote) => quote.decision === "awarded",
);

const categorySpend = categoryAwards.reduce(
(total, quote) => total + Number(quote.amount || 0),
0,
);

const categoryWinRate =
categoryQuotes.length > 0
? Math.round((categoryAwards.length / categoryQuotes.length) * 100)
: 0;

const categoryOpportunityScore = Math.min(
100,
Math.round(
count * 20 +
categoryQuotes.length * 10 +
categoryWinRate * 0.3 +
Math.min(categorySpend / 10000, 25),
),
);

return {
category,
rfqs: count,
quotes: categoryQuotes.length,
awards: categoryAwards.length,
spend: categorySpend,
winRate: categoryWinRate,
opportunityScore: categoryOpportunityScore,
};
})
.sort((a, b) => b.opportunityScore - a.opportunityScore)
.slice(0, 5);

const executiveScenarios = [
{
scenario: "Supplier Expansion",
outcome:
supplierRanking.length >= 10
? "Already achieved"
: "Increase supplier participation to improve competition and pricing.",
impact: "+ Procurement resilience",
confidence: "High",
},
{
scenario: "Risk Reduction",
outcome:
procurementRiskIndex <= 35
? "Risk profile already optimized"
: "Reduce supplier dependency and concentration exposure.",
impact: "+ Executive confidence",
confidence: "High",
},
{
scenario: "Award Optimization",
outcome:
awardRate >= 50
? "Award execution performing well"
: "Improve RFQ-to-award conversion performance.",
impact: "+ Procurement velocity",
confidence: "Medium",
},
{
scenario: "Savings Capture",
outcome:
potentialSavings > 10000
? `Capture approximately $${potentialSavings.toLocaleString()} in value.`
: "Increase procurement competition to unlock savings.",
impact: "+ Financial performance",
confidence: "Medium",
},
];
const executiveDecisionSimulator = [
{
decision: "Expand Supplier Network",
expectedImpact:
supplierRanking.length >= 10
? "Supplier network already operating at scale."
: "Higher competition and stronger procurement resilience.",
risk: supplierRanking.length >= 10 ? "Low" : "Moderate",
confidence: aiConfidenceScore,
},
{
decision: "Reduce Supplier Dependency",
expectedImpact:
procurementRiskIndex <= 35
? "Risk exposure already optimized."
: "Lower concentration risk and stronger executive confidence.",
risk: procurementRiskIndex <= 35 ? "Low" : "Moderate",
confidence: aiConfidenceScore,
},
{
decision: "Accelerate Award Decisions",
expectedImpact:
awardRate >= 50
? "Award process performing efficiently."
: "Faster procurement execution and operational delivery.",
risk: awardRate >= 50 ? "Low" : "Moderate",
confidence: awardPredictionConfidence,
},
{
decision: "Capture Savings Opportunity",
expectedImpact:
potentialSavings > 10000
? `Potential value of $${potentialSavings.toLocaleString()}.`
: "Limited savings opportunity currently available.",
risk: "Low",
confidence:
procurementOpportunityScore >= 80
? "High"
: procurementOpportunityScore >= 60
? "Medium"
: "Low",
},
];

const executiveForecastCenter = [
{
title: "Procurement Outlook",
forecast:
procurementHealthScore >= 80
? "Positive"
: procurementHealthScore >= 60
? "Stable"
: "Improvement Required",
},
{
title: "Supplier Outlook",
forecast:
supplierEngagementScore >= 80
? "Expanding"
: supplierEngagementScore >= 60
? "Stable"
: "At Risk",
},
{
title: "Risk Outlook",
forecast:
procurementRiskIndex <= 35
? "Controlled"
: procurementRiskIndex <= 60
? "Monitor"
: "Elevated",
},
{
title: "Executive Outlook",
forecast:
executiveReadinessScore >= 80
? "Decision Ready"
: executiveReadinessScore >= 60
? "Developing"
: "Limited Visibility",
},
];

const procurementCommandRoom = [
{
title: "Board Readiness",
value: executiveBenchmarkStatus,
},
{
title: "Decision Confidence",
value: aiConfidenceScore,
},
{
title: "Risk Position",
value: riskBenchmark,
},
{
title: "Opportunity Position",
value:
procurementOpportunityScore >= 80
? "High"
: procurementOpportunityScore >= 60
? "Medium"
: "Low",
},
{
title: "Supplier Strength",
value: supplierNetworkBenchmark,
},
{
title: "Industry Position",
value: executiveBenchmarkStatus,
},
];

const procurementCommandRoomStatus =
boardHealthIndex >= 80 && executiveReadinessScore >= 80
? "Executive Control"
: boardHealthIndex >= 65
? "Operational Control"
: "Capability Development";

const boardPresentationReadiness =
benchmarkReadinessScore >= 85
? "Board Ready"
: benchmarkReadinessScore >= 70
? "Executive Ready"
: "Preparation Required";

const boardNarrative =
procurementRiskIndex >= 60
? "Board attention should focus on supplier dependency, concentration risk, and procurement resilience."
: procurementOpportunityScore >= 80
? "Board attention should focus on growth opportunities, savings capture, and supplier expansion."
: "Board attention should focus on maintaining procurement performance and strengthening executive readiness.";

const boardPresentationMetrics = [
{
title: "Board Readiness",
value: `${benchmarkReadinessScore}/100`,
},
{
title: "Board Health",
value: `${boardHealthIndex}/100`,
},
{
title: "Executive Readiness",
value: `${executiveReadinessScore}/100`,
},
{
title: "Decision Confidence",
value: aiConfidenceScore,
},
];
const boardRiskPriorities = [
{
title:
procurementRiskIndex >= 60
? "Supplier Dependency Risk"
: "Supplier Risk Position",
priority:
procurementRiskIndex >= 60
? "Critical"
: procurementRiskIndex >= 40
? "Moderate"
: "Monitor",
impact:
procurementRiskIndex >= 60
? "High"
: procurementRiskIndex >= 40
? "Medium"
: "Low",
attention:
procurementRiskIndex >= 60
? "Immediate"
: procurementRiskIndex >= 40
? "90 Days"
: "Ongoing",
summary:
procurementRiskIndex >= 60
? "Supplier dependency requires board visibility before procurement volume scales further."
: procurementRiskIndex >= 40
? "Supplier dependency should remain under management review as procurement activity expands."
: "Supplier risk is currently controlled but should continue to be monitored.",
},
{
title:
supplierRanking.length <= 3
? "Limited Supplier Competition"
: "Supplier Competition Health",
priority:
supplierRanking.length <= 3
? "Critical"
: supplierRanking.length <= 6
? "Moderate"
: "Monitor",
impact:
supplierRanking.length <= 3
? "High"
: supplierRanking.length <= 6
? "Medium"
: "Low",
attention:
supplierRanking.length <= 3
? "Immediate"
: supplierRanking.length <= 6
? "90 Days"
: "Ongoing",
summary:
supplierRanking.length <= 3
? "Limited supplier participation may reduce quote quality, competitive leverage, and decision confidence."
: supplierRanking.length <= 6
? "Supplier participation is developing and should be expanded to improve competitive coverage."
: "Supplier participation supports healthy procurement competition.",
},
{
title:
constructionClassificationScore < 60
? "RFQ Classification Maturity"
: "Structured RFQ Intelligence",
priority:
constructionClassificationScore < 45
? "Critical"
: constructionClassificationScore < 60
? "Moderate"
: "Monitor",
impact:
constructionClassificationScore < 45
? "High"
: constructionClassificationScore < 60
? "Medium"
: "Low",
attention:
constructionClassificationScore < 45
? "Immediate"
: constructionClassificationScore < 60
? "90 Days"
: "Ongoing",
summary:
constructionClassificationScore < 60
? "RFQ classification maturity should improve before executive reporting relies heavily on category-level intelligence."
: "Structured RFQ intelligence is active and supports executive interpretation.",
},
{
title: awardRate < 25 ? "Award Execution Risk" : "Award Conversion Health",
priority:
awardRate < 25
? "Critical"
: awardRate < 45
? "Moderate"
: "Monitor",
impact: awardRate < 25 ? "High" : awardRate < 45 ? "Medium" : "Low",
attention: awardRate < 25 ? "Immediate" : awardRate < 45 ? "90 Days" : "Ongoing",
summary:
awardRate < 25
? "Award execution history is not yet strong enough to support high-confidence procurement decision patterns."
: awardRate < 45
? "Award conversion is developing and should be monitored as RFQ activity increases."
: "Award conversion supports procurement decision confidence.",
},
];

const boardDeckSlides = [
{
slide: "01",
title: "Executive Summary",
focus: boardPresentationReadiness,
narrative: boardNarrative,
},
{
slide: "02",
title: "Board Readiness",
focus: `${benchmarkReadinessScore}/100`,
narrative:
"Board readiness reflects procurement maturity, executive confidence, supplier engagement, and benchmark strength.",
},
{
slide: "03",
title: "Risk Priorities",
focus: boardRiskPriorities[0]?.title || "Risk Monitoring",
narrative:
boardRiskPriorities[0]?.summary ||
"Procurement risk remains under executive monitoring.",
},
{
slide: "04",
title: "Opportunity Priorities",
focus:
procurementOpportunityScore >= 80
? "High Opportunity"
: procurementOpportunityScore >= 60
? "Medium Opportunity"
: "Opportunity Monitoring",
narrative:
procurementOpportunityScore >= 80
? "Procurement opportunity is strong and should be reviewed for board-level growth planning."
: procurementOpportunityScore >= 60
? "Procurement opportunity is developing and should remain under executive review."
: "Procurement opportunities remain under executive monitoring.",
},
{
slide: "05",
title: "Decision Confidence",
focus: aiConfidenceScore,
narrative:
"Decision confidence reflects AI confidence, benchmark readiness, supplier participation, and procurement signal quality.",
},
{
slide: "06",
title: "Executive Recommendation",
focus: procurementCommandRoomStatus,
narrative: executiveCommandRecommendation,
},
];

const topQuarterOpportunities = [
`${bestProcurementCategory} category expansion`,
`${savingsOpportunityLevel} savings capture`,
`${dominantScope} RFQ mix growth`,
"Supplier network growth",
];
const executiveOpportunityRanking = [
{
title: `${bestProcurementCategory} Expansion`,
priority:
procurementOpportunityScore >= 80
? "Immediate"
: procurementOpportunityScore >= 60
? "90 Days"
: "Strategic",
impact:
procurementOpportunityScore >= 80
? "High"
: procurementOpportunityScore >= 60
? "Medium"
: "Long-Term",
value: `${procurementOpportunityScore}/100`,
summary: `Expand procurement activity within ${bestProcurementCategory} to increase sourcing coverage and operational leverage.`,
},
{
title: "Savings Capture",
priority:
potentialSavings >= 10000
? "Immediate"
: potentialSavings >= 5000
? "90 Days"
: "Strategic",
impact:
potentialSavings >= 10000
? "High"
: potentialSavings >= 5000
? "Medium"
: "Long-Term",
value: `$${potentialSavings.toLocaleString()}`,
summary: `Current procurement intelligence indicates a ${savingsOpportunityLevel.toLowerCase()} savings opportunity.`,
},
{
title: "Supplier Network Growth",
priority:
supplierEngagementScore < 60
? "Immediate"
: supplierEngagementScore < 80
? "90 Days"
: "Strategic",
impact: supplierEngagementScore < 60 ? "High" : "Medium",
value: `${supplierEngagementScore}/100`,
summary:
"Expand supplier participation to improve competition, quote coverage, and decision confidence.",
},
{
title: `${dominantScope} RFQ Growth`,
priority: "Strategic",
impact: "Medium",
value: dominantScope,
summary:
"Increase RFQ volume within the dominant procurement scope to strengthen market intelligence.",
},
];

const executiveOpportunityIntelligence = executiveOpportunityRanking.map(
(opportunity, index) => ({
...opportunity,
rank: index + 1,
businessImpact:
opportunity.impact === "High"
? "High business impact with direct executive visibility."
: opportunity.impact === "Medium"
? "Moderate business impact with operational improvement potential."
: "Long-term strategic value requiring continued development.",
executionHorizon:
opportunity.priority === "Immediate"
? "Immediate executive action"
: opportunity.priority === "90 Days"
? "90-day execution window"
: "Strategic planning cycle",
boardPriority:
opportunity.priority === "Immediate"
? "High"
: opportunity.priority === "90 Days"
? "Medium"
: "Monitor",
ceoRecommendation:
opportunity.priority === "Immediate"
? "Assign executive ownership and begin action planning immediately."
: opportunity.priority === "90 Days"
? "Include in the next quarterly procurement leadership review."
: "Track as a strategic opportunity for future procurement expansion.",
}),
);

const boardRecommendation =
procurementRiskIndex >= 60
? "Reduce supplier dependency and review award concentration before scaling procurement volume."
: procurementOpportunityScore >= 80
? "Prioritize high-opportunity procurement categories and expand supplier participation to capture savings."
: enterpriseProcurementScore >= 75
? "Continue scaling competitive RFQs while maintaining supplier performance, RFQ structure, and forecast confidence."
: "Improve RFQ participation, supplier coverage, classification maturity, and procurement data quality to strengthen executive confidence.";

const industryBenchmarkScore = Math.min(
100,
Math.round(
procurementHealthScore * 0.35 +
supplierReliabilityScore * 0.2 +
competitionScore * 0.2 +
predictionAccuracy * 0.15 +
constructionClassificationScore * 0.1,
),
);

const procurementBenchmarkScore = Math.min(
100,
Math.round(
procurementMaturityScore * 0.45 +
executiveProcurementHealth * 0.25 +
boardHealthIndex * 0.2 +
constructionClassificationScore * 0.1,
),
);

const supplierBenchmarkScore = Math.min(
100,
Math.round(
supplierReliabilityScore * 0.5 +
supplierEngagementScore * 0.3 +
competitionScore * 0.2,
),
);

const costOptimizationBenchmark = Math.min(
100,
Math.round(
budgetUtilization * 0.3 +
procurementOpportunityScore * 0.4 +
savingsScore * 0.3,
),
);

const benchmarkMatrix = [
{ title: "Industry", score: industryBenchmarkScore },
{ title: "Procurement", score: procurementBenchmarkScore },
{ title: "Supplier", score: supplierBenchmarkScore },
{ title: "Cost", score: costOptimizationBenchmark },
];
const benchmarkStatus =
industryBenchmarkScore >= 85
? "Top Quartile"
: industryBenchmarkScore >= 70
? "Above Average"
: industryBenchmarkScore >= 55
? "Average"
: "Below Benchmark";

const benchmarkPeerPosition =
industryBenchmarkScore >= 85
? "Top Quartile Performer"
: industryBenchmarkScore >= 70
? "Above Peer Median"
: industryBenchmarkScore >= 55
? "Median Performer"
: "Below Peer Benchmark";

const benchmarkConfidence =
benchmarkReadinessScore >= 80 && dataQualityScore >= 70
? "High Confidence"
: benchmarkReadinessScore >= 60 && dataQualityScore >= 50
? "Moderate Confidence"
: "Limited Confidence";

const benchmarkNarrative =
industryBenchmarkScore >= 85
? "Nexus Pavilion is benchmarking as a top-quartile procurement intelligence environment, with strong operating maturity, supplier participation, and executive decision readiness."
: industryBenchmarkScore >= 70
? "Nexus Pavilion is performing above the peer median, with credible procurement maturity and supplier intelligence signals. Continued improvement should focus on supplier depth, award history, and financial validation."
: industryBenchmarkScore >= 55
? "Nexus Pavilion is operating near the peer median. The platform has early executive intelligence, but stronger RFQ volume, supplier coverage, and award validation are required before board-level confidence increases."
: "Nexus Pavilion remains below benchmark readiness. Executive benchmarking should stay in a transparent improvement state until validated procurement activity, supplier participation, and decision history improve.";

const benchmarkBoardRecommendation =
industryBenchmarkScore >= 85
? "Maintain governance discipline while scaling procurement intelligence across additional categories and supplier segments."
: industryBenchmarkScore >= 70
? "Prioritize supplier network expansion, award workflow completion, and confidence validation to move toward top-quartile positioning."
: industryBenchmarkScore >= 55
? "Strengthen RFQ activity, supplier participation, and procurement data quality before positioning the platform as board-ready."
: "Focus on foundational procurement data capture before using benchmark output for executive decisions.";

const decisionSupportReadiness =
  buildDecisionSupportReadiness({
    dataQualityScore,
    predictionAccuracy,
    supplierEngagementScore,
    benchmarkReadinessScore,
  });

const decisionConfidenceDrivers = [
`Data Quality: ${dataQualityScore}/100`,
`Prediction Accuracy: ${predictionAccuracy}`,
`Supplier Engagement: ${supplierEngagementScore}/100`,
`Benchmark Readiness: ${benchmarkReadinessScore}/100`,
];

const decisionConfidenceRisks = [
procurementRiskIndex >= 60
? "Procurement risk exposure may reduce decision confidence."
: "Procurement risk is not currently blocking decision confidence.",
supplierEngagementScore < 50
? "Supplier engagement remains below executive decision threshold."
: "Supplier engagement supports decision interpretation.",
dataQualityScore < 60
? "Data quality requires improvement before stronger executive reliance."
: "Data quality supports executive reporting confidence.",
benchmarkReadinessScore < 60
? "Benchmark readiness is still below board-grade confidence."
: "Benchmark readiness supports executive-level comparison.",
];

const executiveDecisionQueue = [
procurementRiskIndex >= 50
? "Review supplier concentration risk."
: "Maintain supplier diversification strategy.",
potentialSavings > 10000
? `Capture $${potentialSavings.toLocaleString()} savings opportunity.`
: "Monitor category savings performance.",
constructionClassificationScore < 60
? "Improve construction RFQ classification maturity."
: "Maintain RFQ classification discipline.",
awardRate < 25
? "Improve RFQ conversion and award execution."
: "Maintain award conversion performance.",
];
const ceoActionCenter = [
{
phase: "Immediate",
title: "Executive Attention",
summary: boardRecommendation,
},
{
phase: "30 Days",
title: "Operational Focus",
summary:
executiveDecisionQueue[0] ||
"Maintain procurement operating discipline.",
},
{
phase: "90 Days",
title: "Growth Initiative",
summary:
executiveOpportunityRanking[0]?.summary ||
"Expand procurement intelligence coverage.",
},
{
phase: "Strategic",
title: "Enterprise Direction",
summary: executiveCommandRecommendation,
},
];

const ceoOperatingStatus =
enterpriseProcurementScore >= 80 && executiveReadinessScore >= 80
? "Executive Growth Mode"
: enterpriseProcurementScore >= 65
? "Operational Scaling Mode"
: "Capability Development Mode";

const ceoDecisionPosture =
  decisionSupportReadiness.status === "board-ready"
    ? "Proceed"
    : decisionSupportReadiness.status === "management-ready"
      ? "Proceed With Review"
      : "Require Validation";

const procurementCommandCenter = [
{
title: "Top Risk",
value: boardRiskPriorities[0]?.title || "No Critical Risks",
status: boardRiskPriorities[0]?.priority || "Monitor",
},
{
title: "Top Opportunity",
value:
executiveOpportunityRanking[0]?.title ||
"No Opportunity Identified",
status: executiveOpportunityRanking[0]?.priority || "Strategic",
},
{
title: "CEO Priority",
value: ceoActionCenter[0]?.title || "No Active Priority",
status: ceoDecisionPosture,
},
{
  title: "Decision Support Readiness",
  value: decisionSupportReadiness.label,
  status: executiveBenchmarkStatus,
},
];

const commandCenterStatus =
  enterpriseProcurementScore >= 80 &&
  decisionSupportReadiness.status === "board-ready"
    ? "Command Ready"
    : enterpriseProcurementScore >= 65
      ? "Operational Command"
      : "Developing Command";

const portfolioHealthIndex = Math.min(
100,
Math.round(
supplierReliabilityScore * 0.4 +
supplierDiversificationScore * 0.3 +
supplierEngagementScore * 0.3,
),
);

const portfolioStatus =
portfolioHealthIndex >= 85
? "Excellent"
: portfolioHealthIndex >= 70
? "Healthy"
: portfolioHealthIndex >= 55
? "Moderate"
: "Needs Attention";

const portfolioRecommendations: string[] = [];

if (highRiskSuppliers > 0) {
portfolioRecommendations.push(
"Reduce exposure to high-risk suppliers.",
);
}

if (supplierDiversificationScore < 60) {
portfolioRecommendations.push(
"Expand supplier network to improve diversification.",
);
}

if (strategicSuppliers < 3) {
portfolioRecommendations.push(
"Develop additional strategic supplier relationships.",
);
}

if (portfolioRecommendations.length === 0) {
portfolioRecommendations.push(
"Supplier portfolio is performing within target range.",
);
}

const topRisk =
vendorConcentrationRisk >= 70
? "Vendor concentration exceeds recommended threshold."
: supplierRanking.length <= 3
? "Supplier participation remains limited."
: procurementRiskIndex >= 50
? "Procurement risk level is elevated."
: constructionClassificationScore < 60
? "RFQ classification maturity remains under target."
: "No major enterprise procurement risks detected.";

const topOpportunity =
potentialSavings > 0
? `${bestProcurementCategory} category contains ${potentialSavings.toLocaleString()} dollars in savings opportunity.`
: `${dominantScope} procurement mix can be expanded to uncover additional savings opportunities.`;

const ceoPriority =
procurementOpportunityScore >= 70
? "Scale supplier network, category expansion, and RFQ intelligence maturity."
: "Improve procurement growth initiatives.";

const cfoPriority =
forecastSavings > 0
? `Capture forecast savings of ${forecastSavings.toLocaleString()} dollars.`
: "Increase budget visibility and spend optimization.";

const procurementPriority =
avgQuotesPerRfq < 2
? "Increase RFQ competition and supplier engagement."
: "Maintain healthy procurement competition levels.";
const dailyExecutiveBriefing = [
{ title: "CEO", message: ceoPriority },
{ title: "CFO", message: cfoPriority },
{ title: "Procurement", message: procurementPriority },
{ title: "Risk", message: topRisk },
{ title: "Opportunity", message: topOpportunity },
];

const activityChartData = [
{ name: "RFQs", value: totalRfqs },
{ name: "Active", value: activeRfqs },
{ name: "Quotes", value: supplierQuotes },
{ name: "Awards", value: awardedContracts },
];

const valueChartData = [
{ name: "Volume", value: procurementVolume },
{ name: "Awarded", value: awardedVolume },
{ name: "Avg Quote", value: averageQuote },
{ name: "Savings", value: potentialSavings },
];

const rfqMixChartData = [
{ name: "Material", value: materialRfqs },
{ name: "Trade", value: tradeRfqs },
{ name: "Equipment", value: equipmentRfqs },
{ name: "Service", value: serviceRfqs },
];

const procurementOutlook =
enterpriseProcurementScore >= 85
? "Strong Growth Outlook"
: enterpriseProcurementScore >= 70
? "Positive Outlook"
: enterpriseProcurementScore >= 55
? "Stable Outlook"
: "Improvement Required";

const forecast30Days =
procurementRiskIndex >= 60
? "Risk stabilization required."
: "Operational procurement growth expected.";

const forecast60Days =
supplierEngagementScore >= 70
? "Supplier participation expansion expected."
: "Supplier engagement initiatives recommended.";

const forecast90Days =
benchmarkReadinessScore >= 80
? "Board-ready procurement intelligence expected."
: "Benchmark maturity improvements recommended.";

const riskTrajectory =
procurementRiskIndex >= 60
? "Elevated"
: procurementRiskIndex >= 40
? "Moderate"
: "Controlled";

const opportunityTrajectory =
procurementOpportunityScore >= 80
? "Accelerating"
: procurementOpportunityScore >= 60
? "Growing"
: "Emerging";

const executiveForecastStatus =
enterpriseProcurementScore >= 80 && executiveReadinessScore >= 80
? "Forecast Confidence High"
: enterpriseProcurementScore >= 65
? "Forecast Confidence Moderate"
: "Forecast Confidence Developing";

const boardForecastNarrative =
enterpriseProcurementScore >= 80
? "Enterprise procurement performance supports a positive executive forecast with opportunities for scale, efficiency, and supplier expansion."
: enterpriseProcurementScore >= 65
? "Procurement operations are improving and forecast indicators remain positive with moderate executive confidence."
: "Forecast indicators suggest capability development should remain a strategic priority before major procurement expansion.";

const bestCaseScenario =
procurementOpportunityScore >= 80
? "Accelerated procurement growth with expanded supplier participation and higher savings realization."
: "Improved procurement performance with stronger supplier engagement.";

const expectedCaseScenario =
enterpriseProcurementScore >= 70
? "Stable procurement growth with moderate opportunity capture and controlled risk."
: "Gradual procurement improvement with ongoing capability development.";

const riskCaseScenario =
procurementRiskIndex >= 60
? "Supplier dependency and execution risk may reduce forecast confidence and delay strategic objectives."
: "Risk exposure remains manageable but should be monitored.";

const forecastConfidenceLevel =
enterpriseProcurementScore >= 80 && benchmarkReadinessScore >= 80
? "High"
: enterpriseProcurementScore >= 65
? "Moderate"
: "Developing";

const executiveScenarioStatus =
forecastConfidenceLevel === "High"
? "Decision Ready"
: forecastConfidenceLevel === "Moderate"
? "Review Required"
: "Validation Required";

const boardForecastBriefing =
forecastConfidenceLevel === "High"
? "Forecast indicators support executive confidence. Procurement performance, supplier engagement, and benchmark readiness suggest favorable operating conditions for board-level planning."
: forecastConfidenceLevel === "Moderate"
? "Forecast indicators remain positive but require continued monitoring of supplier participation, risk exposure, and procurement execution."
: "Forecast indicators suggest additional validation and capability development before major strategic decisions are recommended.";

const boardForecastPriority =
procurementRiskIndex >= 60
? "Risk Stabilization"
: procurementOpportunityScore >= 80
? "Growth Acceleration"
: "Operational Improvement";
const executivePresentationExports = [
{
title: "Board Brief",
status: boardPresentationReadiness,
audience: "Board Members",
},
{
title: "CEO Brief",
status: executiveScenarioStatus,
audience: "Chief Executive Officer",
},
{
title: "Procurement Brief",
status: executiveBenchmarkStatus,
audience: "Procurement Leadership",
},
{
title: "Executive Summary",
status: executiveForecastStatus,
audience: "Executive Team",
},
];

const exportReadinessStatus =
benchmarkReadinessScore >= 80 && executiveReadinessScore >= 80
? "Export Ready"
: "Review Required";

const boardAutomationStatus =
exportReadinessStatus === "Export Ready"
? "Automation Ready"
: "Requires Review";

const boardPackageLifecycle =
exportReadinessStatus === "Export Ready"
? "Ready for board package generation"
: "Pending executive validation";

const boardDistributionStatus =
benchmarkReadinessScore >= 80 && executiveReadinessScore >= 80
? "Distribution Ready"
: "Distribution Hold";

const boardApprovalWorkflow =
boardDistributionStatus === "Distribution Ready"
? "Ready for board review"
: "Requires executive approval";

const boardAutomationItems = [
{
title: "Board Package",
status: boardAutomationStatus,
},
{
title: "Readiness Validation",
status: exportReadinessStatus,
},
{
title: "Distribution Status",
status: boardDistributionStatus,
},
{
title: "Approval Workflow",
status: boardApprovalWorkflow,
},
];

const boardPackageStages = [
{
stage: "Data Collection",
status: "Complete",
},
{
stage: "Executive Validation",
status: executiveReadinessScore >= 80 ? "Complete" : "In Progress",
},
{
stage: "Board Preparation",
status: benchmarkReadinessScore >= 80 ? "Ready" : "Pending",
},
{
stage: "Board Distribution",
status: boardDistributionStatus,
},
];

const boardDistributionChannels = [
{
channel: "Board Members",
status: boardDistributionStatus,
},
{
channel: "CEO Office",
status: "Ready",
},
{
channel: "Executive Committee",
status: executiveReadinessScore >= 80 ? "Ready" : "Pending",
},
{
channel: "Audit Committee",
status: procurementRiskIndex <= 50 ? "Ready" : "Review Required",
},
];

const boardDistributionReadiness =
boardDistributionStatus === "Distribution Ready"
? "Ready For Distribution"
: "Executive Review Required";

const boardApprovalStages = [
{
stage: "Executive Review",
status: executiveReadinessScore >= 80 ? "Approved" : "Pending",
},
{
stage: "Risk Validation",
status: procurementRiskIndex <= 50 ? "Approved" : "Review Required",
},
{
stage: "Board Package Approval",
status:
boardDistributionStatus === "Distribution Ready" ? "Approved" : "Pending",
},
{
stage: "Distribution Authorization",
status:
boardDistributionReadiness === "Ready For Distribution"
? "Authorized"
: "Hold",
},
];

const boardApprovalStatus =
boardDistributionReadiness === "Ready For Distribution"
? "Board Approved"
: "Awaiting Approval";


const topQuarterRisks = [
procurementRiskIndex >= 50
? "Supplier dependency"
: "Low risk exposure",
supplierRanking.length <= 3
? "Limited supplier competition"
: "Healthy supplier participation",
constructionClassificationScore < 60
? "Low RFQ classification maturity"
: "Structured RFQ intelligence active",
];

const executiveBrief = buildExecutiveBrief({
  opportunity: {
    topCategory,
    potentialSavings,
    avgQuotesPerRfq,
    supplierCount: supplierRanking.length,
  },
  executiveRecommendation: executiveCommandRecommendation,
decisionSupportReadinessScore:
  decisionSupportReadiness.score,
  topRisk,
  procurementRiskIndex,
  supplierCount: supplierRanking.length,
  avgQuotesPerRfq,
  classificationScore: constructionClassificationScore,
});
const executiveNarrative =
  buildExecutiveNarrative(executiveBrief);

return (
<main className="min-h-screen bg-[#030712] px-8 py-10">
<div className="mx-auto max-w-7xl">
<Link
href="/dashboard"
className="text-sm font-semibold text-slate-400 transition hover:text-white"
>
← Back to Dashboard
</Link>

<div className="mt-8">
<BoardroomSnapshot
  executiveBrief={executiveBrief}
  quotedPortfolioValue={procurementVolume}
  estimatedSavingsOpportunity={forecastSavings}
  enterpriseProcurementScore={enterpriseProcurementScore}
  constructionClassificationScore={constructionClassificationScore}
  executiveNarrative={executiveNarrative}
/>
</div>
<section className="mt-8 rounded-3xl border border-white/10 bg-[#061426]/88 p-8 text-white shadow-executive">
<p className="text-xs font-black uppercase tracking-[0.3em] text-[#C8A646]">
Construction Procurement Intelligence
</p>

<div className="mt-5 grid gap-8 lg:grid-cols-[1fr_0.8fr]">
<div>
<h1 className="text-5xl font-black">Procurement Analytics</h1>

<p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
{executiveCommandRecommendation}
</p>
</div>

<div className="grid gap-4 sm:grid-cols-2">
<DarkMetric
title="Enterprise Score"
value={`${enterpriseProcurementScore}/100`}
/>
<DarkMetric
title="Opportunity"
value={`${procurementOpportunityScore}/100`}
/>
<DarkMetric
title="Risk Index"
value={`${procurementRiskIndex}/100`}
/>
<DarkMetric
title="Forecast Accuracy"
value={`${predictionAccuracy}%`}
/>
</div>
</div>
</section>

<section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
<MetricCard title="Material RFQs" value={materialRfqs.toString()} />
<MetricCard title="Trade RFQs" value={tradeRfqs.toString()} />
<MetricCard title="Equipment RFQs" value={equipmentRfqs.toString()} />
<MetricCard title="Service RFQs" value={serviceRfqs.toString()} />
</section>

<section className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-5">
<MetricCard title="Open Market" value={openMarketRfqs.toString()} />
<MetricCard title="Invited RFQs" value={invitedRfqs.toString()} />
<MetricCard title="Sealed Bids" value={sealedBidRfqs.toString()} />
<MetricCard
title="Project Specific"
value={projectSpecificRfqs.toString()}
/>
<MetricCard title="Framework RFQs" value={frameworkRfqs.toString()} />
</section>

<section className="mt-8 rounded-3xl border border-white/10 bg-[#061426]/88 p-8 text-white shadow-executive">
<p className="text-xs font-black uppercase tracking-[0.25em] text-[#C8A646]">
RFQ Classification Intelligence
</p>

<h2 className="mt-3 text-3xl font-black text-white">
Construction Procurement Mix
</h2>

<p className="mt-3 max-w-4xl text-sm leading-7 text-slate-400">
Nexus Pavilion now separates material, trade, equipment, service,
sourcing method, and framework agreement activity to improve
supplier matching, quote comparison, risk scoring, and executive
intelligence.
</p>

<div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
<div className="rounded-3xl border border-white/10 bg-black/15 p-4">
<AnalyticsChart data={rfqMixChartData} />
</div>

<div className="rounded-3xl border border-white/10 bg-white/[0.045] p-6">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
RFQ Mix Status
</p>

<h3 className="mt-3 text-3xl font-black text-white">
{procurementMixStatus}
</h3>

<p className="mt-3 text-sm leading-7 text-slate-400">
Classification score is {constructionClassificationScore}/100.
Dominant procurement scope is {dominantScope}. Dominant sourcing
method is {dominantSourcing}.
</p>
</div>
</div>
</section>

<IntelligenceDashboard
executiveAlerts={executiveAlerts}
executiveRecommendations={executiveRecommendations}
dailyExecutiveBriefing={dailyExecutiveBriefing}
aiConfidenceScore={aiConfidenceScore}
dataQualityScore={dataQualityScore}
supplierReliabilityScore={supplierReliabilityScore}
predictionAccuracy={predictionAccuracy}
awardPredictionConfidence={awardPredictionConfidence}
/>

<section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
<MetricCard
title="Health Score"
value={`${procurementHealthScore}/100`}
/>
<MetricCard title="Procurement Health" value={procurementHealth} />
<MetricCard title="Competition Index" value={competitionIndex} />
<MetricCard
title="Avg Quotes / RFQ"
value={avgQuotesPerRfq.toString()}
/>
</section>
<section className="mt-8 rounded-3xl border border-white/10 bg-[#061426]/88 p-8 text-white shadow-executive">
<p className="text-xs font-black uppercase tracking-[0.25em] text-[#C8A646]">
Decision Confidence Layer
</p>

<h2 className="text-3xl font-black text-white">
  Executive Decision Support Readiness
</h2>
<p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-slate-400">
Nexus Pavilion evaluates whether procurement intelligence is
reliable enough to support executive interpretation, board
reporting, and strategic decision guidance.
</p>

<div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
  <MetricCard
    title="Readiness Score"
    value={`${decisionSupportReadiness.score}/100`}
  />
  <MetricCard
    title="Readiness Level"
    value={decisionSupportReadiness.label}
  />
  <MetricCard title="AI Confidence" value={aiConfidenceScore} />
  <MetricCard title="Benchmark Confidence" value={benchmarkConfidence} />
</div>

<div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
<div className="rounded-3xl border border-white/10 bg-white/[0.045] p-6">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
Confidence Drivers
</p>

<div className="mt-4 space-y-3">
{decisionConfidenceDrivers.map((driver) => (
<div
key={driver}
className="rounded-2xl border border-white/10 bg-[#061426]/70 p-4"
>
<p className="text-sm font-semibold text-slate-300">
{driver}
</p>
</div>
))}
</div>
</div>

<div className="rounded-3xl border border-white/10 bg-slate-950 p-6 text-white">
<p className="text-xs font-black uppercase tracking-[0.25em] text-[#C8A646]">
Executive Guidance
</p>

<h3 className="mt-4 text-2xl font-black">
  {decisionSupportReadiness.label}
</h3>

<p className="mt-4 text-sm font-semibold leading-7 text-slate-300">
  {decisionSupportReadiness.guidance}
</p>
</div>
</div>

<div className="mt-8 rounded-3xl border border-amber-300/20 bg-amber-400/10 p-6">
<p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">
Confidence Risks
</p>

<div className="mt-4 grid gap-3 md:grid-cols-2">
{decisionConfidenceRisks.map((risk) => (
<div
key={risk}
className="rounded-2xl border border-white/10 bg-[#061426]/70 p-4"
>
<p className="text-sm font-semibold text-slate-300">
{risk}
</p>
</div>
))}
</div>
</div>
</section>

<ExecutiveOpportunityRanking
opportunities={executiveOpportunityRanking}
intelligence={executiveOpportunityIntelligence}
/>

<section className="mt-8 rounded-3xl border border-white/10 bg-[#061426]/88 p-8 text-white shadow-executive">
<p className="text-xs font-black uppercase tracking-[0.25em] text-[#C8A646]">
Executive Scenario Intelligence
</p>

<h2 className="mt-3 text-3xl font-black text-white">
Strategic Scenario Modeling
</h2>

<p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-slate-400">
Executive scenario modeling evaluates potential procurement
outcomes, operational impact, and strategic decision consequences
before action is taken.
</p>

<div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
{executiveScenarios.map((scenario) => (
<div
key={scenario.scenario}
className="rounded-3xl border border-[#2CC4E8]/15 bg-[#2CC4E8]/[0.055] p-6"
>
<p className="text-xs font-black uppercase tracking-[0.2em] text-[#9BE8F8]">
{scenario.scenario}
</p>

<p className="mt-4 text-sm font-semibold leading-7 text-slate-300">
{scenario.outcome}
</p>

<div className="mt-5 rounded-2xl border border-white/10 bg-[#061426]/70 p-4">
<p className="text-xs font-black uppercase tracking-[0.15em] text-slate-500">
Impact
</p>

<p className="mt-2 font-black text-white">{scenario.impact}</p>
</div>

<div className="mt-4 rounded-2xl border border-white/10 bg-[#061426]/70 p-4">
<p className="text-xs font-black uppercase tracking-[0.15em] text-slate-500">
Confidence
</p>

<p className="mt-2 font-black text-white">
{scenario.confidence}
</p>
</div>
</div>
))}
</div>
</section>
<section className="mt-8 rounded-3xl border border-white/10 bg-[#061426]/88 p-8 text-white shadow-executive">
<p className="text-xs font-black uppercase tracking-[0.25em] text-[#C8A646]">
Executive Decision Simulator
</p>

<h2 className="mt-3 text-3xl font-black text-white">
Decision Outcome Modeling
</h2>

<p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-slate-400">
Simulate executive procurement decisions and evaluate expected
operational impact, confidence level, and implementation risk.
</p>

<div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
{executiveDecisionSimulator.map((item) => (
<div
key={item.decision}
className="rounded-3xl border border-purple-300/15 bg-purple-400/[0.055] p-6"
>
<p className="text-xs font-black uppercase tracking-[0.2em] text-purple-300">
Decision
</p>

<h3 className="mt-4 text-xl font-black text-white">
{item.decision}
</h3>

<p className="mt-4 text-sm font-semibold leading-7 text-slate-300">
{item.expectedImpact}
</p>

<div className="mt-5 rounded-2xl border border-white/10 bg-[#061426]/70 p-4">
<p className="text-xs font-black uppercase tracking-[0.15em] text-slate-500">
Risk
</p>

<p className="mt-2 font-black text-white">{item.risk}</p>
</div>

<div className="mt-4 rounded-2xl border border-white/10 bg-[#061426]/70 p-4">
<p className="text-xs font-black uppercase tracking-[0.15em] text-slate-500">
Confidence
</p>

<p className="mt-2 font-black text-white">
{item.confidence}
</p>
</div>
</div>
))}
</div>
</section>

<section className="mt-8 rounded-3xl border border-white/10 bg-[#061426]/88 p-8 text-white shadow-executive">
<p className="text-xs font-black uppercase tracking-[0.25em] text-[#C8A646]">
Executive Forecast Center
</p>

<h2 className="mt-3 text-3xl font-black text-white">
Forward-Looking Intelligence
</h2>

<p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-slate-400">
Forecast procurement readiness, supplier health, executive
visibility, and enterprise risk trajectory using current operating
signals.
</p>

<div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
{executiveForecastCenter.map((forecast) => (
<div
key={forecast.title}
className="rounded-3xl border border-[#2CC4E8]/15 bg-[#2CC4E8]/[0.055] p-6"
>
<p className="text-xs font-black uppercase tracking-[0.2em] text-[#9BE8F8]">
{forecast.title}
</p>

<h3 className="mt-4 text-2xl font-black text-white">
{forecast.forecast}
</h3>
</div>
))}
</div>
</section>

<div className="mt-8">
<CEOActionCenter
ceoOperatingStatus={ceoOperatingStatus}
ceoDecisionPosture={ceoDecisionPosture}
executiveBenchmarkStatus={executiveBenchmarkStatus}
executiveCommandRecommendation={executiveCommandRecommendation}
ceoActionCenter={ceoActionCenter}
/>
</div>

<ExecutiveDashboard
ceoMorningBrief={ceoMorningBrief}
ceoReadinessScore={ceoReadinessScore}
ceoPriorityLevel={ceoPriorityLevel}
ceoRiskLevel={ceoRiskLevel}
ceoOpportunityLevel={ceoOpportunityLevel}
ceoPriorityQueue={ceoPriorityQueue}
ceoCriticalRisks={ceoCriticalRisks}
ceoStrategicOpportunities={ceoStrategicOpportunities}
boardHealthIndex={boardHealthIndex}
benchmarkReadinessScore={benchmarkReadinessScore}
enterpriseCommandStatus={enterpriseCommandStatus}
riskCommandStatus={riskCommandStatus}
opportunityCommandStatus={opportunityCommandStatus}
executiveCommandRecommendation={executiveCommandRecommendation}
procurementRiskIndex={procurementRiskIndex}
supplierDependencyRisk={supplierDependencyRisk}
concentrationLevel={concentrationLevel}
procurementMaturityScore={procurementMaturityScore}
aiConfidenceScore={aiConfidenceScore}
procurementOutlook={procurementOutlook}
riskTrajectory={riskTrajectory}
opportunityTrajectory={opportunityTrajectory}
executiveForecastStatus={executiveForecastStatus}
forecast30Days={forecast30Days}
forecast60Days={forecast60Days}
forecast90Days={forecast90Days}
boardForecastNarrative={boardForecastNarrative}
bestCaseScenario={bestCaseScenario}
expectedCaseScenario={expectedCaseScenario}
riskCaseScenario={riskCaseScenario}
forecastConfidenceLevel={forecastConfidenceLevel}
executiveScenarioStatus={executiveScenarioStatus}
executivePresentationExports={executivePresentationExports}
exportReadinessStatus={exportReadinessStatus}
benchmarkMatrix={benchmarkMatrix}
benchmarkPeerPosition={benchmarkPeerPosition}
benchmarkStatus={benchmarkStatus}
benchmarkConfidence={benchmarkConfidence}
benchmarkNarrative={benchmarkNarrative}
benchmarkBoardRecommendation={benchmarkBoardRecommendation}
dataQualityScore={dataQualityScore}
supplierReliabilityScore={supplierReliabilityScore}
predictionAccuracy={predictionAccuracy}
awardPredictionConfidence={awardPredictionConfidence}
/>
<section className="mt-8 rounded-3xl border border-white/10 bg-slate-950 p-8 text-white shadow-executive">
<p className="text-xs font-black uppercase tracking-[0.25em] text-[#C8A646]">
Board Forecast Briefing
</p>

<h2 className="mt-3 text-4xl font-black">
Executive Forecast Narrative
</h2>

<div className="mt-8 grid gap-4 md:grid-cols-2">
<div className="rounded-2xl border border-white/10 bg-white/5 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-[#C8A646]">
Board Priority
</p>

<h3 className="mt-3 text-2xl font-black">
{boardForecastPriority}
</h3>
</div>

<div className="rounded-2xl border border-white/10 bg-white/5 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-[#C8A646]">
Forecast Confidence
</p>

<h3 className="mt-3 text-2xl font-black">
{forecastConfidenceLevel}
</h3>
</div>
</div>

<div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6">
<p className="text-xs font-black uppercase tracking-[0.25em] text-[#C8A646]">
Board Narrative
</p>

<p className="mt-4 text-sm font-semibold leading-7 text-slate-300">
{boardForecastBriefing}
</p>
</div>
</section>

<BoardDashboard
boardReadinessScore={boardReadinessScore}
governanceReadiness={governanceReadiness}
financialVisibility={financialVisibility}
riskVisibility={riskVisibility}
boardRecommendation={boardRecommendation}
boardRiskPriorities={boardRiskPriorities}
boardPresentationMetrics={boardPresentationMetrics}
boardPresentationReadiness={boardPresentationReadiness}
boardNarrative={boardNarrative}
boardDeckSlides={boardDeckSlides}
boardAutomationItems={boardAutomationItems}
boardAutomationStatus={boardAutomationStatus}
boardPackageLifecycle={boardPackageLifecycle}
boardPackageStages={boardPackageStages}
boardDistributionChannels={boardDistributionChannels}
boardDistributionReadiness={boardDistributionReadiness}
boardApprovalStages={boardApprovalStages}
boardApprovalStatus={boardApprovalStatus}
/>

<section className="mt-8 rounded-3xl border border-white/10 bg-[#061426]/88 p-8 text-white shadow-executive">
<p className="text-xs font-black uppercase tracking-[0.25em] text-[#C8A646]">
Executive Procurement Intelligence
</p>

<div className="mt-4 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
<div>
<h2 className="text-3xl font-black text-white">
Procurement Health Summary
</h2>

<p className="mt-3 max-w-4xl text-sm leading-7 text-slate-400">
{executiveSummary}
</p>
</div>

<div className="rounded-3xl border border-white/10 bg-white/[0.045] p-6">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
AI Signals
</p>

<div className="mt-4 space-y-3">
<SignalRow
label="Supplier Activity"
value={`${supplierActivityScore}/100`}
/>
<SignalRow
label="Competition"
value={`${competitionScore}/100`}
/>
<SignalRow
label="Award Conversion"
value={`${awardScore}/100`}
/>
<SignalRow
label="RFQ Maturity"
value={`${constructionClassificationScore}/100`}
/>
</div>
</div>
</div>
</section>

<section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
<MetricCard title="Total RFQs" value={totalRfqs.toString()} />
<MetricCard title="Active RFQs" value={activeRfqs.toString()} />
<MetricCard
title="Awarded Contracts"
value={awardedContracts.toString()}
/>
<MetricCard title="Supplier Quotes" value={supplierQuotes.toString()} />
</section>

<section className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
<MetricCard
title="Procurement Volume"
value={`$${procurementVolume.toLocaleString()}`}
/>
<MetricCard
title="Awarded Volume"
value={`$${awardedVolume.toLocaleString()}`}
/>
<MetricCard
title="Average Quote"
value={`$${averageQuote.toLocaleString()}`}
/>
<MetricCard title="Award Rate" value={`${awardRate}%`} />
</section>

<ProcurementDashboard
procurementCommandRoom={procurementCommandRoom}
procurementCommandRoomStatus={procurementCommandRoomStatus}
procurementCommandCenter={procurementCommandCenter}
commandCenterStatus={commandCenterStatus}
executiveCommandRecommendation={executiveCommandRecommendation}
activityChartData={activityChartData}
valueChartData={valueChartData}
awardProbabilityForecast={awardProbabilityForecast}
rfqList={rfqList}
procurementScopeLabels={PROCUREMENT_SCOPE_LABELS}
sourcingMethodLabels={SOURCING_METHOD_LABELS}
contractFrameworkLabels={CONTRACT_FRAMEWORK_LABELS}
categoryIntelligence={categoryIntelligence}
portfolioHealthIndex={portfolioHealthIndex}
strategicSuppliers={strategicSuppliers}
preferredSuppliers={preferredSuppliers}
highRiskSuppliers={highRiskSuppliers}
supplierDiversificationScore={supplierDiversificationScore}
portfolioStatus={portfolioStatus}
portfolioRecommendations={portfolioRecommendations}
/>

<ExecutiveExportPanel />


<section className="mt-8 rounded-3xl border border-white/10 bg-[#061426]/88 p-8 text-white shadow-executive">
<p className="text-xs font-black uppercase tracking-[0.25em] text-[#C8A646]">
Executive Benchmark Center
</p>

<h2 className="mt-3 text-3xl font-black text-white">
Enterprise Procurement Benchmark
</h2>

<p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-slate-400">
Benchmark procurement maturity, supplier network strength,
award confidence, risk exposure, peer positioning, and board
readiness using validated Nexus Pavilion operating data.
</p>

<div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-5">
<MetricCard
title="Benchmark Score"
value={`${benchmarkReadinessScore}/100`}
/>
<MetricCard
title="Benchmark Status"
value={executiveBenchmarkStatus}
/>
<MetricCard
title="Peer Position"
value={benchmarkPeerPosition}
/>
<MetricCard
title="Supplier Network"
value={supplierNetworkBenchmark}
/>
<MetricCard
title="Risk Benchmark"
value={riskBenchmark}
/>
</div>

<div className="mt-8 rounded-3xl border border-white/10 bg-slate-950 p-6">
<p className="text-xs font-black uppercase tracking-[0.25em] text-[#C8A646]">
Executive Benchmark Interpretation
</p>

<h3 className="mt-4 text-2xl font-black text-white">
{benchmarkPeerPosition}
</h3>

<p className="mt-4 text-sm font-semibold leading-7 text-slate-300">
{benchmarkNarrative}
</p>

<p className="mt-4 text-sm font-semibold leading-7 text-slate-300">
{benchmarkBoardRecommendation}
</p>
</div>
</section>

<section className="mt-8 rounded-3xl border border-white/10 bg-[#061426]/88 p-8 text-white shadow-executive">
<p className="text-xs font-black uppercase tracking-[0.25em] text-[#C8A646]">
Executive Procurement Intelligence
</p>

<h2 className="mt-3 text-3xl font-black text-white">
Board Decision Intelligence
</h2>

<p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-slate-400">
Executive interpretation layer converting procurement metrics,
benchmark intelligence, supplier signals, and risk indicators
into board-level actions.
</p>
<div className="mt-8 grid gap-6 lg:grid-cols-3">
<div className="rounded-3xl border border-red-300/20 bg-red-400/10 p-6">
<p className="text-xs font-black uppercase tracking-[0.2em] text-red-300">
Board Risks
</p>

<div className="mt-4 space-y-3">
{topQuarterRisks.map((risk) => (
<div
key={risk}
className="rounded-2xl border border-white/10 bg-[#061426]/70 p-4"
>
<p className="text-sm font-semibold text-slate-300">
{risk}
</p>
</div>
))}
</div>
</div>

<div className="rounded-3xl border border-emerald-300/20 bg-emerald-400/10 p-6">
<p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
Board Opportunities
</p>

<div className="mt-4 space-y-3">
{topQuarterOpportunities.map((opportunity) => (
<div
key={opportunity}
className="rounded-2xl border border-white/10 bg-[#061426]/70 p-4"
>
<p className="text-sm font-semibold text-slate-300">
{opportunity}
</p>
</div>
))}
</div>
</div>

<div className="rounded-3xl border border-[#2CC4E8]/20 bg-[#2CC4E8]/10 p-6">
<p className="text-xs font-black uppercase tracking-[0.2em] text-[#9BE8F8]">
Executive Actions
</p>

<div className="mt-4 space-y-4">
<div className="rounded-2xl border border-white/10 bg-[#061426]/70 p-4">
<p className="text-xs font-black uppercase tracking-[0.15em] text-[#9BE8F8]">
Immediate
</p>

<p className="mt-2 text-sm font-semibold text-slate-300">
{boardRecommendation}
</p>
</div>

<div className="rounded-2xl border border-white/10 bg-[#061426]/70 p-4">
<p className="text-xs font-black uppercase tracking-[0.15em] text-[#9BE8F8]">
90 Days
</p>

<p className="mt-2 text-sm font-semibold text-slate-300">
{executiveCommandRecommendation}
</p>
</div>

<div className="rounded-2xl border border-white/10 bg-[#061426]/70 p-4">
<p className="text-xs font-black uppercase tracking-[0.15em] text-[#9BE8F8]">
Strategic Position
</p>

<p className="mt-2 text-sm font-semibold text-slate-300">
{executiveBenchmarkStatus}
</p>
</div>
</div>
</div>
</div>
</section>

<section className="mt-8 rounded-3xl border border-white/10 bg-slate-950 p-8 text-white shadow-executive">
<p className="text-xs font-black uppercase tracking-[0.25em] text-[#C8A646]">
Executive Scorecard
</p>

<h2 className="mt-3 text-4xl font-black">
Board-Level Procurement Command Scorecard
</h2>

<p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-slate-300">
Nexus Pavilion consolidates procurement maturity, board health,
benchmark readiness, supplier engagement, digital maturity, and
enterprise risk posture into a single executive decision layer.
</p>

<div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
<DarkMetric title="Board Health" value={`${boardHealthIndex}/100`} />
<DarkMetric
title="Enterprise Score"
value={`${enterpriseProcurementScore}/100`}
/>
<DarkMetric
title="Executive Readiness"
value={`${executiveReadinessScore}/100`}
/>
<DarkMetric
title="Digital Maturity"
value={`${digitalMaturityScore}/100`}
/>
</div>

<div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
<DarkMetric
title="Procurement Efficiency"
value={`${procurementEfficiencyScore}/100`}
/>
<DarkMetric
title="Supplier Engagement"
value={`${supplierEngagementScore}/100`}
/>
<DarkMetric
title="Benchmark Status"
value={executiveBenchmarkStatus}
/>
<DarkMetric title="Executive Status" value={executiveStatus} />
</div>
</section>

<section className="mt-8 rounded-3xl border border-white/10 bg-[#061426]/88 p-8 text-white shadow-executive">
<p className="text-xs font-black uppercase tracking-[0.25em] text-[#C8A646]">
Board Presentation Layer
</p>

<h2 className="mt-3 text-3xl font-black text-white">
Board Executive Summary
</h2>

<p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-slate-400">
Board-facing procurement summary consolidating readiness,
enterprise status, risk position, and strategic direction from
validated executive intelligence.
</p>

<div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
<MetricCard
title="Board Readiness"
value={boardPresentationStatus}
/>
<MetricCard
title="Enterprise Status"
value={enterpriseCommandStatus}
/>
<MetricCard title="Risk Position" value={boardRiskPosition} />
<MetricCard
title="Strategic Position"
value={boardStrategicPosition}
/>
</div>

<div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.045] p-6">
<p className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">
Board Summary
</p>

<p className="mt-4 text-sm font-semibold leading-7 text-slate-300">
{executiveCommandRecommendation}
</p>
</div>
</section>

<ExecutiveRiskIntelligence
supplierRiskRadar={supplierRiskRadar}
supplierRanking={supplierRanking}
/>

<section className="mt-8 rounded-3xl border border-white/10 bg-slate-950 p-8 text-white shadow-executive">
<p className="text-xs font-black uppercase tracking-[0.25em] text-[#C8A646]">
Executive Operating System
</p>

<h2 className="mt-3 text-4xl font-black">
Enterprise Command Layer
</h2>

<p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-slate-300">
Unified executive operating view across procurement performance,
benchmark readiness, board health, enterprise risk, supplier
engagement, and opportunity intelligence.
</p>

<div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
<DarkMetric title="Board Health" value={`${boardHealthIndex}/100`} />
<DarkMetric title="Benchmark" value={`${benchmarkReadinessScore}/100`} />
<DarkMetric title="Enterprise" value={enterpriseCommandStatus} />
<DarkMetric title="Risk" value={riskCommandStatus} />
<DarkMetric title="Opportunity" value={opportunityCommandStatus} />
</div>

<div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">
<p className="text-xs font-black uppercase tracking-[0.25em] text-[#C8A646]">
Executive Recommendation
</p>

<p className="mt-4 text-sm leading-7 text-slate-300">
{executiveCommandRecommendation}
</p>
</div>
</section>

<ProcurementCopilotIntelligence
  executiveBrief={executiveBrief}
  executiveNarrative={executiveNarrative}
/>

<BoardReportGenerator
procurementRiskIndex={procurementRiskIndex}
procurementMaturityScore={procurementMaturityScore}
aiConfidenceScore={aiConfidenceScore}
supplierDependencyRisk={supplierDependencyRisk}
concentrationLevel={concentrationLevel}
awardPredictionConfidence={awardPredictionConfidence}
predictionAccuracy={predictionAccuracy}
benchmarkReadinessScore={benchmarkReadinessScore}
boardHealthIndex={boardHealthIndex}
enterpriseProcurementScore={enterpriseProcurementScore}
executiveReadinessScore={executiveReadinessScore}
procurementEfficiencyScore={procurementEfficiencyScore}
supplierEngagementScore={supplierEngagementScore}
digitalMaturityScore={digitalMaturityScore}
/>

<AIBoardNarrativeGenerator
executiveBenchmarkStatus={executiveBenchmarkStatus}
industryBenchmarkScore={industryBenchmarkScore}
executiveStatus={executiveStatus}
boardHealthIndex={boardHealthIndex}
enterpriseProcurementScore={enterpriseProcurementScore}
executiveReadinessScore={executiveReadinessScore}
procurementRiskIndex={procurementRiskIndex}
supplierEngagementScore={supplierEngagementScore}
benchmarkReadinessScore={benchmarkReadinessScore}
boardRecommendation={boardRecommendation}
procurementMaturityScore={procurementMaturityScore}
awardPredictionConfidence={awardPredictionConfidence}
/>
</div>
</main>
);
}

function MetricCard({ title, value }: { title: string; value: string }) {
return <ExecutiveMetricCard label={title} value={value} tone="blue" />;
}

function DarkMetric({ title, value }: { title: string; value: string }) {
return <ExecutiveMetricCard label={title} value={value} tone="gold" />;
}


function SignalRow({ label, value }: { label: string; value: string }) {
return (
<div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#061426]/70 px-4 py-3">
<p className="text-sm font-black text-slate-400">{label}</p>
<p className="text-sm font-black text-white">{value}</p>
</div>
);
}
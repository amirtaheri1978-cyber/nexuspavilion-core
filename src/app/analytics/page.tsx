import Link from "next/link";

import AnalyticsChart from "@/components/analytics-chart";
import ExecutiveExportPanel from "@/components/executive-export-panel";
import BoardReportGenerator from "@/components/board-report-generator";
import AIBoardNarrativeGenerator from "@/components/ai-board-narrative-generator";
import AIConfidenceEngine from "@/components/ai-confidence-engine";
import ExecutiveRiskIntelligence from "@/components/executive-risk-intelligence";
import ProcurementCopilotIntelligence from "@/components/procurement-copilot-intelligence";
import { createClient } from "@/lib/supabase/server";

type ProcurementScope =
| "material"
| "subcontractor"
| "equipment"
| "professional_service";

type SourcingMethod = "open" | "invited" | "sealed_bid";

type ContractFramework = "project_specific" | "framework";

type RFQ = {
id: string;
title: string;
category: string | null;
location: string | null;
budget: number | string | null;
status: string | null;
procurement_scope: ProcurementScope | null;
sourcing_method: SourcingMethod | null;
contract_framework: ContractFramework | null;
};

type Quote = {
id: string;
rfq_id: string;
company_id: string | null;
amount: number | string | null;
decision: string | null;
};

type Company = {
id: string;
name: string | null;
};

type ExecutiveAlert = {
level: "opportunity" | "healthy" | "warning";
title: string;
message: string;
};

const PROCUREMENT_SCOPE_LABELS: Record<ProcurementScope, string> = {
material: "Material RFQs",
subcontractor: "Trade RFQs",
equipment: "Equipment RFQs",
professional_service: "Service RFQs",
};

const SOURCING_METHOD_LABELS: Record<SourcingMethod, string> = {
open: "Open RFQs",
invited: "Invited RFQs",
sealed_bid: "Sealed Bid RFQs",
};

const CONTRACT_FRAMEWORK_LABELS: Record<ContractFramework, string> = {
project_specific: "Project-Specific",
framework: "Framework Agreement",
};

function getHealthLabel(score: number) {
if (score >= 85) return "Strong";
if (score >= 70) return "Healthy";
if (score >= 55) return "Moderate";
return "Needs Attention";
}

function getCompetitionLabel(avgQuotesPerRfq: number) {
if (avgQuotesPerRfq >= 4) return "High Competition";
if (avgQuotesPerRfq >= 2) return "Healthy Competition";
if (avgQuotesPerRfq >= 1) return "Limited Competition";
return "No Competition Yet";
}

function getProcurementScope(value: ProcurementScope | null | undefined) {
if (value && PROCUREMENT_SCOPE_LABELS[value]) return value;
return "subcontractor";
}

function getSourcingMethod(value: SourcingMethod | null | undefined) {
if (value && SOURCING_METHOD_LABELS[value]) return value;
return "invited";
}

function getContractFramework(value: ContractFramework | null | undefined) {
if (value && CONTRACT_FRAMEWORK_LABELS[value]) return value;
return "project_specific";
}

function countByScope(rfqs: RFQ[], scope: ProcurementScope) {
return rfqs.filter((rfq) => getProcurementScope(rfq.procurement_scope) === scope)
.length;
}

function countBySourcing(rfqs: RFQ[], method: SourcingMethod) {
return rfqs.filter((rfq) => getSourcingMethod(rfq.sourcing_method) === method)
.length;
}

function countByFramework(rfqs: RFQ[], framework: ContractFramework) {
return rfqs.filter(
(rfq) => getContractFramework(rfq.contract_framework) === framework
).length;
}

export default async function AnalyticsPage() {
const supabase = await createClient();

const {
data: { user },
} = await supabase.auth.getUser();

const { data: profile } = await supabase
.from("profiles")
.select("company_id")
.eq("id", user?.id)
.single();

const companyId = profile?.company_id;

const { data: rfqs } = companyId
? await supabase
.from("rfqs")
.select("*")
.eq("company_id", companyId)
.order("created_at", { ascending: false })
: { data: [] };

const rfqList = (rfqs ?? []) as RFQ[];
const rfqIds = rfqList.map((rfq) => rfq.id);

const { data: quotes } =
rfqIds.length > 0
? await supabase
.from("quotes")
.select("*")
.in("rfq_id", rfqIds)
.order("created_at", { ascending: false })
: { data: [] };

const { data: notifications } = companyId
? await supabase
.from("notifications")
.select("*")
.eq("company_id", companyId)
.order("created_at", { ascending: false })
.limit(5)
: await supabase
.from("notifications")
.select("*")
.order("created_at", { ascending: false })
.limit(5);

const { data: companies } = await supabase.from("companies").select("id,name");

const quoteList = (quotes ?? []) as Quote[];
const companyList = (companies ?? []) as Company[];

const totalRfqs = rfqList.length;

const activeRfqs = rfqList.filter(
(rfq) => !rfq.status || rfq.status === "open"
).length;

const awardedContracts = quoteList.filter(
(quote) => quote.decision === "awarded"
).length;

const supplierQuotes = quoteList.length;

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
(sealedBidRfqs > 0 ? 9 : 0)
)
);

const procurementMixStatus =
constructionClassificationScore >= 80
? "Mature RFQ Mix"
: constructionClassificationScore >= 60
? "Developing RFQ Mix"
: constructionClassificationScore >= 35
? "Early RFQ Mix"
: "No RFQ Mix Yet";
const quoteAmounts = quoteList
.map((quote) => Number(quote.amount))
.filter((amount) => Number.isFinite(amount));

const procurementVolume = quoteAmounts.reduce(
(total, amount) => total + amount,
0
);

const awardedVolume = quoteList
.filter((quote) => quote.decision === "awarded")
.reduce((total, quote) => total + Number(quote.amount || 0), 0);

const averageQuote =
quoteAmounts.length > 0
? Math.round(procurementVolume / quoteAmounts.length)
: 0;

const lowestQuote = quoteAmounts.length > 0 ? Math.min(...quoteAmounts) : 0;

const potentialSavings =
averageQuote > lowestQuote ? averageQuote - lowestQuote : 0;

const awardRate =
supplierQuotes > 0
? Math.round((awardedContracts / supplierQuotes) * 100)
: 0;

const avgQuotesPerRfq =
totalRfqs > 0 ? Number((supplierQuotes / totalRfqs).toFixed(1)) : 0;

const supplierActivityScore = Math.min(100, supplierQuotes * 12);
const competitionScore = Math.min(100, avgQuotesPerRfq * 25);
const awardScore = Math.min(100, Math.round(awardRate * 1.5));
const savingsScore = potentialSavings > 0 ? 85 : 55;

const procurementHealthScore = Math.round(
supplierActivityScore * 0.25 +
competitionScore * 0.25 +
awardScore * 0.25 +
savingsScore * 0.25
);

const procurementHealth = getHealthLabel(procurementHealthScore);
const competitionIndex = getCompetitionLabel(avgQuotesPerRfq);

const categoryCounts = rfqList.reduce((acc: Record<string, number>, rfq) => {
const category = rfq.category || "Uncategorized";
acc[category] = (acc[category] || 0) + 1;
return acc;
}, {});

const topCategory =
Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
"N/A";

const budgetTotal = rfqList.reduce(
(total, rfq) => total + Number(rfq.budget || 0),
0
);

const budgetUtilization =
budgetTotal > 0 ? Math.round((awardedVolume / budgetTotal) * 100) : 0;

const executiveProcurementHealth = Math.min(
100,
Math.round(awardRate * 0.4 + budgetUtilization * 0.3 + avgQuotesPerRfq * 10)
);

const marketCompetitionIndex =
avgQuotesPerRfq >= 4
? "High"
: avgQuotesPerRfq >= 2
? "Healthy"
: avgQuotesPerRfq >= 1
? "Limited"
: "None";

const forecastAwardVolume = Math.round(awardedVolume * 1.15);
const forecastSavings = Math.round(potentialSavings * 1.2);

const forecastHealth =
procurementHealthScore >= 85
? "Strong Growth"
: procurementHealthScore >= 70
? "Stable Growth"
: procurementHealthScore >= 55
? "Moderate Risk"
: "Needs Intervention";

const forecastCompetition =
competitionScore >= 80
? "Highly Competitive"
: competitionScore >= 60
? "Competitive"
: competitionScore >= 40
? "Developing"
: "Low Activity";

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

const executiveSummary =
totalRfqs === 0
? "No RFQ activity has been created yet. Start by publishing construction procurement opportunities to activate executive intelligence."
: `${procurementHealth} procurement health. ${competitionIndex}. Dominant RFQ scope is ${dominantScope}, sourcing is ${dominantSourcing}, award conversion is ${awardRate}%, with ${supplierQuotes} supplier quotes and ${potentialSavings.toLocaleString()} dollars in estimated savings opportunity.`;

const aiInsight =
executiveProcurementHealth >= 85
? `Procurement operations are performing strongly. Competition remains ${marketCompetitionIndex.toLowerCase()} and estimated savings exceed $${potentialSavings.toLocaleString()}.`
: executiveProcurementHealth >= 70
? "Procurement performance is stable, but there is room to improve supplier participation, RFQ classification depth, and award efficiency."
: "Warning: procurement performance requires attention. Consider improving supplier engagement, RFQ mix maturity, and award conversion rates.";

const aiRecommendation =
constructionClassificationScore < 60
? "Improve RFQ classification coverage across material, trade, equipment, and service procurement to strengthen supplier matching and executive intelligence."
: potentialSavings > 10000
? "Focus on competitive bidding strategies to unlock additional savings."
: awardedVolume > budgetTotal * 0.7
? "Award conversion is healthy. Continue scaling high-performing supplier relationships."
: "Review supplier participation and RFQ attractiveness to improve procurement outcomes.";

const strategicRecommendations: string[] = [];

if (constructionClassificationScore < 60) {
strategicRecommendations.push(
"Increase RFQ classification depth by separating material, trade, equipment, and service procurement."
);
}

if (avgQuotesPerRfq < 2) {
strategicRecommendations.push(
"Increase supplier invitations to improve RFQ competition."
);
}

if (sealedBidRfqs === 0 && totalRfqs > 3) {
strategicRecommendations.push(
"Consider sealed-bid workflows for high-value or governance-sensitive procurement packages."
);
}

if (frameworkRfqs === 0 && totalRfqs > 3) {
strategicRecommendations.push(
"Use framework RFQs for recurring material or supplier agreements across multiple projects."
);
}

if (budgetUtilization > 85) {
strategicRecommendations.push(
"Budget utilization is high. Increase competitive bidding activity."
);
}

if (potentialSavings > 10000) {
strategicRecommendations.push(
"Large savings opportunity detected. Review lowest-bid suppliers."
);
}

if (awardRate < 30) {
strategicRecommendations.push(
"Award conversion is low. Review RFQ quality and supplier targeting."
);
}

if (topCategory !== "N/A") {
strategicRecommendations.push(
`Expand supplier coverage in ${topCategory} procurement category.`
);
}

if (strategicRecommendations.length === 0) {
strategicRecommendations.push(
"Procurement performance is healthy. Continue scaling supplier participation."
);
}
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
awardRate * 0.2
)
)
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

const vendorLeaderboard = companyList
.map((company) => {
const companyQuotes = quoteList.filter(
(quote) => quote.company_id === company.id
);

const awardedQuotes = companyQuotes.filter(
(quote) => quote.decision === "awarded"
);

const revenue = awardedQuotes.reduce(
(total, quote) => total + Number(quote.amount || 0),
0
);

const winRate =
companyQuotes.length > 0
? Math.round((awardedQuotes.length / companyQuotes.length) * 100)
: 0;

return {
name: company.name,
quotes: companyQuotes.length,
awards: awardedQuotes.length,
revenue,
winRate,
score: winRate * 0.5 + awardedQuotes.length * 10 + revenue / 100000,
};
})
.filter((vendor) => vendor.quotes > 0)
.sort((a, b) => b.score - a.score)
.slice(0, 10);

const supplierRanking = companyList
.map((company) => {
const companyQuotes = quoteList.filter(
(quote) => quote.company_id === company.id
);

const awardedQuotes = companyQuotes.filter(
(quote) => quote.decision === "awarded"
);

const revenue = awardedQuotes.reduce(
(total, quote) => total + Number(quote.amount || 0),
0
);

const winRate =
companyQuotes.length > 0
? Math.round((awardedQuotes.length / companyQuotes.length) * 100)
: 0;

const participationScore = Math.min(100, companyQuotes.length * 8);
const revenueScore = Math.min(100, revenue / 5000);

const financialRisk = Math.max(5, Math.round(100 - revenue / 5000));
const performanceRisk = Math.max(5, Math.round(100 - winRate));
const dependencyRisk = revenue > 100000 ? 35 : 70;

const financialScore = Math.max(0, 100 - financialRisk);
const performanceScore = Math.max(0, 100 - performanceRisk);
const dependencyScore = Math.max(0, 100 - dependencyRisk);

const aiScore = Math.round(
financialScore * 0.15 +
performanceScore * 0.25 +
dependencyScore * 0.15 +
winRate * 0.25 +
participationScore * 0.1 +
revenueScore * 0.1
);

const tier =
aiScore >= 90
? "Platinum"
: aiScore >= 80
? "Gold"
: aiScore >= 65
? "Silver"
: "Bronze";

const recommendation =
aiScore >= 90
? "Preferred Supplier"
: aiScore >= 80
? "Strategic Supplier"
: aiScore >= 65
? "Approved Supplier"
: "Monitor Supplier";

return {
name: company.name,
quotes: companyQuotes.length,
awards: awardedQuotes.length,
revenue,
winRate,
aiScore,
tier,
recommendation,
};
})
.filter((vendor) => vendor.quotes > 0)
.sort((a, b) => b.aiScore - a.aiScore)
.slice(0, 20);

const topSupplierRevenue = Math.max(
...supplierRanking.map((supplier) => supplier.revenue),
0
);

const supplierRiskRadar = supplierRanking.map((supplier) => {
const financialRisk = Math.max(
5,
Math.round(100 - supplier.revenue / 5000)
);

const performanceRisk = Math.max(5, Math.round(100 - supplier.winRate));

const capacityRisk =
supplier.quotes <= 1 ? 70 : supplier.quotes <= 3 ? 45 : 20;

const dependencyRisk =
topSupplierRevenue > 0 && supplier.revenue > topSupplierRevenue * 0.5
? 75
: 30;

const deliveryRisk = Math.round((performanceRisk + capacityRisk) / 2);

const overallRisk = Math.round(
(financialRisk +
performanceRisk +
capacityRisk +
dependencyRisk +
deliveryRisk) /
5
);

return {
...supplier,
financialRisk,
performanceRisk,
capacityRisk,
dependencyRisk,
deliveryRisk,
overallRisk,
};
});

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
constructionClassificationScore * 0.1
)
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
(constructionClassificationScore >= 60 ? 15 : 0)
)
);

const supplierReliabilityScore =
supplierRanking.length > 0
? Math.round(
supplierRanking.reduce((sum, vendor) => sum + vendor.winRate, 0) /
supplierRanking.length
)
: 0;

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
const enterpriseProcurementScore = Math.round(
(procurementHealthScore +
predictionAccuracy +
dataQualityScore +
(100 - procurementRiskIndex) +
constructionClassificationScore) /
5
);

const executiveStatus =
enterpriseProcurementScore >= 80
? "Excellent"
: enterpriseProcurementScore >= 60
? "Healthy"
: "Needs Attention";

const procurementEfficiencyScore = Math.min(
100,
Math.round(
awardRate * 0.35 +
budgetUtilization * 0.25 +
avgQuotesPerRfq * 10 +
procurementHealthScore * 0.2 +
constructionClassificationScore * 0.1
)
);

const supplierEngagementScore = Math.min(
100,
Math.round(
supplierQuotes * 5 +
avgQuotesPerRfq * 15 +
supplierReliabilityScore * 0.3
)
);

const executiveReadinessScore = Math.min(
100,
Math.round(
enterpriseProcurementScore * 0.4 +
predictionAccuracy * 0.3 +
dataQualityScore * 0.3
)
);

const digitalMaturityScore = Math.min(
100,
Math.round(
procurementMaturityScore * 0.45 +
dataQualityScore * 0.25 +
supplierEngagementScore * 0.2 +
constructionClassificationScore * 0.1
)
);

const boardHealthIndex = Math.min(
100,
Math.round(
procurementEfficiencyScore * 0.25 +
executiveReadinessScore * 0.25 +
digitalMaturityScore * 0.25 +
procurementHealthScore * 0.25
)
);

const benchmarkReadinessScore = Math.min(
100,
Math.round(
procurementMaturityScore * 0.25 +
supplierEngagementScore * 0.2 +
executiveReadinessScore * 0.2 +
dataQualityScore * 0.2 +
predictionAccuracy * 0.15
)
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

const awardBenchmark =
awardRate >= 60
? "Strong"
: awardRate >= 35
? "Developing"
: awardRate > 0
? "Early"
: "No Award History";

const riskBenchmark =
procurementRiskIndex <= 25
? "Low Exposure"
: procurementRiskIndex <= 50
? "Moderate Exposure"
: procurementRiskIndex <= 75
? "Elevated Exposure"
: "Critical Exposure";


const boardHealthStatus =
boardHealthIndex >= 85
? "Excellent"
: boardHealthIndex >= 70
? "Strong"
: boardHealthIndex >= 55
? "Moderate"
: "Needs Action";

const procurementOpportunityScore = Math.min(
100,
Math.round(
potentialSavings / 1000 +
avgQuotesPerRfq * 15 +
awardRate * 0.3 +
budgetUtilization * 0.2 +
constructionClassificationScore * 0.15
)
);

const boardCommandStatus =
boardHealthIndex >= 85
? "Board Ready"
: boardHealthIndex >= 70
? "Executive Review"
: "Needs Attention";

const ceoCommandStatus =
executiveReadinessScore >= 80
? "Decision Ready"
: executiveReadinessScore >= 60
? "Monitoring"
: "Escalation Required";

const enterpriseCommandStatus =
enterpriseProcurementScore >= 85
? "World Class"
: enterpriseProcurementScore >= 70
? "High Performance"
: enterpriseProcurementScore >= 55
? "Developing"
: "Needs Improvement";

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
boardHealthIndex * 0.30 +
executiveReadinessScore * 0.25 +
enterpriseProcurementScore * 0.20 +
benchmarkReadinessScore * 0.15 +
dataQualityScore * 0.10
)
);

const boardReadinessRecommendation =
boardReadinessScore >= 85
? "Proceed to Board Presentation"
: boardReadinessScore >= 70
? "Executive Validation Recommended"
: "Additional Procurement Evidence Required";

const ceoReadinessScore = Math.min(
100,
Math.round(
boardReadinessScore * 0.30 +
enterpriseProcurementScore * 0.25 +
executiveReadinessScore * 0.20 +
benchmarkReadinessScore * 0.15 +
supplierEngagementScore * 0.10
)
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
const boardStatus =
boardHealthIndex >= 85
? "Board Ready"
: boardHealthIndex >= 70
? "Executive Review"
: "Needs Attention";

const ceoStatus =
executiveReadinessScore >= 80
? "Decision Ready"
: executiveReadinessScore >= 60
? "Monitoring"
: "Escalation Required";

const riskStatus =
procurementRiskIndex <= 25
? "Controlled"
: procurementRiskIndex <= 50
? "Managed"
: "Elevated";

const opportunityStatus =
procurementOpportunityScore >= 80
? "High Opportunity"
: procurementOpportunityScore >= 60
? "Growth Opportunity"
: "Limited Opportunity";



const executiveRecommendation =
procurementRiskIndex > 60
? "Reduce supplier concentration and mitigate procurement exposure."
: procurementOpportunityScore > 75
? "Accelerate sourcing initiatives to capture available savings."
: boardHealthIndex > 80
? "Maintain current procurement operating strategy."
: "Improve procurement maturity before scaling operations.";


const industryProcurementSignal =
procurementEfficiencyScore >= 80 && supplierEngagementScore >= 70
? "High Performance"
: procurementEfficiencyScore >= 60 && supplierEngagementScore >= 50
? "Competitive"
: procurementEfficiencyScore >= 40
? "Improving"
: "Needs Development";

const industryRiskSignal =
procurementRiskIndex <= 25 && concentrationLevel === "Low"
? "Low Exposure"
: procurementRiskIndex <= 50
? "Moderate Exposure"
: procurementRiskIndex <= 75
? "Elevated Exposure"
: "Critical Exposure";

const opportunityLevel =
procurementOpportunityScore >= 80
? "High Opportunity"
: procurementOpportunityScore >= 60
? "Strong Opportunity"
: procurementOpportunityScore >= 40
? "Developing Opportunity"
: "Early Opportunity";

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
message:
"Prediction models are performing above the target threshold.",
});
}

if (procurementRiskIndex >= 35) {
executiveAlerts.push({
level: "warning",
title: "Supplier Dependency Risk",
message:
"Vendor concentration should be reviewed to reduce exposure.",
});
}

if (supplierRanking.length <= 3) {
executiveAlerts.push({
level: "warning",
title: "Limited Supplier Participation",
message:
"Expand supplier coverage to improve competition and pricing.",
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
(rfq) => (rfq.category || "Uncategorized") === category
);

const categoryRfqIds = categoryRfqs.map((rfq) => rfq.id);

const categoryQuotes = quoteList.filter((quote) =>
categoryRfqIds.includes(quote.rfq_id)
);

const categoryAwards = categoryQuotes.filter(
(quote) => quote.decision === "awarded"
);

const categorySpend = categoryAwards.reduce(
(total, quote) => total + Number(quote.amount || 0),
0
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
Math.min(categorySpend / 10000, 25)
)
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

const executivePerformanceMatrix = [
{
title: "Board Health",
value: `${boardHealthIndex}/100`,
},
{
title: "Efficiency",
value: `${procurementEfficiencyScore}/100`,
},
{
title: "Supplier Engagement",
value: `${supplierEngagementScore}/100`,
},
{
title: "Executive Readiness",
value: `${executiveReadinessScore}/100`,
},
{
title: "RFQ Maturity",
value: `${constructionClassificationScore}/100`,
},
];

const boardPriorityScore = Math.min(
100,
Math.round(
enterpriseProcurementScore * 0.35 +
procurementOpportunityScore * 0.25 +
(100 - procurementRiskIndex) * 0.25 +
boardHealthIndex * 0.15
)
);

const bestCaseProjection = Math.round(
forecastAwardVolume + forecastSavings + procurementOpportunityScore * 1000
);

const expectedProjection = Math.round(
forecastAwardVolume + forecastSavings * 0.6
);

const riskProjection = Math.max(
0,
Math.round(forecastAwardVolume - procurementRiskIndex * 1000)
);

const simulationConfidence =
dataQualityScore >= 80 ? "High" : dataQualityScore >= 60 ? "Moderate" : "Low";

const digitalTwinScenario =
boardPriorityScore >= 80
? "Growth Scenario"
: procurementRiskIndex >= 60
? "Risk Scenario"
: "Stable Scenario";

const digitalTwinRecommendation =
digitalTwinScenario === "Growth Scenario"
? "Prioritize supplier expansion, category growth, RFQ mix maturity, and savings capture."
: digitalTwinScenario === "Risk Scenario"
? "Reduce vendor concentration, improve competition, and review award exposure."
: "Maintain procurement discipline while improving forecast quality, sourcing structure, and supplier coverage.";

const boardPriorityLevel =
boardPriorityScore >= 80
? "High Performance"
: boardPriorityScore >= 60
? "Growth Opportunity"
: "Executive Attention";

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

const procurementCopilotPrompts = [
{
question: "Where is our biggest savings opportunity?",
answer:
potentialSavings > 0
? `${bestProcurementCategory} shows the strongest savings signal with $${potentialSavings.toLocaleString()} in estimated opportunity.`
: "Savings opportunity is currently limited. Increase supplier participation to improve pricing discovery.",
},
{
question: "Which RFQ mix needs attention?",
answer:
constructionClassificationScore < 60
? "RFQ classification maturity is under target. Increase structured material, trade, equipment, service, sourcing, and framework tagging."
: `RFQ mix is developing. Current dominant scope is ${dominantScope}, and dominant sourcing method is ${dominantSourcing}.`,
},
{
question: "Which area needs executive attention?",
answer:
procurementRiskIndex >= 50
? "Procurement risk is elevated. Review supplier dependency, award concentration, and low-competition categories."
: "Executive attention should focus on scaling supplier engagement and maintaining forecast confidence.",
},
{
question: "What should the CEO prioritize?",
answer: ceoPriority,
},
{
question: "What should the CFO monitor?",
answer: cfoPriority,
},
{
question: "What should Procurement improve?",
answer: procurementPriority,
},
];
const copilotSummary =
boardPriorityScore >= 80
? "Nexus Copilot recommends scaling category growth, supplier coverage, RFQ classification maturity, and savings capture."
: procurementRiskIndex >= 60
? "Nexus Copilot recommends reducing risk exposure before expanding procurement volume."
: "Nexus Copilot recommends improving supplier participation, sourcing structure, and procurement data maturity.";

const copilotModes = [
{
mode: "CEO Mode",
focus: "Growth, market position, supplier network expansion",
insight: ceoPriority,
},
{
mode: "CFO Mode",
focus: "Savings, spend control, forecast confidence",
insight: cfoPriority,
},
{
mode: "Procurement Director Mode",
focus: "Supplier competition, award quality, category execution",
insight: procurementPriority,
},
];

const copilotFeaturedInsight =
boardPriorityScore >= 80
? "Executive momentum is strong. Copilot recommends scaling procurement intelligence adoption."
: procurementRiskIndex >= 60
? "Risk exposure is elevated. Copilot recommends prioritizing supplier diversification."
: "Procurement performance is stable. Copilot recommends increasing supplier coverage and RFQ data maturity.";

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

const topQuarterRisks = [
procurementRiskIndex >= 50 ? "Supplier dependency" : "Low risk exposure",
supplierRanking.length <= 3
? "Limited supplier competition"
: "Healthy supplier participation",
constructionClassificationScore < 60
? "Low RFQ classification maturity"
: "Structured RFQ intelligence active",
];

const topQuarterOpportunities = [
`${bestProcurementCategory} category expansion`,
`${savingsOpportunityLevel} savings capture`,
`${dominantScope} RFQ mix growth`,
"Supplier network growth",
];

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
constructionClassificationScore * 0.1
)
);
const industryBenchmarkPosition =
industryBenchmarkScore >= 85
? "Top Quartile"
: industryBenchmarkScore >= 70
? "Above Average"
: industryBenchmarkScore >= 50
? "Developing"
: "Below Benchmark";

const procurementBenchmarkScore = Math.min(
100,
Math.round(
procurementMaturityScore * 0.45 +
executiveProcurementHealth * 0.25 +
boardHealthIndex * 0.2 +
constructionClassificationScore * 0.1
)
);

const supplierBenchmarkScore = Math.min(
100,
Math.round(
supplierReliabilityScore * 0.5 +
supplierEngagementScore * 0.3 +
competitionScore * 0.2
)
);

const costOptimizationBenchmark = Math.min(
100,
Math.round(
budgetUtilization * 0.3 +
procurementOpportunityScore * 0.4 +
savingsScore * 0.3
)
);

const benchmarkStatus =
industryBenchmarkScore >= 85
? "Top Quartile"
: industryBenchmarkScore >= 70
? "Above Average"
: industryBenchmarkScore >= 55
? "Average"
: "Below Benchmark";

const benchmarkMatrix = [
{ title: "Industry", score: industryBenchmarkScore },
{ title: "Procurement", score: procurementBenchmarkScore },
{ title: "Supplier", score: supplierBenchmarkScore },
{ title: "Cost", score: costOptimizationBenchmark },
];

const strategicSuppliers = supplierRanking.filter(
(supplier) => supplier.aiScore >= 85
).length;

const preferredSuppliers = supplierRanking.filter(
(supplier) => supplier.aiScore >= 70
).length;

const highRiskSuppliers = supplierRiskRadar.filter(
(supplier) => supplier.overallRisk >= 60
).length;

const supplierDiversificationScore =
supplierRanking.length >= 10 ? 100 : Math.min(100, supplierRanking.length * 10);

const portfolioHealthIndex = Math.min(
100,
Math.round(
supplierReliabilityScore * 0.4 +
supplierDiversificationScore * 0.3 +
supplierEngagementScore * 0.3
)
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
portfolioRecommendations.push("Reduce exposure to high-risk suppliers.");
}

if (supplierDiversificationScore < 60) {
portfolioRecommendations.push(
"Expand supplier network to improve diversification."
);
}

if (strategicSuppliers < 3) {
portfolioRecommendations.push(
"Develop additional strategic supplier relationships."
);
}

if (portfolioRecommendations.length === 0) {
portfolioRecommendations.push(
"Supplier portfolio is performing within target range."
);
}

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

return (
<main className="min-h-screen bg-slate-100 px-8 py-10">
<div className="mx-auto max-w-7xl">
<Link
href="/dashboard"
className="text-sm font-semibold text-slate-600 hover:text-slate-950"
>
← Back to Dashboard
</Link>

<section className="mt-8 rounded-3xl border border-orange-200 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
Boardroom Dashboard
</p>

<div className="mt-5 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
<div>
<h2 className="text-4xl font-black text-slate-950">
CEO Procurement Brief
</h2>

<p className="mt-4 text-sm leading-7 text-slate-600">
value={boardReadinessRecommendation}
</p>
</div>

<div className="grid gap-4 sm:grid-cols-2">
<MetricCard
title="Revenue Under Management"
value={`$${procurementVolume.toLocaleString()}`}
/>
<MetricCard
title="Savings Forecast"
value={`$${forecastSavings.toLocaleString()}`}
/>
<MetricCard
title="Enterprise Score"
value={`${enterpriseProcurementScore}/100`}
/>
<MetricCard
title="RFQ Maturity"
value={`${constructionClassificationScore}/100`}
/>
</div>
</div>
</section>

<section className="mt-8 rounded-3xl border border-slate-200 bg-slate-950 p-8 text-white">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-400">
Construction Procurement Intelligence
</p>

<div className="mt-5 grid gap-8 lg:grid-cols-[1fr_0.8fr]">
<div>
<h1 className="text-5xl font-black">
Procurement Analytics
</h1>

<p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
{executiveCommandRecommendation}
</p>
</div>

<div className="grid gap-4 sm:grid-cols-2">
<DarkMetric title="Enterprise Score" value={`${enterpriseProcurementScore}/100`} />
<DarkMetric title="Opportunity" value={`${procurementOpportunityScore}/100`} />
<DarkMetric title="Risk Index" value={`${procurementRiskIndex}/100`} />
<DarkMetric title="Forecast Accuracy" value={`${predictionAccuracy}%`} />
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
<MetricCard title="Project Specific" value={projectSpecificRfqs.toString()} />
<MetricCard title="Framework RFQs" value={frameworkRfqs.toString()} />
</section>

<section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
RFQ Classification Intelligence
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Construction Procurement Mix
</h2>

<p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600">
Nexus Pavilion now separates material, trade, equipment, service,
sourcing method, and framework agreement activity to improve
supplier matching, quote comparison, risk scoring, and executive
intelligence.
</p>

<div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
<div>
<AnalyticsChart data={rfqMixChartData} />
</div>

<div className="rounded-3xl bg-slate-50 p-6">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
RFQ Mix Status
</p>

<h3 className="mt-3 text-3xl font-black text-slate-950">
{procurementMixStatus}
</h3>

<p className="mt-3 text-sm leading-7 text-slate-600">
Classification score is {constructionClassificationScore}/100.
Dominant procurement scope is {dominantScope}. Dominant sourcing
method is {dominantSourcing}.
</p>
</div>
</div>
</section>

<section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
Executive Alerts Center
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Real-Time Executive Signals
</h2>

<div className="mt-6 space-y-4">
{executiveAlerts.map((alert, index) => (
<div
key={index}
className="rounded-2xl border border-slate-200 p-5"
>
<div className="flex items-center gap-3">
<div
className={`h-3 w-3 rounded-full ${
alert.level === "healthy"
? "bg-green-500"
: alert.level === "opportunity"
? "bg-yellow-500"
: "bg-red-500"
}`}
/>

<p className="font-black text-slate-950">{alert.title}</p>
</div>

<p className="mt-2 text-sm text-slate-600">{alert.message}</p>
</div>
))}
</div>
</section>

<section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
AI Executive Recommendations
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Executive Action Plan
</h2>

<div className="mt-6 grid gap-4 md:grid-cols-2">
{executiveRecommendations.map((item) => (
<div
key={item.role}
className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
>
<p className="text-xs font-black uppercase tracking-[0.2em] text-orange-500">
{item.role}
</p>

<p className="mt-3 text-sm font-semibold leading-7 text-slate-700">
{item.action}
</p>
</div>
))}
</div>
</section>

<section className="mt-8 rounded-3xl border border-slate-200 bg-slate-950 p-8 text-white">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-400">
AI Procurement Command Center
</p>

<h2 className="mt-3 text-4xl font-black">
Executive Priority Dashboard
</h2>

<div className="mt-8 grid gap-6 md:grid-cols-4">
<DarkMetric title="Board Priority" value={`${boardPriorityScore}/100`} />
<DarkMetric title="Board Health" value={boardHealthStatus} />
<DarkMetric title="Top Risk" value={topRisk} />
<DarkMetric title="Top Opportunity" value={topOpportunity} />
</div>

<div className="mt-8 grid gap-4 md:grid-cols-3">
<DarkTextCard title="CEO Priority" value={ceoPriority} />
<DarkTextCard title="CFO Priority" value={cfoPriority} />
<DarkTextCard title="Procurement Priority" value={procurementPriority} />
</div>
</section>

<section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
<MetricCard title="Health Score" value={`${procurementHealthScore}/100`} />
<MetricCard title="Procurement Health" value={procurementHealth} />
<MetricCard title="Competition Index" value={competitionIndex} />
<MetricCard title="Avg Quotes / RFQ" value={avgQuotesPerRfq.toString()} />
</section>

<section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
Executive Procurement Intelligence
</p>

<div className="mt-4 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
<div>
<h2 className="text-3xl font-black text-slate-950">
Procurement Health Summary
</h2>

<p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600">
{executiveSummary}
</p>
</div>

<div className="rounded-3xl bg-slate-50 p-6">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
AI Signals
</p>

<div className="mt-4 space-y-3">
<SignalRow label="Supplier Activity" value={`${supplierActivityScore}/100`} />
<SignalRow label="Competition" value={`${competitionScore}/100`} />
<SignalRow label="Award Conversion" value={`${awardScore}/100`} />
<SignalRow label="RFQ Maturity" value={`${constructionClassificationScore}/100`} />
</div>
</div>
</div>
</section>

<section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
<MetricCard title="Total RFQs" value={totalRfqs.toString()} />
<MetricCard title="Active RFQs" value={activeRfqs.toString()} />
<MetricCard title="Awarded Contracts" value={awardedContracts.toString()} />
<MetricCard title="Supplier Quotes" value={supplierQuotes.toString()} />
</section>

<section className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
<MetricCard title="Procurement Volume" value={`$${procurementVolume.toLocaleString()}`} />
<MetricCard title="Awarded Volume" value={`$${awardedVolume.toLocaleString()}`} />
<MetricCard title="Average Quote" value={`$${averageQuote.toLocaleString()}`} />
<MetricCard title="Award Rate" value={`${awardRate}%`} />
</section>

<section className="mt-8 grid gap-6 lg:grid-cols-2">
<div className="rounded-3xl border border-slate-200 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
Pipeline Intelligence
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Procurement Activity
</h2>

<div className="mt-6">
<AnalyticsChart data={activityChartData} />
</div>
</div>

<div className="rounded-3xl border border-slate-200 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
Value Intelligence
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Procurement Value
</h2>

<div className="mt-6">
<AnalyticsChart data={valueChartData} />
</div>
</div>
</section>

<section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
Award Probability Forecast
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
RFQ Award Forecast Engine
</h2>

<div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
<table className="w-full text-left">
<thead className="bg-slate-950 text-white">
<tr>
<th className="px-5 py-4 text-sm">RFQ</th>
<th className="px-5 py-4 text-sm">Scope</th>
<th className="px-5 py-4 text-sm">Sourcing</th>
<th className="px-5 py-4 text-sm">Quotes</th>
<th className="px-5 py-4 text-sm">Probability</th>
<th className="px-5 py-4 text-sm">Status</th>
</tr>
</thead>

<tbody>
{awardProbabilityForecast.map((rfq) => (
<tr key={rfq.title} className="border-t border-slate-100">
<td className="px-5 py-4 font-bold text-slate-950">
{rfq.title}
</td>
<td className="px-5 py-4 text-slate-600">{rfq.scope}</td>
<td className="px-5 py-4 text-slate-600">{rfq.sourcing}</td>
<td className="px-5 py-4 text-slate-600">{rfq.quotes}</td>
<td className="px-5 py-4 font-black text-emerald-600">
{rfq.probability}%
</td>
<td className="px-5 py-4">
<span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">
{rfq.status}
</span>
</td>
</tr>
))}

{awardProbabilityForecast.length === 0 ? (
<tr>
<td
colSpan={6}
className="px-5 py-10 text-center text-sm font-semibold text-slate-500"
>
No RFQ forecast data available.
</td>
</tr>
) : null}
</tbody>
</table>
</div>
</section>

<section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
Company RFQ Pipeline
</p>

<div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
<table className="w-full text-left">
<thead className="bg-slate-950 text-white">
<tr>
<th className="px-5 py-4 text-sm">RFQ</th>
<th className="px-5 py-4 text-sm">Category</th>
<th className="px-5 py-4 text-sm">Scope</th>
<th className="px-5 py-4 text-sm">Sourcing</th>
<th className="px-5 py-4 text-sm">Framework</th>
<th className="px-5 py-4 text-sm">Status</th>
</tr>
</thead>

<tbody>
{rfqList.map((rfq) => (
<tr key={rfq.id} className="border-t border-slate-100">
<td className="px-5 py-4 font-bold text-slate-950">
{rfq.title}
</td>
<td className="px-5 py-4 text-slate-600">{rfq.category}</td>
<td className="px-5 py-4 text-slate-600">
{PROCUREMENT_SCOPE_LABELS[getProcurementScope(rfq.procurement_scope)]}
</td>
<td className="px-5 py-4 text-slate-600">
{SOURCING_METHOD_LABELS[getSourcingMethod(rfq.sourcing_method)]}
</td>
<td className="px-5 py-4 text-slate-600">
{CONTRACT_FRAMEWORK_LABELS[getContractFramework(rfq.contract_framework)]}
</td>
<td className="px-5 py-4">
<span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">
{rfq.status || "open"}
</span>
</td>
</tr>
))}

{rfqList.length === 0 ? (
<tr>
<td
colSpan={6}
className="px-5 py-10 text-center text-sm font-semibold text-slate-500"
>
No company RFQs found.
</td>
</tr>
) : null}
</tbody>
</table>
</div>
</section>

<section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
Category Intelligence
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Top Procurement Categories
</h2>

<div className="mt-8 overflow-x-auto">
<table className="w-full">
<thead>
<tr className="border-b border-slate-200 text-left">
<th className="pb-4 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
Category
</th>
<th className="pb-4 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
RFQs
</th>
<th className="pb-4 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
Quotes
</th>
<th className="pb-4 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
Awards
</th>
<th className="pb-4 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
Win Rate
</th>
<th className="pb-4 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
Spend
</th>
<th className="pb-4 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
Opportunity
</th>
</tr>
</thead>

<tbody>
{categoryIntelligence.map((item) => (
<tr key={item.category} className="border-b border-slate-100">
<td className="py-4 font-black text-slate-950">
{item.category}
</td>
<td className="py-4 text-slate-700">{item.rfqs}</td>
<td className="py-4 text-slate-700">{item.quotes}</td>
<td className="py-4 text-slate-700">{item.awards}</td>
<td className="py-4 font-bold text-slate-950">
{item.winRate}%
</td>
<td className="py-4 font-bold text-slate-950">
${item.spend.toLocaleString()}
</td>
<td className="py-4">
<span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-orange-700">
{item.opportunityScore}/100
</span>
</td>
</tr>
))}
</tbody>
</table>
</div>
</section>

<section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
Executive Benchmark Engine
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Industry Benchmark Intelligence
</h2>

<div className="mt-8 grid gap-6 md:grid-cols-4">
{benchmarkMatrix.map((item) => (
<MetricCard
key={item.title}
title={`${item.title} Benchmark`}
value={`${item.score}/100`}
/>
))}
</div>

<div className="mt-8 rounded-3xl border border-orange-200 bg-orange-50 p-6">
<p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">
Benchmark Status
</p>

<h3 className="mt-2 text-3xl font-black text-slate-950">
{benchmarkStatus}
</h3>

<p className="mt-3 text-sm leading-7 text-slate-700">
Benchmark analysis compares procurement performance, supplier
quality, cost optimization, RFQ classification maturity, and
executive readiness against enterprise procurement standards.
</p>
</div>
</section>

<section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
Supplier Portfolio Intelligence
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Supplier Portfolio Health
</h2>

<div className="mt-8 grid gap-6 md:grid-cols-5">
<MetricCard title="Portfolio Health" value={`${portfolioHealthIndex}/100`} />
<MetricCard title="Strategic Suppliers" value={strategicSuppliers.toString()} />
<MetricCard title="Preferred Suppliers" value={preferredSuppliers.toString()} />
<MetricCard title="High Risk Suppliers" value={highRiskSuppliers.toString()} />
<MetricCard title="Diversification" value={`${supplierDiversificationScore}/100`} />
</div>

<div className="mt-8 rounded-3xl border border-orange-200 bg-orange-50 p-6">
<p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">
Portfolio Status
</p>

<h3 className="mt-2 text-3xl font-black text-slate-950">
{portfolioStatus}
</h3>
</div>

<div className="mt-8 space-y-4">
{portfolioRecommendations.map((recommendation) => (
<div
key={recommendation}
className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
>
<p className="text-sm font-semibold text-slate-700">
{recommendation}
</p>
</div>
))}
</div>
</section>

<section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
Daily Executive Briefing
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Executive Morning Brief
</h2>

<div className="mt-8 grid gap-4 md:grid-cols-5">
{dailyExecutiveBriefing.map((item) => (
<div
key={item.title}
className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
>
<p className="text-xs font-black uppercase tracking-[0.2em] text-orange-500">
{item.title}
</p>

<p className="mt-3 text-sm font-semibold leading-7 text-slate-700">
{item.message}
</p>
</div>
))}
</div>
</section>

<ExecutiveExportPanel />

<section className="mt-8 rounded-3xl border border-slate-200 bg-slate-950 p-8 text-white">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-400">
Enterprise Procurement Copilot
</p>

<h2 className="mt-3 text-4xl font-black">
Ask Nexus Copilot
</h2>

<p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300">
{copilotSummary}
</p>

<div className="mt-8 grid gap-4 md:grid-cols-2">
{procurementCopilotPrompts.map((prompt) => (
<div key={prompt.question} className="rounded-2xl bg-white/10 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">
{prompt.question}
</p>

<p className="mt-3 text-sm font-semibold leading-7 text-slate-300">
{prompt.answer}
</p>
</div>
))}
</div>

<div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-400">
Featured Insight
</p>

<p className="mt-3 text-sm font-semibold leading-7 text-slate-300">
{copilotFeaturedInsight}
</p>
</div>

<div className="mt-8 grid gap-4 md:grid-cols-3">
{copilotModes.map((mode) => (
<div
key={mode.mode}
className="rounded-2xl border border-white/10 bg-white/5 p-5"
>
<p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">
{mode.mode}
</p>

<p className="mt-3 text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
{mode.focus}
</p>

<p className="mt-4 text-sm leading-7 text-slate-300">
{mode.insight}
</p>
</div>
))}
</div>

<div className="mt-8 grid gap-6 md:grid-cols-3">
<DarkList title="Executive Decision Queue" items={executiveDecisionQueue} />
<DarkList title="Top Risks This Quarter" items={topQuarterRisks} />
<DarkList title="Top Opportunities" items={topQuarterOpportunities} />
</div>
</section>

<section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
Executive Benchmark Center
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Enterprise Procurement Benchmark
</h2>

<p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-slate-600">
Benchmark procurement maturity, supplier network strength, award confidence,
risk exposure, and board readiness using validated Nexus Pavilion operating
data.
</p>

<div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-5">
<MetricCard title="Benchmark Score" value={`${benchmarkReadinessScore}/100`} />
<MetricCard title="Benchmark Status" value={executiveBenchmarkStatus} />
<MetricCard title="Supplier Network" value={supplierNetworkBenchmark} />
<MetricCard title="Award Benchmark" value={awardBenchmark} />
<MetricCard title="Risk Benchmark" value={riskBenchmark} />
</div>
</section>
<section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
Industry Benchmark Engine
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Construction Procurement Industry Benchmark
</h2>

<p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-slate-600">
Nexus Pavilion estimates internal industry positioning using validated
procurement maturity, supplier engagement, operational efficiency, data
quality, and enterprise procurement performance signals.
</p>

<div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
<MetricCard title="Industry Score" value={`${industryBenchmarkScore}/100`} />
<MetricCard title="Market Position" value={industryBenchmarkPosition} />
<MetricCard title="Procurement Signal" value={industryProcurementSignal} />
<MetricCard title="Risk Signal" value={industryRiskSignal} />
</div>
</section>

<section className="mt-8 rounded-3xl border border-slate-200 bg-slate-950 p-8 text-white">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-400">
Executive Scorecard
</p>

<h2 className="mt-3 text-4xl font-black">
Board-Level Procurement Command Scorecard
</h2>

<p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-slate-300">
Nexus Pavilion consolidates procurement maturity, board health,
benchmark readiness, supplier engagement, digital maturity, and enterprise
risk posture into a single executive decision layer.
</p>

<div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
<DarkMetric title="Board Health" value={`${boardHealthIndex}/100`} />
<DarkMetric title="Enterprise Score" value={`${enterpriseProcurementScore}/100`} />
<DarkMetric title="Executive Readiness" value={`${executiveReadinessScore}/100`} />
<DarkMetric title="Digital Maturity" value={`${digitalMaturityScore}/100`} />
</div>

<div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
<DarkMetric title="Procurement Efficiency" value={`${procurementEfficiencyScore}/100`} />
<DarkMetric title="Supplier Engagement" value={`${supplierEngagementScore}/100`} />
<DarkMetric title="Benchmark Status" value={executiveBenchmarkStatus} />
<DarkMetric title="Executive Status" value={executiveStatus} />
</div>
</section>

<section className="mt-8 rounded-3xl border border-slate-950 bg-slate-950 p-8 text-white">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-400">
Executive Operating System
</p>

<h2 className="mt-3 text-4xl font-black">
Enterprise Decision Layer
</h2>

<p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-slate-300">
Unified executive operating model combining board readiness,
enterprise performance, risk posture, and strategic opportunity
intelligence.
</p>

<div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
<DarkMetric title="Board Status" value={boardCommandStatus} />
<DarkMetric title="CEO Status" value={ceoCommandStatus} />
<DarkMetric title="Enterprise" value={enterpriseCommandStatus} />
<DarkMetric title="Risk" value={riskCommandStatus} />
<DarkMetric title="Opportunity" value={opportunityCommandStatus} />
</div>

<div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-400">
Command Recommendation
</p>

<p className="mt-4 text-sm leading-7 text-slate-300">
{executiveCommandRecommendation}
</p>
</div>
</section>

<section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
Board Readiness Intelligence
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Executive Governance Center
</h2>

<p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-slate-600">
Evaluate executive governance readiness, board presentation
confidence, financial visibility, procurement maturity,
and enterprise risk posture using validated operating data.
</p>

<div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-5">
<MetricCard
title="Board Readiness"
value={`${boardReadinessScore}/100`}
/>

<MetricCard
title="Governance"
value={governanceReadiness}
/>

<MetricCard
title="Financial Visibility"
value={financialVisibility}
/>

<MetricCard
title="Risk Visibility"
value={riskVisibility}
/>

<MetricCard
title="Recommendation"
value={boardRecommendation}
/>
</div>
</section>
<section className="mt-8 rounded-3xl border border-slate-200 bg-slate-950 p-8 text-white">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-400">
CEO Briefing Intelligence
</p>

<h2 className="mt-3 text-4xl font-black">
Executive Morning Brief
</h2>

<p className="mt-4 max-w-4xl text-sm leading-7 text-slate-300">
{ceoMorningBrief}
</p>

<div className="mt-8 grid gap-4 md:grid-cols-4">
<DarkMetric
title="CEO Readiness"
value={`${ceoReadinessScore}/100`}
/>

<DarkMetric
title="Priority"
value={ceoPriorityLevel}
/>

<DarkMetric
title="Risk Level"
value={ceoRiskLevel}
/>

<DarkMetric
title="Opportunity"
value={ceoOpportunityLevel}
/>
</div>

<div className="mt-8 grid gap-6 md:grid-cols-3">
<DarkList
title="Priority Queue"
items={ceoPriorityQueue}
/>

<DarkList
title="Critical Risks"
items={ceoCriticalRisks}
/>

<DarkList
title="Strategic Opportunities"
items={ceoStrategicOpportunities}
/>
</div>
</section>

<ExecutiveRiskIntelligence
supplierRiskRadar={supplierRiskRadar}
supplierRanking={supplierRanking}
/>

<section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
Executive Risk Intelligence
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Enterprise Risk Center
</h2>

<div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-5">
<MetricCard title="Risk Index" value={`${procurementRiskIndex}/100`} />
<MetricCard title="Supplier Dependency" value={supplierDependencyRisk} />
<MetricCard title="Vendor Concentration" value={concentrationLevel} />
<MetricCard title="Maturity Score" value={`${procurementMaturityScore}/100`} />
<MetricCard title="AI Confidence" value={aiConfidenceScore} />
</div>
</section>



<section className="mt-8 rounded-3xl border border-slate-950 bg-slate-950 p-8 text-white">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-400">
Procurement Command Center
</p>

<h2 className="mt-3 text-4xl font-black">
Executive Procurement Command Center
</h2>

<p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-slate-300">
Unified executive decision layer combining board readiness,
procurement performance, supplier engagement, operational risk,
and strategic opportunity intelligence.
</p>

<div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
<DarkMetric
title="Board Command"
value={boardCommandStatus}
/>

<DarkMetric
title="CEO Command"
value={ceoCommandStatus}
/>

<DarkMetric
title="Risk Level"
value={ceoRiskLevel}
/>

<DarkMetric
title="Opportunity"
value={ceoOpportunityLevel}
/>
</div>

<div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
<DarkMetric
title="Board Health"
value={`${boardHealthIndex}/100`}
/>

<DarkMetric
title="Enterprise Score"
value={`${enterpriseProcurementScore}/100`}
/>

<DarkMetric
title="Executive Readiness"
value={`${executiveReadinessScore}/100`}
/>

<DarkMetric
title="Benchmark Readiness"
value={`${benchmarkReadinessScore}/100`}
/>
</div>

<div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-400">
Command Recommendation
</p>

<p className="mt-4 text-sm leading-7 text-slate-300">
{boardRecommendation}
</p>
</div>
</section>

<section className="mt-8 rounded-3xl border border-slate-950 bg-slate-950 p-8 text-white">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-400">
Executive Operating System
</p>

<h2 className="mt-3 text-4xl font-black">
Enterprise Command Layer
</h2>

<p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-slate-300">
Unified executive operating view across procurement performance,
benchmark readiness, board health, enterprise risk, supplier engagement,
and opportunity intelligence.
</p>

<div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
<DarkMetric
title="Board Health"
value={`${boardHealthIndex}/100`}
/>

<DarkMetric
title="Benchmark"
value={`${benchmarkReadinessScore}/100`}
/>

<DarkMetric
title="Enterprise"
value={enterpriseCommandStatus}
/>

<DarkMetric
title="Risk"
value={riskCommandStatus}
/>

<DarkMetric
title="Opportunity"
value={opportunityCommandStatus}
/>
</div>

<div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-400">
Executive Recommendation
</p>

<p className="mt-4 text-sm leading-7 text-slate-300">
{executiveCommandRecommendation}
</p>
</div>
</section>

<ProcurementCopilotIntelligence
procurementRiskIndex={procurementRiskIndex}
supplierDependencyRisk={supplierDependencyRisk}
awardPredictionConfidence={awardPredictionConfidence}
predictionAccuracy={predictionAccuracy}
executiveStatus={executiveStatus}
/>

<AIConfidenceEngine
aiConfidenceScore={aiConfidenceScore}
dataQualityScore={dataQualityScore}
supplierReliabilityScore={supplierReliabilityScore}
predictionAccuracy={predictionAccuracy}
awardPredictionConfidence={awardPredictionConfidence}
/>
</div>

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
</main>
);
}

function MetricCard({ title, value }: { title: string; value: string }) {
return (
<div className="rounded-3xl border border-slate-200 bg-white p-7">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
{title}
</p>

<p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
</div>
);
}

function DarkMetric({ title, value }: { title: string; value: string }) {
return (
<div className="rounded-2xl bg-white/10 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
{title}
</p>

<p className="mt-2 text-2xl font-black text-white">{value}</p>
</div>
);
}

function DarkTextCard({ title, value }: { title: string; value: string }) {
return (
<div className="rounded-2xl bg-white/5 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">
{title}
</p>

<p className="mt-3 text-sm leading-7 text-slate-300">{value}</p>
</div>
);
}

function DarkList({ title, items }: { title: string; items: string[] }) {
return (
<div className="rounded-2xl border border-white/10 bg-white/5 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">
{title}
</p>

<div className="mt-4 space-y-3">
{items.map((item) => (
<div key={item} className="rounded-xl bg-white/5 p-3 text-sm text-slate-300">
{item}
</div>
))}
</div>
</div>
);
}

function SignalRow({ label, value }: { label: string; value: string }) {
return (
<div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm">
<p className="text-sm font-black text-slate-600">{label}</p>
<p className="text-sm font-black text-slate-950">{value}</p>
</div>
);
}
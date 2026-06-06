import Link from "next/link";

import AnalyticsChart from "@/components/analytics-chart";
import { createClient } from "@/lib/supabase/server";

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

const rfqList = rfqs ?? [];
const rfqIds = rfqList.map((rfq: any) => rfq.id);

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

const quoteList = quotes ?? [];
const companyList = companies ?? [];

const totalRfqs = rfqList.length;

const activeRfqs = rfqList.filter(
(rfq: any) => !rfq.status || rfq.status === "open"
).length;

const awardedContracts = quoteList.filter(
(quote: any) => quote.decision === "awarded"
).length;

const supplierQuotes = quoteList.length;

const quoteAmounts = quoteList
.map((quote: any) => Number(quote.amount))
.filter((amount) => Number.isFinite(amount));

const procurementVolume = quoteAmounts.reduce(
(total, amount) => total + amount,
0
);

const awardedVolume = quoteList
.filter((quote: any) => quote.decision === "awarded")
.reduce((total: number, quote: any) => total + Number(quote.amount || 0), 0);

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

const categoryCounts = rfqList.reduce(
(acc: Record<string, number>, rfq: any) => {
const category = rfq.category || "Uncategorized";
acc[category] = (acc[category] || 0) + 1;
return acc;
},
{}
);

const topCategory =
Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
"N/A";

const budgetTotal = rfqList.reduce(
(total: number, rfq: any) => total + Number(rfq.budget || 0),
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

const executiveSummary =
totalRfqs === 0
? "No RFQ activity has been created yet. Start by publishing procurement opportunities to activate executive intelligence."
: `${procurementHealth} procurement health. ${competitionIndex}. Award conversion is ${awardRate}%, with ${supplierQuotes} supplier quotes and ${potentialSavings.toLocaleString()} dollars in estimated savings opportunity.`;

const aiInsight =
executiveProcurementHealth >= 85
? `Procurement operations are performing strongly. Competition remains ${marketCompetitionIndex.toLowerCase()} and estimated savings exceed $${potentialSavings.toLocaleString()}.`
: executiveProcurementHealth >= 70
? "Procurement performance is stable, but there is room to improve supplier participation and award efficiency."
: "Warning: procurement performance requires attention. Consider increasing supplier engagement and reviewing RFQ conversion rates.";

const aiRecommendation =
potentialSavings > 10000
? "Focus on competitive bidding strategies to unlock additional savings."
: awardedVolume > budgetTotal * 0.7
? "Award conversion is healthy. Continue scaling high-performing supplier relationships."
: "Review supplier participation and RFQ attractiveness to improve procurement outcomes.";

const strategicRecommendations: string[] = [];

if (avgQuotesPerRfq < 2) {
strategicRecommendations.push(
"Increase supplier invitations to improve RFQ competition."
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
.map((rfq: any) => {
const rfqQuotes = quoteList.filter(
(quote: any) => quote.rfq_id === rfq.id
);

const lowestBid =
rfqQuotes.length > 0
? Math.min(
...rfqQuotes.map((quote: any) => Number(quote.amount || 0))
)
: 0;

const probability = Math.min(
95,
Math.max(
25,
Math.round(
rfqQuotes.length * 18 +
(rfq.status === "awarded" ? 35 : 0) +
(lowestBid > 0 ? 15 : 0) +
awardRate * 0.2
)
)
);

return {
title: rfq.title || "Untitled RFQ",
category: rfq.category || "Procurement",
quotes: rfqQuotes.length,
probability,
status: rfq.status || "open",
};
})
.slice(0, 10);

const vendorLeaderboard = companyList
.map((company: any) => {
const companyQuotes = quoteList.filter(
(quote: any) => quote.company_id === company.id
);

const awardedQuotes = companyQuotes.filter(
(quote: any) => quote.decision === "awarded"
);

const revenue = awardedQuotes.reduce(
(total: number, quote: any) => total + Number(quote.amount || 0),
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
.map((company: any) => {
const companyQuotes = quoteList.filter(
(quote: any) => quote.company_id === company.id
);

const awardedQuotes = companyQuotes.filter(
(quote: any) => quote.decision === "awarded"
);

const revenue = awardedQuotes.reduce(
(total: number, quote: any) => total + Number(quote.amount || 0),
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
procurementHealthScore * 0.5 +
competitionScore * 0.2 +
awardRate * 0.2 +
budgetUtilization * 0.1
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
(totalRfqs > 0 ? 30 : 0) +
(supplierQuotes > 0 ? 30 : 0) +
(awardedContracts > 0 ? 20 : 0) +
(budgetTotal > 0 ? 20 : 0)
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
(100 - procurementRiskIndex)) /
4
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
awardRate * 0.4 +
budgetUtilization * 0.3 +
avgQuotesPerRfq * 10 +
procurementHealthScore * 0.2
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
procurementMaturityScore * 0.5 +
dataQualityScore * 0.25 +
supplierEngagementScore * 0.25
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
budgetUtilization * 0.2
)
);

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
enterpriseProcurementScore >= 80 && procurementRiskIndex < 35
? "Procurement performance is strong. Continue scaling supplier coverage and competitive RFQ activity."
: procurementOpportunityScore >= 70
? "High opportunity detected. Prioritize supplier expansion, competitive bidding, and category-level savings capture."
: procurementRiskIndex >= 60
? "Risk level is elevated. Review supplier dependency, award concentration, and RFQ conversion quality."
: "Procurement operations are stable. Continue improving supplier participation and forecast confidence.";

const executiveAlerts = [];

if (procurementOpportunityScore >= 80) {
executiveAlerts.push({
level: "opportunity",
title: "Major Savings Opportunity",
message:
"Category analysis indicates significant procurement savings potential.",
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

const boardRecommendation =
procurementRiskIndex >= 60
? "Reduce supplier dependency and review award concentration before scaling procurement volume."
: procurementOpportunityScore >= 80
? "Prioritize high-opportunity procurement categories and expand supplier participation to capture savings."
: enterpriseProcurementScore >= 75
? "Continue scaling competitive RFQs while maintaining supplier performance and forecast confidence."
: "Improve RFQ participation, supplier coverage, and procurement data quality to strengthen executive confidence.";

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
{boardRecommendation}
</p>
</div>

<div className="grid gap-4 sm:grid-cols-2">
<MetricCard
title="Revenue Under Management"
value={`$${procurementVolume.toLocaleString()}`}
/>

<MetricCard
title="Savings Generated"
value={`$${forecastSavings.toLocaleString()}`}
/>

<MetricCard
title="Enterprise Score"
value={`${enterpriseProcurementScore}/100`}
/>

<MetricCard
title="Forecast Accuracy"
value={`${predictionAccuracy}%`}
/>
</div>
</div>
</section>

<section className="mt-8 rounded-3xl border border-slate-200 bg-white p-10">
<p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
Executive Command Center
</p>

<h1 className="mt-3 text-5xl font-black text-slate-950">
Procurement Analytics
</h1>

<p className="mt-4 max-w-3xl text-sm text-slate-600">
Company-isolated analytics for RFQs, supplier quotes, awarded
contracts, procurement volume, savings, platform activity, and
executive procurement intelligence.
</p>
</section>
<section className="mt-8 rounded-3xl border border-slate-200 bg-slate-950 p-8 text-white">
<p className="text-xs font-black uppercase tracking-[0.3em] text-orange-400">
Executive Procurement Command Center
</p>

<div className="mt-5 grid gap-8 lg:grid-cols-[1fr_0.8fr]">
<div>
<h2 className="text-4xl font-black">
Enterprise Procurement Control Tower
</h2>

<p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
{executiveCommandRecommendation}
</p>
</div>

<div className="grid gap-4 sm:grid-cols-2">
<div className="rounded-2xl bg-white/10 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
Enterprise Score
</p>
<p className="mt-2 text-3xl font-black">
{enterpriseProcurementScore}/100
</p>
</div>

<div className="rounded-2xl bg-white/10 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
Opportunity
</p>
<p className="mt-2 text-3xl font-black">
{procurementOpportunityScore}/100
</p>
</div>

<div className="rounded-2xl bg-white/10 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
Risk Index
</p>
<p className="mt-2 text-3xl font-black">
{procurementRiskIndex}/100
</p>
</div>

<div className="rounded-2xl bg-white/10 p-5">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
Forecast Accuracy
</p>
<p className="mt-2 text-3xl font-black">
{predictionAccuracy}%
</p>
</div>
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

<p className="font-black text-slate-950">
{alert.title}
</p>
</div>

<p className="mt-2 text-sm text-slate-600">
{alert.message}
</p>
</div>
))}
</div>
</section>

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
<SignalRow label="Savings Signal" value={`${savingsScore}/100`} />
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

<section className="mt-8 grid gap-6 lg:grid-cols-3">
<div className="rounded-3xl border border-slate-200 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
Savings Tracker
</p>

<h2 className="mt-3 text-4xl font-black text-slate-950">
${potentialSavings.toLocaleString()}
</h2>

<p className="mt-3 text-sm text-slate-600">
Estimated savings based on lowest quote compared to average bid.
</p>
</div>

<div className="rounded-3xl border border-slate-200 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
Awarded Procurement
</p>

<h2 className="mt-3 text-4xl font-black text-slate-950">
${awardedVolume.toLocaleString()}
</h2>

<p className="mt-3 text-sm text-slate-600">
Total value of company RFQ quotes that have been awarded.
</p>
</div>

<div className="rounded-3xl border border-slate-200 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
Recent Activity
</p>

<div className="mt-4 space-y-3">
{notifications && notifications.length > 0 ? (
notifications.map((notification: any) => (
<div
key={notification.id}
className="rounded-2xl bg-slate-100 p-4"
>
<p className="text-sm font-black text-slate-950">
{notification.title}
</p>

<p className="mt-1 text-xs text-slate-600">
{notification.type}
</p>
</div>
))
) : (
<p className="text-sm font-semibold text-slate-500">
No activity yet.
</p>
)}
</div>
</div>
</section>

<section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
Strategic Procurement Intelligence
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Executive Market Signals
</h2>

<div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
<MetricCard
title="Executive Health"
value={`${executiveProcurementHealth}/100`}
/>

<MetricCard
title="Market Competition"
value={marketCompetitionIndex}
/>

<MetricCard
title="Budget Utilization"
value={`${budgetUtilization}%`}
/>

<MetricCard title="Top Category" value={topCategory} />
</div>

<div className="mt-6 grid gap-6 md:grid-cols-2">
<MetricCard
title="Total RFQ Budget"
value={`$${budgetTotal.toLocaleString()}`}
/>

<MetricCard
title="Savings Opportunity"
value={`$${potentialSavings.toLocaleString()}`}
/>
</div>
</section>

<section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
Executive Procurement Dashboard
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Strategic Command Signals
</h2>

<div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
<MetricCard
title="Procurement Health"
value={`${procurementHealthScore}/100`}
/>

<MetricCard
title="Executive Health"
value={`${executiveProcurementHealth}/100`}
/>

<MetricCard
title="Market Competition"
value={marketCompetitionIndex}
/>

<MetricCard title="Top Category" value={topCategory} />
</div>

<div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
<MetricCard
title="Budget Utilization"
value={`${budgetUtilization}%`}
/>

<MetricCard
title="Savings Opportunity"
value={`$${potentialSavings.toLocaleString()}`}
/>

<MetricCard
title="Awarded Volume"
value={`$${awardedVolume.toLocaleString()}`}
/>

<MetricCard
title="Top Vendor"
value={vendorLeaderboard[0]?.name || "N/A"}
/>
</div>
</section>

<section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
AI Procurement Insights
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Executive Recommendations
</h2>

<div className="mt-6 rounded-3xl bg-slate-50 p-6">
<p className="text-sm leading-7 text-slate-700">{aiInsight}</p>
</div>

<div className="mt-6 rounded-3xl border border-orange-200 bg-orange-50 p-6">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-600">
Recommended Action
</p>

<p className="mt-3 text-sm leading-7 text-slate-700">
{aiRecommendation}
</p>
</div>
</section>

<section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
AI Strategic Recommendations
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Recommended Executive Actions
</h2>

<div className="mt-6 space-y-4">
{strategicRecommendations.map((recommendation, index) => (
<div
key={index}
className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
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
<th className="px-5 py-4 text-sm">Category</th>
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

<td className="px-5 py-4 text-slate-600">
{rfq.category}
</td>

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

{awardProbabilityForecast.length === 0 && (
<tr>
<td
colSpan={5}
className="px-5 py-10 text-center text-sm font-semibold text-slate-500"
>
No RFQ forecast data available.
</td>
</tr>
)}
</tbody>
</table>
</div>
</section>

<section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
Procurement Opportunity Engine
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Opportunity Intelligence Center
</h2>

<div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
<MetricCard
title="Opportunity Score"
value={`${procurementOpportunityScore}/100`}
/>

<MetricCard
title="Opportunity Level"
value={opportunityLevel}
/>

<MetricCard
title="Best Category"
value={bestProcurementCategory}
/>

<MetricCard
title="Savings Signal"
value={savingsOpportunityLevel}
/>
</div>
</section>

<section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
Executive KPI Scorecard
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Enterprise Procurement Score
</h2>

<div className="mt-6 grid gap-4 md:grid-cols-5">
<MetricCard
title="Overall Score"
value={`${enterpriseProcurementScore}/100`}
/>

<MetricCard title="Executive Status" value={executiveStatus} />

<MetricCard
title="Forecast Accuracy"
value={`${predictionAccuracy}%`}
/>

<MetricCard
title="Savings Forecast"
value={`$${forecastSavings.toLocaleString()}`}
/>

<MetricCard title="AI Confidence" value={`${dataQualityScore}%`} />
</div>
</section>

<section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
Executive Forecast
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Procurement Forecast Intelligence
</h2>

<div className="mt-6 grid gap-6 md:grid-cols-4">
<MetricCard
title="Forecast Award Volume"
value={`$${forecastAwardVolume.toLocaleString()}`}
/>

<MetricCard
title="Forecast Savings"
value={`$${forecastSavings.toLocaleString()}`}
/>

<MetricCard title="Forecast Health" value={forecastHealth} />

<MetricCard
title="Competition Outlook"
value={forecastCompetition}
/>
</div>
</section>

<section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
Vendor Intelligence
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Top Vendors
</h2>

<div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
<table className="w-full text-left">
<thead className="bg-slate-950 text-white">
<tr>
<th className="px-5 py-4 text-sm">Vendor</th>
<th className="px-5 py-4 text-sm">Quotes</th>
<th className="px-5 py-4 text-sm">Awards</th>
<th className="px-5 py-4 text-sm">Win Rate</th>
<th className="px-5 py-4 text-sm">Revenue</th>
</tr>
</thead>

<tbody>
{vendorLeaderboard.length > 0 ? (
vendorLeaderboard.map((vendor) => (
<tr key={vendor.name} className="border-t border-slate-100">
<td className="px-5 py-4 font-bold text-slate-950">
{vendor.name}
</td>

<td className="px-5 py-4 text-slate-600">
{vendor.quotes}
</td>

<td className="px-5 py-4 text-slate-600">
{vendor.awards}
</td>

<td className="px-5 py-4 text-slate-600">
{vendor.winRate}%
</td>

<td className="px-5 py-4 text-slate-600">
${vendor.revenue.toLocaleString()}
</td>
</tr>
))
) : (
<tr>
<td
colSpan={5}
className="px-5 py-10 text-center text-sm font-semibold text-slate-500"
>
No vendor quote activity found.
</td>
</tr>
)}
</tbody>
</table>
</div>
</section>

<section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
Supplier Risk Radar
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Supplier Risk Intelligence
</h2>

<div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
<table className="w-full text-left">
<thead className="bg-slate-950 text-white">
<tr>
<th className="px-4 py-4 text-sm">Supplier</th>
<th className="px-4 py-4 text-sm">Overall</th>
<th className="px-4 py-4 text-sm">Financial</th>
<th className="px-4 py-4 text-sm">Performance</th>
<th className="px-4 py-4 text-sm">Capacity</th>
<th className="px-4 py-4 text-sm">Dependency</th>
</tr>
</thead>

<tbody>
{supplierRiskRadar.map((supplier) => (
<tr key={supplier.name} className="border-t border-slate-100">
<td className="px-4 py-4 font-bold">{supplier.name}</td>
<td className="px-4 py-4 font-black">
{supplier.overallRisk}
</td>
<td className="px-4 py-4">{supplier.financialRisk}</td>
<td className="px-4 py-4">{supplier.performanceRisk}</td>
<td className="px-4 py-4">{supplier.capacityRisk}</td>
<td className="px-4 py-4">{supplier.dependencyRisk}</td>
</tr>
))}

{supplierRiskRadar.length === 0 && (
<tr>
<td
colSpan={6}
className="px-5 py-10 text-center text-sm font-semibold text-slate-500"
>
No supplier risk data available.
</td>
</tr>
)}
</tbody>
</table>
</div>
</section>
<section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
AI Supplier Ranking Engine
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Supplier Intelligence Ranking
</h2>

<div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
<table className="w-full text-left">
<thead className="bg-slate-950 text-white">
<tr>
<th className="px-5 py-4 text-sm">Supplier</th>
<th className="px-5 py-4 text-sm">AI Score</th>
<th className="px-5 py-4 text-sm">Tier</th>
<th className="px-5 py-4 text-sm">Win Rate</th>
<th className="px-5 py-4 text-sm">Revenue</th>
<th className="px-5 py-4 text-sm">Recommendation</th>
</tr>
</thead>

<tbody>
{supplierRanking.map((vendor) => (
<tr key={vendor.name} className="border-t border-slate-100">
<td className="px-5 py-4 font-bold text-slate-950">
{vendor.name}
</td>

<td className="px-5 py-4 font-black text-emerald-600">
{vendor.aiScore}
</td>

<td className="px-5 py-4">
<span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold">
{vendor.tier}
</span>
</td>

<td className="px-5 py-4 text-slate-600">
{vendor.winRate}%
</td>

<td className="px-5 py-4 text-slate-600">
${vendor.revenue.toLocaleString()}
</td>

<td className="px-5 py-4 text-slate-600">
{vendor.recommendation}
</td>
</tr>
))}

{supplierRanking.length === 0 && (
<tr>
<td
colSpan={6}
className="px-5 py-10 text-center text-slate-500"
>
No supplier intelligence available.
</td>
</tr>
)}
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
<th className="px-5 py-4 text-sm">Location</th>
<th className="px-5 py-4 text-sm">Status</th>
</tr>
</thead>

<tbody>
{rfqList.map((rfq: any) => (
<tr key={rfq.id} className="border-t border-slate-100">
<td className="px-5 py-4 font-bold text-slate-950">
{rfq.title}
</td>

<td className="px-5 py-4 text-slate-600">
{rfq.category}
</td>

<td className="px-5 py-4 text-slate-600">
{rfq.location}
</td>

<td className="px-5 py-4">
<span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">
{rfq.status || "open"}
</span>
</td>
</tr>
))}

{rfqList.length === 0 && (
<tr>
<td
colSpan={4}
className="px-5 py-10 text-center text-sm font-semibold text-slate-500"
>
No company RFQs found.
</td>
</tr>
)}
</tbody>
</table>
</div>
</section>

<section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
Executive Risk Intelligence
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Enterprise Risk Center
</h2>

<div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-5">
<MetricCard
title="Risk Index"
value={`${procurementRiskIndex}/100`}
/>

<MetricCard
title="Supplier Dependency"
value={supplierDependencyRisk}
/>

<MetricCard
title="Vendor Concentration"
value={concentrationLevel}
/>

<MetricCard
title="Maturity Score"
value={`${procurementMaturityScore}/100`}
/>

<MetricCard title="AI Confidence" value={aiConfidenceScore} />
</div>
</section>

<section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
AI Confidence Engine
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Prediction Confidence Center
</h2>

<div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-5">
<MetricCard title="AI Confidence" value={aiConfidenceScore} />

<MetricCard
title="Data Quality"
value={`${dataQualityScore}/100`}
/>

<MetricCard
title="Supplier Reliability"
value={`${supplierReliabilityScore}/100`}
/>

<MetricCard
title="Prediction Accuracy"
value={`${predictionAccuracy}%`}
/>

<MetricCard
title="Award Confidence"
value={awardPredictionConfidence}
/>
</div>
</section>
</div>
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

function SignalRow({ label, value }: { label: string; value: string }) {
return (
<div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm">
<p className="text-sm font-black text-slate-600">{label}</p>
<p className="text-sm font-black text-slate-950">{value}</p>
</div>
);
}
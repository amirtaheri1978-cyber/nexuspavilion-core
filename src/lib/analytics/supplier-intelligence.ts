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

type BuildSupplierIntelligenceInput = {
quoteList: Quote[];
companyList: Company[];
};

export function buildSupplierIntelligence({
quoteList,
companyList,
}: BuildSupplierIntelligenceInput) {
const vendorLeaderboard = companyList
.map((company) => {
const companyQuotes = quoteList.filter(
(quote) => quote.company_id === company.id,
);

const awardedQuotes = companyQuotes.filter(
(quote) => quote.decision === "awarded",
);

const revenue = awardedQuotes.reduce(
(total, quote) => total + Number(quote.amount || 0),
0,
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
(quote) => quote.company_id === company.id,
);

const awardedQuotes = companyQuotes.filter(
(quote) => quote.decision === "awarded",
);

const revenue = awardedQuotes.reduce(
(total, quote) => total + Number(quote.amount || 0),
0,
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
revenueScore * 0.1,
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
0,
);

const supplierRiskRadar = supplierRanking.map((supplier) => {
const financialRisk = Math.max(
5,
Math.round(100 - supplier.revenue / 5000),
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
5,
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

const strategicSuppliers = supplierRanking.filter(
(supplier) => supplier.aiScore >= 85,
).length;

const preferredSuppliers = supplierRanking.filter(
(supplier) => supplier.aiScore >= 70,
).length;

const highRiskSuppliers = supplierRiskRadar.filter(
(supplier) => supplier.overallRisk >= 60,
).length;

const supplierDiversificationScore =
supplierRanking.length >= 10
? 100
: Math.min(100, supplierRanking.length * 10);

const supplierReliabilityScore =
supplierRanking.length > 0
? Math.round(
supplierRanking.reduce((sum, vendor) => sum + vendor.winRate, 0) /
supplierRanking.length,
)
: 0;

return {
vendorLeaderboard,
supplierRanking,
supplierRiskRadar,
strategicSuppliers,
preferredSuppliers,
highRiskSuppliers,
supplierDiversificationScore,
supplierReliabilityScore,
};
}

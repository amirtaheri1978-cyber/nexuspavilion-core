import type {
ExecutiveIntelligenceInput,
ExecutiveRisk,
ExecutiveTone,
} from "@/lib/executive/executive-types";

function severity(score: number): ExecutiveTone {
if (score >= 85) return "success";
if (score >= 70) return "info";
if (score >= 55) return "warning";
return "risk";
}

export function buildExecutiveRisks({
recommendedQuote,
healthScore,
quoteCount,
documentCount,
addendaCount,
}: ExecutiveIntelligenceInput): ExecutiveRisk[] {
const risks: ExecutiveRisk[] = [];

if (healthScore < 72) {
risks.push({
title: "Procurement Health",
severity: severity(healthScore),
summary:
"Overall procurement health is below the executive target and should be improved before award.",
});
}

if (quoteCount < 3) {
risks.push({
title: "Supplier Competition",
severity: "warning",
summary:
"Supplier competition is below the preferred executive threshold.",
});
}

if (documentCount === 0) {
risks.push({
title: "Documentation",
severity: "risk",
summary:
"The RFQ package is incomplete and may increase commercial and execution risk.",
});
}

if (addendaCount === 0) {
risks.push({
title: "Governance",
severity: "info",
summary:
"No addenda have been issued. Confirm that the scope has been fully clarified.",
});
}

if (
recommendedQuote &&
recommendedQuote.riskLevel.toLowerCase() !== "low"
) {
risks.push({
title: "Supplier Risk",
severity: "warning",
summary: `Recommended supplier is currently assessed as ${recommendedQuote.riskLevel.toLowerCase()} risk.`,
});
}

if (risks.length === 0) {
risks.push({
title: "Executive Assessment",
severity: "success",
summary:
"No significant executive procurement risks have been identified.",
});
}

return risks;
}

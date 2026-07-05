import type {
ExecutiveIntelligenceInput,
ExecutiveScenario,
ExecutiveTone,
} from "@/lib/executive/executive-types";

function scenarioTone(score: number, riskLevel: string): ExecutiveTone {
if (score >= 85 && riskLevel.toLowerCase() === "low") return "success";
if (score >= 70) return "info";
if (score >= 55) return "warning";

return "risk";
}

export function buildExecutiveScenarios({
recommendedQuote,
averageBid = 0,
quoteCount,
healthScore,
budget = 0,
}: ExecutiveIntelligenceInput): ExecutiveScenario[] {
if (!recommendedQuote) {
return [
{
title: "Await Commercial Evaluation",
tone: "warning",
recommendation:
"Scenario modeling becomes available after a recommended supplier has been identified.",
costImpact: "Pending",
timeImpact: "Pending",
riskImpact: "Pending",
boardView: "Executive review not available yet",
},
];
}

const savings =
averageBid > 0 ? averageBid - recommendedQuote.amountNumber : 0;

const budgetDelta =
budget > 0 ? budget - recommendedQuote.amountNumber : 0;

const confidence = recommendedQuote.awardConfidence;

return [
{
title: "Award Now",
tone: scenarioTone(confidence, recommendedQuote.riskLevel),
recommendation:
"Proceed after executive validation and governance approval.",
costImpact:
savings > 0
? `${Math.round(savings).toLocaleString()} below average bid`
: "Commercial position neutral",
timeImpact: "Fastest route to contract award.",
riskImpact: recommendedQuote.riskLevel,
boardView: confidence >= 85 ? "Board Ready" : "Executive Review",
},
{
title: "Negotiate",
tone: quoteCount >= 3 ? "success" : "warning",
recommendation:
"Use supplier competition to improve commercial value.",
costImpact: "Potential additional savings.",
timeImpact: "Short negotiation cycle.",
riskImpact: "Low if scope remains unchanged.",
boardView: "Recommended when leverage exists.",
},
{
title: "Extend RFQ",
tone: quoteCount < 3 ? "warning" : "info",
recommendation: "Increase supplier participation before award.",
costImpact: "May improve pricing competition.",
timeImpact: "Delays procurement schedule.",
riskImpact: "Lower selection risk.",
boardView: "Use when competition is limited.",
},
{
title: "Rebid",
tone: healthScore < 58 ? "risk" : "warning",
recommendation:
"Restart procurement only if governance or scope quality is inadequate.",
costImpact:
budgetDelta < 0 ? "Potential budget recovery." : "Higher procurement cost.",
timeImpact: "Longest schedule impact.",
riskImpact: "Resets procurement process.",
boardView: "Last resort.",
},
];
}


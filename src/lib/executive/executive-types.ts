import type { ExecutiveQuote } from "@/types/executive";

export type ExecutiveTone =
| "success"
| "info"
| "warning"
| "risk"
| "neutral";

export type ExecutivePriority =
| "critical"
| "high"
| "medium"
| "low";

export type ExecutiveResult = {
score: number;
status: string;
tone: ExecutiveTone;
priority: ExecutivePriority;
recommendation: string;
};

export type ExecutiveReadiness = ExecutiveResult & {
completedControls: number;
totalControls: number;
};

export type ExecutiveRisk = {
title: string;
severity: ExecutiveTone;
summary: string;
};

export type ExecutiveOpportunity = {
title: string;
impact: ExecutiveTone;
summary: string;
};

export type ExecutiveAction = {
title: string;
priority: ExecutivePriority;
category: string;
rationale: string;
outcome: string;
href?: string;
anchorHref?: string;
actionLabel: string;
};

export type ExecutiveScenario = {
title: string;
tone: ExecutiveTone;
recommendation: string;
costImpact: string;
timeImpact: string;
riskImpact: string;
boardView: string;
};

export type ExecutiveNegotiation = ExecutiveResult & {
targetPrice: number;
targetImprovement: number;
expectedSavings: number;
};

export type ExecutiveBoardSummary = {
status: string;
confidence: number;
summary: string;
boardRecommendation: string;
};

export type ExecutiveSummary = {
headline: string;
recommendation: string;
topRisk: string;
topOpportunity: string;
nextStep: string;
};

export type ExecutiveIntelligenceInput = {
rfqSlug: string;
isOwner: boolean;
isOpen: boolean;
commercialEvaluationUnlocked: boolean;
healthScore: number;
quoteCount: number;
documentCount: number;
addendaCount: number;
averageBid: number;
lowestAmount: number | null;
budget: number;
potentialSavings: number;
recommendedQuote: ExecutiveQuote | null;
awardedQuote:
| {
amountNumber: number;
}
| null;
};

export type ExecutiveIntelligence = {
readiness: ExecutiveReadiness;
recommendation: ExecutiveResult;
risks: ExecutiveRisk[];
actions: ExecutiveAction[];
scenarios: ExecutiveScenario[];
negotiation: ExecutiveNegotiation | null;
board: ExecutiveBoardSummary;
summary: ExecutiveSummary;
};

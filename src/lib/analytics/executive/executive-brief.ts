import type { ExecutiveInsight } from "@/lib/analytics/executive/executive-insight";

import {
  buildExecutiveAssessment,
  type ExecutiveAssessment,
} from "@/lib/analytics/executive/executive-assessment";

import {
  buildExecutiveConfidence,
  type ExecutiveConfidence,
} from "@/lib/analytics/executive/executive-confidence";

import {
  buildTopActionInsight,
  type ActionIntelligenceInput,
} from "@/lib/analytics/executive/action-intelligence";

import {
  buildTopOpportunityInsight,
  type OpportunityIntelligenceInput,
} from "@/lib/analytics/executive/opportunity-intelligence";

import {
  buildTopRiskInsight,
  type RiskIntelligenceInput,
} from "@/lib/analytics/executive/risk-intelligence";

export type ExecutiveBrief = {
  action: ExecutiveInsight;
  opportunity: ExecutiveInsight;
  risk: ExecutiveInsight;

  assessment: ExecutiveAssessment;
  executiveConfidence: ExecutiveConfidence;
};

export type ExecutiveBriefInput =
  ActionIntelligenceInput &
  RiskIntelligenceInput & {
    opportunity: OpportunityIntelligenceInput;
  };

export function buildExecutiveBrief({
  opportunity,
  executiveRecommendation,
  decisionSupportReadinessScore,
  topRisk,
  procurementRiskIndex,
  supplierCount,
  avgQuotesPerRfq,
  classificationScore,
}: ExecutiveBriefInput): ExecutiveBrief {
  const actionBundle = buildTopActionInsight({
    executiveRecommendation,
    decisionSupportReadinessScore,
    procurementRiskIndex,
    avgQuotesPerRfq,
  });

  const opportunityBundle =
    buildTopOpportunityInsight(opportunity);

  const riskBundle = buildTopRiskInsight({
    topRisk,
    procurementRiskIndex,
    supplierCount,
    avgQuotesPerRfq,
    classificationScore,
  });

  const assessment = buildExecutiveAssessment([
    ...actionBundle.signals,
    ...opportunityBundle.signals,
    ...riskBundle.signals,
  ]);

  const executiveConfidence =
    buildExecutiveConfidence(assessment);

  return {
    action: actionBundle.insight,
    opportunity: opportunityBundle.insight,
    risk: riskBundle.insight,
    assessment,
    executiveConfidence,
  };
}

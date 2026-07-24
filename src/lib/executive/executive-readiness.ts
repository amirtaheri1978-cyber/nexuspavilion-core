import {
  EXECUTIVE_READINESS_CONTROL_THRESHOLDS,
} from "@/lib/executive/executive-config";

import {
  calculateDecisionReadiness,
} from "@/lib/executive/decision-readiness";

import {
  EXECUTIVE_SCORE_THRESHOLDS,
} from "@/lib/executive/executive-scoring";

import type {
  ExecutiveIntelligenceInput,
  ExecutivePriority,
  ExecutiveReadiness,
  ExecutiveTone,
} from "@/lib/executive/executive-types";

function mapScoreToTone(score: number): ExecutiveTone {
  if (score >= EXECUTIVE_SCORE_THRESHOLDS.excellent) {
    return "success";
  }

  if (score >= EXECUTIVE_SCORE_THRESHOLDS.healthy) {
    return "info";
  }

  if (score >= EXECUTIVE_SCORE_THRESHOLDS.developing) {
    return "warning";
  }

  return "risk";
}

function mapScoreToPriority(
  score: number,
): ExecutivePriority {
  if (score >= EXECUTIVE_SCORE_THRESHOLDS.excellent) {
    return "low";
  }

  if (score >= EXECUTIVE_SCORE_THRESHOLDS.healthy) {
    return "medium";
  }

  if (score >= EXECUTIVE_SCORE_THRESHOLDS.developing) {
    return "high";
  }

  return "critical";
}

export function buildExecutiveReadiness({
  healthScore,
  quoteCount,
  documentCount,
  addendaCount,
  commercialEvaluationUnlocked,
  recommendedQuote,
}: ExecutiveIntelligenceInput): ExecutiveReadiness {
  const readiness = calculateDecisionReadiness({
    healthScore,
    quoteCount,
    documentCount,
    addendaCount,
    commercialEvaluationUnlocked,
    hasRecommendedQuote: Boolean(recommendedQuote),
  });

  const controls = [
    commercialEvaluationUnlocked,
    quoteCount >=
      EXECUTIVE_READINESS_CONTROL_THRESHOLDS.minimumQuoteCount,
    documentCount >=
      EXECUTIVE_READINESS_CONTROL_THRESHOLDS.minimumDocumentCount,
    addendaCount >=
      EXECUTIVE_READINESS_CONTROL_THRESHOLDS.minimumAddendaCount,
    Boolean(recommendedQuote),
    healthScore >=
      EXECUTIVE_READINESS_CONTROL_THRESHOLDS.minimumHealthScore,
  ];

  return {
    score: readiness.score,
    status: readiness.status,
    tone: mapScoreToTone(readiness.score),
    priority: mapScoreToPriority(readiness.score),
    recommendation: readiness.recommendation,
    completedControls: controls.filter(Boolean).length,
    totalControls: controls.length,
  };
}
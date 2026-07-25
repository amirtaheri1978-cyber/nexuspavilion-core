import type {
  ExecutiveEvidence,
  ExecutiveInsight,
  ExecutiveInsightCategory,
  ExecutiveInsightSeverity,
} from "@/lib/analytics/executive/executive-insight";

import { buildExecutiveReasoning } from "@/lib/analytics/executive/executive-reasoning";

import {
  prioritizeExecutiveSignals,
  type ExecutiveSignal,
} from "@/lib/analytics/executive/executive-signal";

export type BuildExecutiveInsightInput = {
  category: ExecutiveInsightCategory;
  title: string;
  summary: string;
  subject: string;
  severity: ExecutiveInsightSeverity;
  confidence: number;
  signals: ExecutiveSignal[];
  fallbackReason: string;
  recommendation: string;
};

function normalizeConfidence(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildEvidence(
  signals: ExecutiveSignal[],
): ExecutiveEvidence[] {
  return prioritizeExecutiveSignals(signals).map((signal) => ({
    label: signal.label,
    value: signal.value,
    status: signal.status,
    description: signal.description,
  }));
}

export function buildExecutiveInsight({
  category,
  title,
  summary,
  subject,
  severity,
  confidence,
  signals,
  fallbackReason,
  recommendation,
}: BuildExecutiveInsightInput): ExecutiveInsight {
  const evidence = buildEvidence(signals);

  const reasoning = buildExecutiveReasoning({
    subject,
    evidence,
    fallbackReason,
    recommendation,
  });

  return {
    category,
    title,
    summary,
    reason: reasoning.reason,
    recommendation: reasoning.recommendation,
    confidence: normalizeConfidence(confidence),
    severity,
    evidence: reasoning.drivers,
  };
}
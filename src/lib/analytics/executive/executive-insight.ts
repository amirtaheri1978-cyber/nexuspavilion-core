export type ExecutiveInsightSeverity =
  | "low"
  | "medium"
  | "high";

export type ExecutiveInsightCategory =
  | "action"
  | "opportunity"
  | "risk";

export type ExecutiveInsight = {
  category: ExecutiveInsightCategory;

  title: string;

  summary: string;

  reason: string;

  recommendation: string;

  confidence: number;

  severity: ExecutiveInsightSeverity;

  evidence: string[];
};
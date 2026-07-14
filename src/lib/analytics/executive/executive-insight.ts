export type ExecutiveInsightSeverity =
  | "low"
  | "medium"
  | "high";

export type ExecutiveInsightCategory =
  | "action"
  | "opportunity"
  | "risk";

export type ExecutiveEvidenceStatus =
  | "strong"
  | "healthy"
  | "moderate"
  | "limited"
  | "critical"
  | "neutral";

export type ExecutiveEvidence = {
  label: string;
  value: string;
  status: ExecutiveEvidenceStatus;
  description?: string;
};

export type ExecutiveInsight = {
  category: ExecutiveInsightCategory;
  title: string;
  summary: string;
  reason: string;
  recommendation: string;
  confidence: number;
  severity: ExecutiveInsightSeverity;
  evidence: ExecutiveEvidence[];
};
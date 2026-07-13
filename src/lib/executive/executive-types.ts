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

export type ExecutiveDataAvailability =
  | "available"
  | "insufficient_data"
  | "not_operational";

export type ExecutiveConfidenceLevel =
  | "high"
  | "medium"
  | "low"
  | "unavailable";

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

export type ExecutiveSupplierSignalKey =
  | "category_alignment"
  | "geographic_alignment"
  | "avl_governance"
  | "commercial_competitiveness"
  | "delivery_reliability"
  | "quality_performance"
  | "historical_award_performance"
  | "response_reliability"
  | "compliance_readiness"
  | "capacity_confidence"
  | "procurement_risk";

export type ExecutiveSupplierSignal = {
  key: ExecutiveSupplierSignalKey;
  label: string;
  availability: ExecutiveDataAvailability;
  score: number | null;
  tone: ExecutiveTone;
  summary: string;
  evidence: string[];
};

export type ExecutiveSupplierRecommendationCandidate = {
  supplierCompanyId: string;
  supplierName: string;
  category: string | null;
  location: string | null;
  networkRole: string | null;
  avlStatus: string | null;
  avlRating: number | null;
  submittedQuoteCount: number;
  awardedQuoteCount: number;
  unsuccessfulQuoteCount: number;
  totalQuotedValue: number;
  totalAwardedValue: number;
  currentQuote: ExecutiveQuote | null;
  signals: ExecutiveSupplierSignal[];
};

export type ExecutiveSupplierRecommendation = {
  supplierCompanyId: string;
  supplierName: string;
  rank: number;
  score: number | null;
  status: string;
  tone: ExecutiveTone;
  priority: ExecutivePriority;
  confidence: ExecutiveConfidenceLevel;
  dataAvailability: ExecutiveDataAvailability;
  dataCoverage: number;
  recommendation: string;
  rationale: string[];
  risks: ExecutiveRisk[];
  signals: ExecutiveSupplierSignal[];
};

export type ExecutiveSupplierRecommendationInput = {
  rfqSlug: string;
  rfqCategory: string | null;
  rfqLocation: string | null;
  procurementScope: string | null;
  sourcingMethod: string | null;
  commercialEvaluationUnlocked: boolean;
  candidates: ExecutiveSupplierRecommendationCandidate[];
};

export type ExecutiveSupplierRecommendationResult = {
  status: string;
  availability: ExecutiveDataAvailability;
  confidence: ExecutiveConfidenceLevel;
  recommendation: string;
  recommendedSupplier: ExecutiveSupplierRecommendation | null;
  rankedSuppliers: ExecutiveSupplierRecommendation[];
  evaluatedSupplierCount: number;
  suppliersWithSufficientData: number;
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
  averageBid?: number;
  lowestAmount?: number | null;
  budget?: number;
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
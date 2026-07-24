export const EXECUTIVE_SCORE_THRESHOLDS = {
  preferred: 85,
  qualifiedReview: 70,
  conditional: 55,
} as const;

export const EXECUTIVE_CONFIDENCE_THRESHOLDS = {
  high: 80,
  medium: 65,
} as const;

export const EXECUTIVE_EVIDENCE_THRESHOLDS = {
  minimumSufficientCoverage: 50,
  minimumCommercialDomainCoverage: 50,
} as const;

export const EXECUTIVE_CONFIDENCE_WEIGHTS = {
  supplier: {
    evidenceCoverage: 35,
    decisionReadiness: 25,
    historicalSample: 15,
    signalConsistency: 15,
    procurementRisk: 10,
  },
  decision: {
    supplierConfidence: 55,
    decisionMargin: 25,
    competitiveDepth: 20,
  },
} as const;

export const EXECUTIVE_READINESS_SCORES = {
  ready: 100,
  reviewRequired: 60,
  insufficientEvidence: 20,
} as const;

export const EXECUTIVE_DECISION_READINESS_WEIGHTS = {
  health: 0.34,
  quoteCoverage: 0.22,
  documentCoverage: 0.18,
  governanceTrail: 0.1,
  commercialAccess: 0.08,
  recommendationAvailability: 0.08,
} as const;

export const EXECUTIVE_DECISION_READINESS_SIGNALS = {
  quoteCoverageIncrement: 28,
  documentCoverageIncrement: 24,
  governanceBaseline: 55,
  governanceIncrement: 12,
  commercialAccessUnlockedScore: 100,
  commercialAccessLockedScore: 45,
  recommendationAvailableScore: 100,
  recommendationUnavailableScore: 35,
} as const;

export const EXECUTIVE_READINESS_CONTROL_THRESHOLDS = {
  minimumHealthScore: 72,
  minimumQuoteCount: 1,
  minimumDocumentCount: 1,
  minimumAddendaCount: 1,
} as const;

export const EXECUTIVE_HISTORICAL_SAMPLE_THRESHOLDS = {
  extensive: 8,
  strong: 5,
  established: 3,
  limited: 2,
} as const;

export const EXECUTIVE_HISTORICAL_SAMPLE_SCORES = {
  extensive: 100,
  strong: 85,
  established: 70,
  limited: 55,
  minimal: 35,
  unavailable: 0,
} as const;

export const EXECUTIVE_AWARD_SUPPORT = {
  establishedAwardCount: 3,
  establishedAwardScore: 10,
  initialAwardCount: 1,
  initialAwardScore: 5,
} as const;

export const EXECUTIVE_SIGNAL_CONSISTENCY = {
  minimumSignalCount: 2,
  insufficientScore: 25,
  standardDeviationMultiplier: 3,
} as const;

export const EXECUTIVE_RISK_SCORES = {
  low: 100,
  medium: 60,
  high: 20,
} as const;

export const EXECUTIVE_DECISION_MARGIN_THRESHOLDS = {
  decisive: 15,
  strong: 10,
  meaningful: 5,
  narrow: 2,
} as const;

export const EXECUTIVE_DECISION_MARGIN_SCORES = {
  decisive: 100,
  strong: 85,
  meaningful: 70,
  narrow: 55,
  minimal: 35,
  singleSupplier: 25,
} as const;

export const EXECUTIVE_COMPETITIVE_DEPTH = {
  strongSupplierCount: 4,
  establishedSupplierCount: 3,
  minimumComparableSupplierCount: 2,
  strongScore: 100,
  establishedScore: 85,
  comparableScore: 65,
  limitedScore: 35,
} as const;
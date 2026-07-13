export type ProcurementScope =
  | "material"
  | "subcontractor"
  | "equipment"
  | "professional_service";

export type SourcingMethod =
  | "open"
  | "invited"
  | "sealed_bid";

export type ContractFramework =
  | "project_specific"
  | "framework";

export type AnalyticsRFQ = {
  id: string;
  title: string | null;
  category: string | null;
  location: string | null;
  budget: number | string | null;
  status: string | null;
  procurement_scope: ProcurementScope | null;
  sourcing_method: SourcingMethod | null;
  contract_framework: ContractFramework | null;
};

export type AnalyticsClassificationCoverage = {
  totalRfqs: number;
  fullyClassifiedRfqs: number;
  scopeClassifiedRfqs: number;
  sourcingClassifiedRfqs: number;
  frameworkClassifiedRfqs: number;
  unclassifiedScopeRfqs: number;
  unclassifiedSourcingRfqs: number;
  unclassifiedFrameworkRfqs: number;
  fullCoverageScore: number;
  scopeCoverageScore: number;
  sourcingCoverageScore: number;
  frameworkCoverageScore: number;
  status:
    | "complete"
    | "strong"
    | "developing"
    | "insufficient-data";
};

const PROCUREMENT_SCOPES: readonly ProcurementScope[] = [
  "material",
  "subcontractor",
  "equipment",
  "professional_service",
];

const SOURCING_METHODS: readonly SourcingMethod[] = [
  "open",
  "invited",
  "sealed_bid",
];

const CONTRACT_FRAMEWORKS: readonly ContractFramework[] = [
  "project_specific",
  "framework",
];

export const PROCUREMENT_SCOPE_LABELS: Record<
  ProcurementScope,
  string
> = {
  material: "Material RFQs",
  subcontractor: "Trade RFQs",
  equipment: "Equipment RFQs",
  professional_service: "Service RFQs",
};

export const SOURCING_METHOD_LABELS: Record<
  SourcingMethod,
  string
> = {
  open: "Open RFQs",
  invited: "Invited RFQs",
  sealed_bid: "Sealed Bid RFQs",
};

export const CONTRACT_FRAMEWORK_LABELS: Record<
  ContractFramework,
  string
> = {
  project_specific: "Project-Specific",
  framework: "Framework Agreement",
};

function normalizeScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeCount(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

function calculateCoverageScore(
  classifiedCount: number,
  totalCount: number,
): number {
  const normalizedClassifiedCount = normalizeCount(classifiedCount);
  const normalizedTotalCount = normalizeCount(totalCount);

  if (normalizedTotalCount === 0) {
    return 0;
  }

  return normalizeScore(
    (normalizedClassifiedCount / normalizedTotalCount) * 100,
  );
}

export function isProcurementScope(
  value: unknown,
): value is ProcurementScope {
  return PROCUREMENT_SCOPES.includes(value as ProcurementScope);
}

export function isSourcingMethod(
  value: unknown,
): value is SourcingMethod {
  return SOURCING_METHODS.includes(value as SourcingMethod);
}

export function isContractFramework(
  value: unknown,
): value is ContractFramework {
  return CONTRACT_FRAMEWORKS.includes(
    value as ContractFramework,
  );
}

export function resolveProcurementScope(
  value: unknown,
): ProcurementScope | null {
  return isProcurementScope(value) ? value : null;
}

export function resolveSourcingMethod(
  value: unknown,
): SourcingMethod | null {
  return isSourcingMethod(value) ? value : null;
}

export function resolveContractFramework(
  value: unknown,
): ContractFramework | null {
  return isContractFramework(value) ? value : null;
}

/**
 * Compatibility helper for existing UI consumers that require a definite
 * procurement scope.
 *
 * Analytics calculations should prefer resolveProcurementScope() so missing
 * classifications are not silently counted as subcontractor RFQs.
 */
export function getProcurementScope(
  value: ProcurementScope | null | undefined,
): ProcurementScope {
  return resolveProcurementScope(value) ?? "subcontractor";
}

/**
 * Compatibility helper for existing UI consumers that require a definite
 * sourcing method.
 *
 * Analytics calculations should prefer resolveSourcingMethod() so missing
 * classifications are not silently counted as invited RFQs.
 */
export function getSourcingMethod(
  value: SourcingMethod | null | undefined,
): SourcingMethod {
  return resolveSourcingMethod(value) ?? "invited";
}

/**
 * Compatibility helper for existing UI consumers that require a definite
 * contract framework.
 *
 * Analytics calculations should prefer resolveContractFramework() so missing
 * classifications are not silently counted as project-specific RFQs.
 */
export function getContractFramework(
  value: ContractFramework | null | undefined,
): ContractFramework {
  return resolveContractFramework(value) ?? "project_specific";
}

export function getHealthLabel(score: number): string {
  const normalizedScore = normalizeScore(score);

  if (normalizedScore >= 85) {
    return "Strong";
  }

  if (normalizedScore >= 70) {
    return "Healthy";
  }

  if (normalizedScore >= 55) {
    return "Developing";
  }

  return "Needs Attention";
}

export function getCompetitionLabel(
  avgQuotesPerRfq: number,
): string {
  const normalizedAverage = Number.isFinite(avgQuotesPerRfq)
    ? Math.max(0, avgQuotesPerRfq)
    : 0;

  if (normalizedAverage >= 4) {
    return "Strong Competition";
  }

  if (normalizedAverage >= 2) {
    return "Healthy Competition";
  }

  if (normalizedAverage >= 1) {
    return "Limited Competition";
  }

  return "Competition Not Yet Established";
}

export function countByScope(
  rfqs: AnalyticsRFQ[],
  scope: ProcurementScope,
): number {
  return rfqs.reduce((count, rfq) => {
    return resolveProcurementScope(rfq.procurement_scope) === scope
      ? count + 1
      : count;
  }, 0);
}

export function countBySourcing(
  rfqs: AnalyticsRFQ[],
  method: SourcingMethod,
): number {
  return rfqs.reduce((count, rfq) => {
    return resolveSourcingMethod(rfq.sourcing_method) === method
      ? count + 1
      : count;
  }, 0);
}

export function countByFramework(
  rfqs: AnalyticsRFQ[],
  framework: ContractFramework,
): number {
  return rfqs.reduce((count, rfq) => {
    return resolveContractFramework(rfq.contract_framework) ===
      framework
      ? count + 1
      : count;
  }, 0);
}

export function countUnclassifiedScopes(
  rfqs: AnalyticsRFQ[],
): number {
  return rfqs.reduce((count, rfq) => {
    return resolveProcurementScope(rfq.procurement_scope) === null
      ? count + 1
      : count;
  }, 0);
}

export function countUnclassifiedSourcingMethods(
  rfqs: AnalyticsRFQ[],
): number {
  return rfqs.reduce((count, rfq) => {
    return resolveSourcingMethod(rfq.sourcing_method) === null
      ? count + 1
      : count;
  }, 0);
}

export function countUnclassifiedFrameworks(
  rfqs: AnalyticsRFQ[],
): number {
  return rfqs.reduce((count, rfq) => {
    return resolveContractFramework(rfq.contract_framework) === null
      ? count + 1
      : count;
  }, 0);
}

export function getClassificationCoverage(
  rfqs: AnalyticsRFQ[],
): AnalyticsClassificationCoverage {
  const totalRfqs = rfqs.length;

  const scopeClassifiedRfqs = rfqs.reduce((count, rfq) => {
    return resolveProcurementScope(rfq.procurement_scope)
      ? count + 1
      : count;
  }, 0);

  const sourcingClassifiedRfqs = rfqs.reduce((count, rfq) => {
    return resolveSourcingMethod(rfq.sourcing_method)
      ? count + 1
      : count;
  }, 0);

  const frameworkClassifiedRfqs = rfqs.reduce((count, rfq) => {
    return resolveContractFramework(rfq.contract_framework)
      ? count + 1
      : count;
  }, 0);

  const fullyClassifiedRfqs = rfqs.reduce((count, rfq) => {
    const hasScope = Boolean(
      resolveProcurementScope(rfq.procurement_scope),
    );

    const hasSourcing = Boolean(
      resolveSourcingMethod(rfq.sourcing_method),
    );

    const hasFramework = Boolean(
      resolveContractFramework(rfq.contract_framework),
    );

    return hasScope && hasSourcing && hasFramework
      ? count + 1
      : count;
  }, 0);

  const fullCoverageScore = calculateCoverageScore(
    fullyClassifiedRfqs,
    totalRfqs,
  );

  const scopeCoverageScore = calculateCoverageScore(
    scopeClassifiedRfqs,
    totalRfqs,
  );

  const sourcingCoverageScore = calculateCoverageScore(
    sourcingClassifiedRfqs,
    totalRfqs,
  );

  const frameworkCoverageScore = calculateCoverageScore(
    frameworkClassifiedRfqs,
    totalRfqs,
  );

  const status: AnalyticsClassificationCoverage["status"] =
    totalRfqs === 0
      ? "insufficient-data"
      : fullCoverageScore >= 95
        ? "complete"
        : fullCoverageScore >= 75
          ? "strong"
          : "developing";

  return {
    totalRfqs,
    fullyClassifiedRfqs,
    scopeClassifiedRfqs,
    sourcingClassifiedRfqs,
    frameworkClassifiedRfqs,
    unclassifiedScopeRfqs: totalRfqs - scopeClassifiedRfqs,
    unclassifiedSourcingRfqs:
      totalRfqs - sourcingClassifiedRfqs,
    unclassifiedFrameworkRfqs:
      totalRfqs - frameworkClassifiedRfqs,
    fullCoverageScore,
    scopeCoverageScore,
    sourcingCoverageScore,
    frameworkCoverageScore,
    status,
  };
}
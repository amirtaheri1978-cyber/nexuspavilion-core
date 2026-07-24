import type {
  ExecutiveDecisionReadiness,
  ExecutiveEvidenceAssessment,
  ExecutiveEvidenceDomain,
  ExecutiveEvidenceDomainKey,
  ExecutiveSupplierSignal,
  ExecutiveSupplierSignalKey,
} from "@/lib/executive/executive-types";

type ExecutiveEvidenceDomainDefinition = {
  key: ExecutiveEvidenceDomainKey;
  label: string;
  signalKeys: readonly ExecutiveSupplierSignalKey[];
};

export const EXECUTIVE_EVIDENCE_DOMAINS: readonly ExecutiveEvidenceDomainDefinition[] =
  [
    {
      key: "commercial",
      label: "Commercial Evidence",
      signalKeys: [
        "commercial_competitiveness",
        "delivery_reliability",
        "quality_performance",
        "procurement_risk",
      ],
    },
    {
      key: "historical",
      label: "Historical Evidence",
      signalKeys: [
        "historical_award_performance",
        "response_reliability",
      ],
    },
    {
      key: "governance",
      label: "Governance Evidence",
      signalKeys: [
        "avl_governance",
        "compliance_readiness",
      ],
    },
    {
      key: "operational_fit",
      label: "Operational Fit",
      signalKeys: [
        "category_alignment",
        "geographic_alignment",
        "capacity_confidence",
      ],
    },
  ] as const;

const FOUNDATIONAL_SIGNAL_KEYS: readonly ExecutiveSupplierSignalKey[] =
  [
    "commercial_competitiveness",
    "procurement_risk",
  ];

const GOVERNANCE_REVIEW_SIGNAL_KEYS: readonly ExecutiveSupplierSignalKey[] =
  [
    "compliance_readiness",
    "capacity_confidence",
  ];

function isSignalAvailable(
  signal: ExecutiveSupplierSignal | undefined,
) {
  return (
    signal?.availability === "available" &&
    signal.score !== null
  );
}

function calculateCoverage(
  availableSignalCount: number,
  totalSignalCount: number,
) {
  if (totalSignalCount === 0) {
    return 0;
  }

  return Math.round(
    (availableSignalCount / totalSignalCount) * 100,
  );
}

function buildDomainAssessment({
  definition,
  signalByKey,
}: {
  definition: ExecutiveEvidenceDomainDefinition;
  signalByKey: Map<
    ExecutiveSupplierSignalKey,
    ExecutiveSupplierSignal
  >;
}): ExecutiveEvidenceDomain {
  const availableSignalKeys =
    definition.signalKeys.filter((signalKey) =>
      isSignalAvailable(signalByKey.get(signalKey)),
    );

  const missingSignalKeys =
    definition.signalKeys.filter(
      (signalKey) =>
        !availableSignalKeys.includes(signalKey),
    );

  const availableSignalCount =
    availableSignalKeys.length;

  const totalSignalCount =
    definition.signalKeys.length;

  const coverage = calculateCoverage(
    availableSignalCount,
    totalSignalCount,
  );

  return {
    key: definition.key,
    label: definition.label,
    availableSignalCount,
    totalSignalCount,
    coverage,
    readiness:
      availableSignalCount === totalSignalCount
        ? "ready"
        : availableSignalCount > 0
          ? "partial"
          : "missing",
    availableSignalKeys: [...availableSignalKeys],
    missingSignalKeys: [...missingSignalKeys],
  };
}

function resolveDecisionReadiness({
  hasCurrentQuote,
  missingFoundationalSignalKeys,
  missingGovernanceSignalKeys,
  domains,
  riskLevel,
}: {
  hasCurrentQuote: boolean;
  missingFoundationalSignalKeys: ExecutiveSupplierSignalKey[];
  missingGovernanceSignalKeys: ExecutiveSupplierSignalKey[];
  domains: ExecutiveEvidenceDomain[];
  riskLevel: string | null;
}): ExecutiveDecisionReadiness {
  const commercialDomain = domains.find(
    (domain) => domain.key === "commercial",
  );

  if (
    !hasCurrentQuote ||
    missingFoundationalSignalKeys.length > 0 ||
    !commercialDomain ||
    commercialDomain.coverage < 50
  ) {
    return "insufficient_evidence";
  }

  const normalizedRiskLevel =
    riskLevel?.trim().toLowerCase() ?? "";

  if (
    missingGovernanceSignalKeys.length > 0 ||
    normalizedRiskLevel.includes("high") ||
    domains.some(
      (domain) =>
        domain.key !== "historical" &&
        domain.readiness === "missing",
    )
  ) {
    return "review_required";
  }

  return "ready";
}

export function buildExecutiveEvidenceAssessment({
  signals,
  hasCurrentQuote,
  riskLevel,
}: {
  signals: ExecutiveSupplierSignal[];
  hasCurrentQuote: boolean;
  riskLevel: string | null;
}): ExecutiveEvidenceAssessment {
  const signalByKey = new Map<
    ExecutiveSupplierSignalKey,
    ExecutiveSupplierSignal
  >();

  for (const signal of signals) {
    signalByKey.set(signal.key, signal);
  }

  const domains = EXECUTIVE_EVIDENCE_DOMAINS.map(
    (definition) =>
      buildDomainAssessment({
        definition,
        signalByKey,
      }),
  );

  const allSignalKeys =
    EXECUTIVE_EVIDENCE_DOMAINS.flatMap(
      (domain) => domain.signalKeys,
    );

  const availableSignalKeys = allSignalKeys.filter(
    (signalKey) =>
      isSignalAvailable(signalByKey.get(signalKey)),
  );

  const missingSignalKeys = allSignalKeys.filter(
    (signalKey) =>
      !availableSignalKeys.includes(signalKey),
  );

  const missingFoundationalSignalKeys =
    FOUNDATIONAL_SIGNAL_KEYS.filter(
      (signalKey) =>
        !availableSignalKeys.includes(signalKey),
    );

  const missingGovernanceSignalKeys =
    GOVERNANCE_REVIEW_SIGNAL_KEYS.filter(
      (signalKey) =>
        !availableSignalKeys.includes(signalKey),
    );

  return {
    coverage: calculateCoverage(
      availableSignalKeys.length,
      allSignalKeys.length,
    ),
    availableSignalCount: availableSignalKeys.length,
    totalSignalCount: allSignalKeys.length,
    domains,
    missingSignalKeys: [...missingSignalKeys],
    missingFoundationalSignalKeys: [
      ...missingFoundationalSignalKeys,
    ],
    missingGovernanceSignalKeys: [
      ...missingGovernanceSignalKeys,
    ],
    decisionReadiness: resolveDecisionReadiness({
      hasCurrentQuote,
      missingFoundationalSignalKeys: [
        ...missingFoundationalSignalKeys,
      ],
      missingGovernanceSignalKeys: [
        ...missingGovernanceSignalKeys,
      ],
      domains,
      riskLevel,
    }),
  };
}
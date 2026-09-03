export type RfqScopeReviewKey =
  | "scope_boundaries"
  | "site_conditions"
  | "technical_basis"
  | "execution_timing";

export type RfqScopeReviewSignalStatus = "covered" | "review";

export type RfqScopeReviewSignal = {
  key: RfqScopeReviewKey;
  label: string;
  status: RfqScopeReviewSignalStatus;
  source: string;
  evidence: string;
  context: string;
};

export type RfqScopeReviewInput = {
  description?: unknown;
  attachmentTypes?: readonly unknown[];
  mobilizationDate?: unknown;
  substantialCompletionDate?: unknown;
};

export type RfqScopeReview = {
  status: "insufficient-data" | "review" | "clear";
  reviewable: boolean;
  coveredCount: number;
  reviewCount: number;
  totalCount: number;
  signals: RfqScopeReviewSignal[];
  reviewSignals: RfqScopeReviewSignal[];
};

const MIN_REVIEWABLE_SCOPE_LENGTH = 9;

const SCOPE_BOUNDARY_TERMS = [
  "include",
  "includes",
  "included",
  "including",
  "inclusion",
  "inclusions",
  "exclude",
  "excludes",
  "excluded",
  "excluding",
  "exclusion",
  "exclusions",
  "allowance",
  "allowances",
  "alternate",
  "alternates",
  "by others",
  "owner supplied",
  "owner-supplied",
  "not included",
  "scope boundary",
  "scope boundaries",
] as const;

const SITE_CONDITION_TERMS = [
  "site condition",
  "site conditions",
  "existing condition",
  "existing conditions",
  "site access",
  "building access",
  "work area access",
  "access restriction",
  "access restrictions",
  "access hours",
  "working hours",
  "occupied",
  "shutdown",
  "shutdowns",
  "phasing",
  "staging",
  "logistics",
  "laydown",
] as const;

const TECHNICAL_BASIS_TERMS = [
  "specification",
  "specifications",
  "drawing",
  "drawings",
  "detail drawing",
  "detail drawings",
  "drawing detail",
  "drawing details",
  "technical standard",
  "technical standards",
  "industry standard",
  "industry standards",
  "applicable standard",
  "applicable standards",
  "building code",
  "building codes",
  "electrical code",
  "electrical codes",
  "mechanical code",
  "mechanical codes",
  "applicable code",
  "applicable codes",
  "manufacturer requirement",
  "manufacturer requirements",
  "performance requirement",
  "performance requirements",
  "performance criteria",
  "material requirement",
  "material requirements",
  "finish schedule",
  "finish requirements",
  "testing requirement",
  "testing requirements",
  "commissioning",
] as const;

const EXECUTION_TIMING_TERMS = [
  "mobilization",
  "mobilization date",
  "substantial completion",
  "completion date",
  "final completion",
  "construction schedule",
  "project schedule",
  "work schedule",
  "installation schedule",
  "execution schedule",
  "duration",
  "lead time",
  "lead times",
  "phasing",
  "sequence",
  "sequences",
  "sequencing",
  "milestone",
  "milestones",
] as const;

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeSearchText(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsAny(text: string, terms: readonly string[]) {
  return terms.some((term) => {
    const escapedTerm = escapeRegExp(term).replace(/\\ /g, "\\s+");
    return new RegExp(`(?:^|\\b)${escapedTerm}(?:\\b|$)`).test(text);
  });
}

function normalizeAttachmentTypes(values: readonly unknown[] | undefined) {
  return new Set(
    (values ?? [])
      .map((value) => normalizeSearchText(value))
      .filter(Boolean),
  );
}

function buildSignal({
  key,
  label,
  source,
  covered,
  coveredEvidence,
  reviewEvidence,
  context,
}: {
  key: RfqScopeReviewKey;
  label: string;
  source: string;
  covered: boolean;
  coveredEvidence: string;
  reviewEvidence: string;
  context: string;
}): RfqScopeReviewSignal {
  return {
    key,
    label,
    status: covered ? "covered" : "review",
    source,
    evidence: covered ? coveredEvidence : reviewEvidence,
    context,
  };
}

export function evaluateRfqScopeReview(
  input: RfqScopeReviewInput,
): RfqScopeReview {
  const description = normalizeText(input.description);
  const searchText = description.toLowerCase();

  if (description.length < MIN_REVIEWABLE_SCOPE_LENGTH) {
    return {
      status: "insufficient-data",
      reviewable: false,
      coveredCount: 0,
      reviewCount: 0,
      totalCount: 4,
      signals: [],
      reviewSignals: [],
    };
  }

  const hasAttachmentEvidence = input.attachmentTypes !== undefined;
  const attachmentTypes = normalizeAttachmentTypes(input.attachmentTypes);
  const hasTechnicalAttachment =
    attachmentTypes.has("drawing") ||
    attachmentTypes.has("specification");

  const hasExecutionDate =
    Boolean(normalizeText(input.mobilizationDate)) ||
    Boolean(normalizeText(input.substantialCompletionDate));

  const signals: RfqScopeReviewSignal[] = [
    buildSignal({
      key: "scope_boundaries",
      label: "Scope boundaries",
      source: "RFQ Details · Scope of Work Summary",
      covered: containsAny(searchText, SCOPE_BOUNDARY_TERMS),
      coveredEvidence:
        "Explicit scope-boundary language is present in the current scope summary.",
      reviewEvidence:
        "No explicit inclusion, exclusion, allowance, alternate, or work-by-others language was detected in the current scope summary.",
      context:
        "Review whether inclusions, exclusions, allowances, alternates, or work by others should be stated before supplier pricing.",
    }),
    buildSignal({
      key: "site_conditions",
      label: "Site conditions and access",
      source: "RFQ Details · Scope of Work Summary",
      covered: containsAny(searchText, SITE_CONDITION_TERMS),
      coveredEvidence:
        "Site-condition, access, logistics, or working-hours language is present in the current scope summary.",
      reviewEvidence:
        "No explicit site-condition, access, logistics, shutdown, phasing, staging, or working-hours language was detected in the current scope summary.",
      context:
        "Review whether site access, working hours, shutdowns, phasing, logistics, staging, or existing conditions affect supplier pricing.",
    }),
    buildSignal({
      key: "technical_basis",
      label: "Technical basis",
      source: hasAttachmentEvidence
        ? "RFQ Details · Scope of Work Summary / RFQ Documents"
        : "RFQ Details · Scope of Work Summary",
      covered:
        containsAny(searchText, TECHNICAL_BASIS_TERMS) ||
        hasTechnicalAttachment,
      coveredEvidence: hasTechnicalAttachment
        ? "A drawing or specification is present in the current RFQ document package."
        : "Technical-basis language is present in the current scope summary.",
      reviewEvidence: hasAttachmentEvidence
        ? "No explicit technical-basis language was detected and no drawing or specification is currently present in the RFQ document package."
        : "No explicit technical-basis language was detected in the current scope summary.",
      context:
        "Review whether drawings, specifications, standards, performance criteria, materials, finishes, testing, or commissioning requirements should be referenced.",
    }),
    buildSignal({
      key: "execution_timing",
      label: "Execution timing",
      source: "RFQ Details · Scope of Work Summary / Project Controls",
      covered:
        containsAny(searchText, EXECUTION_TIMING_TERMS) ||
        hasExecutionDate,
      coveredEvidence: hasExecutionDate
        ? "A mobilization or substantial-completion date is captured in Project Controls."
        : "Execution-timing language is present in the current scope summary.",
      reviewEvidence:
        "No explicit execution-timing language was detected and no mobilization or substantial-completion date is currently captured.",
      context:
        "Review whether mobilization, completion, duration, lead time, phasing, sequencing, or milestones should be stated.",
    }),
  ];

  const reviewSignals = signals.filter((signal) => signal.status === "review");
  const coveredCount = signals.length - reviewSignals.length;

  return {
    status: reviewSignals.length > 0 ? "review" : "clear",
    reviewable: true,
    coveredCount,
    reviewCount: reviewSignals.length,
    totalCount: signals.length,
    signals,
    reviewSignals,
  };
}

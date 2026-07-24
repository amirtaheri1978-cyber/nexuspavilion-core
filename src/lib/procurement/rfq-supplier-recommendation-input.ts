import type {
  ExecutiveSupplierRecommendationCandidate,
  ExecutiveSupplierRecommendationInput,
  ExecutiveSupplierSignal,
  ExecutiveSupplierSignalKey,
  ExecutiveTone,
} from "@/lib/executive/executive-types";
import type { ScoredQuote } from "@/lib/procurement/rfq-commercial-intelligence";
import type { SupplierHistorySnapshot } from "@/lib/procurement/supplier-intelligence";
import type { ExecutiveQuote } from "@/types/executive";

export type RfqSupplierCompany = {
  id: string;
  name: string | null;
  category: string | null;
  location: string | null;
  network_role: string | null;
};

type BuildRfqSupplierRecommendationInputParams = {
  rfqSlug: string;
  rfqCategory: string | null;
  rfqLocation: string | null;
  procurementScope: string | null;
  sourcingMethod: string | null;
  commercialEvaluationUnlocked: boolean;
  scoredQuotes: ScoredQuote[];
  companies: RfqSupplierCompany[];
  supplierHistorySnapshots: SupplierHistorySnapshot[];
};

function normalizeComparableValue(value: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function mapScoreToTone(score: number): ExecutiveTone {
  if (score >= 85) return "success";
  if (score >= 70) return "info";
  if (score >= 55) return "warning";

  return "risk";
}

function buildAvailableSignal({
  key,
  label,
  score,
  summary,
  evidence,
}: {
  key: ExecutiveSupplierSignalKey;
  label: string;
  score: number;
  summary: string;
  evidence: string[];
}): ExecutiveSupplierSignal {
  return {
    key,
    label,
    availability: "available",
    score,
    tone: mapScoreToTone(score),
    summary,
    evidence,
  };
}

function buildUnavailableSignal({
  key,
  label,
  summary,
}: {
  key: ExecutiveSupplierSignalKey;
  label: string;
  summary: string;
}): ExecutiveSupplierSignal {
  return {
    key,
    label,
    availability: "insufficient_data",
    score: null,
    tone: "neutral",
    summary,
    evidence: [],
  };
}

function valuesAlign(
  firstValue: string | null,
  secondValue: string | null,
) {
  const first = normalizeComparableValue(firstValue);
  const second = normalizeComparableValue(secondValue);

  if (!first || !second) {
    return null;
  }

  return (
    first === second ||
    first.includes(second) ||
    second.includes(first)
  );
}

function buildAlignmentSignal({
  key,
  label,
  rfqValue,
  supplierValue,
  matchingScore,
  mismatchScore,
}: {
  key: "category_alignment" | "geographic_alignment";
  label: string;
  rfqValue: string | null;
  supplierValue: string | null;
  matchingScore: number;
  mismatchScore: number;
}): ExecutiveSupplierSignal {
  const alignment = valuesAlign(rfqValue, supplierValue);

  if (alignment === null) {
    return buildUnavailableSignal({
      key,
      label,
      summary: `${label} cannot be validated because the RFQ or supplier profile does not contain sufficient structured data.`,
    });
  }

  if (alignment) {
    return buildAvailableSignal({
      key,
      label,
      score: matchingScore,
      summary: `${label} is supported by the current RFQ and supplier profile.`,
      evidence: [
        `RFQ: ${rfqValue}`,
        `Supplier profile: ${supplierValue}`,
      ],
    });
  }

  return buildAvailableSignal({
    key,
    label,
    score: mismatchScore,
    summary: `${label} requires executive validation because the RFQ and supplier profile are not directly aligned.`,
    evidence: [
      `RFQ: ${rfqValue}`,
      `Supplier profile: ${supplierValue}`,
    ],
  });
}

function toExecutiveQuote(
  quote: ScoredQuote,
): ExecutiveQuote {
  return {
    rank: quote.rank,
    amountNumber: quote.amountNumber,
    awardConfidence: quote.awardConfidence,
    riskLevel: quote.riskLevel,
    totalScore: quote.totalScore,
    priceScore: quote.priceScore,
    timelineScore: quote.timelineScore,
    riskScore: quote.riskScore,
    performanceScore: quote.performanceScore,
    budgetVariance: quote.budgetVariance,
    lowestBidVariance: quote.lowestBidVariance,
  };
}

function buildCommercialSignals(
  quote: ScoredQuote,
): ExecutiveSupplierSignal[] {
  return [
    buildAvailableSignal({
      key: "commercial_competitiveness",
      label: "Commercial Competitiveness",
      score: quote.priceScore,
      summary: `Current commercial competitiveness is ${quote.priceScore}/100 based on the canonical RFQ price evaluation.`,
      evidence: [
        `Evaluated quote amount: ${quote.amountNumber}`,
        `Price score: ${quote.priceScore}/100`,
      ],
    }),
    buildAvailableSignal({
      key: "delivery_reliability",
      label: "Delivery Reliability",
      score: quote.timelineScore,
      summary: `Current delivery evidence is scored ${quote.timelineScore}/100 from the submitted RFQ timeline.`,
      evidence: [
        `Submitted timeline: ${quote.timeline || "Not specified"}`,
        `Timeline score: ${quote.timelineScore}/100`,
      ],
    }),
    buildAvailableSignal({
      key: "quality_performance",
      label: "Quality Performance",
      score: quote.performanceScore,
      summary: `Current submission evidence supports a quality and performance score of ${quote.performanceScore}/100.`,
      evidence: [
        `Performance score: ${quote.performanceScore}/100`,
      ],
    }),
    buildAvailableSignal({
      key: "procurement_risk",
      label: "Procurement Risk",
      score: quote.riskScore,
      summary: `Current procurement risk readiness is ${quote.riskScore}/100 and is classified as ${quote.riskLevel}.`,
      evidence: [
        `Risk score: ${quote.riskScore}/100`,
        `Risk classification: ${quote.riskLevel}`,
      ],
    }),
  ];
}

function buildHistoricalAwardPerformanceSignal(
  history: SupplierHistorySnapshot | null,
): ExecutiveSupplierSignal {
  if (!history || history.submittedQuoteCount === 0) {
    return buildUnavailableSignal({
      key: "historical_award_performance",
      label: "Historical Award Performance",
      summary:
        "No prior buyer-scoped supplier submissions are available for this evaluation.",
    });
  }

  return buildAvailableSignal({
    key: "historical_award_performance",
    label: "Historical Award Performance",
    score: history.performanceScore,
    summary: `Buyer-scoped historical performance is ${history.performanceScore}/100 across ${history.submittedQuoteCount} prior submission${history.submittedQuoteCount === 1 ? "" : "s"}.`,
    evidence: [
      `Historical submissions: ${history.submittedQuoteCount}`,
      `Historical awards: ${history.awardedQuoteCount}`,
      `Historical win rate: ${history.winRate}%`,
      `Historical quoted value: ${history.totalQuotedValue}`,
      `Historical awarded value: ${history.totalAwardedValue}`,
    ],
  });
}

function buildEvidenceGapSignals(
  history: SupplierHistorySnapshot | null,
): ExecutiveSupplierSignal[] {
  return [
    buildUnavailableSignal({
      key: "avl_governance",
      label: "AVL Governance",
      summary:
        "Approved-vendor governance has not yet been connected with verified buyer-company scope.",
    }),
    buildHistoricalAwardPerformanceSignal(history),
    buildUnavailableSignal({
      key: "response_reliability",
      label: "Response Reliability",
      summary:
        "Response reliability requires buyer-scoped invitation and participation history, which is not yet connected.",
    }),
    buildUnavailableSignal({
      key: "compliance_readiness",
      label: "Compliance Readiness",
      summary:
        "Structured compliance evidence is not yet available for this supplier evaluation.",
    }),
    buildUnavailableSignal({
      key: "capacity_confidence",
      label: "Capacity Confidence",
      summary:
        "Verified supplier capacity evidence is not yet available for this RFQ.",
    }),
  ];
}

function selectBestQuoteByCompany(
  scoredQuotes: ScoredQuote[],
) {
  const quoteByCompany = new Map<string, ScoredQuote>();

  for (const quote of scoredQuotes) {
    if (!quote.company_id) {
      continue;
    }

    const existingQuote = quoteByCompany.get(quote.company_id);

    if (
      !existingQuote ||
      quote.rank < existingQuote.rank ||
      (
        quote.rank === existingQuote.rank &&
        quote.totalScore > existingQuote.totalScore
      )
    ) {
      quoteByCompany.set(quote.company_id, quote);
    }
  }

  return quoteByCompany;
}

export function getRfqSupplierCompanyIds(
  scoredQuotes: ScoredQuote[],
) {
  return [
    ...new Set(
      scoredQuotes
        .map((quote) => quote.company_id)
        .filter(
          (companyId): companyId is string =>
            Boolean(companyId),
        ),
    ),
  ];
}

export function buildRfqSupplierRecommendationInput({
  rfqSlug,
  rfqCategory,
  rfqLocation,
  procurementScope,
  sourcingMethod,
  commercialEvaluationUnlocked,
  scoredQuotes,
  companies,
  supplierHistorySnapshots,
}: BuildRfqSupplierRecommendationInputParams): ExecutiveSupplierRecommendationInput {
  const companyById = new Map(
    companies.map((company) => [company.id, company]),
  );

  const bestQuoteByCompany =
    selectBestQuoteByCompany(scoredQuotes);

  const historyBySupplierCompanyId = new Map(
    supplierHistorySnapshots.map((snapshot) => [
      snapshot.supplierCompanyId,
      snapshot,
    ]),
  );

  const candidates: ExecutiveSupplierRecommendationCandidate[] =
    [...bestQuoteByCompany.entries()].map(
      ([supplierCompanyId, quote]) => {
        const company = companyById.get(supplierCompanyId);
        const supplierName =
          company?.name?.trim() || "Unverified Supplier";

        const history =
          historyBySupplierCompanyId.get(
            supplierCompanyId,
          ) ?? null;

        return {
          supplierCompanyId,
          supplierName,
          category: company?.category ?? null,
          location: company?.location ?? null,
          networkRole: company?.network_role ?? null,
          avlStatus: null,
          avlRating: null,
          submittedQuoteCount:
            history?.submittedQuoteCount ?? 0,
          awardedQuoteCount:
            history?.awardedQuoteCount ?? 0,
          unsuccessfulQuoteCount:
            history?.unsuccessfulQuoteCount ?? 0,
          totalQuotedValue:
            history?.totalQuotedValue ?? 0,
          totalAwardedValue:
            history?.totalAwardedValue ?? 0,
          currentQuote: toExecutiveQuote(quote),
          signals: [
            buildAlignmentSignal({
              key: "category_alignment",
              label: "Category Alignment",
              rfqValue: rfqCategory,
              supplierValue: company?.category ?? null,
              matchingScore: 92,
              mismatchScore: 55,
            }),
            buildAlignmentSignal({
              key: "geographic_alignment",
              label: "Geographic Alignment",
              rfqValue: rfqLocation,
              supplierValue: company?.location ?? null,
              matchingScore: 88,
              mismatchScore: 55,
            }),
            ...buildCommercialSignals(quote),
            ...buildEvidenceGapSignals(history),
          ],
        };
      },
    );

  return {
    rfqSlug,
    rfqCategory,
    rfqLocation,
    procurementScope,
    sourcingMethod,
    commercialEvaluationUnlocked,
    candidates,
  };
}
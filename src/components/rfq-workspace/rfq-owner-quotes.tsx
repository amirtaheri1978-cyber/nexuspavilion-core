import { RfqQuoteComparison } from "@/components/rfq-workspace/rfq-quote-comparison";
import {
  buildRfqOwnerSupplierNameById,
  resolveRfqOwnerSupplierLabel,
  type RfqOwnerSupplierCompanyIdentity,
} from "@/lib/procurement/rfq-owner-supplier-identity";

type RFQOwnerQuote = {
  id: string;
  company_id?: string | null;
  amountNumber: number;
  timeline: string | null;
  validity_days?: number | null;
  decision: string | null;
  rank: number;
  priceScore: number;
  timelineScore: number;
  riskScore: number;
  performanceScore: number;
  totalScore: number;
  awardConfidence: number;
  riskLevel: string;
  budgetVariance: number;
  lowestBidVariance: number;
  requiresMaterialRevalidation?: boolean;
};

type RFQOwnerQuotesProps = {
  rfqTitle: string;
  quotes: RFQOwnerQuote[];
  recommendedQuoteId: string | null;
  lowestAmount: number | null;
  highestAmount: number | null;
  averageBid: number;
  rfqAwardAvailable: boolean;
  supplierCompanies?: ReadonlyArray<RfqOwnerSupplierCompanyIdentity>;
};

/**
 * RFQ-detail UI award-action availability.
 * Combines issuer decision permission with lifecycle/opening/existing-award gates.
 * Backend award RPC remains authoritative for mutation authorization.
 */
export function isRfqDetailAwardAvailable({
  issuerCanDecideQuotes,
  rfqStatus,
  commercialEvaluationUnlocked,
  awardedQuoteId,
  awardedAt,
}: {
  issuerCanDecideQuotes: boolean;
  rfqStatus: string | null | undefined;
  commercialEvaluationUnlocked: boolean;
  awardedQuoteId: string | null;
  awardedAt: string | null;
}) {
  return (
    issuerCanDecideQuotes &&
    rfqStatus === "open" &&
    commercialEvaluationUnlocked &&
    !awardedQuoteId &&
    !awardedAt
  );
}

/** Quote-level award eligibility given RFQ-level availability. Backend remains authoritative. */
export function isOwnerQuoteAwardEligible({
  rfqAwardAvailable,
  decision,
  requiresMaterialRevalidation,
}: {
  rfqAwardAvailable: boolean;
  decision: string | null;
  requiresMaterialRevalidation: boolean;
}) {
  return (
    rfqAwardAvailable &&
    decision !== "awarded" &&
    decision !== "rejected" &&
    !requiresMaterialRevalidation
  );
}

/** Shared bid-set position label used by compare surfaces. Not award-authorization logic. */
export function getBidSetPosition({
  recommendedAmount,
  averageBid,
}: {
  recommendedAmount: number;
  averageBid: number;
}) {
  if (recommendedAmount <= 0 || averageBid <= 0) {
    return "Quote-set position pending";
  }

  const ratio = recommendedAmount / averageBid;

  if (recommendedAmount === averageBid) {
    return "At decision-ready quote average";
  }

  if (ratio <= 0.9) return "Strong relative quote position";
  if (ratio < 1) return "Below decision-ready quote average";
  if (ratio <= 1.1) return "Above decision-ready quote average";
  return "High relative cost position";
}

function formatMoney(value: number) {
  return `$${value.toLocaleString()}`;
}

export function RFQOwnerQuotes({
  rfqTitle,
  quotes,
  recommendedQuoteId,
  lowestAmount,
  highestAmount,
  averageBid,
  rfqAwardAvailable,
  supplierCompanies,
}: RFQOwnerQuotesProps) {
  const supplierNameById = buildRfqOwnerSupplierNameById(supplierCompanies);

  return (
    <RfqQuoteComparison
      embedded
      rfqTitle={rfqTitle}
      awarded={quotes.some((quote) => quote.decision === "awarded")}
      quotes={quotes.map((quote) => {
        const requiresMaterialRevalidation = Boolean(
          quote.requiresMaterialRevalidation,
        );
        const isLowest =
          !requiresMaterialRevalidation &&
          lowestAmount !== null &&
          quote.amountNumber === lowestAmount;
        const isHighest =
          !requiresMaterialRevalidation &&
          highestAmount !== null &&
          highestAmount !== lowestAmount &&
          quote.amountNumber === highestAmount;

        return {
          id: quote.id,
          supplierLabel: resolveRfqOwnerSupplierLabel({
            companyId: quote.company_id,
            rank: quote.rank,
            supplierNameById,
          }),
          amountLabel: formatMoney(quote.amountNumber),
          amountNumber: quote.amountNumber,
          timeline: quote.timeline,
          validityDays: Number(quote.validity_days || 30),
          decision: quote.decision,
          rank: quote.rank,
          priceScore: quote.priceScore,
          timelineScore: quote.timelineScore,
          performanceScore: quote.performanceScore,
          riskScore: quote.riskScore,
          evaluationScore: quote.totalScore,
          riskLevel: quote.riskLevel,
          budgetVarianceLabel: formatMoney(quote.budgetVariance),
          lowestBidVarianceLabel: formatMoney(quote.lowestBidVariance),
          isRecommended:
            !requiresMaterialRevalidation && recommendedQuoteId === quote.id,
          isLowest,
          isHighest,
          isBelowAverage:
            !requiresMaterialRevalidation &&
            averageBid > 0 &&
            quote.amountNumber <= averageBid,
          requiresMaterialRevalidation,
          canAward: isOwnerQuoteAwardEligible({
            rfqAwardAvailable,
            decision: quote.decision,
            requiresMaterialRevalidation,
          }),
        };
      })}
    />
  );
}

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
};

type RFQOwnerQuotesProps = {
  rfqTitle: string;
  quotes: RFQOwnerQuote[];
  recommendedQuoteId: string | null;
  lowestAmount: number | null;
  highestAmount: number | null;
  averageBid: number;
  isOpen: boolean;
  supplierCompanies?: ReadonlyArray<RfqOwnerSupplierCompanyIdentity>;
};

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
  isOpen,
  supplierCompanies,
}: RFQOwnerQuotesProps) {
  const supplierNameById = buildRfqOwnerSupplierNameById(supplierCompanies);

  return (
    <RfqQuoteComparison
      embedded
      rfqTitle={rfqTitle}
      awarded={!isOpen || quotes.some((quote) => quote.decision === "awarded")}
      quotes={quotes.map((quote) => {
        const isLowest =
          lowestAmount !== null && quote.amountNumber === lowestAmount;
        const isHighest =
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
          isRecommended: recommendedQuoteId === quote.id,
          isLowest,
          isHighest,
          isBelowAverage: averageBid > 0 && quote.amountNumber <= averageBid,
          canAward: isOpen && quote.decision !== "awarded",
        };
      })}
    />
  );
}

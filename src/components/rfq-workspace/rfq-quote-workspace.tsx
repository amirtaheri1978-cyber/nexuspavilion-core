import Link from "next/link";
import type { ComponentProps } from "react";

import { ExecutiveBadge } from "@/components/executive/executive-badge";
import { ExecutiveMetricCard } from "@/components/executive/executive-metric-card";
import { ExecutivePanel } from "@/components/executive/executive-panel";
import { RFQOwnerQuotes } from "@/components/rfq-workspace/rfq-owner-quotes";
import { RFQSupplierQuotes } from "@/components/rfq-workspace/rfq-supplier-quotes";

type RFQOwnerQuotesProps = ComponentProps<typeof RFQOwnerQuotes>;
type RFQSupplierQuotesProps = ComponentProps<typeof RFQSupplierQuotes>;

type RFQQuoteWorkspaceProps = {
  rfqSlug: string;
  isOwner: boolean;
  isOpen: boolean;
  canSubmitQuote: boolean;
  commercialEvaluationUnlocked: boolean;
  quoteList: RFQSupplierQuotesProps["quotes"];
  scoredQuotes: RFQOwnerQuotesProps["quotes"];
  recommendedQuoteId: string | null;
  lowestAmount: number | null;
  highestAmount: number | null;
  averageBid: number;
};

export function RFQQuoteWorkspace({
  rfqSlug,
  isOwner,
  isOpen,
  canSubmitQuote,
  commercialEvaluationUnlocked,
  quoteList,
  scoredQuotes,
  recommendedQuoteId,
  lowestAmount,
  highestAmount,
  averageBid,
}: RFQQuoteWorkspaceProps) {
  return (
    <ExecutivePanel
      id="quote-intelligence"
      className="mt-8"
      padding="lg"
      tone="blue"
    >
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#9BE8F8]">
            {isOwner ? "Quote Intelligence" : "Supplier Submission"}
          </p>

          <h2 className="mt-3 text-3xl font-black text-nexus-white">
            {isOwner
              ? commercialEvaluationUnlocked
                ? "AI Supplier Ranking"
                : "Commercial Submission Lockbox"
              : "Your Organization's Quote"}
          </h2>

          <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-nexus-muted">
            {!isOwner
              ? "Supplier pricing is confidential. You can only view your own submission. Competitor pricing and award controls are visible only to authorized buyer-side users after the proper commercial opening stage."
              : commercialEvaluationUnlocked
                ? "Ranking uses weighted scoring: 38% price, 22% timeline, 18% performance signals, 14% procurement risk, and 8% proposal validity."
                : "Commercial submissions are locked until the RFQ deadline. Buyer-side users can monitor participation count, but pricing, ranking, supplier comparison, and award actions are hidden."}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {canSubmitQuote ? (
            <Link
              href={`/rfq/${rfqSlug}/submit`}
              className="rounded-full border border-[#2CC4E8]/25 bg-[#2CC4E8]/10 px-6 py-3 text-sm font-black text-[#9BE8F8] transition hover:bg-[#2CC4E8]/15"
            >
              Submit Quote
            </Link>
          ) : null}

          {isOwner && commercialEvaluationUnlocked ? (
            <Link
              href={`/rfq/${rfqSlug}/compare`}
              className="rounded-full border border-[#C8A646]/25 bg-[#C8A646]/10 px-6 py-3 text-sm font-black text-[#F5D77B] transition hover:bg-[#C8A646]/15"
            >
              Launch Comparative Evaluation
            </Link>
          ) : null}
        </div>
      </div>

      {isOwner && !commercialEvaluationUnlocked ? (
        <ExecutivePanel
          className="mt-6"
          variant="operational"
          padding="md"
          tone="gold"
        >
          <div className="grid gap-4 md:grid-cols-4">
            <ExecutiveMetricCard
              label="Submissions"
              value={String(quoteList.length)}
              insight="Quotes submitted"
              tone="gold"
            />

            <ExecutiveMetricCard
              label="Commercial Data"
              value="Locked"
              insight="Until deadline"
              tone="gold"
            />

            <ExecutiveMetricCard
              label="Evaluation"
              value="Awaiting Commercial Opening"
              insight="Blind bidding active"
              tone="blue"
            />

            <div className="flex items-center">
              <ExecutiveBadge tone="warning">
                Blind Bidding Active
              </ExecutiveBadge>
            </div>
          </div>
        </ExecutivePanel>
      ) : isOwner ? (
        <RFQOwnerQuotes
          quotes={scoredQuotes}
          recommendedQuoteId={recommendedQuoteId}
          lowestAmount={lowestAmount}
          highestAmount={highestAmount}
          averageBid={averageBid}
          isOpen={isOpen}
        />
      ) : (
        <RFQSupplierQuotes
          quotes={quoteList}
          isOpen={isOpen}
          rfqSlug={rfqSlug}
          canSubmitQuote={canSubmitQuote}
        />
      )}
    </ExecutivePanel>
  );
}
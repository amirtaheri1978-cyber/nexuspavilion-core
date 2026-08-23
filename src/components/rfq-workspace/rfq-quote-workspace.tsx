import Link from "next/link";
import type { ComponentProps } from "react";

import { ExecutiveBadge } from "@/components/executive/executive-badge";
import { ExecutiveMetricCard } from "@/components/executive/executive-metric-card";
import { ExecutivePanel } from "@/components/executive/executive-panel";
import { RFQOwnerQuotes } from "@/components/rfq-workspace/rfq-owner-quotes";
import { RFQSupplierQuotes } from "@/components/rfq-workspace/rfq-supplier-quotes";
import {
  EXECUTIVE_CTA_PRIMARY,
  EXECUTIVE_CTA_SECONDARY,
} from "@/lib/design-system/executive-contract";
import type { RfqOwnerSupplierCompanyIdentity } from "@/lib/procurement/rfq-owner-supplier-identity";

type RFQOwnerQuotesProps = ComponentProps<typeof RFQOwnerQuotes>;
type RFQSupplierQuotesProps = ComponentProps<typeof RFQSupplierQuotes>;

type RFQQuoteWorkspaceProps = {
  rfqSlug: string;
  rfqTitle: string;
  isOwner: boolean;
  isOpen: boolean;
  canSubmitQuote: boolean;
  commercialEvaluationUnlocked: boolean;
  quoteList: RFQSupplierQuotesProps["quotes"];
  submissionCount?: number;
  scoredQuotes: RFQOwnerQuotesProps["quotes"];
  recommendedQuoteId: string | null;
  lowestAmount: number | null;
  highestAmount: number | null;
  averageBid: number;
  supplierCompanies?: ReadonlyArray<RfqOwnerSupplierCompanyIdentity>;
};

export function RFQQuoteWorkspace({
  rfqSlug,
  rfqTitle,
  isOwner,
  isOpen,
  canSubmitQuote,
  commercialEvaluationUnlocked,
  quoteList,
  submissionCount,
  scoredQuotes,
  recommendedQuoteId,
  lowestAmount,
  highestAmount,
  averageBid,
  supplierCompanies,
}: RFQQuoteWorkspaceProps) {
  const workspaceLabel = isOwner
    ? "Quote Intelligence"
    : "Supplier Submission";

  const workspaceTitle = isOwner
    ? commercialEvaluationUnlocked
      ? "Supplier Evaluation Intelligence"
      : "Commercial Submission Lockbox"
    : "Your Organization’s Commercial Submission";

  const workspaceDescription = !isOwner
    ? "Supplier pricing remains confidential. Your organization can review only its own submission. Competitor pricing, comparative evaluation, ranking, and award controls remain restricted to authorized buyer-side users after commercial opening."
    : commercialEvaluationUnlocked
      ? "Supplier evaluation applies weighted commercial and execution criteria across price, timeline, performance signals, procurement risk, and proposal validity."
      : "Commercial submissions remain protected until the RFQ deadline. Buyer-side users can monitor participation volume while pricing, ranking, supplier comparison, and award controls remain unavailable.";

  return (
    <ExecutivePanel
      id="quote-intelligence"
      className="mt-8 min-w-0 @container"
      padding="lg"
      tone="blue"
    >
      <section aria-labelledby="rfq-quote-workspace-title">
        <div className="flex min-w-0 flex-col gap-6 @4xl:flex-row @4xl:items-start @4xl:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-nexus-gold">
              {workspaceLabel}
            </p>

            <h2
              id="rfq-quote-workspace-title"
              className="mt-3 min-w-0 text-pretty text-2xl font-black tracking-tight text-nexus-white sm:text-3xl"
            >
              {workspaceTitle}
            </h2>

            <p className="mt-3 max-w-3xl min-w-0 text-pretty text-sm font-semibold leading-7 text-nexus-muted">
              {workspaceDescription}
            </p>
          </div>

          <div
            className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap @4xl:max-w-xl @4xl:justify-end"
            aria-label="Quote workspace actions"
          >
            {canSubmitQuote ? (
              <Link
                href={`/rfq/${rfqSlug}/submit`}
                className={EXECUTIVE_CTA_SECONDARY}
              >
                Submit Quote
              </Link>
            ) : null}

            {isOwner && commercialEvaluationUnlocked ? (
              <Link
                href={`/rfq/${rfqSlug}/compare`}
                className={EXECUTIVE_CTA_PRIMARY}
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
            <section
              aria-labelledby="commercial-lockbox-status-title"
              aria-describedby="commercial-lockbox-status-description"
            >
              <div className="flex flex-col gap-5 @4xl:flex-row @4xl:items-start @4xl:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-nexus-gold">
                    Commercial Governance Status
                  </p>

                  <h3
                    id="commercial-lockbox-status-title"
                    className="mt-3 min-w-0 text-pretty text-xl font-black tracking-tight text-nexus-white sm:text-2xl"
                  >
                    Blind Bidding Controls Active
                  </h3>

                  <p
                    id="commercial-lockbox-status-description"
                    className="mt-3 max-w-3xl min-w-0 text-pretty text-sm font-semibold leading-7 text-nexus-muted"
                  >
                    Supplier submissions have been received, but commercial
                    pricing and comparative evaluation remain protected until
                    the authorized commercial opening stage.
                  </p>
                </div>

                <div className="shrink-0">
                  <ExecutiveBadge tone="warning">
                    Blind Bidding Active
                  </ExecutiveBadge>
                </div>
              </div>

              <div
                className="mt-6 grid grid-cols-1 gap-4 @sm:grid-cols-2"
                aria-label="Commercial lockbox metrics"
              >
                <ExecutiveMetricCard
                  label="Submissions"
                  value={String(submissionCount ?? quoteList.length)}
                  insight="Supplier responses received"
                  tone="gold"
                />

                <ExecutiveMetricCard
                  label="Commercial Data"
                  value="Locked"
                  insight="Protected until opening"
                  tone="gold"
                />

                <ExecutiveMetricCard
                  label="Evaluation Status"
                  value="Pending"
                  insight="Blind bidding remains active"
                  tone="blue"
                />
              </div>
            </section>
          </ExecutivePanel>
        ) : isOwner ? (
          <div className="mt-8">
            <RFQOwnerQuotes
              rfqTitle={rfqTitle}
              quotes={scoredQuotes}
              recommendedQuoteId={recommendedQuoteId}
              lowestAmount={lowestAmount}
              highestAmount={highestAmount}
              averageBid={averageBid}
              isOpen={isOpen}
              supplierCompanies={supplierCompanies}
            />
          </div>
        ) : (
          <div className="mt-8">
            <RFQSupplierQuotes
              quotes={quoteList}
              isOpen={isOpen}
              rfqSlug={rfqSlug}
              canSubmitQuote={canSubmitQuote}
            />
          </div>
        )}
      </section>
    </ExecutivePanel>
  );
}
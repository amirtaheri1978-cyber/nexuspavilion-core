import { ExecutivePanel } from "@/components/executive/executive-panel";
import { ExecutiveMiniTile } from "@/components/rfq-workspace/shared/executive-mini-tile";
import { ExecutiveSignal } from "@/components/rfq-workspace/shared/executive-signal";
import { ExecutiveStatusBadge } from "@/components/rfq-workspace/shared/executive-status-badge";
import { buildExecutiveIntelligence } from "@/lib/executive/executive-engine";
import type { ExecutiveQuote } from "@/types/executive";

type ExecutiveNegotiationIntelligenceProps = {
  isOwner: boolean;
  commercialEvaluationUnlocked: boolean;
  recommendedQuote: ExecutiveQuote | null;
  averageBid: number;
  lowestAmount: number | null;
  quoteCount: number;
  budget: number;
};

function formatMoney(value: number) {
  if (!Number.isFinite(value)) return "$0";
  return `$${Math.max(0, Math.round(value)).toLocaleString()}`;
}

export function ExecutiveNegotiationIntelligence({
  isOwner,
  commercialEvaluationUnlocked,
  recommendedQuote,
  averageBid,
  lowestAmount,
  quoteCount,
  budget,
}: ExecutiveNegotiationIntelligenceProps) {
  if (!isOwner) return null;

  if (!commercialEvaluationUnlocked || !recommendedQuote) {
    return (
      <ExecutivePanel className="mt-8" padding="lg" tone="gold">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-nexus-gold">
              Executive Negotiation Intelligence
            </p>

            <h2 className="mt-3 text-3xl font-black text-nexus-white">
              Negotiation Strategy Awaiting Activation
            </h2>

            <p className="mt-3 max-w-4xl text-sm font-semibold leading-7 text-nexus-muted">
              Negotiation strategy becomes available after commercial opening
              and once Nexus Pavilion has a recommended supplier path to
              evaluate.
            </p>
          </div>

          <ExecutiveStatusBadge tone="warning">
            Not Operational
          </ExecutiveStatusBadge>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <LockedRequirement
            label="Commercial evaluation opened"
            ready={commercialEvaluationUnlocked}
          />
          <LockedRequirement
            label="Competitive quote data available"
            ready={quoteCount > 0}
          />
          <LockedRequirement
            label="Recommended supplier path established"
            ready={Boolean(recommendedQuote)}
          />
        </div>
      </ExecutivePanel>
    );
  }

  const executive = buildExecutiveIntelligence({
    rfqSlug: "",
    isOwner,
    isOpen: true,
    commercialEvaluationUnlocked,
    healthScore: recommendedQuote.totalScore,
    quoteCount,
    documentCount: 1,
    addendaCount: 0,
    averageBid,
    lowestAmount,
    budget,
    potentialSavings:
      averageBid > 0 ? averageBid - recommendedQuote.amountNumber : 0,
    recommendedQuote,
    awardedQuote: null,
  });

  const negotiation = executive.negotiation;

  if (!negotiation) return null;

  const budgetDelta = budget > 0 ? budget - recommendedQuote.amountNumber : 0;
  const isLowest =
    lowestAmount !== null && recommendedQuote.amountNumber === lowestAmount;

  const potential =
    recommendedQuote.amountNumber > 0
      ? Math.round(
          (negotiation.targetImprovement / recommendedQuote.amountNumber) * 100,
        )
      : 0;

  const commercialSignals = [
    {
      label: "Negotiation Potential",
      value: `${potential}%`,
      detail: negotiation.status,
    },
    {
      label: "Target Improvement",
      value: formatMoney(negotiation.targetImprovement),
      detail: "Estimated achievable reduction",
    },
    {
      label: "Target Price",
      value: formatMoney(negotiation.targetPrice),
      detail: "Suggested negotiation target",
    },
    {
      label: "Savings vs Average",
      value:
        negotiation.expectedSavings > 0
          ? formatMoney(negotiation.expectedSavings)
          : "Limited",
      detail: "Compared to average bid",
    },
  ];

  const leverageSignals = [
    {
      label: "Competition",
      value: quoteCount >= 3 ? "Strong" : quoteCount >= 2 ? "Moderate" : "Light",
      positive: quoteCount >= 3,
    },
    {
      label: "Lowest Bid Position",
      value: isLowest ? "Yes" : "No",
      positive: isLowest,
    },
    {
      label: "Budget Position",
      value:
        budget <= 0
          ? "Unknown"
          : budgetDelta >= 0
            ? `${formatMoney(budgetDelta)} under budget`
            : `${formatMoney(Math.abs(budgetDelta))} over budget`,
      positive: budget > 0 && budgetDelta >= 0,
    },
    {
      label: "Risk Position",
      value: `${recommendedQuote.riskLevel} risk`,
      positive: recommendedQuote.riskLevel.toLowerCase() === "low",
    },
  ];

  return (
    <section className="mt-8 overflow-hidden rounded-[40px] border border-white/10 bg-slate-950 text-white shadow-[0_30px_100px_rgba(2,6,23,0.26)]">
      <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="border-b border-white/10 p-6 sm:p-8 lg:border-b-0 lg:border-r">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#C8A646]">
            Executive Negotiation Intelligence
          </p>

          <h2 className="mt-3 text-3xl font-black text-white">
            Commercial strategy before award
          </h2>

          <p className="mt-4 text-sm font-semibold leading-7 text-slate-400">
            Nexus Pavilion estimates negotiation room, leverage, target pricing,
            and commercial strategy before executive award validation.
          </p>

          <div className="mt-8 rounded-[34px] border border-white/10 bg-white/[0.055] p-6">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
              Recommended Strategy
            </p>

            <p className="mt-4 text-sm font-bold leading-7 text-slate-300">
              {negotiation.recommendation}
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {commercialSignals.map((signal) => (
              <ExecutiveMiniTile
                key={signal.label}
                title={signal.label}
                value={signal.value}
                detail={signal.detail}
              />
            ))}
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300">
            Commercial Leverage Signals
          </p>

          <h3 className="mt-3 text-3xl font-black text-white">
            What strengthens negotiation position
          </h3>

          <div className="mt-6 grid gap-4">
            {leverageSignals.map((signal) => (
              <div
                key={signal.label}
                className="flex items-start gap-4 rounded-3xl border border-white/10 bg-white/[0.045] p-5"
              >
                <ExecutiveSignal positive={signal.positive} />

                <div>
                  <p className="text-sm font-black text-white">
                    {signal.label}
                  </p>

                  <p className="mt-1 text-sm font-bold leading-6 text-slate-400">
                    {signal.value}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-[32px] border border-cyan-300/15 bg-cyan-400/[0.07] p-6">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-300">
              Executive Negotiation Brief
            </p>

            <p className="mt-4 text-sm font-bold leading-7 text-slate-300">
              {negotiation.recommendation}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function LockedRequirement({
  label,
  ready,
}: {
  label: string;
  ready: boolean;
}) {
  return (
    <ExecutivePanel
      variant="operational"
      padding="sm"
      tone={ready ? "success" : "neutral"}
    >
      <div className="flex items-start gap-3">
        <ExecutiveSignal positive={ready} />

        <p className="text-sm font-bold leading-6 text-nexus-muted">
          {label}
        </p>
      </div>
    </ExecutivePanel>
  );
}
import { ExecutivePanel } from "@/components/executive/executive-panel";
import { ExecutiveMiniTile } from "@/components/rfq-workspace/shared/executive-mini-tile";
import { ExecutiveSignal } from "@/components/rfq-workspace/shared/executive-signal";
import { ExecutiveStatusBadge } from "@/components/rfq-workspace/shared/executive-status-badge";
import type { ExecutiveIntelligence } from "@/lib/executive/executive-types";
import type { ExecutiveQuote } from "@/types/executive";

type ExecutiveNegotiationIntelligenceProps = {
  isOwner: boolean;
  commercialEvaluationUnlocked: boolean;
  recommendedQuote: ExecutiveQuote | null;
  averageBid: number;
  lowestAmount: number | null;
  quoteCount: number;
  budget: number;
  executive: ExecutiveIntelligence;
};

type LeverageSignal = {
  label: string;
  value: string;
  positive: boolean;
};

function formatMoney(value: number) {
  if (!Number.isFinite(value)) return "$0";

  return `$${Math.max(0, Math.round(value)).toLocaleString()}`;
}

function normalizePercentage(value: number) {
  if (!Number.isFinite(value)) return 0;

  return Math.max(0, Math.min(100, Math.round(value)));
}

function getNegotiationTone(
  potential: number,
): "success" | "info" | "warning" | "neutral" {
  if (potential >= 8) return "success";
  if (potential >= 4) return "info";
  if (potential > 0) return "warning";

  return "neutral";
}

function getSignalStatus(signal: LeverageSignal) {
  return signal.positive
    ? {
        label: "Favorable",
        tone: "success" as const,
      }
    : {
        label: "Review",
        tone: "warning" as const,
      };
}

export function ExecutiveNegotiationIntelligence({
  isOwner,
  commercialEvaluationUnlocked,
  recommendedQuote,
  
  lowestAmount,
  quoteCount,
  budget,
  executive,
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

            <h2 className="mt-3 text-2xl font-black tracking-tight text-nexus-white sm:text-3xl">
              Negotiation Strategy Awaiting Activation
            </h2>

            <p className="mt-3 max-w-4xl text-sm font-semibold leading-7 text-nexus-muted">
              Negotiation strategy becomes available after commercial opening
              and once Nexus Pavilion has a recommended supplier path to
              evaluate.
            </p>
          </div>

          <div className="shrink-0">
            <ExecutiveStatusBadge tone="warning">
              Not Operational
            </ExecutiveStatusBadge>
          </div>
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


  const negotiation = executive.negotiation;

  if (!negotiation) return null;

  const budgetDelta =
    budget > 0 ? budget - recommendedQuote.amountNumber : 0;

  const isLowest =
    lowestAmount !== null &&
    recommendedQuote.amountNumber === lowestAmount;

  const potential =
    recommendedQuote.amountNumber > 0
      ? normalizePercentage(
          (negotiation.targetImprovement /
            recommendedQuote.amountNumber) *
            100,
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
      detail: "Estimated achievable commercial reduction",
    },
    {
      label: "Target Price",
      value: formatMoney(negotiation.targetPrice),
      detail: "Recommended commercial negotiation target",
    },
    {
      label: "Savings vs Average",
      value:
        negotiation.expectedSavings > 0
          ? formatMoney(negotiation.expectedSavings)
          : "Limited",
      detail: "Relative to the current average bid position",
    },
  ];

  const leverageSignals: LeverageSignal[] = [
    {
      label: "Competitive Tension",
      value:
        quoteCount >= 3
          ? "Strong"
          : quoteCount >= 2
            ? "Moderate"
            : "Limited",
      positive: quoteCount >= 3,
    },
    {
      label: "Lowest Bid Position",
      value: isLowest ? "Recommended bid is lowest" : "Not the lowest bid",
      positive: isLowest,
    },
    {
      label: "Budget Position",
      value:
        budget <= 0
          ? "Budget baseline unavailable"
          : budgetDelta >= 0
            ? `${formatMoney(budgetDelta)} below budget`
            : `${formatMoney(Math.abs(budgetDelta))} above budget`,
      positive: budget > 0 && budgetDelta >= 0,
    },
    {
      label: "Risk Position",
      value: `${recommendedQuote.riskLevel} risk`,
      positive: recommendedQuote.riskLevel.toLowerCase() === "low",
    },
  ];

  const favorableSignalCount = leverageSignals.filter(
    (signal) => signal.positive,
  ).length;

  return (
    <ExecutivePanel
      className="mt-8 overflow-hidden p-0"
      tone="gold"
    >
      <section aria-labelledby="executive-negotiation-intelligence-title">
        <div className="grid gap-0 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="border-b border-white/10 p-6 sm:p-8 xl:border-b-0 xl:border-r">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-nexus-gold">
                  Executive Negotiation Intelligence
                </p>

                <h2
                  id="executive-negotiation-intelligence-title"
                  className="mt-3 text-2xl font-black tracking-tight text-nexus-white sm:text-3xl"
                >
                  Pre-Award Commercial Strategy
                </h2>
              </div>

              <div className="shrink-0">
                <ExecutiveStatusBadge tone="success">
                  Operational
                </ExecutiveStatusBadge>
              </div>
            </div>

            <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-nexus-muted">
              This decision-support view evaluates negotiation headroom,
              commercial leverage, target pricing, and expected savings before
              final award authorization.
            </p>

            <div className="mt-8 rounded-[34px] border border-nexus-gold/20 bg-black/25 p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-nexus-muted">
                    Recommended Negotiation Strategy
                  </p>

                  <p className="mt-4 break-words text-sm font-bold leading-7 text-nexus-white">
                    {negotiation.recommendation}
                  </p>
                </div>

                <ExecutiveStatusBadge
                  tone={getNegotiationTone(potential)}
                >
                  {potential}% Potential
                </ExecutiveStatusBadge>
              </div>

              <p className="mt-5 border-t border-white/10 pt-4 text-xs font-semibold leading-5 text-nexus-muted">
                Negotiation guidance supports authorized procurement review and
                does not replace supplier engagement protocols, commercial
                approval limits, or final award accountability.
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

          <div className="min-w-0 p-6 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-nexus-gold">
                  Commercial Leverage Signals
                </p>

                <h3 className="mt-3 text-2xl font-black tracking-tight text-nexus-white sm:text-3xl">
                  Negotiation Position Assessment
                </h3>
              </div>

              <div className="shrink-0">
                <ExecutiveStatusBadge
                  tone={
                    favorableSignalCount >= 3
                      ? "success"
                      : favorableSignalCount >= 2
                        ? "info"
                        : "warning"
                  }
                >
                  {favorableSignalCount} of {leverageSignals.length} Favorable
                </ExecutiveStatusBadge>
              </div>
            </div>

            <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-nexus-muted">
              These signals indicate where competitive tension, bid position,
              budget alignment, and supplier risk strengthen or constrain the
              current negotiation strategy.
            </p>

            <div className="mt-6 grid gap-4">
              {leverageSignals.map((signal) => {
                const signalStatus = getSignalStatus(signal);

                return (
                  <article
                    key={signal.label}
                    className="flex min-w-0 items-start gap-4 rounded-3xl border border-white/10 bg-white/[0.045] p-5 transition duration-300 hover:border-white/15 hover:bg-white/[0.06]"
                  >
                    <div className="shrink-0 pt-0.5">
                      <ExecutiveSignal positive={signal.positive} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <h4 className="break-words text-sm font-black text-nexus-white">
                            {signal.label}
                          </h4>

                          <p className="mt-2 break-words text-sm font-bold leading-6 text-nexus-muted">
                            {signal.value}
                          </p>
                        </div>

                        <div className="shrink-0 self-start">
                          <ExecutiveStatusBadge tone={signalStatus.tone}>
                            {signalStatus.label}
                          </ExecutiveStatusBadge>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-6 rounded-[32px] border border-nexus-gold/20 bg-black/20 p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-nexus-muted">
                    Executive Negotiation Brief
                  </p>

                  <p className="mt-4 break-words text-sm font-bold leading-7 text-nexus-white">
                    {negotiation.recommendation}
                  </p>
                </div>

                <ExecutiveStatusBadge
                  tone={getNegotiationTone(potential)}
                >
                  {negotiation.status}
                </ExecutiveStatusBadge>
              </div>
            </div>
          </div>
        </div>
      </section>
    </ExecutivePanel>
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
        <div className="shrink-0 pt-0.5">
          <ExecutiveSignal positive={ready} />
        </div>

        <p className="break-words text-sm font-bold leading-6 text-nexus-muted">
          {label}
        </p>
      </div>
    </ExecutivePanel>
  );
}
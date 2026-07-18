import { ExecutiveMetricCard } from "@/components/executive/executive-metric-card";
import { ExecutivePanel } from "@/components/executive/executive-panel";

type BoardReadinessIntelligenceProps = {
  boardReadinessScore: number;
  governanceReadiness: string;
  financialVisibility: string;
  riskVisibility: string;
  boardRecommendation: string;
};

export default function BoardReadinessIntelligence({
  boardReadinessScore,
  governanceReadiness,
  financialVisibility,
  riskVisibility,
  boardRecommendation,
}: BoardReadinessIntelligenceProps) {
  return (
    <ExecutivePanel
      aria-labelledby="board-readiness-intelligence-heading"
      variant="boardroom"
      padding="lg"
      tone="gold"
    >
      <header className="grid min-w-0 gap-6 border-b border-white/10 pb-7 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-nexus-gold sm:text-xs">
              Board Readiness Intelligence
            </p>

            <span
              aria-hidden="true"
              className="hidden h-1 w-1 rounded-full bg-white/20 sm:block"
            />

            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted">
              Governance decision assurance
            </p>
          </div>

          <h2
            id="board-readiness-intelligence-heading"
            className="mt-4 max-w-5xl text-3xl font-black leading-[1.08] tracking-tight text-nexus-white sm:text-4xl lg:text-5xl"
          >
            Executive Governance Readiness
          </h2>

          <p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-nexus-muted sm:text-base">
            Assessment of board-level governance readiness, financial
            transparency, risk visibility, and the quality of procurement
            intelligence available for executive review.
          </p>
        </div>

        <div className="flex min-w-[220px] items-center justify-between gap-5 rounded-2xl border border-nexus-gold/20 bg-nexus-gold/[0.055] px-5 py-4 xl:flex-col xl:items-end xl:gap-1">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-gold xl:text-right">
              Board readiness score
            </p>

            <p className="mt-1 text-xs font-semibold text-nexus-muted xl:text-right">
              Current governance position
            </p>
          </div>

          <p className="shrink-0 text-3xl font-black tabular-nums text-nexus-white">
            {boardReadinessScore}/100
          </p>
        </div>
      </header>

      <section
        aria-labelledby="board-readiness-signals-heading"
        className="mt-7 min-w-0"
      >
        <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-nexus-gold">
              Governance control signals
            </p>

            <h3
              id="board-readiness-signals-heading"
              className="mt-2 text-lg font-black tracking-tight text-nexus-white sm:text-xl"
            >
              Board Decision Readiness
            </h3>
          </div>

          <p className="max-w-xl text-xs font-semibold leading-5 text-nexus-muted sm:text-right">
            Core indicators defining whether current procurement intelligence is
            sufficiently mature, transparent, and decision-ready for board
            review.
          </p>
        </div>

        <div className="mt-5 grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ExecutiveMetricCard
            label="Board Readiness"
            value={`${boardReadinessScore}/100`}
            insight="Composite indication of current board-level decision readiness."
            impact="Governance readiness signal"
            tone="blue"
          />

          <ExecutiveMetricCard
            label="Governance Readiness"
            value={governanceReadiness}
            insight="Current maturity of governance controls and executive oversight."
            impact="Governance control position"
            tone="gold"
          />

          <ExecutiveMetricCard
            label="Financial Visibility"
            value={financialVisibility}
            insight="Current level of financial transparency supporting board review."
            impact="Financial decision assurance"
            tone="blue"
          />

          <ExecutiveMetricCard
            label="Risk Visibility"
            value={riskVisibility}
            insight="Current visibility into procurement, supplier, and operating risk."
            impact="Enterprise risk assurance"
            tone="gold"
          />
        </div>
      </section>

      <div className="mt-7 grid min-w-0 items-stretch gap-6 xl:grid-cols-[minmax(300px,0.72fr)_minmax(0,1.28fr)]">
        <section
          aria-labelledby="governance-position-heading"
          className="min-w-0 rounded-3xl border border-white/10 bg-white/[0.025] p-5 sm:p-6"
        >
          <div className="border-b border-white/10 pb-5">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-nexus-gold">
              Current governance posture
            </p>

            <h3
              id="governance-position-heading"
              className="mt-2 text-lg font-black tracking-tight text-nexus-white sm:text-xl"
            >
              Board Assurance Position
            </h3>

            <p className="mt-3 text-xs font-semibold leading-5 text-nexus-muted">
              Consolidated interpretation of governance maturity, financial
              transparency, and executive risk visibility.
            </p>
          </div>

          <div className="mt-5 grid min-w-0 gap-3">
            <ReadinessSignal
              label="Governance"
              value={governanceReadiness}
              description="Executive governance maturity and oversight readiness."
            />

            <ReadinessSignal
              label="Financial Visibility"
              value={financialVisibility}
              description="Availability of reliable financial information for board review."
            />

            <ReadinessSignal
              label="Risk Visibility"
              value={riskVisibility}
              description="Clarity of procurement and supplier exposure presented to leadership."
            />
          </div>
        </section>

        <section
          aria-labelledby="board-recommendation-heading"
          className="min-w-0 overflow-hidden rounded-3xl border border-nexus-gold/20 bg-nexus-gold/[0.045]"
        >
          <div className="grid h-full min-w-0 lg:grid-cols-[220px_minmax(0,1fr)]">
            <div className="border-b border-white/10 p-5 sm:p-6 lg:border-b-0 lg:border-r">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-nexus-gold">
                Board recommendation
              </p>

              <h3
                id="board-recommendation-heading"
                className="mt-3 text-xl font-black leading-7 text-nexus-white"
              >
                Required Governance Response
              </h3>

              <p className="mt-3 text-xs font-semibold leading-5 text-nexus-muted">
                Leadership direction derived from the current board-readiness
                assessment.
              </p>
            </div>

            <div className="flex min-w-0 flex-col justify-between p-5 sm:p-6">
              <div className="flex min-w-0 items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-nexus-gold/25 bg-nexus-gold/10 text-xs font-black text-nexus-gold">
                  01
                </span>

                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted">
                    Executive governance directive
                  </p>

                  <p className="mt-3 break-words text-base font-bold leading-8 text-nexus-white [overflow-wrap:anywhere]">
                    {boardRecommendation}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-nexus-muted">
                  Board review required
                </p>

                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-nexus-gold">
                  Governance action position
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </ExecutivePanel>
  );
}

function ReadinessSignal({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-black/10 p-4">
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-nexus-muted">
            {label}
          </p>

          <p className="mt-2 break-words text-xs font-semibold leading-5 text-nexus-muted [overflow-wrap:anywhere]">
            {description}
          </p>
        </div>

        <p className="max-w-[45%] shrink-0 break-words text-right text-sm font-black leading-6 text-nexus-white [overflow-wrap:anywhere]">
          {value}
        </p>
      </div>
    </div>
  );
}
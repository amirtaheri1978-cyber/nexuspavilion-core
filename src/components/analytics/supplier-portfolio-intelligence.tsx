import { ExecutiveMetricCard } from "@/components/executive/executive-metric-card";
import { ExecutivePanel } from "@/components/executive/executive-panel";

type SupplierPortfolioIntelligenceProps = {
  portfolioHealthIndex: number;
  supplierParticipationCount: number;
  awardHistoryCoverage: number;
  suppliersWithAwardHistory: number;
  suppliersWithMultipleAwards: number;
  suppliersWithLimitedQuoteHistory: number;
  supplierDiversificationScore: number;
  portfolioStatus: string;
  portfolioRecommendations: string[];
};

export function SupplierPortfolioIntelligence({
  portfolioHealthIndex,
  supplierParticipationCount,
  awardHistoryCoverage,
  suppliersWithAwardHistory,
  suppliersWithMultipleAwards,
  suppliersWithLimitedQuoteHistory,
  supplierDiversificationScore,
  portfolioStatus,
  portfolioRecommendations,
}: SupplierPortfolioIntelligenceProps) {
  return (
    <ExecutivePanel
      aria-labelledby="supplier-portfolio-intelligence-heading"
      variant="boardroom"
      padding="lg"
      tone="gold"
    >
      <header className="grid min-w-0 gap-6 border-b border-white/10 pb-7 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-nexus-gold sm:text-xs">
              Supplier Portfolio Evidence
            </p>

            <span
              aria-hidden="true"
              className="hidden h-1 w-1 rounded-full bg-white/20 sm:block"
            />

            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted">
              Supply-base coverage
            </p>
          </div>

          <h2
            id="supplier-portfolio-intelligence-heading"
            className="mt-4 max-w-4xl text-3xl font-black leading-[1.08] tracking-tight text-nexus-white sm:text-4xl lg:text-5xl"
          >
            Supplier Portfolio Coverage
          </h2>

          <p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-nexus-muted sm:text-base">
            Factual assessment of supplier participation, award-history depth,
            limited-history concentration, and internal diversification signals
            across suppliers with recorded quotation history. Coverage is not a
            trust score, approval status, or authorization signal.
          </p>
        </div>

        <div className="flex min-w-[190px] items-center justify-between gap-5 rounded-2xl border border-nexus-gold/15 bg-nexus-gold/[0.045] px-5 py-4 xl:flex-col xl:items-end xl:gap-1">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted xl:text-right">
              Internal portfolio coverage index
            </p>

            <p className="mt-1 text-xs font-semibold text-nexus-muted xl:text-right">
              Composite internal coverage signal
            </p>
          </div>

          <p className="shrink-0 text-3xl font-black tabular-nums text-nexus-white">
            {portfolioHealthIndex}/100
          </p>
        </div>
      </header>

      <section
        aria-labelledby="supplier-portfolio-signals-heading"
        className="mt-7 min-w-0"
      >
        <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-nexus-gold">
              Portfolio evidence signals
            </p>

            <h3
              id="supplier-portfolio-signals-heading"
              className="mt-2 text-lg font-black tracking-tight text-nexus-white sm:text-xl"
            >
              Participation Population, History Depth, and Diversification
            </h3>
          </div>

          <p className="max-w-xl text-xs font-semibold leading-5 text-nexus-muted sm:text-right">
            Counts and coverage ratios use the full supplier population with
            recorded quotation history. Ranking limits do not cap these
            denominators.
          </p>
        </div>

        <div className="mt-5 grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ExecutiveMetricCard
            label="Participating Suppliers"
            value={supplierParticipationCount.toString()}
            insight="Full supplier population with recorded quotation history in the scoped portfolio."
            impact="Participation denominator"
            tone="blue"
          />

          <ExecutiveMetricCard
            label="Award-History Coverage"
            value={`${awardHistoryCoverage}%`}
            insight={`${suppliersWithAwardHistory} of ${supplierParticipationCount} participating suppliers have at least one recorded award.`}
            impact="Defined supplier denominator"
            tone="gold"
          />

          <ExecutiveMetricCard
            label="Multiple Awards"
            value={suppliersWithMultipleAwards.toString()}
            insight="Suppliers with more than one recorded award across the portfolio."
            impact="Repeat award depth"
            tone="blue"
          />

          <ExecutiveMetricCard
            label="Limited Quote History"
            value={suppliersWithLimitedQuoteHistory.toString()}
            insight="Participating suppliers with fewer than three recorded quotations."
            impact="History-depth attention"
            tone="gold"
          />

          <ExecutiveMetricCard
            label="Internal Diversification Score"
            value={`${supplierDiversificationScore}/100`}
            insight="Participation-breadth threshold score based on participating supplier count; not a participation percentage."
            impact="Internal breadth signal"
            tone="blue"
          />

          <ExecutiveMetricCard
            label="Portfolio Coverage Index"
            value={`${portfolioHealthIndex}/100`}
            insight="Composite internal signal from participation breadth and recorded commercial history."
            impact="Internal coverage signal"
            tone="gold"
          />
        </div>
      </section>

      <div className="mt-7 grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(320px,0.75fr)_minmax(0,1.25fr)]">
        <section
          aria-labelledby="supplier-portfolio-assessment-heading"
          className="min-w-0 rounded-3xl border border-nexus-gold/20 bg-nexus-gold/[0.045] p-5 sm:p-6"
        >
          <div className="border-b border-white/10 pb-5">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-nexus-gold">
              Executive portfolio assessment
            </p>

            <h3
              id="supplier-portfolio-assessment-heading"
              className="mt-2 text-lg font-black tracking-tight text-nexus-white sm:text-xl"
            >
              Current Supplier Position
            </h3>

            <p className="mt-3 text-xs font-semibold leading-5 text-nexus-muted">
              Consolidated interpretation of supplier participation,
              award-history depth, and internal diversification evidence.
            </p>
          </div>

          <div className="mt-5 rounded-2xl border border-nexus-gold/20 bg-black/10 p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-gold">
              Portfolio status
            </p>

            <p className="mt-3 break-words text-2xl font-black leading-8 text-nexus-white [overflow-wrap:anywhere] sm:text-3xl">
              {portfolioStatus}
            </p>
          </div>

          <div className="mt-5 grid min-w-0 gap-3">
            <PortfolioAssessmentSignal
              label="Participation population"
              value={supplierParticipationCount.toString()}
              description="Full supplier population with recorded quotation history."
            />

            <PortfolioAssessmentSignal
              label="Award-history coverage"
              value={`${awardHistoryCoverage}%`}
              description={`${suppliersWithAwardHistory} of ${supplierParticipationCount} participating suppliers have recorded award history.`}
            />

            <PortfolioAssessmentSignal
              label="Repeat award depth"
              value={suppliersWithMultipleAwards.toString()}
              description="Suppliers with multiple recorded awards."
            />

            <PortfolioAssessmentSignal
              label="Limited quote history"
              value={suppliersWithLimitedQuoteHistory.toString()}
              description="Participating suppliers with fewer than three recorded quotations."
            />

            <PortfolioAssessmentSignal
              label="Internal diversification score"
              value={`${supplierDiversificationScore}/100`}
              description="Participation-breadth threshold score; not a participation percentage."
            />
          </div>
        </section>

        <section
          aria-labelledby="supplier-portfolio-actions-heading"
          className="min-w-0 rounded-3xl border border-white/10 bg-white/[0.025] p-5 sm:p-6"
        >
          <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-nexus-gold">
                Executive response agenda
              </p>

              <h3
                id="supplier-portfolio-actions-heading"
                className="mt-2 text-lg font-black tracking-tight text-nexus-white sm:text-xl"
              >
                Recommended Portfolio Actions
              </h3>
            </div>

            <span className="w-fit rounded-full border border-nexus-gold/20 bg-nexus-gold/[0.07] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-nexus-gold">
              {portfolioRecommendations.length} recommendations
            </span>
          </div>

          <div className="mt-5 grid min-w-0 gap-4 md:grid-cols-2">
            {portfolioRecommendations.map((recommendation, index) => (
              <article
                key={recommendation}
                className="group min-w-0 rounded-3xl border border-white/10 bg-black/10 p-5 transition-colors hover:border-nexus-gold/20 hover:bg-nexus-gold/[0.025]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-nexus-gold/20 bg-nexus-gold/[0.07] text-[10px] font-black tabular-nums text-nexus-gold">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted">
                      Executive action
                    </p>

                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-nexus-gold">
                      Portfolio recommendation
                    </p>
                  </div>
                </div>

                <div
                  aria-hidden="true"
                  className="my-4 h-px bg-gradient-to-r from-nexus-gold/25 via-white/10 to-transparent"
                />

                <p className="break-words text-sm font-bold leading-7 text-nexus-white [overflow-wrap:anywhere]">
                  {recommendation}
                </p>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-nexus-muted">
                    Leadership review
                  </p>

                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-nexus-gold">
                    Action assessment required
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </ExecutivePanel>
  );
}

function PortfolioAssessmentSignal({
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

        <p className="shrink-0 text-lg font-black tabular-nums text-nexus-white">
          {value}
        </p>
      </div>
    </div>
  );
}

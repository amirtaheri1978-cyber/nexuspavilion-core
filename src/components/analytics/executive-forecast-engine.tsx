import { ExecutivePanel } from "@/components/executive/executive-panel";

type ExecutiveForecastEngineProps = {
  procurementOutlook: string;
  riskTrajectory: string;
  opportunityTrajectory: string;
  executiveForecastStatus: string;
  forecast30Days: string;
  forecast60Days: string;
  forecast90Days: string;
  boardForecastNarrative: string;
};

type PatternSignalTone = "activity" | "commercial" | "status";

/**
 * Legacy prop names are retained to avoid widening the analytics composition
 * contract. The supplied values are now observed historical-pattern evidence,
 * not predictive forecasts.
 */
export function ExecutiveForecastEngine({
  procurementOutlook: historicalPatternNarrative,
  riskTrajectory: rfqActivityDirection,
  opportunityTrajectory: submittedQuoteValueDirection,
  executiveForecastStatus: historicalEvidenceStatus,
  forecast30Days: rfqCreationPattern,
  forecast60Days: quoteSubmissionPattern,
  forecast90Days: supplierParticipationPattern,
  boardForecastNarrative: boardHistoricalPatternNarrative,
}: ExecutiveForecastEngineProps) {
  return (
    <ExecutivePanel
      aria-labelledby="executive-historical-patterns-heading"
      padding="lg"
    >
      <header className="grid min-w-0 gap-6 border-b border-white/10 pb-7 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-nexus-gold sm:text-xs">
              Executive Historical Patterns
            </p>

            <span
              aria-hidden="true"
              className="hidden h-1 w-1 rounded-full bg-white/20 sm:block"
            />

            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted">
              Recorded procurement evidence
            </p>
          </div>

          <h2
            id="executive-historical-patterns-heading"
            className="mt-4 max-w-5xl text-3xl font-black leading-[1.08] tracking-tight text-nexus-white sm:text-4xl lg:text-5xl"
          >
            Current vs Prior 30-Day Activity
          </h2>

          <p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-nexus-muted sm:text-base">
            Observed RFQ creation, quotation activity, supplier participation,
            and submitted quotation value are compared across adjacent recorded
            periods. This evidence is descriptive and does not predict future
            outcomes.
          </p>
        </div>

        <div className="min-w-[230px] rounded-2xl border border-nexus-gold/20 bg-nexus-gold/[0.045] px-5 py-4">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-gold xl:text-right">
            Historical evidence status
          </p>

          <p className="mt-2 max-w-[220px] break-words text-lg font-black leading-6 text-nexus-white [overflow-wrap:anywhere] xl:text-right">
            {historicalEvidenceStatus}
          </p>
        </div>
      </header>

      <section
        aria-labelledby="historical-pattern-narrative-heading"
        className="mt-7 overflow-hidden rounded-3xl border border-blue-500/20 bg-blue-500/[0.045]"
      >
        <div className="grid min-w-0 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="border-b border-white/10 p-5 sm:p-6 xl:border-b-0 xl:border-r">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-300">
              Cross-domain comparison
            </p>

            <h3
              id="historical-pattern-narrative-heading"
              className="mt-3 text-xl font-black tracking-tight text-nexus-white sm:text-2xl"
            >
              Observed Portfolio Movement
            </h3>

            <p className="mt-3 text-xs font-semibold leading-6 text-nexus-muted">
              Current and preceding 30-day windows are compared using persisted
              RFQ and quotation timestamps.
            </p>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/10 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-nexus-muted">
                Evidence status
              </p>

              <p className="mt-2 break-words text-sm font-black leading-6 text-nexus-white [overflow-wrap:anywhere]">
                {historicalEvidenceStatus}
              </p>
            </div>
          </div>

          <div className="min-w-0 p-5 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted">
              Historical pattern narrative
            </p>

            <p className="mt-4 break-words text-lg font-bold leading-8 text-nexus-white [overflow-wrap:anywhere] sm:text-xl sm:leading-9">
              {historicalPatternNarrative}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <PatternSignal
                label="RFQ Activity Direction"
                value={rfqActivityDirection}
                description="Observed direction of RFQ creation activity across the comparison windows."
                tone="activity"
              />

              <PatternSignal
                label="Submitted Quote Value Direction"
                value={submittedQuoteValueDirection}
                description="Observed direction of submitted quotation value across the comparison windows."
                tone="commercial"
              />
            </div>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="historical-pattern-detail-heading"
        className="mt-7 min-w-0"
      >
        <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-nexus-gold">
              Recorded activity detail
            </p>

            <h3
              id="historical-pattern-detail-heading"
              className="mt-2 text-lg font-black tracking-tight text-nexus-white sm:text-xl"
            >
              Cross-Domain Historical Evidence
            </h3>
          </div>

          <p className="max-w-xl text-xs font-semibold leading-5 text-nexus-muted sm:text-right">
            Each pattern compares the current 30-day window with the directly
            preceding 30-day window; no future values are generated.
          </p>
        </div>

        <div className="mt-5 grid min-w-0 gap-5 md:grid-cols-3">
          <HistoricalPatternCard
            position="01"
            title="RFQ Creation Activity"
            subtitle="Recorded sourcing events"
            value={rfqCreationPattern}
          />

          <HistoricalPatternCard
            position="02"
            title="Quote Submission Activity"
            subtitle="Recorded quotation events"
            value={quoteSubmissionPattern}
          />

          <HistoricalPatternCard
            position="03"
            title="Supplier Participation"
            subtitle="Distinct submitting companies"
            value={supplierParticipationPattern}
          />
        </div>
      </section>

      <section
        aria-labelledby="board-historical-narrative-heading"
        className="mt-7 overflow-hidden rounded-3xl border border-nexus-gold/20 bg-nexus-gold/[0.04]"
      >
        <div className="grid min-w-0 xl:grid-cols-[300px_minmax(0,1fr)]">
          <div className="border-b border-white/10 p-5 sm:p-6 xl:border-b-0 xl:border-r">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-nexus-gold">
              Board evidence narrative
            </p>

            <h3
              id="board-historical-narrative-heading"
              className="mt-3 text-xl font-black tracking-tight text-nexus-white sm:text-2xl"
            >
              Historical Pattern Summary
            </h3>

            <p className="mt-3 text-xs font-semibold leading-6 text-nexus-muted">
              Consolidated recorded-activity context prepared for executive and
              board review.
            </p>
          </div>

          <div className="min-w-0 p-5 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted">
              Evidence position
            </p>

            <h4 className="mt-3 break-words text-2xl font-black leading-8 text-nexus-white [overflow-wrap:anywhere]">
              {historicalEvidenceStatus}
            </h4>

            <p className="mt-4 break-words text-sm font-semibold leading-7 text-nexus-muted [overflow-wrap:anywhere]">
              {boardHistoricalPatternNarrative}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <EvidenceSignal
                label="Evidence Basis"
                value="Persisted RFQ and quotation timestamps"
              />

              <EvidenceSignal
                label="Comparison Method"
                value="Current vs preceding 30-day windows"
              />
            </div>
          </div>
        </div>
      </section>
    </ExecutivePanel>
  );
}

function HistoricalPatternCard({
  position,
  title,
  subtitle,
  value,
}: {
  position: string;
  title: string;
  subtitle: string;
  value: string;
}) {
  return (
    <article className="flex min-w-0 flex-col rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-6">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-nexus-gold/20 bg-nexus-gold/[0.07] text-[10px] font-black text-nexus-gold">
          {position}
        </span>

        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.17em] text-nexus-gold">
            {title}
          </p>

          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-nexus-muted">
            {subtitle}
          </p>
        </div>
      </div>

      <p className="mt-5 flex-1 break-words text-sm font-semibold leading-7 text-nexus-muted [overflow-wrap:anywhere]">
        {value}
      </p>

      <div className="mt-5 border-t border-white/10 pt-4">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-nexus-muted">
          Observed historical evidence
        </p>
      </div>
    </article>
  );
}

function EvidenceSignal({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-black/10 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-nexus-muted">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-black leading-6 text-nexus-white [overflow-wrap:anywhere]">
        {value}
      </p>
    </div>
  );
}

function PatternSignal({
  label,
  value,
  description,
  tone,
}: {
  label: string;
  value: string;
  description: string;
  tone: PatternSignalTone;
}) {
  const toneClasses: Record<
    PatternSignalTone,
    {
      border: string;
      background: string;
      label: string;
      indicator: string;
    }
  > = {
    activity: {
      border: "border-blue-300/15",
      background: "bg-blue-400/[0.035]",
      label: "text-blue-200",
      indicator: "bg-blue-300",
    },
    commercial: {
      border: "border-nexus-gold/20",
      background: "bg-nexus-gold/[0.04]",
      label: "text-nexus-gold",
      indicator: "bg-nexus-gold",
    },
    status: {
      border: "border-nexus-gold/20",
      background: "bg-nexus-gold/[0.04]",
      label: "text-nexus-gold",
      indicator: "bg-nexus-gold",
    },
  };

  const classes = toneClasses[tone];

  return (
    <article
      className={`relative min-w-0 overflow-hidden rounded-2xl border ${classes.border} ${classes.background} px-4 py-4`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 w-0.5 ${classes.indicator}`}
      />

      <div className="pl-1">
        <p
          className={`text-[10px] font-black uppercase tracking-[0.16em] ${classes.label}`}
        >
          {label}
        </p>

        <p className="mt-2 break-words text-sm font-black leading-6 text-nexus-white [overflow-wrap:anywhere]">
          {value}
        </p>

        <p className="mt-2 text-xs font-semibold leading-5 text-nexus-muted">
          {description}
        </p>
      </div>
    </article>
  );
}

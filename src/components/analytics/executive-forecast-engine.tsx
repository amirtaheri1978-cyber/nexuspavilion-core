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

type OutlookSignalTone = "risk" | "opportunity" | "status";

export function ExecutiveForecastEngine({
  procurementOutlook,
  riskTrajectory,
  opportunityTrajectory,
  executiveForecastStatus,
  forecast30Days,
  forecast60Days,
  forecast90Days,
  boardForecastNarrative,
}: ExecutiveForecastEngineProps) {
  return (
    <ExecutivePanel
      aria-labelledby="executive-forecast-engine-heading"
      padding="lg"
    >
      <header className="grid min-w-0 gap-6 border-b border-white/10 pb-7 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-nexus-gold sm:text-xs">
              Executive Forecast Engine
            </p>

            <span
              aria-hidden="true"
              className="hidden h-1 w-1 rounded-full bg-white/20 sm:block"
            />

            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted">
              Forward procurement intelligence
            </p>
          </div>

          <h2
            id="executive-forecast-engine-heading"
            className="mt-4 max-w-5xl text-3xl font-black leading-[1.08] tracking-tight text-nexus-white sm:text-4xl lg:text-5xl"
          >
            30 / 60 / 90 Day Procurement Forecast
          </h2>

          <p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-nexus-muted sm:text-base">
            Forward-looking executive intelligence projecting procurement
            outlook, supplier participation, risk trajectory, opportunity
            momentum, and board readiness over the next operating cycle.
          </p>
        </div>

        <div className="min-w-[230px] rounded-2xl border border-nexus-gold/20 bg-nexus-gold/[0.045] px-5 py-4">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-gold xl:text-right">
            Forecast status
          </p>

          <p className="mt-2 max-w-[220px] break-words text-lg font-black leading-6 text-nexus-white [overflow-wrap:anywhere] xl:text-right">
            {executiveForecastStatus}
          </p>
        </div>
      </header>

      <section
        aria-labelledby="primary-procurement-outlook-heading"
        className="mt-7 overflow-hidden rounded-3xl border border-blue-500/20 bg-blue-500/[0.045]"
      >
        <div className="grid min-w-0 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="border-b border-white/10 p-5 sm:p-6 xl:border-b-0 xl:border-r">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-300">
              Primary forecast position
            </p>

            <h3
              id="primary-procurement-outlook-heading"
              className="mt-3 text-xl font-black tracking-tight text-nexus-white sm:text-2xl"
            >
              Procurement Outlook
            </h3>

            <p className="mt-3 text-xs font-semibold leading-6 text-nexus-muted">
              Principal forward-looking position informing executive planning
              across the next operating horizon.
            </p>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/10 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-nexus-muted">
                Current status
              </p>

              <p className="mt-2 break-words text-sm font-black leading-6 text-nexus-white [overflow-wrap:anywhere]">
                {executiveForecastStatus}
              </p>
            </div>
          </div>

          <div className="min-w-0 p-5 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted">
              Executive outlook
            </p>

            <p className="mt-4 break-words text-xl font-black leading-8 text-nexus-white [overflow-wrap:anywhere] sm:text-2xl sm:leading-9">
              {procurementOutlook}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <ForecastSignal
                label="Risk Direction"
                value={riskTrajectory}
              />

              <ForecastSignal
                label="Opportunity Direction"
                value={opportunityTrajectory}
              />
            </div>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="forecast-horizon-heading"
        className="mt-7 min-w-0"
      >
        <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-nexus-gold">
              Operating horizon
            </p>

            <h3
              id="forecast-horizon-heading"
              className="mt-2 text-lg font-black tracking-tight text-nexus-white sm:text-xl"
            >
              30 / 60 / 90 Day Forecast
            </h3>
          </div>

          <p className="max-w-xl text-xs font-semibold leading-5 text-nexus-muted sm:text-right">
            The forecast sequence remains fixed from immediate operating
            priorities through medium-term procurement exposure.
          </p>
        </div>

        <div className="mt-5 grid min-w-0 gap-5 md:grid-cols-3">
          <ForecastWindow
            position="01"
            title="30 Days"
            subtitle="Immediate operating horizon"
            value={forecast30Days}
            emphasis="Current"
          />

          <ForecastWindow
            position="02"
            title="60 Days"
            subtitle="Near-term planning horizon"
            value={forecast60Days}
            emphasis="Emerging"
          />

          <ForecastWindow
            position="03"
            title="90 Days"
            subtitle="Forward operating horizon"
            value={forecast90Days}
            emphasis="Strategic"
          />
        </div>
      </section>

      <section
        aria-labelledby="executive-outlook-summary-heading"
        className="mt-7 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025]"
      >
        <div className="grid min-w-0 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
          <div className="min-w-0 border-b border-white/10 p-5 sm:p-6 xl:border-b-0 xl:border-r">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-nexus-gold">
              Executive outlook summary
            </p>

            <h3
              id="executive-outlook-summary-heading"
              className="mt-3 text-xl font-black tracking-tight text-nexus-white sm:text-2xl"
            >
              Forward Operating Position
            </h3>

            <p className="mt-4 break-words text-base font-semibold leading-7 text-nexus-white [overflow-wrap:anywhere] sm:text-lg sm:leading-8">
              {procurementOutlook}
            </p>

            <p className="mt-4 max-w-3xl text-xs font-semibold leading-6 text-nexus-muted">
              The current procurement outlook should be interpreted alongside
              directional risk, opportunity momentum, and the overall forecast
              status before executive action is finalized.
            </p>
          </div>

          <div className="min-w-0 p-5 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted">
              Directional intelligence
            </p>

            <div className="mt-4 space-y-3">
              <OutlookSignal
                label="Risk Direction"
                value={riskTrajectory}
                description="Expected movement in enterprise procurement exposure."
                tone="risk"
              />

              <OutlookSignal
                label="Opportunity Direction"
                value={opportunityTrajectory}
                description="Expected movement in commercial and strategic opportunity."
                tone="opportunity"
              />

              <OutlookSignal
                label="Forecast Status"
                value={executiveForecastStatus}
                description="Consolidated status governing the current planning posture."
                tone="status"
              />
            </div>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="board-forecast-narrative-heading"
        className="mt-7 overflow-hidden rounded-3xl border border-nexus-gold/20 bg-nexus-gold/[0.04]"
      >
        <div className="grid min-w-0 xl:grid-cols-[300px_minmax(0,1fr)]">
          <div className="border-b border-white/10 p-5 sm:p-6 xl:border-b-0 xl:border-r">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-nexus-gold">
              Board decision narrative
            </p>

            <h3
              id="board-forecast-narrative-heading"
              className="mt-3 text-xl font-black tracking-tight text-nexus-white sm:text-2xl"
            >
              Board Forecast Narrative
            </h3>

            <p className="mt-3 text-xs font-semibold leading-6 text-nexus-muted">
              Consolidated forward-looking position prepared for executive and
              board-level procurement review.
            </p>
          </div>

          <div className="min-w-0 p-5 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted">
              Forecast position
            </p>

            <h4 className="mt-3 break-words text-2xl font-black leading-8 text-nexus-white [overflow-wrap:anywhere]">
              {executiveForecastStatus}
            </h4>

            <p className="mt-4 break-words text-sm font-semibold leading-7 text-nexus-muted [overflow-wrap:anywhere]">
              {boardForecastNarrative}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <ForecastSignal
                label="Planning Outlook"
                value={procurementOutlook}
              />

              <ForecastSignal
                label="Review Horizon"
                value="30 / 60 / 90 Days"
              />
            </div>
          </div>
        </div>
      </section>
    </ExecutivePanel>
  );
}
function ForecastWindow({
  position,
  title,
  subtitle,
  value,
  emphasis,
}: {
  position: string;
  title: string;
  subtitle: string;
  value: string;
  emphasis: string;
}) {
  return (
    <article className="flex min-w-0 flex-col rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
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

        <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-nexus-muted">
          {emphasis}
        </span>
      </div>

      <p className="mt-5 flex-1 break-words text-sm font-semibold leading-7 text-nexus-muted [overflow-wrap:anywhere]">
        {value}
      </p>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-nexus-muted">
          Forecast window
        </p>

        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-nexus-gold">
          Executive review
        </p>
      </div>
    </article>
  );
}

function ForecastSignal({
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

function OutlookSignal({
  label,
  value,
  description,
  tone,
}: {
  label: string;
  value: string;
  description: string;
  tone: OutlookSignalTone;
}) {
  const toneClasses: Record<
    OutlookSignalTone,
    {
      border: string;
      background: string;
      label: string;
      indicator: string;
    }
  > = {
    risk: {
      border: "border-rose-300/15",
      background: "bg-rose-400/[0.035]",
      label: "text-rose-200",
      indicator: "bg-rose-300",
    },
    opportunity: {
      border: "border-emerald-300/15",
      background: "bg-emerald-400/[0.035]",
      label: "text-emerald-200",
      indicator: "bg-emerald-300",
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
import { ExecutivePanel } from "@/components/executive/executive-panel";

type ExecutiveScenarioCenterProps = {
  bestCaseScenario: string;
  expectedCaseScenario: string;
  riskCaseScenario: string;
  forecastConfidenceLevel: string;
  executiveScenarioStatus: string;
};

export function ExecutiveScenarioCenter({
  bestCaseScenario,
  expectedCaseScenario,
  riskCaseScenario,
  forecastConfidenceLevel,
  executiveScenarioStatus,
}: ExecutiveScenarioCenterProps) {
  return (
    <ExecutivePanel
      aria-labelledby="executive-scenario-center-heading"
      padding="lg"
    >
      <header className="grid min-w-0 gap-6 border-b border-white/10 pb-7 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-nexus-gold sm:text-xs">
              Executive Scenario Center
            </p>

            <span
              aria-hidden="true"
              className="hidden h-1 w-1 rounded-full bg-white/20 sm:block"
            />

            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted">
              Strategic decision simulation
            </p>
          </div>

          <h2
            id="executive-scenario-center-heading"
            className="mt-4 max-w-5xl text-3xl font-black leading-[1.08] tracking-tight text-nexus-white sm:text-4xl lg:text-5xl"
          >
            Strategic Scenario Modeling
          </h2>

          <p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-nexus-muted sm:text-base">
            Comparative modeling of upside opportunity, expected operating
            performance, and downside procurement exposure to support executive
            planning and board-level decision review.
          </p>
        </div>

        <div className="flex min-w-[220px] items-center justify-between gap-5 rounded-2xl border border-white/10 bg-white/[0.035] px-5 py-4 xl:flex-col xl:items-end xl:gap-1">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-gold xl:text-right">
              Scenario status
            </p>

            <p className="mt-1 text-xs font-semibold text-nexus-muted xl:text-right">
              Current modeling position
            </p>
          </div>

          <p className="max-w-[180px] shrink-0 break-words text-right text-lg font-black leading-6 text-nexus-white [overflow-wrap:anywhere]">
            {executiveScenarioStatus}
          </p>
        </div>
      </header>

      <section
        aria-labelledby="expected-scenario-position-heading"
        className="mt-7 overflow-hidden rounded-3xl border border-blue-500/20 bg-blue-500/[0.045]"
      >
        <div className="grid min-w-0 xl:grid-cols-[300px_minmax(0,1fr)]">
          <div className="border-b border-white/10 p-5 sm:p-6 xl:border-b-0 xl:border-r">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-300">
              Primary planning case
            </p>

            <h3
              id="expected-scenario-position-heading"
              className="mt-3 text-xl font-black tracking-tight text-nexus-white sm:text-2xl"
            >
              Expected Operating Position
            </h3>

            <p className="mt-3 text-xs font-semibold leading-6 text-nexus-muted">
              Central scenario used as the principal basis for executive
              planning and board discussion.
            </p>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/10 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.17em] text-nexus-muted">
                Forecast confidence
              </p>

              <p className="mt-2 break-words text-sm font-black leading-6 text-nexus-white [overflow-wrap:anywhere]">
                {forecastConfidenceLevel}
              </p>
            </div>
          </div>

          <div className="min-w-0 p-5 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted">
              Expected-case scenario
            </p>

            <p className="mt-4 break-words text-lg font-bold leading-8 text-nexus-white [overflow-wrap:anywhere] sm:text-xl sm:leading-9">
              {expectedCaseScenario}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <ScenarioSignal
                label="Modeling Status"
                value={executiveScenarioStatus}
              />

              <ScenarioSignal
                label="Decision Confidence"
                value={forecastConfidenceLevel}
              />
            </div>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="scenario-comparison-heading"
        className="mt-7 min-w-0"
      >
        <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-nexus-gold">
              Scenario comparison
            </p>

            <h3
              id="scenario-comparison-heading"
              className="mt-2 text-lg font-black tracking-tight text-nexus-white sm:text-xl"
            >
              Executive Planning Range
            </h3>
          </div>

          <p className="max-w-xl text-xs font-semibold leading-5 text-nexus-muted sm:text-right">
            Scenario ordering remains fixed as upside, expected operating case,
            and downside risk for direct executive comparison.
          </p>
        </div>

        <div className="mt-5 grid min-w-0 gap-5 md:grid-cols-3">
          <ScenarioCard
            position="01"
            title="Best Case"
            subtitle="Upside opportunity"
            value={bestCaseScenario}
            tone="success"
          />

          <ScenarioCard
            position="02"
            title="Expected Case"
            subtitle="Planning baseline"
            value={expectedCaseScenario}
            tone="info"
            primary
          />

          <ScenarioCard
            position="03"
            title="Risk Case"
            subtitle="Downside exposure"
            value={riskCaseScenario}
            tone="risk"
          />
        </div>
      </section>

      <section
        aria-labelledby="forecast-confidence-heading"
        className="mt-7 min-w-0 rounded-3xl border border-white/10 bg-white/[0.025] p-5 sm:p-6"
      >
        <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-nexus-gold">
              Decision assurance
            </p>

            <h3
              id="forecast-confidence-heading"
              className="mt-2 text-lg font-black tracking-tight text-nexus-white sm:text-xl"
            >
              Forecast Confidence Matrix
            </h3>
          </div>

          <p className="max-w-xl text-xs font-semibold leading-5 text-nexus-muted sm:text-right">
            Confidence and scenario status should be reviewed together before
            executive or board-level decisions are finalized.
          </p>
        </div>

        <div className="mt-5 grid min-w-0 gap-4 md:grid-cols-2">
          <ConfidenceBlock
            label="Forecast Confidence"
            value={forecastConfidenceLevel}
            description="Current confidence level supporting the scenario range and expected planning case."
          />

          <ConfidenceBlock
            label="Scenario Status"
            value={executiveScenarioStatus}
            description="Current readiness and governance position of the executive scenario model."
          />
        </div>

        <div className="mt-5 rounded-2xl border border-nexus-gold/15 bg-nexus-gold/[0.035] p-4 sm:p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.17em] text-nexus-gold">
            Executive decision guidance
          </p>

          <p className="mt-3 text-sm font-semibold leading-7 text-nexus-muted">
            Scenario intelligence compares upside opportunity, expected
            operating performance, and downside risk before executive and
            board-level decisions are made.
          </p>
        </div>
      </section>
    </ExecutivePanel>
  );
}

type ScenarioTone = "success" | "info" | "risk";

function ScenarioCard({
  position,
  title,
  subtitle,
  value,
  tone,
  primary = false,
}: {
  position: string;
  title: string;
  subtitle: string;
  value: string;
  tone: ScenarioTone;
  primary?: boolean;
}) {
  const styles = {
    success: {
      border: "border-emerald-500/25",
      bg: "bg-emerald-500/[0.045]",
      text: "text-emerald-300",
      badge: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
    },
    info: {
      border: "border-blue-500/25",
      bg: "bg-blue-500/[0.045]",
      text: "text-blue-300",
      badge: "border-blue-500/25 bg-blue-500/10 text-blue-300",
    },
    risk: {
      border: "border-red-500/25",
      bg: "bg-red-500/[0.045]",
      text: "text-red-300",
      badge: "border-red-500/25 bg-red-500/10 text-red-300",
    },
  };

  const style = styles[tone];

  return (
    <article
      className={`flex min-w-0 flex-col rounded-3xl border p-5 sm:p-6 ${
        style.border
      } ${style.bg} ${primary ? "ring-1 ring-blue-300/10" : ""}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-[10px] font-black ${style.badge}`}
          >
            {position}
          </span>

          <div className="min-w-0">
            <p
              className={`text-[10px] font-black uppercase tracking-[0.17em] ${style.text}`}
            >
              {title}
            </p>

            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-nexus-muted">
              {subtitle}
            </p>
          </div>
        </div>

        {primary ? (
          <span className="shrink-0 rounded-full border border-blue-300/15 bg-blue-300/[0.07] px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-blue-200">
            Baseline
          </span>
        ) : null}
      </div>

      <p className="mt-5 flex-1 break-words text-sm font-semibold leading-7 text-nexus-muted [overflow-wrap:anywhere]">
        {value}
      </p>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-nexus-muted">
          Strategic scenario
        </p>

        <p
          className={`text-[10px] font-black uppercase tracking-[0.14em] ${style.text}`}
        >
          Executive review
        </p>
      </div>
    </article>
  );
}

function ScenarioSignal({
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

function ConfidenceBlock({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <article className="min-w-0 rounded-2xl border border-white/10 bg-black/10 p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.17em] text-nexus-muted">
        {label}
      </p>

      <p className="mt-3 break-words text-2xl font-black leading-8 text-nexus-white [overflow-wrap:anywhere]">
        {value}
      </p>

      <p className="mt-3 text-xs font-semibold leading-6 text-nexus-muted">
        {description}
      </p>
    </article>
  );
}
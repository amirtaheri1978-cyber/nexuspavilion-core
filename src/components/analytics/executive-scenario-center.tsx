import { ExecutivePanel } from "@/components/executive/executive-panel";

type ExecutiveScenarioCenterProps = {
  bestCaseScenario: string;
  expectedCaseScenario: string;
  riskCaseScenario: string;
  forecastConfidenceLevel: string;
  executiveScenarioStatus: string;
};

/**
 * Legacy prop names are retained to avoid widening the analytics composition
 * contract. The supplied values now represent observed historical evidence and
 * decision-evidence readiness, not modeled future scenarios.
 */
export function ExecutiveScenarioCenter({
  bestCaseScenario: rfqCreationContext,
  expectedCaseScenario: supplierParticipationContext,
  riskCaseScenario: submittedQuoteValueContext,
  forecastConfidenceLevel: decisionEvidenceReadiness,
  executiveScenarioStatus: historicalEvidenceStatus,
}: ExecutiveScenarioCenterProps) {
  return (
    <ExecutivePanel
      aria-labelledby="executive-historical-context-heading"
      padding="lg"
    >
      <header className="grid min-w-0 gap-6 border-b border-white/10 pb-7 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-nexus-gold sm:text-xs">
              Historical Evidence Context
            </p>

            <span
              aria-hidden="true"
              className="hidden h-1 w-1 rounded-full bg-white/20 sm:block"
            />

            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted">
              Cross-domain pattern interpretation
            </p>
          </div>

          <h2
            id="executive-historical-context-heading"
            className="mt-4 max-w-5xl text-3xl font-black leading-[1.08] tracking-tight text-nexus-white sm:text-4xl lg:text-5xl"
          >
            Observed Procurement Pattern Context
          </h2>

          <p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-nexus-muted sm:text-base">
            Recorded sourcing, supplier-participation, and commercial activity
            are presented as historical evidence for executive interpretation.
            This section does not model future outcomes or outcome probability.
          </p>
        </div>

        <div className="flex min-w-[220px] items-center justify-between gap-5 rounded-2xl border border-white/10 bg-white/[0.035] px-5 py-4 xl:flex-col xl:items-end xl:gap-1">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-gold xl:text-right">
              Historical evidence status
            </p>

            <p className="mt-1 text-xs font-semibold text-nexus-muted xl:text-right">
              Recorded comparison availability
            </p>
          </div>

          <p className="max-w-[180px] shrink-0 break-words text-right text-lg font-black leading-6 text-nexus-white [overflow-wrap:anywhere]">
            {historicalEvidenceStatus}
          </p>
        </div>
      </header>

      <section
        aria-labelledby="rfq-historical-context-heading"
        className="mt-7 overflow-hidden rounded-3xl border border-blue-500/20 bg-blue-500/[0.045]"
      >
        <div className="grid min-w-0 xl:grid-cols-[300px_minmax(0,1fr)]">
          <div className="border-b border-white/10 p-5 sm:p-6 xl:border-b-0 xl:border-r">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-300">
              Recorded sourcing activity
            </p>

            <h3
              id="rfq-historical-context-heading"
              className="mt-3 text-xl font-black tracking-tight text-nexus-white sm:text-2xl"
            >
              RFQ Creation Pattern
            </h3>

            <p className="mt-3 text-xs font-semibold leading-6 text-nexus-muted">
              Observed RFQ creation volume in the current comparison window
              relative to the immediately preceding window.
            </p>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/10 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.17em] text-nexus-muted">
                Decision evidence readiness
              </p>

              <p className="mt-2 break-words text-sm font-black leading-6 text-nexus-white [overflow-wrap:anywhere]">
                {decisionEvidenceReadiness}
              </p>
            </div>
          </div>

          <div className="min-w-0 p-5 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted">
              RFQ activity evidence
            </p>

            <p className="mt-4 break-words text-lg font-bold leading-8 text-nexus-white [overflow-wrap:anywhere] sm:text-xl sm:leading-9">
              {rfqCreationContext}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <EvidenceSignal
                label="Evidence Status"
                value={historicalEvidenceStatus}
              />

              <EvidenceSignal
                label="Decision Readiness"
                value={decisionEvidenceReadiness}
              />
            </div>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="historical-comparison-heading"
        className="mt-7 min-w-0"
      >
        <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-nexus-gold">
              Historical comparison
            </p>

            <h3
              id="historical-comparison-heading"
              className="mt-2 text-lg font-black tracking-tight text-nexus-white sm:text-xl"
            >
              Cross-Domain Recorded Patterns
            </h3>
          </div>

          <p className="max-w-xl text-xs font-semibold leading-5 text-nexus-muted sm:text-right">
            The comparison remains descriptive: it shows recorded changes and
            does not infer future performance.
          </p>
        </div>

        <div className="mt-5 grid min-w-0 gap-5 md:grid-cols-3">
          <HistoricalEvidenceCard
            position="01"
            title="RFQ Creation"
            subtitle="Sourcing activity"
            value={rfqCreationContext}
            tone="info"
          />

          <HistoricalEvidenceCard
            position="02"
            title="Supplier Participation"
            subtitle="Distinct submitting companies"
            value={supplierParticipationContext}
            tone="neutral"
          />

          <HistoricalEvidenceCard
            position="03"
            title="Submitted Quote Value"
            subtitle="Recorded commercial activity"
            value={submittedQuoteValueContext}
            tone="neutral"
          />
        </div>
      </section>

      <section
        aria-labelledby="historical-evidence-governance-heading"
        className="mt-7 min-w-0 rounded-3xl border border-white/10 bg-white/[0.025] p-5 sm:p-6"
      >
        <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-nexus-gold">
              Decision governance
            </p>

            <h3
              id="historical-evidence-governance-heading"
              className="mt-2 text-lg font-black tracking-tight text-nexus-white sm:text-xl"
            >
              Evidence Readiness Context
            </h3>
          </div>

          <p className="max-w-xl text-xs font-semibold leading-5 text-nexus-muted sm:text-right">
            Historical movement and decision-evidence readiness should be
            reviewed together before executive or board action is finalized.
          </p>
        </div>

        <div className="mt-5 grid min-w-0 gap-4 md:grid-cols-2">
          <ContextBlock
            label="Decision Evidence Readiness"
            value={decisionEvidenceReadiness}
            description="Current readiness of the evidence base supporting executive interpretation."
          />

          <ContextBlock
            label="Historical Evidence Status"
            value={historicalEvidenceStatus}
            description="Availability of observed activity across the comparison windows."
          />
        </div>

        <div className="mt-5 rounded-2xl border border-nexus-gold/15 bg-nexus-gold/[0.035] p-4 sm:p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.17em] text-nexus-gold">
            Executive decision guidance
          </p>

          <p className="mt-3 text-sm font-semibold leading-7 text-nexus-muted">
            Use historical patterns to understand recorded movement, then apply
            delegated authority, financial validation, supplier due diligence,
            and contractual review before material decisions are made.
          </p>
        </div>
      </section>
    </ExecutivePanel>
  );
}

type EvidenceTone = "info" | "neutral";

function HistoricalEvidenceCard({
  position,
  title,
  subtitle,
  value,
  tone,
}: {
  position: string;
  title: string;
  subtitle: string;
  value: string;
  tone: EvidenceTone;
}) {
  const styles = {
    info: {
      border: "border-blue-500/25",
      bg: "bg-blue-500/[0.045]",
      text: "text-blue-300",
      badge: "border-blue-500/25 bg-blue-500/10 text-blue-300",
    },
    neutral: {
      border: "border-white/10",
      bg: "bg-white/[0.035]",
      text: "text-nexus-gold",
      badge: "border-nexus-gold/20 bg-nexus-gold/[0.07] text-nexus-gold",
    },
  };

  const style = styles[tone];

  return (
    <article
      className={`flex min-w-0 flex-col rounded-3xl border p-5 sm:p-6 ${style.border} ${style.bg}`}
    >
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

      <p className="mt-5 flex-1 break-words text-sm font-semibold leading-7 text-nexus-muted [overflow-wrap:anywhere]">
        {value}
      </p>

      <div className="mt-5 border-t border-white/10 pt-4">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-nexus-muted">
          Recorded evidence
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

function ContextBlock({
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

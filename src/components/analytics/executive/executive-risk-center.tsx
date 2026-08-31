import { ExecutivePanel } from "@/components/executive/executive-panel";

type ExecutiveRiskCenterProps = {
  procurementRiskIndex: number;
  supplierDependencyRisk: string;
  concentrationLevel: string;
  procurementMaturityScore: number;
  decisionSupportReadinessScore: number;
};

type RiskSignalTone = "risk" | "gold" | "cyan" | "confidence";

export default function ExecutiveRiskCenter({
  procurementRiskIndex,
  supplierDependencyRisk,
  concentrationLevel,
  procurementMaturityScore,
  decisionSupportReadinessScore,
}: ExecutiveRiskCenterProps) {
  return (
    <ExecutivePanel padding="lg">
      <section aria-labelledby="enterprise-risk-center-title">
        <header className="border-b border-white/10 pb-5">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-rose-200">
              Executive Risk Intelligence
            </p>

            <span
              aria-hidden="true"
              className="hidden h-1 w-1 rounded-full bg-white/20 sm:block"
            />

            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Enterprise exposure posture
            </p>
          </div>

          <div className="mt-3 grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
            <div className="min-w-0">
              <h2
                id="enterprise-risk-center-title"
                className="text-2xl font-semibold tracking-tight text-nexus-white sm:text-3xl"
              >
                Enterprise Risk Center
              </h2>

              <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-slate-400">
                Consolidated executive view of procurement exposure, supplier
                dependency, vendor concentration, organizational maturity, and
                readiness of the underlying decision evidence.
              </p>
            </div>

            <div className="flex items-center gap-4 rounded-2xl border border-rose-300/15 bg-rose-400/[0.045] px-4 py-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-200">
                  Procurement Risk Index
                </p>

                <p className="mt-1 text-2xl font-semibold tabular-nums text-white">
                  {procurementRiskIndex}/100
                </p>
              </div>

              <span aria-hidden="true" className="h-10 w-px bg-white/10" />

              <div className="max-w-44">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Risk posture
                </p>

                <p className="mt-1 text-sm font-semibold leading-5 text-slate-200">
                  Enterprise procurement exposure
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="pt-5">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
            <section
              aria-labelledby="critical-exposure-title"
              className="relative overflow-hidden rounded-2xl border border-rose-300/15 bg-rose-400/[0.035] p-5 sm:p-6"
            >
              <div
                aria-hidden="true"
                className="absolute inset-y-0 left-0 w-0.5 bg-rose-300"
              />

              <div className="pl-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-200">
                  Primary Risk Position
                </p>

                <h3
                  id="critical-exposure-title"
                  className="mt-2 text-xl font-semibold tracking-tight text-white"
                >
                  Critical enterprise exposure
                </h3>

                <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-slate-400">
                  The procurement risk index represents the consolidated
                  exposure position across supplier dependency, concentration,
                  operational maturity, and decision-evidence conditions.
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <RiskSignal
                    label="Supplier Dependency"
                    value={supplierDependencyRisk}
                    description="Exposure created by reliance on critical suppliers or constrained alternatives."
                    tone="risk"
                  />

                  <RiskSignal
                    label="Vendor Concentration"
                    value={concentrationLevel}
                    description="Degree of commercial and operational exposure concentrated across the vendor base."
                    tone="gold"
                  />
                </div>
              </div>
            </section>

            <section
              aria-labelledby="risk-resilience-title"
              className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-6"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9BE8F8]">
                Risk Resilience
              </p>

              <h3
                id="risk-resilience-title"
                className="mt-2 text-xl font-semibold tracking-tight text-white"
              >
                Organizational response capacity
              </h3>

              <p className="mt-3 text-sm font-medium leading-7 text-slate-400">
                Maturity and evidence readiness indicate how effectively
                the organization can interpret exposure and execute an
                appropriate response.
              </p>

              <div className="mt-5 space-y-3">
                <RiskSignal
                  label="Procurement Maturity"
                  value={`${procurementMaturityScore}/100`}
                  description="Organizational capability to govern, mitigate, and respond to procurement risk."
                  tone="cyan"
                />

                <RiskSignal
                  label="Decision Evidence Readiness"
                  value={`${decisionSupportReadinessScore}/100`}
                  description="Readiness of the recorded evidence supporting risk interpretation and executive response."
                  tone="confidence"
                />
              </div>
            </section>
          </div>

          <section
            aria-label="Executive risk interpretation"
            className="mt-4 grid gap-4 rounded-2xl border border-white/10 bg-[#07111F]/55 p-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start sm:p-5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-300/15 bg-rose-400/[0.06]">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 rounded-full bg-rose-300 shadow-[0_0_16px_rgba(253,164,175,0.45)]"
              />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Executive Interpretation
              </p>

              <p className="mt-2 text-sm font-medium leading-7 text-slate-300">
                Risk exposure should be assessed alongside supplier dependency,
                vendor concentration, procurement maturity, and decision-evidence readiness.
                These signals collectively determine whether the current
                posture requires monitoring, mitigation, or executive
                intervention.
              </p>
            </div>
          </section>
        </div>
      </section>
    </ExecutivePanel>
  );
}

function RiskSignal({
  label,
  value,
  description,
  tone,
}: {
  label: string;
  value: string;
  description: string;
  tone: RiskSignalTone;
}) {
  const toneClasses: Record<
    RiskSignalTone,
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
    gold: {
      border: "border-[#C8A646]/18",
      background: "bg-[#C8A646]/[0.04]",
      label: "text-[#E4C768]",
      indicator: "bg-[#C8A646]",
    },
    cyan: {
      border: "border-[#2CC4E8]/18",
      background: "bg-[#2CC4E8]/[0.04]",
      label: "text-[#9BE8F8]",
      indicator: "bg-[#2CC4E8]",
    },
    confidence: {
      border: "border-emerald-300/15",
      background: "bg-emerald-400/[0.035]",
      label: "text-emerald-200",
      indicator: "bg-emerald-300",
    },
  };

  const classes = toneClasses[tone];

  return (
    <article
      className={`relative min-w-0 overflow-hidden rounded-xl border ${classes.border} ${classes.background} px-4 py-4`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 w-0.5 ${classes.indicator}`}
      />

      <div className="pl-1">
        <p
          className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${classes.label}`}
        >
          {label}
        </p>

        <p className="mt-2 break-words text-lg font-semibold leading-6 text-white [overflow-wrap:anywhere]">
          {value}
        </p>

        <p className="mt-2 text-xs font-medium leading-5 text-slate-500">
          {description}
        </p>
      </div>
    </article>
  );
}

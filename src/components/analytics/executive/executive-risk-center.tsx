import { ExecutivePanel } from "@/components/executive/executive-panel";
import type { RiskComplianceEvidence } from "@/lib/analytics/executive/risk-intelligence";

type ExecutiveRiskCenterProps = {
  riskComplianceEvidence: RiskComplianceEvidence;
  procurementMaturityScore: number;
  decisionSupportReadinessScore: number;
};

type RiskSignalTone = "risk" | "gold" | "cyan" | "confidence" | "neutral";

export default function ExecutiveRiskCenter({
  riskComplianceEvidence,
  procurementMaturityScore,
  decisionSupportReadinessScore,
}: ExecutiveRiskCenterProps) {
  const { compliance, rfq, supplier } = riskComplianceEvidence;

  return (
    <ExecutivePanel padding="lg">
      <section aria-labelledby="enterprise-risk-center-title">
        <header className="border-b border-white/10 pb-5">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-rose-200">
              Risk &amp; Compliance Evidence
            </p>

            <span
              aria-hidden="true"
              className="hidden h-1 w-1 rounded-full bg-white/20 sm:block"
            />

            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Company and RFQ evidence review
            </p>
          </div>

          <div className="mt-3 grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
            <div className="min-w-0">
              <h2
                id="enterprise-risk-center-title"
                className="text-2xl font-semibold tracking-tight text-nexus-white sm:text-3xl"
              >
                Explainable Risk &amp; Compliance Evidence
              </h2>

              <p className="mt-3 max-w-4xl text-sm font-medium leading-7 text-slate-400">
                Company compliance records remain self-declared. RFQ and supplier
                indicators are derived only from company-scoped procurement evidence
                available to the current workspace membership. This view does not
                produce a universal enterprise risk rating, probability, regulatory
                determination, or third-party compliance verification.
              </p>
            </div>

            <EvidenceBadge state={riskComplianceEvidence.state}>
              {riskComplianceEvidence.stateLabel}
            </EvidenceBadge>
          </div>
        </header>

        <div className="pt-5">
          <section className="rounded-2xl border border-white/10 bg-[#07111F]/55 p-5 sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Executive Interpretation
            </p>
            <p className="mt-2 max-w-5xl text-sm font-medium leading-7 text-slate-300">
              {riskComplianceEvidence.narrative}
            </p>
          </section>

          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <EvidenceGroup
              eyebrow="Company Workspace Compliance"
              title="Self-Declared Compliance Standing"
              badge={compliance.evidenceLabel}
              description={compliance.summary}
            >
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <RiskSignal
                  label="Recorded Compliance"
                  value={String(compliance.recordCount)}
                  description="Insurance, workers' compensation, and safety records maintained by the organization."
                  tone="gold"
                />
                <RiskSignal
                  label="Expired Records"
                  value={String(compliance.expiredCount)}
                  description="Self-declared records whose recorded expiry date has passed."
                  tone={compliance.expiredCount > 0 ? "risk" : "neutral"}
                />
                <RiskSignal
                  label="Expiring Soon"
                  value={String(compliance.expiringSoonCount)}
                  description="Self-declared records within the existing 30-day expiring-soon window."
                  tone={compliance.expiringSoonCount > 0 ? "risk" : "neutral"}
                />
                <RiskSignal
                  label="No Expiry Recorded"
                  value={String(compliance.noExpiryCount)}
                  description="Records without a recorded expiry date; this is an evidence limitation, not an expiry conclusion."
                  tone="neutral"
                />
              </div>
            </EvidenceGroup>

            <EvidenceGroup
              eyebrow="RFQ Procurement Risk"
              title="Observed RFQ Review Indicators"
              badge={rfq.evidenceLabel}
              description={rfq.summary}
            >
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <RiskSignal
                  label="Company-Scoped RFQs"
                  value={String(rfq.totalRfqs)}
                  description="RFQs returned through the current active company membership scope."
                  tone="cyan"
                />
                <RiskSignal
                  label="Active RFQs"
                  value={String(rfq.activeRfqs)}
                  description="Open or published RFQs in the current company-scoped dataset."
                  tone="neutral"
                />
                <RiskSignal
                  label="Classification Gaps"
                  value={String(rfq.incompleteClassificationRfqs)}
                  description="RFQs missing procurement scope, sourcing method, or contract framework evidence."
                  tone={rfq.incompleteClassificationRfqs > 0 ? "risk" : "neutral"}
                />
                <RiskSignal
                  label="Past Recorded Deadline"
                  value={String(rfq.overdueOpenRfqs)}
                  description="Active RFQs whose recorded deadline is earlier than the current review date."
                  tone={rfq.overdueOpenRfqs > 0 ? "risk" : "neutral"}
                />
              </div>
            </EvidenceGroup>

            <EvidenceGroup
              eyebrow="Supplier Response Evidence"
              title="Authorized Participation Coverage"
              badge={supplier.evidenceLabel}
              description={supplier.summary}
            >
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <RiskSignal
                  label="Distinct Suppliers"
                  value={
                    supplier.evidenceState === "access-restricted"
                      ? "Restricted"
                      : String(supplier.distinctSuppliers)
                  }
                  description="Distinct submitting organization IDs in authorized quotation history."
                  tone="cyan"
                />
                <RiskSignal
                  label="RFQs With Quote Evidence"
                  value={
                    supplier.evidenceState === "access-restricted"
                      ? "Restricted"
                      : String(supplier.rfqsWithQuoteEvidence)
                  }
                  description="RFQs represented by at least one authorized submitted quotation row."
                  tone="neutral"
                />
                <RiskSignal
                  label="Active RFQs Without Quote Evidence"
                  value={
                    supplier.evidenceState === "access-restricted"
                      ? "Restricted"
                      : String(supplier.activeRfqsWithoutQuoteEvidence)
                  }
                  description="Active RFQs without submitted quotation evidence in the authorized analytics dataset."
                  tone={
                    supplier.activeRfqsWithoutQuoteEvidence > 0
                      ? "risk"
                      : "neutral"
                  }
                />
              </div>
            </EvidenceGroup>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
            <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-200">
                Observed Review Indicators
              </p>

              {riskComplianceEvidence.indicators.length > 0 ? (
                <ul className="mt-4 space-y-3">
                  {riskComplianceEvidence.indicators.slice(0, 5).map((indicator) => (
                    <li
                      key={indicator}
                      className="rounded-xl border border-rose-300/10 bg-rose-400/[0.025] px-4 py-3 text-sm font-medium leading-6 text-slate-300"
                    >
                      {indicator}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm font-medium leading-7 text-slate-400">
                  No observed review indicator is supported by the current evidence.
                </p>
              )}
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9BE8F8]">
                Evidence &amp; Governance Context
              </p>

              <div className="mt-4 space-y-3">
                <RiskSignal
                  label="Procurement Maturity"
                  value={`${procurementMaturityScore}/100`}
                  description="Internal operating-maturity context; not a compliance or risk certification."
                  tone="cyan"
                />
                <RiskSignal
                  label="Decision Evidence Readiness"
                  value={`${decisionSupportReadinessScore}/100`}
                  description="Readiness of recorded evidence supporting executive interpretation."
                  tone="confidence"
                />
              </div>

              {riskComplianceEvidence.limitations.length > 0 ? (
                <div className="mt-4 rounded-xl border border-white/10 bg-black/10 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Evidence limitations
                  </p>
                  <ul className="mt-3 space-y-2 text-xs font-medium leading-5 text-slate-400">
                    {riskComplianceEvidence.limitations.slice(0, 4).map((limitation) => (
                      <li key={limitation}>• {limitation}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          </div>
        </div>
      </section>
    </ExecutivePanel>
  );
}

function EvidenceGroup({
  eyebrow,
  title,
  badge,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  badge: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {eyebrow}
          </p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-white">
            {title}
          </h3>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300">
          {badge}
        </span>
      </div>
      <p className="mt-3 text-sm font-medium leading-7 text-slate-400">
        {description}
      </p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function EvidenceBadge({
  state,
  children,
}: {
  state: RiskComplianceEvidence["state"];
  children: React.ReactNode;
}) {
  const className =
    state === "available"
      ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-200"
      : state === "limited"
        ? "border-amber-300/20 bg-amber-400/10 text-amber-200"
        : "border-orange-300/20 bg-orange-400/10 text-orange-200";

  return (
    <span
      className={`inline-flex rounded-full border px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] ${className}`}
    >
      {children}
    </span>
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
    neutral: {
      border: "border-white/10",
      background: "bg-white/[0.025]",
      label: "text-slate-400",
      indicator: "bg-slate-500",
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

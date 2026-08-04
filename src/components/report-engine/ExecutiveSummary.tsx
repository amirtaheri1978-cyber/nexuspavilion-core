import { ReportFooter } from "./ReportFooter";
import { ReportHeader } from "./ReportHeader";

type ExecutiveSummaryProps = {
  companyName: string;
  generatedAt: string;
  procurementHealth: number;
  opportunityValue: string;
  riskLevel: string;
  confidence: string;
  findings: string[];
  risks: string[];
  actions: string[];
  recommendation: string;
};

export function ExecutiveSummary({
  companyName,
  generatedAt,
  procurementHealth,
  opportunityValue,
  riskLevel,
  confidence,
  findings,
  risks,
  actions,
  recommendation,
}: ExecutiveSummaryProps) {
  return (
    <section className="report-page report-executive-summary">
      <div className="report-page__frame">
        <ReportHeader companyName={companyName} />

        <div className="report-page__body">
          <p className="report-kicker">
            Executive Summary
          </p>

          <h1 className="report-page__title">
            Procurement Intelligence Overview
          </h1>

          <p className="report-page__lead">
            This summary provides the executive board with a consolidated view
            of procurement performance, commercial opportunity, enterprise
            risk, supplier resilience, and AI-supported decision readiness.
          </p>

          <div className="my-9 h-px bg-slate-200" />

          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            <SummaryMetric
              label="Overall Procurement Health"
              value={`${procurementHealth}/100`}
            />

            <SummaryMetric
              label="Commercial Opportunity"
              value={opportunityValue}
            />

            <SummaryMetric label="Enterprise Risk" value={riskLevel} />

            <SummaryMetric
              label="Decision Confidence"
              value={confidence}
            />
          </div>

          <div className="my-9 h-px bg-slate-200" />

          <div className="grid gap-8 lg:grid-cols-2">
            <SummaryList
              title="Key Executive Findings"
              items={findings}
              bulletColor="bg-emerald-500"
            />

            <SummaryList
              title="Executive Risks"
              items={risks}
              bulletColor="bg-red-500"
            />
          </div>

          <div className="my-9 h-px bg-slate-200" />

          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#C8A646]">
              Recommended Board Actions
            </p>

            <div className="mt-5 grid gap-3">
              {actions.map((action, index) => (
                <div
                  key={`${index}-${action}`}
                  className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#C8A646] text-sm font-black text-white">
                    {index + 1}
                  </div>

                  <p className="text-sm font-semibold leading-6 text-slate-800">
                    {action}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="my-9 h-px bg-slate-200" />

          <div className="rounded-3xl border border-[#C8A646]/25 bg-[#FFF9E8] p-6">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-[#C8A646]">
              AI Executive Recommendation
            </p>

            <p className="mt-4 text-base font-semibold leading-8 text-slate-800">
              {recommendation}
            </p>
          </div>
        </div>

        <ReportFooter generatedAt={generatedAt} />
      </div>
    </section>
  );
}

function SummaryMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="break-inside-avoid rounded-3xl border border-slate-200 bg-white p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>

      <p className="mt-4 break-words text-3xl font-black tracking-tight text-slate-950">
        {value}
      </p>
    </div>
  );
}

function SummaryList({
  title,
  items,
  bulletColor,
}: {
  title: string;
  items: string[];
  bulletColor: string;
}) {
  const visibleItems = items.filter(Boolean).slice(0, 3);

  return (
    <div className="break-inside-avoid">
      <p className="text-xs font-black uppercase tracking-[0.24em] text-[#C8A646]">
        {title}
      </p>

      <div className="mt-5 space-y-4">
        {visibleItems.map((item, index) => (
          <div
            key={`${index}-${item}`}
            className="flex items-start gap-4"
          >
            <span
              aria-hidden="true"
              className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${bulletColor}`}
            />

            <p className="text-sm font-semibold leading-6 text-slate-700">
              {item}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

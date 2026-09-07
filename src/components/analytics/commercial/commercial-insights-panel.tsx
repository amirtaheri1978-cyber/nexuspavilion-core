import Link from "next/link";

import { ExecutivePanel } from "@/components/executive/executive-panel";
import type {
  CommercialEvidenceState,
  CommercialInsights,
} from "@/lib/analytics/commercial/commercial-insights";

type CommercialInsightsPanelProps = {
  insights: CommercialInsights;
};

function formatCurrency(value: number | null): string {
  return value == null
    ? "Insufficient Data"
    : `$${value.toLocaleString()}`;
}

function formatPercentage(value: number | null): string {
  return value == null ? "Insufficient Data" : `${value}%`;
}

function getStateLabel(state: CommercialEvidenceState): string {
  if (state === "available") {
    return "Available";
  }

  if (state === "access-restricted") {
    return "Access Restricted";
  }

  if (state === "policy-locked") {
    return "Policy Locked";
  }

  return "Insufficient Data";
}

function getStateClasses(state: CommercialEvidenceState): string {
  if (state === "available") {
    return "border-emerald-300/20 bg-emerald-400/[0.06] text-emerald-200";
  }

  if (state === "access-restricted") {
    return "border-red-300/20 bg-red-400/[0.055] text-red-200";
  }

  if (state === "policy-locked") {
    return "border-amber-300/20 bg-amber-400/[0.055] text-amber-200";
  }

  return "border-white/10 bg-white/[0.04] text-slate-300";
}

export function CommercialInsightsPanel({
  insights,
}: CommercialInsightsPanelProps) {
  const evidenceRows = insights.rfqEvidence.slice(0, 8);
  const opportunityValue =
    insights.state === "available"
      ? formatCurrency(insights.estimatedOpportunity)
      : getStateLabel(insights.state);

  return (
    <ExecutivePanel id="commercial-evidence" padding="lg">
      <div className="flex min-w-0 flex-col gap-5 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-nexus-gold">
            Commercial Evidence
          </p>

          <h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
            Permission-Safe Commercial Intelligence
          </h2>

          <p className="mt-3 max-w-4xl text-sm font-semibold leading-6 text-slate-400">
            Visible commercial evidence only. Pricing is compared within the
            same RFQ after the applicable commercial-access policy allows the
            current membership to see quotation rows.
          </p>
        </div>

        <span
          className={[
            "inline-flex w-fit items-center rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em]",
            getStateClasses(insights.state),
          ].join(" ")}
        >
          {getStateLabel(insights.state)}
        </span>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <EvidenceMetric
          label="Observed Quotation Opportunity"
          value={opportunityValue}
          context={
            insights.state === "available"
              ? `${insights.comparableRfqCount} comparable RFQ${insights.comparableRfqCount === 1 ? "" : "s"}`
              : "Commercial evidence gate"
          }
        />

        <EvidenceMetric
          label="Visible Positive Quotes"
          value={
            insights.state === "access-restricted" ||
            insights.state === "policy-locked"
              ? getStateLabel(insights.state)
              : String(insights.visiblePositiveQuoteCount)
          }
          context="Positive visible quotation amounts only"
        />

        <EvidenceMetric
          label="Unlocked RFQs"
          value={`${insights.unlockedRfqCount}`}
          context={`${insights.lockedRfqCount} policy-locked RFQ${insights.lockedRfqCount === 1 ? "" : "s"}`}
        />

        <EvidenceMetric
          label="High-Deviation Review"
          value={
            insights.state === "available"
              ? String(insights.highDeviationRfqCount)
              : getStateLabel(insights.state)
          }
          context={`Internal review threshold: ±${insights.reviewThresholdPercentage}% from within-RFQ median`}
        />
      </div>

      <div
        className={[
          "mt-5 rounded-2xl border p-4 text-sm font-semibold leading-6",
          getStateClasses(insights.state),
        ].join(" ")}
      >
        {insights.limitation}
      </div>

      {evidenceRows.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[960px] text-left">
            <thead className="bg-[#07111F] text-white">
              <tr>
                <th className="px-4 py-3 text-xs">RFQ</th>
                <th className="px-4 py-3 text-xs">Positive Quotes</th>
                <th className="px-4 py-3 text-xs">Average</th>
                <th className="px-4 py-3 text-xs">Lowest</th>
                <th className="px-4 py-3 text-xs">Bid Spread</th>
                <th className="px-4 py-3 text-xs">Max Median Deviation</th>
                <th className="px-4 py-3 text-xs">Review Signal</th>
              </tr>
            </thead>

            <tbody className="bg-[#061426]/70">
              {evidenceRows.map((evidence) => (
                <tr
                  key={evidence.rfqId}
                  className="border-t border-white/10"
                >
                  <td className="px-4 py-4 font-bold text-white">
                    {evidence.sourceHref ? (
                      <Link
                        href={evidence.sourceHref}
                        className="underline-offset-4 hover:underline"
                      >
                        {evidence.title}
                      </Link>
                    ) : (
                      evidence.title
                    )}
                  </td>

                  <td className="px-4 py-4 text-slate-300">
                    {evidence.positiveQuoteCount}
                  </td>

                  <td className="px-4 py-4 text-slate-300">
                    {formatCurrency(evidence.averageQuote)}
                  </td>

                  <td className="px-4 py-4 text-slate-300">
                    {formatCurrency(evidence.lowestQuote)}
                  </td>

                  <td className="px-4 py-4 text-slate-300">
                    {formatPercentage(evidence.bidSpreadPercentage)}
                  </td>

                  <td className="px-4 py-4 text-slate-300">
                    {formatPercentage(
                      evidence.maxAbsoluteMedianDeviationPercentage,
                    )}
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={[
                        "inline-flex rounded-full border px-3 py-1 text-xs font-black",
                        evidence.highDeviationQuoteCount > 0
                          ? "border-amber-300/20 bg-amber-400/[0.06] text-amber-200"
                          : "border-emerald-300/15 bg-emerald-400/[0.05] text-emerald-200",
                      ].join(" ")}
                    >
                      {evidence.positiveQuoteCount < 3
                        ? "Insufficient Evidence"
                        : evidence.highDeviationQuoteCount > 0
                          ? `${evidence.highDeviationQuoteCount} Review`
                          : "Within Threshold"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <p className="mt-4 text-xs font-semibold leading-5 text-slate-500">
        The deviation signal is an internal deterministic review threshold. It
        is not a statistical outlier classification, external market
        benchmark, supplier approval, award recommendation, or realized
        savings measure.
      </p>
    </ExecutivePanel>
  );
}

function EvidenceMetric({
  label,
  value,
  context,
}: {
  label: string;
  value: string;
  context: string;
}) {
  return (
    <article className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.025] p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>

      <p className="mt-3 break-words text-2xl font-black tracking-tight text-white">
        {value}
      </p>

      <p className="mt-2 text-xs font-semibold leading-5 text-slate-400">
        {context}
      </p>
    </article>
  );
}

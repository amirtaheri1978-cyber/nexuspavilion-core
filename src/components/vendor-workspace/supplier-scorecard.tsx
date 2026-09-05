import { ExecutivePanel } from "@/components/executive/executive-panel";

type SupplierScorecardProps = {
  historyStatus: string;
  submittedQuotes: number;
  awardedQuotes: number;
  unsuccessfulQuotes: number;
  pendingDecisions: number;
  openRfqs: number;
  winRate: number;
  totalBidVolume: string;
  awardedRevenue: string;
  averageBid: string;
  averageAward: string;
};

export function SupplierScorecard({
  historyStatus,
  submittedQuotes,
  awardedQuotes,
  unsuccessfulQuotes,
  pendingDecisions,
  openRfqs,
  winRate,
  totalBidVolume,
  awardedRevenue,
  averageBid,
  averageAward,
}: SupplierScorecardProps) {
  return (
    <ExecutivePanel className="mt-8" padding="lg" tone="gold">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-nexus-gold">
            Supplier Quotation Record
          </p>

          <h2 className="mt-3 text-3xl font-black text-nexus-white">
            Quotation Activity and Commercial Outcomes
          </h2>

          <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-nexus-muted">
            This record reflects observable quotation activity: submissions,
            awards, unsuccessful outcomes, pending decisions, and commercial
            volume derived directly from quote history.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <SupplierEvidenceCard
              title="Submitted Quotes"
              value={String(submittedQuotes)}
              detail="Total quotations submitted"
            />

            <SupplierEvidenceCard
              title="Awarded Quotes"
              value={String(awardedQuotes)}
              detail={
                awardedQuotes > 0
                  ? `${awardedRevenue} in awarded revenue`
                  : "No awards recorded"
              }
            />

            <SupplierEvidenceCard
              title="Unsuccessful Quotes"
              value={String(unsuccessfulQuotes)}
              detail="Rejected or non-awarded quotations"
            />

            <SupplierEvidenceCard
              title="Pending Decisions"
              value={String(pendingDecisions)}
              detail="Quotations awaiting buyer review"
            />
          </div>
        </div>

        <div className="min-w-0 rounded-[32px] border border-white/10 bg-white/[0.045] p-6">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">
            Commercial Evidence
          </p>

          <h3 className="mt-3 text-2xl font-black text-nexus-white">
            Record Status and Volume
          </h3>

          <div className="mt-6 grid gap-3">
            <SupplierSignalRow label="Record Status" value={historyStatus} />

            <SupplierSignalRow
              label="Win Rate"
              value={submittedQuotes > 0 ? `${winRate}%` : "Insufficient Data"}
            />

            <SupplierSignalRow
              label="Open RFQs"
              value={String(openRfqs)}
            />

            <SupplierSignalRow
              label="Total Bid Volume"
              value={totalBidVolume}
            />

            <SupplierSignalRow
              label="Awarded Revenue"
              value={awardedRevenue}
            />

            <SupplierSignalRow
              label="Average Bid"
              value={averageBid}
            />

            <SupplierSignalRow
              label="Average Award"
              value={averageAward}
            />
          </div>
        </div>
      </div>
    </ExecutivePanel>
  );
}

function SupplierEvidenceCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="min-w-0 rounded-3xl border border-white/10 bg-white/[0.045] p-5">
      <p className="text-sm font-black text-nexus-white">{title}</p>

      <p className="mt-3 text-3xl font-black text-nexus-gold">{value}</p>

      <p className="mt-2 text-xs font-semibold leading-5 text-nexus-muted">
        {detail}
      </p>
    </div>
  );
}

function SupplierSignalRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-nexus-muted">
        {label}
      </p>

      <p className="min-w-0 break-words text-sm font-black text-nexus-white sm:text-right">
        {value}
      </p>
    </div>
  );
}

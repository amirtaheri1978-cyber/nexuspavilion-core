import { ExecutiveMetricCard } from "@/components/executive/executive-metric-card";
import { ExecutivePanel } from "@/components/executive/executive-panel";

type RFQBlindBiddingNoticeProps = {
  message: string;
  quoteCount: number;
};

type RFQGovernanceNoticeProps = {
  reservationNotice: string;
};

export function RFQBlindBiddingNotice({
  message,
  quoteCount,
}: RFQBlindBiddingNoticeProps) {
  return (
    <ExecutivePanel padding="lg" tone="gold">
      <p className="text-xs font-black uppercase tracking-[0.25em] text-nexus-gold">
        Blind Bidding Enforcement
      </p>

      <h3 className="mt-3 text-2xl font-black text-nexus-white">
        Commercial bids are locked until closing
      </h3>

      <p className="mt-3 max-w-4xl text-sm font-bold leading-7 text-nexus-muted">
        {message}
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <BlindBiddingMetric
          title="Submissions"
          value={`${quoteCount} received`}
        />

        <BlindBiddingMetric
          title="Commercial Pricing"
          value="Locked"
        />

        <BlindBiddingMetric
          title="Evaluation Room"
          value="Closed"
        />
      </div>
    </ExecutivePanel>
  );
}

export function RFQGovernanceNotice({
  reservationNotice,
}: RFQGovernanceNoticeProps) {
  return (
    <ExecutivePanel padding="lg" tone="risk">
      <ExecutivePanel variant="operational" padding="md" tone="risk">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-red-300">
          Buyer Reservation Rights
        </p>

        <p className="mt-3 max-w-4xl text-sm font-bold leading-7 text-nexus-muted">
          {reservationNotice}
        </p>
      </ExecutivePanel>

      <ExecutivePanel
        className="mt-4"
        variant="operational"
        padding="md"
        tone="gold"
      >
        <p className="text-xs font-black uppercase tracking-[0.25em] text-nexus-gold">
          Confidentiality &amp; Anti-Collusion
        </p>

        <p className="mt-3 max-w-4xl text-sm font-bold leading-7 text-nexus-muted">
          Supplier submissions are confidential. Competing suppliers cannot
          view each other’s pricing, proposal notes, validity periods, or
          commercial submission data.
        </p>
      </ExecutivePanel>
    </ExecutivePanel>
  );
}

function BlindBiddingMetric({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <ExecutiveMetricCard
      label={title}
      value={value}
      tone="gold"
    />
  );
}

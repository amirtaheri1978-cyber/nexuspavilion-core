import { ExecutiveMetricCard } from "@/components/executive/executive-metric-card";
import { SupplierCommandCenter } from "@/components/vendor-workspace/supplier-command-center";
import { SupplierDecisionSidebar } from "@/components/vendor-workspace/supplier-decision-sidebar";
import { SupplierOpportunityPipeline } from "@/components/vendor-workspace/supplier-opportunity-pipeline";
import { SupplierScorecard } from "@/components/vendor-workspace/supplier-scorecard";
import { getActiveMembershipForUserCompany } from "@/lib/auth/membership";
import { createClient } from "@/lib/supabase/server";

type RFQ = {
  id: string;
  slug: string | null;
  title: string | null;
  description: string | null;
  category: string | null;
  location: string | null;
  budget: number | string | null;
  status: string | null;
  created_at: string | null;
};

type Quote = {
  id: string;
  rfq_id: string;
  amount: number | string | null;
  timeline: string | null;
  message: string | null;
  decision: string | null;
  created_at: string | null;
};

function formatMoney(value: number | string | null | undefined) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "$0";
  }

  return `$${amount.toLocaleString()}`;
}

function getHistoryStatus(submittedQuotes: number, awardedQuoteCount: number) {
  if (submittedQuotes === 0) {
    return "Insufficient Data";
  }

  if (awardedQuoteCount === 0) {
    return "No Award History";
  }

  if (submittedQuotes < 3) {
    return "Limited Quote History";
  }

  return "Established Quote History";
}

function buildExecutiveBrief({
  submittedQuotes,
  awardedQuoteCount,
  winRate,
  awardedRevenue,
  pendingDecisions,
  unsuccessfulQuotes,
}: {
  submittedQuotes: number;
  awardedQuoteCount: number;
  winRate: number;
  awardedRevenue: number;
  pendingDecisions: number;
  unsuccessfulQuotes: number;
}) {
  if (submittedQuotes === 0) {
    return "No quotation history is on record for this supplier profile. Explore open RFQ opportunities and submit the first competitive quotation to begin building a verifiable performance record.";
  }

  if (awardedQuoteCount === 0) {
    const pendingNote =
      pendingDecisions > 0
        ? ` ${pendingDecisions} open RFQ${pendingDecisions === 1 ? "" : "s"} currently have quotations awaiting buyer decision.`
        : " Continue monitoring open opportunities and refine proposal competitiveness.";

    return `This supplier has submitted ${submittedQuotes} quotation${submittedQuotes === 1 ? "" : "s"} with no awards recorded yet.${pendingNote}`;
  }

  const parts = [
    `This supplier has submitted ${submittedQuotes} quotation${submittedQuotes === 1 ? "" : "s"}, secured ${awardedQuoteCount} award${awardedQuoteCount === 1 ? "" : "s"} (${winRate}% win rate), and generated ${formatMoney(awardedRevenue)} in awarded revenue.`,
  ];

  if (unsuccessfulQuotes > 0) {
    parts.push(
      `${unsuccessfulQuotes} quotation${unsuccessfulQuotes === 1 ? "" : "s"} were unsuccessful.`,
    );
  }

  if (pendingDecisions > 0) {
    parts.push(
      `${pendingDecisions} open RFQ${pendingDecisions === 1 ? "" : "s"} await buyer decision.`,
    );
  }

  if (submittedQuotes < 3) {
    parts.unshift("Limited quote history:");
  }

  return parts.join(" ");
}

export default async function VendorDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("company_id, role, email")
        .eq("id", user.id)
        .single()
    : { data: null };

  const activeMembership =
    user && profile?.company_id
      ? await getActiveMembershipForUserCompany(
          supabase,
          user.id,
          profile.company_id,
        )
      : null;

  const companyId = activeMembership?.companyId ?? null;

  const { data: quotes } = companyId
    ? await supabase
        .from("quotes")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
    : { data: [] };

  const quoteList = (quotes ?? []) as Quote[];

  const rfqIds = [...new Set(quoteList.map((quote) => quote.rfq_id))];

  const { data: rfqs } =
    rfqIds.length > 0
      ? await supabase
          .from("rfqs")
          .select("*")
          .in("id", rfqIds)
          .order("created_at", { ascending: false })
      : { data: [] };

  const rfqList = (rfqs ?? []) as RFQ[];

  const submittedQuotes = quoteList.length;
  const awardedQuotes = quoteList.filter((quote) => quote.decision === "awarded");
  const lostQuotes = quoteList.filter((quote) => quote.decision === "rejected");

  const awardedQuoteCount = awardedQuotes.length;
  const unsuccessfulQuotes = lostQuotes.length;

  const awardedRevenue = awardedQuotes.reduce((total, quote) => {
    const amount = Number(quote.amount);
    return total + (Number.isFinite(amount) ? amount : 0);
  }, 0);

  const totalBidVolume = quoteList.reduce((total, quote) => {
    const amount = Number(quote.amount);
    return total + (Number.isFinite(amount) ? amount : 0);
  }, 0);

  const averageBid =
    submittedQuotes > 0 ? Math.round(totalBidVolume / submittedQuotes) : 0;

  const averageAward =
    awardedQuoteCount > 0
      ? Math.round(awardedRevenue / awardedQuoteCount)
      : 0;

  const winRate =
    submittedQuotes > 0
      ? Math.round((awardedQuoteCount / submittedQuotes) * 100)
      : 0;

  const openRfqs = rfqList.filter((rfq) => !rfq.status || rfq.status === "open");

  const pendingDecisionRfqs = openRfqs.filter((rfq) =>
    quoteList.some((quote) => quote.rfq_id === rfq.id),
  );

  const pendingDecisions = pendingDecisionRfqs.length;
  const openRfqCount = openRfqs.length;

  const historyStatus = getHistoryStatus(submittedQuotes, awardedQuoteCount);

  const executiveBrief = buildExecutiveBrief({
    submittedQuotes,
    awardedQuoteCount,
    winRate,
    awardedRevenue,
    pendingDecisions,
    unsuccessfulQuotes,
  });

  const nextBestAction =
    submittedQuotes === 0
      ? "Explore active RFQ opportunities and submit the first competitive quotation."
      : winRate < 25
        ? "Review pricing competitiveness and proposal quality before the next quotation submission."
        : pendingDecisions > 0
          ? "Monitor pending award decisions and prepare for clarification or negotiation requests."
          : "Maintain quotation discipline and expand participation in strategically aligned RFQ opportunities.";

  const pipelineRows = rfqList.map((rfq) => {
    const rfqQuotes = quoteList.filter((quote) => quote.rfq_id === rfq.id);

    const amounts = rfqQuotes
      .map((quote) => Number(quote.amount))
      .filter((amount) => Number.isFinite(amount));

    const lowestQuote = amounts.length > 0 ? Math.min(...amounts) : null;

    const awardedQuote = rfqQuotes.find((quote) => quote.decision === "awarded");

    const isPendingDecision =
      (!rfq.status || rfq.status === "open") && rfqQuotes.length > 0;

    return {
      rfq,
      rfqQuotes,
      lowestQuote,
      awardedQuote,
      isPendingDecision,
    };
  });

  const recentAwards = awardedQuotes.slice(0, 5);

  const pendingReviewItems = pendingDecisionRfqs.slice(0, 5).map((rfq) => ({
    rfq,
    quoteCount: quoteList.filter((quote) => quote.rfq_id === rfq.id).length,
  }));

  const recentAwardItems = recentAwards.map((quote) => ({
    quote,
    rfq: rfqList.find((item) => item.id === quote.rfq_id) ?? null,
  }));

  return (
    <main className="min-h-screen bg-[#061426] px-4 py-8 text-white sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-7xl">
        <SupplierCommandCenter
          historyStatus={historyStatus}
          submittedQuotes={submittedQuotes}
          awardedQuotes={awardedQuoteCount}
          pendingDecisions={pendingDecisions}
          winRate={winRate}
          executiveBrief={executiveBrief}
          nextBestAction={nextBestAction}
          commandMetrics={[
            {
              title: "Win Rate",
              value: submittedQuotes > 0 ? `${winRate}%` : "—",
              detail: "Awards secured relative to submitted quotations",
              accentClassName: "text-cyan-300",
            },
            {
              title: "Awarded Revenue",
              value: formatMoney(awardedRevenue),
              detail: `${awardedQuoteCount} awarded quotation${awardedQuoteCount === 1 ? "" : "s"}`,
              accentClassName: "text-[#F5D77B]",
            },
            {
              title: "Total Bid Volume",
              value: formatMoney(totalBidVolume),
              detail: "Combined value of all submitted quotations",
              accentClassName: "text-emerald-300",
            },
          ]}
          stripItems={[
            {
              title: "Submitted Quotes",
              value: String(submittedQuotes),
            },
            {
              title: "Awarded Quotes",
              value: String(awardedQuoteCount),
            },
            {
              title: "Pending Decisions",
              value: String(pendingDecisions),
            },
            {
              title: "Open RFQs",
              value: String(openRfqCount),
            },
          ]}
        />

        <section className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <ExecutiveMetricCard
            label="Submitted Quotes"
            value={String(submittedQuotes)}
            insight="Total supplier quotations submitted"
            tone="neutral"
          />

          <ExecutiveMetricCard
            label="Awarded Quotes"
            value={String(awardedQuoteCount)}
            insight={
              awardedQuoteCount > 0
                ? `${formatMoney(awardedRevenue)} in awarded revenue`
                : "No awards recorded yet"
            }
            tone={awardedQuoteCount > 0 ? "success" : "neutral"}
          />

          <ExecutiveMetricCard
            label="Unsuccessful Quotes"
            value={String(unsuccessfulQuotes)}
            insight="Rejected or non-awarded quotations"
            tone={unsuccessfulQuotes > 0 ? "risk" : "neutral"}
          />

          <ExecutiveMetricCard
            label="Pending Decisions"
            value={String(pendingDecisions)}
            insight="Open RFQs with submitted quotations awaiting review"
            tone={pendingDecisions > 0 ? "gold" : "neutral"}
          />

          <ExecutiveMetricCard
            label="Open RFQs"
            value={String(openRfqCount)}
            insight="Active opportunities accepting or reviewing quotations"
            tone="blue"
          />

          <ExecutiveMetricCard
            label="Win Rate"
            value={submittedQuotes > 0 ? `${winRate}%` : "—"}
            insight={
              submittedQuotes > 0
                ? "Awards secured relative to submitted quotations"
                : "Insufficient data"
            }
            tone={winRate >= 50 ? "success" : "gold"}
          />

          <ExecutiveMetricCard
            label="Awarded Revenue"
            value={formatMoney(awardedRevenue)}
            insight={
              awardedQuoteCount > 0
                ? `${awardedQuoteCount} awarded quotation${awardedQuoteCount === 1 ? "" : "s"}`
                : "No award history"
            }
            tone="success"
            valueClassName="text-2xl"
          />

          <ExecutiveMetricCard
            label="Total Bid Volume"
            value={formatMoney(totalBidVolume)}
            insight="Combined value of all submitted quotations"
            tone="blue"
            valueClassName="text-2xl"
          />

          <ExecutiveMetricCard
            label="Average Bid"
            value={submittedQuotes > 0 ? formatMoney(averageBid) : "—"}
            insight={
              submittedQuotes > 0
                ? "Average submitted quotation value"
                : "Insufficient data"
            }
            tone="blue"
            valueClassName="text-2xl"
          />

          <ExecutiveMetricCard
            label="Average Award"
            value={awardedQuoteCount > 0 ? formatMoney(averageAward) : "—"}
            insight={
              awardedQuoteCount > 0
                ? "Average awarded contract value"
                : "No award history"
            }
            tone="gold"
            valueClassName="text-2xl"
          />
        </section>

        <SupplierScorecard
          historyStatus={historyStatus}
          submittedQuotes={submittedQuotes}
          awardedQuotes={awardedQuoteCount}
          unsuccessfulQuotes={unsuccessfulQuotes}
          pendingDecisions={pendingDecisions}
          openRfqs={openRfqCount}
          winRate={winRate}
          totalBidVolume={formatMoney(totalBidVolume)}
          awardedRevenue={formatMoney(awardedRevenue)}
          averageBid={submittedQuotes > 0 ? formatMoney(averageBid) : "—"}
          averageAward={
            awardedQuoteCount > 0 ? formatMoney(averageAward) : "—"
          }
        />

        <section className="mt-8 grid gap-8 lg:grid-cols-[1.5fr_0.8fr]">
          <SupplierOpportunityPipeline pipelineRows={pipelineRows} />

          <SupplierDecisionSidebar
            pendingReviews={pendingReviewItems}
            recentAwards={recentAwardItems}
          />
        </section>
      </div>
    </main>
  );
}

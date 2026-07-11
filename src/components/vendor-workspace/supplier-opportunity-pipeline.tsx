import Link from "next/link";

import { ExecutiveBadge } from "@/components/executive/executive-badge";
import { ExecutivePanel } from "@/components/executive/executive-panel";

type SupplierPipelineRFQ = {
  id: string;
  slug: string | null;
  title: string | null;
  description: string | null;
  category: string | null;
  location: string | null;
  budget: number | string | null;
  status: string | null;
};

type SupplierPipelineQuote = {
  amount: number | string | null;
};

type SupplierPipelineRow = {
  rfq: SupplierPipelineRFQ;
  rfqQuotes: SupplierPipelineQuote[];
  lowestQuote: number | null;
  awardedQuote:
    | {
        amount: number | string | null;
      }
    | undefined;
  isPendingDecision: boolean;
};

type SupplierOpportunityPipelineProps = {
  pipelineRows: SupplierPipelineRow[];
};

function formatMoney(value: number | string | null | undefined) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "$0";
  }

  return `$${amount.toLocaleString()}`;
}

function getStatusTone(
  status: string | null,
): "success" | "neutral" | "gold" {
  if (status === "awarded") {
    return "success";
  }

  if (status === "closed") {
    return "neutral";
  }

  return "gold";
}

function getStatusLabel(status: string | null) {
  if (status === "awarded") {
    return "Awarded";
  }

  if (status === "closed") {
    return "Closed";
  }

  return "Open";
}

export function SupplierOpportunityPipeline({
  pipelineRows,
}: SupplierOpportunityPipelineProps) {
  return (
    <ExecutivePanel padding="lg" tone="blue">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300">
            Supplier Opportunity Pipeline
          </p>

          <h2 className="mt-3 text-3xl font-black text-nexus-white">
            Active RFQ Opportunities
          </h2>

          <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-nexus-muted">
            Review active procurement opportunities, quotation activity,
            commercial position, award status, and supplier participation
            across the current RFQ portfolio.
          </p>
        </div>

        <Link
          href="/rfq"
          className="inline-flex shrink-0 rounded-full border border-[#C8A646]/25 bg-[#C8A646]/10 px-5 py-3 text-sm font-black text-[#F5D77B] transition hover:bg-[#C8A646]/15"
        >
          Explore Opportunities
        </Link>
      </div>

      <div className="mt-8 grid gap-5">
        {pipelineRows.length > 0 ? (
          pipelineRows.map(
            ({
              rfq,
              rfqQuotes,
              lowestQuote,
              awardedQuote,
              isPendingDecision,
            }) => (
              <article
                key={rfq.id}
                className="min-w-0 rounded-[28px] border border-white/10 bg-white/[0.045] p-6 transition duration-300 hover:border-cyan-300/20 hover:bg-white/[0.065]"
              >
                <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-xs font-black uppercase tracking-[0.25em] text-nexus-gold">
                        {rfq.category || "Procurement"}
                      </p>

                      <ExecutiveBadge tone={getStatusTone(rfq.status)}>
                        {getStatusLabel(rfq.status)}
                      </ExecutiveBadge>

                      {isPendingDecision ? (
                        <ExecutiveBadge tone="warning">
                          Award Decision Pending
                        </ExecutiveBadge>
                      ) : null}
                    </div>

                    <h3 className="mt-3 break-words text-2xl font-black text-nexus-white">
                      {rfq.title || "Untitled RFQ"}
                    </h3>

                    <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-nexus-muted">
                      {rfq.description ||
                        "No procurement opportunity description is currently available."}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <PipelineSignal
                        label="Location"
                        value={rfq.location || "Not specified"}
                      />

                      <PipelineSignal
                        label="Budget"
                        value={formatMoney(rfq.budget)}
                      />

                      <PipelineSignal
                        label="Quotations"
                        value={String(rfqQuotes.length)}
                      />

                      {lowestQuote !== null ? (
                        <PipelineSignal
                          label="Lowest Quotation"
                          value={formatMoney(lowestQuote)}
                        />
                      ) : null}

                      {awardedQuote ? (
                        <PipelineSignal
                          label="Awarded Value"
                          value={formatMoney(awardedQuote.amount)}
                          tone="success"
                        />
                      ) : null}
                    </div>
                  </div>

                  {rfq.slug ? (
                    <Link
                      href={`/rfq/${rfq.slug}`}
                      className="inline-flex shrink-0 rounded-full border border-white/10 bg-white/10 px-5 py-3 text-sm font-black text-nexus-white transition hover:bg-white/15"
                    >
                      Review Opportunity
                    </Link>
                  ) : null}
                </div>
              </article>
            ),
          )
        ) : (
          <div className="rounded-[28px] border border-dashed border-white/15 bg-white/[0.035] p-8 text-center">
            <p className="text-sm font-bold leading-6 text-nexus-muted">
              No active RFQ opportunities are currently connected to this
              supplier workspace.
            </p>

            <Link
              href="/rfq"
              className="mt-5 inline-flex rounded-full border border-[#C8A646]/25 bg-[#C8A646]/10 px-5 py-3 text-sm font-black text-[#F5D77B] transition hover:bg-[#C8A646]/15"
            >
              Explore RFQ Opportunities
            </Link>
          </div>
        )}
      </div>
    </ExecutivePanel>
  );
}

function PipelineSignal({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "success";
}) {
  return (
    <div
      className={[
        "min-w-0 rounded-2xl border px-4 py-3",
        tone === "success"
          ? "border-emerald-400/20 bg-emerald-400/10"
          : "border-white/10 bg-slate-950/40",
      ].join(" ")}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-nexus-muted">
        {label}
      </p>

      <p
        className={[
          "mt-1 break-words text-sm font-black",
          tone === "success" ? "text-emerald-300" : "text-nexus-white",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}
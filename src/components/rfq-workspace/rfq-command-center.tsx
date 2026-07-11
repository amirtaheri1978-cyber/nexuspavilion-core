import Link from "next/link";

import { ExecutiveCommandMetric } from "@/components/executive/workspace/executive-command-metric";
import { ExecutiveCommandStripCard } from "@/components/executive/workspace/executive-command-strip-card";

type RFQCommandMetric = {
  title: string;
  value: string;
  detail: string;
  accentClassName: string;
};

type RFQCommandStripItem = {
  title: string;
  value: string;
};

type RFQCommandCenterAward = {
  label: string;
  value: string;
};

type RFQCommandCenterProps = {
  backHref?: string;
  statusLabel: string;
  statusClassName: string;
  classificationBadges: string[];
  title: string;
  description: string;
  commandMetrics: RFQCommandMetric[];
  executiveBrief: string;
  nextBestAction: string;
  award?: RFQCommandCenterAward | null;
  stripItems: RFQCommandStripItem[];
};

export function RFQCommandCenter({
  backHref = "/rfq",
  statusLabel,
  statusClassName,
  classificationBadges,
  title,
  description,
  commandMetrics,
  executiveBrief,
  nextBestAction,
  award = null,
  stripItems,
}: RFQCommandCenterProps) {
  return (
    <>
      <Link
        href={backHref}
        className="text-sm font-semibold text-nexus-muted transition hover:text-nexus-white"
      >
       ← Return to RFQ Marketplace
      </Link>

      <section className="mt-8 overflow-hidden rounded-[40px] border border-white/10 bg-slate-950 text-white shadow-[0_30px_100px_rgba(2,6,23,0.28)]">
        <div className="relative overflow-hidden p-6 sm:p-8 lg:p-10">
          <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-orange-400/10 blur-3xl" />

          <div className="relative grid gap-10 lg:grid-cols-[1.25fr_0.75fr]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.35em] text-[#C8A646]">
                Procurement Command Center
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span
                  className={`rounded-full px-4 py-2 text-sm font-black ${statusClassName}`}
                >
                  {statusLabel}
                </span>

                {classificationBadges.map((badge) => (
                  <RFQCommandBadge key={badge}>{badge}</RFQCommandBadge>
                ))}
              </div>

              <h1 className="mt-6 text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
                {title}
              </h1>

              <p className="mt-5 max-w-4xl text-sm font-semibold leading-7 text-slate-300">
                {description}
              </p>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {commandMetrics.map((metric) => (
                  <ExecutiveCommandMetric
                    key={metric.title}
                    title={metric.title}
                    value={metric.value}
                    detail={metric.detail}
                    accentClassName={metric.accentClassName}
                  />
                ))}
              </div>
            </div>

            <div className="relative rounded-[32px] border border-white/10 bg-white/10 p-6 backdrop-blur">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300">
                Executive Brief
              </p>

              <h2 className="mt-4 text-2xl font-black text-white">
  Executive Procurement Summary
</h2>

              <p className="mt-4 text-sm font-semibold leading-7 text-slate-300">
                {executiveBrief}
              </p>

              <div className="mt-6 rounded-3xl border border-white/10 bg-slate-950/60 p-5">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-[#C8A646]">
  Recommended Executive Action
</p>

                <p className="mt-3 text-sm font-bold leading-6 text-white">
                  {nextBestAction}
                </p>
              </div>

              {award ? (
                <div className="mt-4 rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-300">
                    {award.label}
                  </p>

                  <p className="mt-3 text-sm font-bold text-white">
                    {award.value}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid border-t border-white/10 bg-white/[0.03] md:grid-cols-2 xl:grid-cols-6">
          {stripItems.map((item) => (
            <ExecutiveCommandStripCard
              key={item.title}
              title={item.title}
              value={item.value}
            />
          ))}
        </div>
      </section>
    </>
  );
}

function RFQCommandBadge({ children }: { children: string }) {
  return (
    <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.15em] text-white">
      {children}
    </span>
  );
}
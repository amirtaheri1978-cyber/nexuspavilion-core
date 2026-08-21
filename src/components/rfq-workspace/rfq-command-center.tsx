import Link from "next/link";

import { ExecutiveBadge } from "@/components/executive/executive-badge";
import { ExecutivePanel } from "@/components/executive/executive-panel";
import { ExecutiveCommandMetric } from "@/components/executive/workspace/executive-command-metric";
import {
  EXECUTIVE_FOCUS_CYAN,
} from "@/lib/design-system/executive-contract";

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
  statusTone?: "success" | "warning" | "neutral" | "live" | "awarded" | "locked";
  statusClassName?: string;
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
  statusTone = "live",
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
    <div className="min-w-0 @container" data-rfq-command-center="true">
      <Link
        href={backHref}
        className={`inline-flex min-h-11 items-center text-sm font-black text-nexus-cyan-bright ${EXECUTIVE_FOCUS_CYAN}`}
      >
        Return to RFQ marketplace
      </Link>

      <ExecutivePanel
        variant="executive"
        padding="lg"
        tone="gold"
        className="np-region min-w-0"
        aria-labelledby="rfq-command-heading"
      >
        <div className="grid min-w-0 gap-8 @7xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] @7xl:items-start @7xl:gap-10">
          <div className="min-w-0 @container">
            <p className="np-type-eyebrow">Procurement command center</p>
            <div className="mt-4 flex min-w-0 flex-wrap items-center gap-3">
              <ExecutiveBadge tone={statusTone} size="md">
                {statusLabel}
              </ExecutiveBadge>
              {classificationBadges.map((badge) => (
                <ExecutiveBadge key={badge} tone="neutral">
                  {badge}
                </ExecutiveBadge>
              ))}
            </div>
            <h1
              id="rfq-command-heading"
              className="np-type-h1 mt-6 min-w-0 max-w-4xl text-pretty"
            >
              {title}
            </h1>
            <p className="np-type-body mt-5 min-w-0 max-w-4xl text-pretty">
              {description}
            </p>
            <div className="mt-8 grid grid-cols-1 gap-4 @sm:grid-cols-2 @4xl:grid-cols-3">
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
            <dl className="mt-8 grid grid-cols-1 gap-x-6 gap-y-4 border-t border-white/10 pt-6 @sm:grid-cols-2">
              {stripItems.map((item) => (
                <div key={item.title} className="min-w-0">
                  <dt className="np-type-meta">{item.title}</dt>
                  <dd className="np-type-kpi mt-2 text-pretty text-lg">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <section
            className="min-w-0"
            aria-labelledby="rfq-command-brief-heading"
            data-rfq-command-brief="true"
          >
            <p className="np-type-meta text-nexus-cyan-bright">Executive brief</p>
            <h2
              id="rfq-command-brief-heading"
              className="np-type-h3 mt-3 text-pretty"
            >
              Executive procurement summary
            </h2>
            <p className="np-type-body mt-4 min-w-0 text-pretty">
              {executiveBrief}
            </p>
            <div
              className="mt-6 border-t border-nexus-gold/25 pt-5"
              data-rfq-command-recommended-action="true"
            >
              <h3 className="np-type-meta text-nexus-gold-bright">
                Recommended executive action
              </h3>
              <p className="np-type-body mt-3 min-w-0 text-pretty">
                {nextBestAction}
              </p>
            </div>
            {award ? (
              <div
                className="mt-5 border-t border-emerald-400/25 pt-5"
                data-rfq-command-award="true"
              >
                <ExecutiveBadge tone="awarded">{award.label}</ExecutiveBadge>
                <p className="np-type-body mt-3 min-w-0 text-pretty text-white">
                  {award.value}
                </p>
              </div>
            ) : null}
          </section>
        </div>
      </ExecutivePanel>
    </div>
  );
}

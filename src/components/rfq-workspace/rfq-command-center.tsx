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
    <>
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
        className="np-region"
        aria-labelledby="rfq-command-heading"
      >
        <div className="grid gap-10 lg:grid-cols-[1.25fr_0.75fr]">
          <div>
            <p className="np-type-eyebrow">Procurement command center</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <ExecutiveBadge tone={statusTone} size="md">
                {statusLabel}
              </ExecutiveBadge>
              {classificationBadges.map((badge) => (
                <ExecutiveBadge key={badge} tone="neutral">
                  {badge}
                </ExecutiveBadge>
              ))}
            </div>
            <h1 id="rfq-command-heading" className="np-type-h1 mt-6">
              {title}
            </h1>
            <p className="np-type-body mt-5 max-w-4xl">{description}</p>
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

          <div className="rounded-executive border border-white/10 bg-white/[0.04] p-6">
            <p className="np-type-meta text-nexus-cyan-bright">Executive brief</p>
            <h2 className="np-type-h3 mt-3">Executive procurement summary</h2>
            <p className="np-type-body mt-4">{executiveBrief}</p>
            <div className="mt-6 rounded-executive border border-nexus-gold/20 bg-nexus-gold/[0.08] p-5">
              <p className="np-type-meta text-nexus-gold-bright">
                Recommended executive action
              </p>
              <p className="np-type-body mt-3">{nextBestAction}</p>
            </div>
            {award ? (
              <div className="mt-4 rounded-executive border border-emerald-400/20 bg-emerald-400/10 p-5">
                <ExecutiveBadge tone="awarded">{award.label}</ExecutiveBadge>
                <p className="np-type-body mt-3 text-white">{award.value}</p>
              </div>
            ) : null}
          </div>
        </div>
      </ExecutivePanel>

      <ul className="np-region grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stripItems.map((item) => (
          <li
            key={item.title}
            className="min-w-0 rounded-executive border border-white/10 bg-white/[0.035] px-4 py-3"
          >
            <p className="np-type-meta">{item.title}</p>
            <p className="np-type-kpi mt-2 break-words text-lg">{item.value}</p>
          </li>
        ))}
      </ul>
    </>
  );
}

import Link from "next/link";

import { ExecutiveBadge } from "@/components/executive/executive-badge";
import { ExecutivePanel } from "@/components/executive/executive-panel";
import { EXECUTIVE_FOCUS_CYAN } from "@/lib/design-system/executive-contract";

export type ExecutiveAttentionItem = {
  id: string;
  kind: "warning" | "opportunity";
  title: string;
  description: string;
  href?: string;
  hrefLabel?: string;
};

type ExecutiveAttentionStripProps = {
  items: ExecutiveAttentionItem[];
};

const kindTone = {
  warning: "warning",
  opportunity: "gold",
} as const;

const kindLabel = {
  warning: "Requires Attention",
  opportunity: "Opportunity",
} as const;

export function ExecutiveAttentionStrip({
  items,
}: ExecutiveAttentionStripProps) {
  return (
    <ExecutivePanel
      variant="operational"
      padding="lg"
      className="np-region"
      aria-labelledby="executive-attention-heading"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="np-type-eyebrow">Attention</p>
          <h2 id="executive-attention-heading" className="np-type-h2 mt-3">
            What requires attention
          </h2>
        </div>

        <ExecutiveBadge tone={items.length > 0 ? "warning" : "success"} size="md">
          {items.length > 0 ? `${items.length} Open` : "Clear"}
        </ExecutiveBadge>
      </div>

      {items.length > 0 ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-executive border border-white/10 bg-black/20 p-5"
            >
              <ExecutiveBadge tone={kindTone[item.kind]} size="sm">
                {kindLabel[item.kind]}
              </ExecutiveBadge>

              <h3 className="mt-4 text-lg font-black leading-tight text-white">
                {item.title}
              </h3>

              <p className="np-type-body mt-3 text-nexus-text-muted">
                {item.description}
              </p>

              {item.href ? (
                <Link
                  href={item.href}
                  className={`mt-4 inline-flex min-h-11 items-center text-sm font-black text-nexus-cyan-bright ${EXECUTIVE_FOCUS_CYAN}`}
                >
                  {item.hrefLabel || "Open"}
                </Link>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-executive border border-dashed border-white/15 bg-white/[0.035] px-5 py-8 text-center">
          <ExecutiveBadge tone="success" size="sm">
            No Immediate Action
          </ExecutiveBadge>
          <p className="np-type-body mt-3">
            No current warning or opportunity requires executive intervention.
          </p>
        </div>
      )}
    </ExecutivePanel>
  );
}

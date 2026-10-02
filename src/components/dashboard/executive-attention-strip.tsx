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

function kindTone(
  kind: ExecutiveAttentionItem["kind"],
): "warning" | "gold" {
  switch (kind) {
    case "warning":
      return "warning";
    case "opportunity":
      return "gold";
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

function kindLabel(kind: ExecutiveAttentionItem["kind"]): string {
  switch (kind) {
    case "warning":
      return "Requires Attention";
    case "opportunity":
      return "Opportunity";
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

export function ExecutiveAttentionStrip({
  items,
}: ExecutiveAttentionStripProps) {
  const queueTone = items.length > 0 ? "warning" : "success";
  const queueLabel = items.length > 0 ? `${items.length} Open` : "Clear";

  return (
    <ExecutivePanel
      variant="operational"
      padding="lg"
      className="np-region"
      aria-labelledby="executive-action-queue-heading"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className="np-type-eyebrow">Action Queue</p>
          <h2
            id="executive-action-queue-heading"
            className="np-type-h2 mt-2 text-pretty"
          >
            Action Queue
          </h2>
          <p className="np-type-body mt-2 max-w-3xl text-pretty text-nexus-text-secondary">
            Decisions and actions requiring attention
          </p>
        </div>

        <div className="shrink-0">
          <ExecutiveBadge tone={queueTone} size="md">
            {queueLabel}
          </ExecutiveBadge>
        </div>
      </div>

      {items.length > 0 ? (
        <ol className="mt-5 grid list-none gap-3 p-0 lg:grid-cols-2">
          {items.map((item, index) => (
            <li key={item.id} className="min-w-0">
              <article
                className={[
                  "h-full min-w-0 rounded-executive border border-white/10 bg-black/20 p-4 sm:p-5",
                  "transition-[border-color,background-color] duration-200",
                  "hover:border-white/20 hover:bg-black/30",
                ].join(" ")}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <ExecutiveBadge tone="neutral" size="sm">
                    Priority {index + 1}
                  </ExecutiveBadge>
                  <ExecutiveBadge tone={kindTone(item.kind)} size="sm">
                    {kindLabel(item.kind)}
                  </ExecutiveBadge>
                </div>

                <h3 className="np-type-h3 mt-3 min-w-0 text-pretty break-words">
                  {item.title}
                </h3>

                <p className="np-type-body mt-2 text-pretty text-nexus-text-muted">
                  {item.description}
                </p>

                {item.href ? (
                  <Link
                    href={item.href}
                    className={`mt-3 inline-flex min-h-11 items-center text-sm font-black text-nexus-cyan-bright transition-colors duration-200 hover:text-white ${EXECUTIVE_FOCUS_CYAN}`}
                  >
                    {item.hrefLabel || "Open"}
                  </Link>
                ) : null}
              </article>
            </li>
          ))}
        </ol>
      ) : (
        <div
          className="mt-5 rounded-executive border border-dashed border-white/15 bg-white/[0.035] px-5 py-8 text-center"
          role="status"
        >
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

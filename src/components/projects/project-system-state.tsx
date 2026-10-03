import Link from "next/link";

import { ExecutivePanel } from "@/components/executive/executive-panel";
import {
  EXECUTIVE_CTA_PRIMARY,
  EXECUTIVE_CTA_SECONDARY,
  EXECUTIVE_PAGE_CLASS,
} from "@/lib/design-system/executive-contract";

export function ProjectSystemState({
  eyebrow,
  title,
  description,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: {
  eyebrow: string;
  title: string;
  description: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <main className={EXECUTIVE_PAGE_CLASS}>
      <ExecutivePanel variant="operational" padding="lg" tone="gold">
        <p className="np-type-eyebrow text-nexus-gold">{eyebrow}</p>

        <h1 className="np-type-h1 mt-4 max-w-4xl min-w-0 text-pretty text-nexus-white">
          {title}
        </h1>

        <p className="np-type-body mt-4 max-w-3xl min-w-0 text-pretty text-nexus-muted">
          {description}
        </p>

        {primaryHref || secondaryHref ? (
          <div className="mt-7 flex flex-wrap gap-3">
            {primaryHref && primaryLabel ? (
              <Link href={primaryHref} className={EXECUTIVE_CTA_PRIMARY}>
                {primaryLabel}
              </Link>
            ) : null}

            {secondaryHref && secondaryLabel ? (
              <Link href={secondaryHref} className={EXECUTIVE_CTA_SECONDARY}>
                {secondaryLabel}
              </Link>
            ) : null}
          </div>
        ) : null}
      </ExecutivePanel>
    </main>
  );
}

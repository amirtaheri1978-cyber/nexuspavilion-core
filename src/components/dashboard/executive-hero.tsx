import Link from "next/link";

import { ExecutiveBadge } from "@/components/executive/executive-badge";
import { ExecutivePanel } from "@/components/executive/executive-panel";
import {
  EXECUTIVE_CTA_PRIMARY,
  EXECUTIVE_CTA_SECONDARY,
} from "@/lib/design-system/executive-contract";

type ExecutiveHeroAction = {
  href: string;
  label: string;
};

type ExecutiveHeroProps = {
  eyebrow: string;
  welcomeTitle: string;
  welcomeDescription: string;
  briefLabel: string;
  companyName: string;
  readinessScore: number;
  readinessTone: "success" | "warning" | "blue" | "neutral";
  primaryAction: ExecutiveHeroAction;
  secondaryAction: ExecutiveHeroAction;
};

export function ExecutiveHero({
  eyebrow,
  welcomeTitle,
  welcomeDescription,
  briefLabel,
  companyName,
  readinessScore,
  readinessTone,
  primaryAction,
  secondaryAction,
}: ExecutiveHeroProps) {
  const readinessStatus =
    readinessScore >= 100
      ? "Workspace Ready"
      : readinessScore >= 55
        ? "Setup In Progress"
        : "Setup Required";

  return (
    <ExecutivePanel variant="executive" padding="lg" tone="gold">
      <p className="np-type-eyebrow">{eyebrow}</p>

      <h1 className="np-type-h1 mt-4 max-w-5xl">{welcomeTitle}</h1>

      <p className="np-type-body mt-4 max-w-4xl text-base text-nexus-text-secondary">
        {welcomeDescription}
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <ExecutiveBadge tone={readinessTone} size="sm">
          {readinessStatus}
        </ExecutiveBadge>

        <ExecutiveBadge tone="blue" size="sm">
          {briefLabel}
        </ExecutiveBadge>

        <ExecutiveBadge tone="neutral" size="sm">
          {companyName}
        </ExecutiveBadge>
      </div>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <Link href={primaryAction.href} className={EXECUTIVE_CTA_PRIMARY}>
          {primaryAction.label}
        </Link>

        <Link href={secondaryAction.href} className={EXECUTIVE_CTA_SECONDARY}>
          {secondaryAction.label}
        </Link>
      </div>
    </ExecutivePanel>
  );
}

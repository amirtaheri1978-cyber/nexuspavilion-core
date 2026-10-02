import { useId, type ReactNode } from "react";

import { ExecutiveBadge, type ExecutiveBadgeTone } from "@/components/executive/executive-badge";
import {
  EXECUTIVE_CARD_INTELLIGENCE_CLASS,
  EXECUTIVE_CARD_ROLE_ELEVATION,
  EXECUTIVE_CARD_ROLE_RADIUS,
} from "@/lib/design-system/executive-contract";

export type ExecutiveIntelligenceCardStatus = {
  label: string;
  tone?: ExecutiveBadgeTone;
};

type ExecutiveIntelligenceCardProps = {
  signal: string;
  evidence?: string;
  impact?: string;
  recommendation?: string;
  action?: ReactNode;
  status?: ExecutiveIntelligenceCardStatus;
  className?: string;
};

function hasText(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasAction(action: ReactNode) {
  return action !== undefined && action !== null && action !== false && action !== "";
}

function IntelligenceSection({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: string;
}) {
  return (
    <section className="mt-6 min-w-0" aria-labelledby={id}>
      <h4 id={id} className="np-type-meta np-intelligence-accent">
        {label}
      </h4>
      <p className="mt-2 min-w-0 break-words np-type-body [overflow-wrap:anywhere]">
        {children}
      </p>
    </section>
  );
}

export function ExecutiveIntelligenceCard({
  signal,
  evidence,
  impact,
  recommendation,
  action,
  status,
  className = "",
}: ExecutiveIntelligenceCardProps) {
  const labelId = useId();
  const evidenceId = `${labelId}-evidence`;
  const impactId = `${labelId}-impact`;
  const recommendationId = `${labelId}-recommendation`;
  const actionId = `${labelId}-action`;
  const showStatus = hasText(status?.label);

  return (
    <article
      className={[
        "min-w-0 p-5 sm:p-6",
        EXECUTIVE_CARD_INTELLIGENCE_CLASS,
        EXECUTIVE_CARD_ROLE_RADIUS.intelligence,
        EXECUTIVE_CARD_ROLE_ELEVATION.intelligence,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <header className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="np-type-meta np-intelligence-accent">Signal</p>
          <h3 className="np-type-h3 mt-2 break-words [overflow-wrap:anywhere]">
            {signal}
          </h3>
        </div>
        {showStatus ? (
          <ExecutiveBadge tone={status?.tone}>{status?.label}</ExecutiveBadge>
        ) : null}
      </header>

      {hasText(evidence) ? (
        <IntelligenceSection id={evidenceId} label="Evidence">
          {evidence}
        </IntelligenceSection>
      ) : null}

      {hasText(impact) ? (
        <IntelligenceSection id={impactId} label="Impact">
          {impact}
        </IntelligenceSection>
      ) : null}

      {hasText(recommendation) ? (
        <IntelligenceSection id={recommendationId} label="Recommendation">
          {recommendation}
        </IntelligenceSection>
      ) : null}

      {hasAction(action) ? (
        <section className="mt-6 min-w-0" aria-labelledby={actionId}>
          <h4 id={actionId} className="np-type-meta np-intelligence-accent">
            Action
          </h4>
          <div className="mt-2 min-w-0">{action}</div>
        </section>
      ) : null}
    </article>
  );
}

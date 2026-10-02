"use client";

import { useEffect, useId, type ReactNode, type RefObject } from "react";

import {
  EXECUTIVE_ERROR_HIGHLIGHT_CLASS,
  EXECUTIVE_ERROR_IMPACT,
  EXECUTIVE_ERROR_LIVE,
  EXECUTIVE_ERROR_PROBLEM,
  EXECUTIVE_ERROR_ROLE,
  EXECUTIVE_ERROR_SURFACE,
} from "@/lib/design-system/executive-contract";

type ExecutiveErrorRecoveryProps = {
  active: boolean;
  title: string;
  problem: string;
  impact?: string;
  recovery?: string;
  recoveryTargetRef?: RefObject<HTMLElement | null>;
  recoveryAction?: ReactNode;
  className?: string;
};

function hasText(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasAction(action: ReactNode) {
  return action !== undefined && action !== null && action !== false && action !== "";
}

function recoveryLive(value: string): "assertive" | "polite" {
  return value === "polite" ? "polite" : "assertive";
}

export function ExecutiveErrorRecovery({
  active,
  title,
  problem,
  impact,
  recovery,
  recoveryTargetRef,
  recoveryAction,
  className = "",
}: ExecutiveErrorRecoveryProps) {
  const titleId = useId();

  useEffect(() => {
    if (!active) return;

    recoveryTargetRef?.current?.focus();
  }, [active, recoveryTargetRef]);

  if (!active) return null;

  return (
    <section
      className={`${EXECUTIVE_ERROR_SURFACE} ${EXECUTIVE_ERROR_HIGHLIGHT_CLASS} min-w-0 p-5 sm:p-6 ${className}`}
      role={EXECUTIVE_ERROR_ROLE}
      aria-live={recoveryLive(EXECUTIVE_ERROR_LIVE)}
      aria-labelledby={titleId}
    >
      <h2 id={titleId} className="np-type-h3 text-pretty">
        {title}
      </h2>
      <p className={EXECUTIVE_ERROR_PROBLEM}>{problem}</p>
      {hasText(impact) ? <p className={EXECUTIVE_ERROR_IMPACT}>{impact}</p> : null}
      {hasText(recovery) ? (
        <p className="np-type-meta mt-3 text-pretty">{recovery}</p>
      ) : null}
      {hasAction(recoveryAction) ? (
        <div className="mt-4 min-w-0">{recoveryAction}</div>
      ) : null}
    </section>
  );
}

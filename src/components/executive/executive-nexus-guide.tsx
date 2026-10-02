"use client";

import { useId, type ReactNode } from "react";

import {
  EXECUTIVE_DRAWER_BODY,
  EXECUTIVE_DRAWER_CLOSE,
  EXECUTIVE_DRAWER_FOOTER,
  EXECUTIVE_DRAWER_HEADER,
  EXECUTIVE_DRAWER_INTELLIGENCE,
  EXECUTIVE_DRAWER_OVERLAY,
  EXECUTIVE_DRAWER_SURFACE,
  EXECUTIVE_DRAWER_TITLE,
} from "@/lib/design-system/executive-contract";

type ExecutiveNexusGuideProps = {
  open: boolean;
  onClose: () => void;
  workflow?: string;
  readiness?: string;
  attentionItems?: readonly string[];
  suggestedNextStep?: string;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  className?: string;
};

function hasText(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasAction(action: ReactNode) {
  return action !== undefined && action !== null && action !== false && action !== "";
}

/**
 * L4 Nexus Guide side panel: presents caller-supplied guide context only.
 * Open/close and action effects stay with the caller.
 */
export function ExecutiveNexusGuide({
  open,
  onClose,
  workflow,
  readiness,
  attentionItems,
  suggestedNextStep,
  primaryAction,
  secondaryAction,
  className = "",
}: ExecutiveNexusGuideProps) {
  const titleId = useId();

  if (!open) return null;

  const attention = (attentionItems ?? []).filter((item) => item.trim().length > 0);
  const showWorkflow = hasText(workflow);
  const showReadiness = hasText(readiness);
  const showAttention = attention.length > 0;
  const showNextStep = hasText(suggestedNextStep);
  const showPrimary = hasAction(primaryAction);
  const showSecondary = hasAction(secondaryAction);
  const showFooter = showPrimary || showSecondary;

  return (
    <div className={EXECUTIVE_DRAWER_OVERLAY}>
      <aside
        className={[
          EXECUTIVE_DRAWER_SURFACE,
          EXECUTIVE_DRAWER_INTELLIGENCE,
          "min-w-0",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        aria-labelledby={titleId}
      >
        <div className={EXECUTIVE_DRAWER_HEADER}>
          <h2
            id={titleId}
            className={`${EXECUTIVE_DRAWER_TITLE} min-w-0 max-w-full text-pretty break-words`}
          >
            Nexus Guide
          </h2>
          <button
            type="button"
            className={EXECUTIVE_DRAWER_CLOSE}
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className={`${EXECUTIVE_DRAWER_BODY} min-w-0`}>
          {showWorkflow ? (
            <section className="min-w-0">
              <p className="np-type-eyebrow">Workflow</p>
              <p className="mt-2 min-w-0 max-w-full text-pretty break-words">
                {workflow}
              </p>
            </section>
          ) : null}

          {showReadiness ? (
            <section className={showWorkflow ? "mt-6 min-w-0" : "min-w-0"}>
              <p className="np-type-eyebrow">Readiness</p>
              <p className="mt-2 min-w-0 max-w-full text-pretty break-words">
                {readiness}
              </p>
            </section>
          ) : null}

          {showAttention ? (
            <section
              className={
                showWorkflow || showReadiness ? "mt-6 min-w-0" : "min-w-0"
              }
            >
              <p className="np-type-eyebrow">Attention</p>
              <ul className="mt-2 list-disc space-y-2 pl-5">
                {attention.map((item) => (
                  <li
                    key={item}
                    className="min-w-0 max-w-full text-pretty break-words"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {showNextStep ? (
            <section
              className={
                showWorkflow || showReadiness || showAttention
                  ? "mt-6 min-w-0"
                  : "min-w-0"
              }
            >
              <p className="np-type-eyebrow">Suggested next step</p>
              <p className="mt-2 min-w-0 max-w-full text-pretty break-words">
                {suggestedNextStep}
              </p>
            </section>
          ) : null}
        </div>

        {showFooter ? (
          <div className={EXECUTIVE_DRAWER_FOOTER}>
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              {showPrimary ? (
                <div className="min-w-0 max-w-full">{primaryAction}</div>
              ) : null}
              {showSecondary ? (
                <div className="min-w-0 max-w-full">{secondaryAction}</div>
              ) : null}
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

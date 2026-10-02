"use client";

import { ExecutivePanel } from "@/components/executive/executive-panel";
import {
  EXECUTIVE_BUTTON_SECONDARY,
  EXECUTIVE_BUTTON_TERTIARY,
} from "@/lib/design-system/executive-contract";

type ExecutiveGuidanceCardProps = {
  title: string;
  description: string;
  reviewLabel?: string;
  onReview?: () => void;
  dismissLabel?: string;
  onDismiss?: () => void;
  className?: string;
};

function hasLabeledAction(
  label: string | undefined,
  handler: (() => void) | undefined,
): label is string {
  return (
    typeof label === "string" &&
    label.trim().length > 0 &&
    typeof handler === "function"
  );
}

/**
 * L2 Guidance Card: embedded contextual guidance with caller-owned actions.
 * Stays in page flow and never blocks work; Review and Dismiss remain optional and external.
 */
export function ExecutiveGuidanceCard({
  title,
  description,
  reviewLabel,
  onReview,
  dismissLabel,
  onDismiss,
  className = "",
}: ExecutiveGuidanceCardProps) {
  const showReview = hasLabeledAction(reviewLabel, onReview);
  const showDismiss = hasLabeledAction(dismissLabel, onDismiss);

  return (
    <ExecutivePanel className={`min-w-0 ${className}`} padding="md" tone="gold">
      <p className="np-type-eyebrow">Guidance</p>
      <h3 className="np-type-h3 mt-3 min-w-0 max-w-full text-pretty break-words">
        {title}
      </h3>
      <p className="np-type-body mt-3 min-w-0 max-w-full text-pretty break-words">
        {description}
      </p>
      {showReview || showDismiss ? (
        <div className="mt-6 flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {showReview ? (
            <button
              type="button"
              onClick={onReview}
              className={`min-w-0 max-w-full ${EXECUTIVE_BUTTON_SECONDARY}`}
            >
              {reviewLabel}
            </button>
          ) : null}
          {showDismiss ? (
            <button
              type="button"
              onClick={onDismiss}
              className={`min-w-0 max-w-full ${EXECUTIVE_BUTTON_TERTIARY}`}
            >
              {dismissLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </ExecutivePanel>
  );
}

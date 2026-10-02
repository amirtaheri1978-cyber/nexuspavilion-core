"use client";

import { useId, type ReactNode } from "react";

import {
  EXECUTIVE_BUTTON_SECONDARY,
  EXECUTIVE_BUTTON_TERTIARY,
  EXECUTIVE_POPOVER_MOTION,
  EXECUTIVE_POPOVER_PLACEMENT,
  EXECUTIVE_POPOVER_SURFACE,
} from "@/lib/design-system/executive-contract";

type ExecutiveCoachmarkProps = {
  open: boolean;
  children: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
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
 * L3 Anchored Coachmark: attaches to a real caller-provided control.
 * Open/replay state stays with the caller; the anchor is never replaced.
 */
export function ExecutiveCoachmark({
  open,
  children,
  title,
  description,
  actionLabel,
  onAction,
  dismissLabel,
  onDismiss,
  className = "",
}: ExecutiveCoachmarkProps) {
  const contentId = useId();
  const titleId = useId();
  const showAction = hasLabeledAction(actionLabel, onAction);
  const showDismiss = hasLabeledAction(dismissLabel, onDismiss);

  return (
    <div className={`relative inline-flex min-w-0 max-w-full ${className}`}>
      {children}
      {open ? (
        <div
          id={contentId}
          className={[
            EXECUTIVE_POPOVER_PLACEMENT,
            EXECUTIVE_POPOVER_SURFACE,
            EXECUTIVE_POPOVER_MOTION,
            "min-w-0 max-w-[min(100%,20rem)]",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-labelledby={titleId}
        >
          <p
            id={titleId}
            className="np-type-h3 min-w-0 max-w-full text-pretty break-words"
          >
            {title}
          </p>
          <p className="mt-2 min-w-0 max-w-full text-pretty break-words">
            {description}
          </p>
          {showAction || showDismiss ? (
            <div className="mt-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              {showAction ? (
                <button
                  type="button"
                  onClick={onAction}
                  className={`min-w-0 max-w-full ${EXECUTIVE_BUTTON_SECONDARY}`}
                >
                  {actionLabel}
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
        </div>
      ) : null}
    </div>
  );
}

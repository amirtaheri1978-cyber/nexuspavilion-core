import { useId, type ReactNode } from "react";

import { ExecutiveProgress } from "@/components/executive/executive-progress";
import {
  EXECUTIVE_FEEDBACK_INFO,
  EXECUTIVE_FEEDBACK_LIVE,
  EXECUTIVE_FEEDBACK_SUCCESS,
  EXECUTIVE_LOADING_LIVE,
} from "@/lib/design-system/executive-contract";

export type ExecutiveCompletionState = "processing" | "confirmed";

type ExecutiveCompletionMomentProps = {
  state: ExecutiveCompletionState;
  title: string;
  summary: string;
  detail?: string;
  progress?: number;
  nextAction?: ReactNode;
  secondaryAction?: ReactNode;
  className?: string;
};

type CompletionPresentation = {
  eyebrow: string;
  surface: string;
  live: "polite" | "assertive";
  busy: boolean;
};

function completionLive(value: string): "polite" | "assertive" {
  return value === "assertive" ? "assertive" : "polite";
}

function hasText(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasAction(action: ReactNode) {
  return action !== undefined && action !== null && action !== false && action !== "";
}

function completionPresentation(state: ExecutiveCompletionState): CompletionPresentation {
  switch (state) {
    case "processing":
      return {
        eyebrow: "Processing",
        surface: EXECUTIVE_FEEDBACK_INFO,
        live: completionLive(EXECUTIVE_LOADING_LIVE),
        busy: true,
      };
    case "confirmed":
      return {
        eyebrow: "Confirmed",
        surface: EXECUTIVE_FEEDBACK_SUCCESS,
        live: completionLive(EXECUTIVE_FEEDBACK_LIVE.success),
        busy: false,
      };
    default: {
      const exhaustive: never = state;
      return exhaustive;
    }
  }
}

export function ExecutiveCompletionMoment({
  state,
  title,
  summary,
  detail,
  progress,
  nextAction,
  secondaryAction,
  className = "",
}: ExecutiveCompletionMomentProps) {
  const titleId = useId();
  const presentation = completionPresentation(state);
  const showProgress = state === "processing" && Number.isFinite(progress);
  const showNext = hasAction(nextAction);
  const showSecondary = hasAction(secondaryAction);

  return (
    <section
      className={`min-w-0 p-5 sm:p-6 ${presentation.surface} ${className}`}
      aria-labelledby={titleId}
      aria-busy={presentation.busy}
      aria-live={presentation.live}
      role="status"
    >
      <p className="np-type-eyebrow">{presentation.eyebrow}</p>
      <h2 id={titleId} className="np-type-h3 mt-3 text-pretty">
        {title}
      </h2>
      {hasText(summary) ? (
        <p className="np-type-body mt-3 text-pretty">{summary}</p>
      ) : null}
      {showProgress ? (
        <div className="mt-5">
          <ExecutiveProgress value={progress ?? 0} label={title} />
        </div>
      ) : null}
      {hasText(detail) ? (
        <p className="np-type-meta mt-4 text-pretty">{detail}</p>
      ) : null}
      {showNext || showSecondary ? (
        <div className="mt-6 flex min-w-0 flex-wrap items-center gap-3">
          {showNext ? <div className="min-w-0">{nextAction}</div> : null}
          {showSecondary ? <div className="min-w-0">{secondaryAction}</div> : null}
        </div>
      ) : null}
    </section>
  );
}

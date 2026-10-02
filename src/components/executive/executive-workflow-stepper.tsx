"use client";

import type { ReactNode } from "react";

import {
  EXECUTIVE_STEPPER_CURRENT,
  EXECUTIVE_STEPPER_DESCRIPTION,
  EXECUTIVE_STEPPER_DISABLED,
  EXECUTIVE_STEPPER_FOCUS,
  EXECUTIVE_STEPPER_ITEM_COMPACT,
  EXECUTIVE_STEPPER_ITEM_HORIZONTAL,
  EXECUTIVE_STEPPER_LABEL,
  EXECUTIVE_STEPPER_LIST_COMPACT,
  EXECUTIVE_STEPPER_LIST_HORIZONTAL,
  EXECUTIVE_STEPPER_MARKER,
  EXECUTIVE_STEPPER_MARKER_STATE,
  EXECUTIVE_STEPPER_SURFACE,
  EXECUTIVE_STEPPER_SURFACE_STATE,
  type ExecutiveStepperLayout,
  type ExecutiveStepperState,
} from "@/lib/design-system/executive-contract";

export type ExecutiveWorkflowStep = {
  id: string;
  label: string;
  description?: string;
  state: ExecutiveStepperState;
  disabled?: boolean;
  href?: string;
  onSelect?: () => void;
};

type ExecutiveWorkflowStepperProps = {
  steps: readonly ExecutiveWorkflowStep[];
  label?: string;
  layout?: ExecutiveStepperLayout;
  className?: string;
};

const STEP_STATE_LABEL: Record<ExecutiveStepperState, string> = {
  completed: "Completed",
  current: "Current",
  upcoming: "Upcoming",
};

function stepperListClass(layout: ExecutiveStepperLayout) {
  switch (layout) {
    case "horizontal":
      return EXECUTIVE_STEPPER_LIST_HORIZONTAL;
    case "compact":
      return EXECUTIVE_STEPPER_LIST_COMPACT;
    default: {
      const exhaustive: never = layout;
      return exhaustive;
    }
  }
}

function stepperItemClass(layout: ExecutiveStepperLayout) {
  switch (layout) {
    case "horizontal":
      return EXECUTIVE_STEPPER_ITEM_HORIZONTAL;
    case "compact":
      return EXECUTIVE_STEPPER_ITEM_COMPACT;
    default: {
      const exhaustive: never = layout;
      return exhaustive;
    }
  }
}

function stepMarker(state: ExecutiveStepperState, index: number) {
  switch (state) {
    case "completed":
      return "✓";
    case "current":
    case "upcoming":
      return String(index + 1);
    default: {
      const exhaustive: never = state;
      return exhaustive;
    }
  }
}

function stepClassName(step: ExecutiveWorkflowStep, interactive: boolean) {
  return [
    EXECUTIVE_STEPPER_SURFACE,
    EXECUTIVE_STEPPER_SURFACE_STATE[step.state],
    interactive ? EXECUTIVE_STEPPER_FOCUS : "",
    step.disabled ? EXECUTIVE_STEPPER_DISABLED : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function StepContent({
  step,
  index,
}: {
  step: ExecutiveWorkflowStep;
  index: number;
}) {
  const unavailable = step.disabled ? ", unavailable" : "";

  return (
    <>
      <span
        aria-hidden="true"
        className={`${EXECUTIVE_STEPPER_MARKER} ${EXECUTIVE_STEPPER_MARKER_STATE[step.state]}`}
      >
        {stepMarker(step.state, index)}
      </span>
      <span className="min-w-0">
        <span className="np-type-meta">Step {index + 1}</span>
        <span className="sr-only">
          {STEP_STATE_LABEL[step.state]}
          {unavailable}
        </span>
        <span className={EXECUTIVE_STEPPER_LABEL}>{step.label}</span>
        {step.description ? (
          <span className={EXECUTIVE_STEPPER_DESCRIPTION}>{step.description}</span>
        ) : null}
      </span>
    </>
  );
}

function StepControl({
  step,
  children,
}: {
  step: ExecutiveWorkflowStep;
  children: ReactNode;
}) {
  const interactive = !step.disabled && Boolean(step.href || step.onSelect);
  const className = stepClassName(step, interactive);
  const current = step.state === "current" ? EXECUTIVE_STEPPER_CURRENT : undefined;

  if (!step.disabled && step.href) {
    return (
      <a href={step.href} className={className} aria-current={current}>
        {children}
      </a>
    );
  }

  if (step.onSelect || step.href) {
    return (
      <button
        type="button"
        className={className}
        disabled={step.disabled === true}
        aria-current={current}
        onClick={step.disabled ? undefined : step.onSelect}
      >
        {children}
      </button>
    );
  }

  return (
    <div className={className} aria-current={current}>
      {children}
    </div>
  );
}

export function ExecutiveWorkflowStepper({
  steps,
  label = "Workflow progress",
  layout = "horizontal",
  className = "",
}: ExecutiveWorkflowStepperProps) {
  const listClass = stepperListClass(layout);
  const itemClass = stepperItemClass(layout);

  return (
    <nav aria-label={label} className={`min-w-0 ${className}`}>
      <ol className={listClass}>
        {steps.map((step, index) => (
          <li key={step.id} className={itemClass}>
            <StepControl step={step}>
              <StepContent step={step} index={index} />
            </StepControl>
          </li>
        ))}
      </ol>
    </nav>
  );
}

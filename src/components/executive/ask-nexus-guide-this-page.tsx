"use client";

import type { ComponentProps, ReactNode } from "react";

import { ExecutiveCoachmark } from "@/components/executive/executive-coachmark";

export type AskNexusGuideStep = {
  id: string;
  title: string;
  description: string;
};

type ExecutiveCoachmarkBindProps = Omit<
  ComponentProps<typeof ExecutiveCoachmark>,
  "children" | "className"
>;

export type AskNexusGuideThisPageHelpers = {
  guideActive: boolean;
  activeStepId: string | null;
  startGuide: () => void;
  closeGuide: () => void;
  nextStep: () => void;
  previousStep: () => void;
  isStepActive: (stepId: string) => boolean;
  getStepCoachmarkProps: (stepId: string) => ExecutiveCoachmarkBindProps | null;
};

export type AskNexusGuideThisPageProps = {
  steps: readonly AskNexusGuideStep[];
  activeStepId: string | null;
  onActiveStepChange: (stepId: string | null) => void;
  children: (helpers: AskNexusGuideThisPageHelpers) => ReactNode;
};

function normalizedText(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Normalize guide steps: trim, drop empties, dedupe by id, preserve order. */
export function normalizeAskNexusGuideSteps(
  steps: readonly AskNexusGuideStep[],
): AskNexusGuideStep[] {
  const seenIds = new Set<string>();
  const normalized: AskNexusGuideStep[] = [];

  for (const step of steps) {
    const id = normalizedText(step.id);
    const title = normalizedText(step.title);
    const description = normalizedText(step.description);

    if (!id || !title || !description) continue;
    if (seenIds.has(id)) continue;

    seenIds.add(id);
    normalized.push({ id, title, description });
  }

  return normalized;
}

/**
 * Build Guide This Page helpers from caller-owned active step state.
 * Replay is always available; no persistence or auto-start.
 */
export function createAskNexusGuideThisPageHelpers(options: {
  steps: readonly AskNexusGuideStep[];
  activeStepId: string | null;
  onActiveStepChange: (stepId: string | null) => void;
}): AskNexusGuideThisPageHelpers {
  const steps = normalizeAskNexusGuideSteps(options.steps);
  const activeStepId =
    typeof options.activeStepId === "string" &&
    options.activeStepId.trim().length > 0
      ? options.activeStepId.trim()
      : null;
  const activeIndex =
    activeStepId === null
      ? -1
      : steps.findIndex((step) => step.id === activeStepId);
  const guideActive = activeIndex >= 0;
  const activeStep = guideActive ? steps[activeIndex] : null;

  const closeGuide = () => {
    options.onActiveStepChange(null);
  };

  const startGuide = () => {
    const first = steps[0];
    options.onActiveStepChange(first ? first.id : null);
  };

  const nextStep = () => {
    if (!guideActive || !activeStep) {
      options.onActiveStepChange(null);
      return;
    }

    const next = steps[activeIndex + 1];
    options.onActiveStepChange(next ? next.id : null);
  };

  const previousStep = () => {
    if (!guideActive || activeIndex <= 0) {
      return;
    }

    const previous = steps[activeIndex - 1];
    if (previous) {
      options.onActiveStepChange(previous.id);
    }
  };

  const isStepActive = (stepId: string) => {
    const normalizedStepId = normalizedText(stepId);
    return (
      guideActive &&
      normalizedStepId !== null &&
      activeStepId === normalizedStepId
    );
  };

  const getStepCoachmarkProps = (
    stepId: string,
  ): ExecutiveCoachmarkBindProps | null => {
    const normalizedStepId = normalizedText(stepId);
    if (!normalizedStepId) return null;

    const stepIndex = steps.findIndex((step) => step.id === normalizedStepId);
    if (stepIndex < 0) return null;

    const step = steps[stepIndex];
    if (!step) return null;

    const isLast = stepIndex === steps.length - 1;
    const open = guideActive && activeStepId === step.id;

    return {
      open,
      title: step.title,
      description: step.description,
      actionLabel: isLast ? "Finish" : "Next",
      onAction: nextStep,
      dismissLabel: "Close",
      onDismiss: closeGuide,
    };
  };

  return {
    guideActive,
    activeStepId: guideActive ? activeStepId : null,
    startGuide,
    closeGuide,
    nextStep,
    previousStep,
    isStepActive,
    getStepCoachmarkProps,
  };
}

/**
 * Explicitly user-invoked Guide This Page controller.
 * Callers wrap real page anchors with ExecutiveCoachmark using helper props.
 */
export function AskNexusGuideThisPage({
  steps,
  activeStepId,
  onActiveStepChange,
  children,
}: AskNexusGuideThisPageProps) {
  return children(
    createAskNexusGuideThisPageHelpers({
      steps,
      activeStepId,
      onActiveStepChange,
    }),
  );
}

// Retain a direct type-level link to ExecutiveCoachmark for callers/tests.
export type AskNexusGuideCoachmarkProps = ExecutiveCoachmarkBindProps;

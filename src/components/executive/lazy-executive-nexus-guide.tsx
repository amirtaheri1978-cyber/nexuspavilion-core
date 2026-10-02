"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

export type LazyExecutiveNexusGuideProps = {
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

const ExecutiveNexusGuide = dynamic(
  () =>
    import("@/components/executive/executive-nexus-guide").then(
      (mod) => mod.ExecutiveNexusGuide,
    ),
  {
    ssr: false,
    loading: () => null,
  },
);

/**
 * Lazy boundary for ExecutiveNexusGuide.
 * Renders nothing while closed so the interactive drawer stays off the critical path.
 */
export function LazyExecutiveNexusGuide({
  open,
  onClose,
  workflow,
  readiness,
  attentionItems,
  suggestedNextStep,
  primaryAction,
  secondaryAction,
  className,
}: LazyExecutiveNexusGuideProps) {
  if (!open) return null;

  return (
    <ExecutiveNexusGuide
      open={open}
      onClose={onClose}
      workflow={workflow}
      readiness={readiness}
      attentionItems={attentionItems}
      suggestedNextStep={suggestedNextStep}
      primaryAction={primaryAction}
      secondaryAction={secondaryAction}
      className={className}
    />
  );
}

import type { ExecutiveEvidence } from "@/lib/analytics/executive/executive-insight";

export type ExecutiveReasoningInput = {
  subject: string;
  evidence: ExecutiveEvidence[];
  fallbackReason: string;
  recommendation: string;
};

export type ExecutiveReasoningResult = {
  reason: string;
  recommendation: string;
  drivers: ExecutiveEvidence[];
};

export function buildExecutiveReasoning({
  subject,
  evidence,
  fallbackReason,
  recommendation,
}: ExecutiveReasoningInput): ExecutiveReasoningResult {
  const drivers = [...evidence];

  const primaryDriver = drivers[0];
  const secondaryDriver = drivers[1];

  const reason =
    primaryDriver && secondaryDriver
      ? `${subject} is primarily influenced by ${primaryDriver.label.toLowerCase()} at ${primaryDriver.value}, with additional evidence from ${secondaryDriver.label.toLowerCase()} at ${secondaryDriver.value}.`
      : primaryDriver
        ? `${subject} is primarily influenced by ${primaryDriver.label.toLowerCase()} at ${primaryDriver.value}.`
        : fallbackReason;

  return {
    reason,
    recommendation,
    drivers,
  };
}

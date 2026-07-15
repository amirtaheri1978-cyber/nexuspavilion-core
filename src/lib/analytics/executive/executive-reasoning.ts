import type {
  ExecutiveEvidence,
  ExecutiveInsightSeverity,
} from "@/lib/analytics/executive/executive-insight";

export type ExecutiveReasoningInput = {
  subject: string;
  severity: ExecutiveInsightSeverity;
  evidence: ExecutiveEvidence[];
  fallbackReason: string;
  fallbackRecommendation: string;
};

export type ExecutiveReasoningResult = {
  reason: string;
  recommendation: string;
  drivers: ExecutiveEvidence[];
};

function getPriorityEvidence(
  evidence: ExecutiveEvidence[],
): ExecutiveEvidence[] {
  const statusPriority: Record<
    ExecutiveEvidence["status"],
    number
  > = {
    critical: 6,
    limited: 5,
    moderate: 4,
    neutral: 3,
    healthy: 2,
    strong: 1,
  };

  return [...evidence].sort(
    (left, right) =>
      statusPriority[right.status] -
      statusPriority[left.status],
  );
}

export function buildExecutiveReasoning({
  subject,
  severity,
  evidence,
  fallbackReason,
  fallbackRecommendation,
}: ExecutiveReasoningInput): ExecutiveReasoningResult {
  const drivers = getPriorityEvidence(evidence);
  const primaryDriver = drivers[0];
  const secondaryDriver = drivers[1];

  const reason =
    primaryDriver && secondaryDriver
      ? `${subject} is primarily influenced by ${primaryDriver.label.toLowerCase()} at ${primaryDriver.value}, supported by ${secondaryDriver.label.toLowerCase()} at ${secondaryDriver.value}.`
      : primaryDriver
        ? `${subject} is primarily influenced by ${primaryDriver.label.toLowerCase()} at ${primaryDriver.value}.`
        : fallbackReason;

  const recommendation =
    severity === "high"
      ? `Prioritize immediate leadership review of ${subject.toLowerCase()} and validate the supporting commercial, supplier, and governance evidence before proceeding.`
      : severity === "medium"
        ? `Assign management ownership for ${subject.toLowerCase()} and review the supporting evidence during the current procurement cycle.`
        : fallbackRecommendation;

  return {
    reason,
    recommendation,
    drivers,
  };
}
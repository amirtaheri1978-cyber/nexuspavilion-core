import type { ExecutiveEvidenceStatus } from "@/lib/analytics/executive/executive-insight";

export type ExecutiveSignalCategory =
  | "commercial"
  | "competition"
  | "supplier"
  | "risk"
  | "classification"
  | "confidence"
  | "governance";

export type ExecutiveSignal = {
  id: string;
  category: ExecutiveSignalCategory;
  label: string;
  value: string;
  status: ExecutiveEvidenceStatus;
  importance: number;
  description: string;
};

function normalizeImportance(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

export function createExecutiveSignal({
  id,
  category,
  label,
  value,
  status,
  importance,
  description,
}: ExecutiveSignal): ExecutiveSignal {
  return {
    id: id.trim(),
    category,
    label: label.trim(),
    value: value.trim(),
    status,
    importance: normalizeImportance(importance),
    description: description.trim(),
  };
}

export function prioritizeExecutiveSignals(
  signals: ExecutiveSignal[],
): ExecutiveSignal[] {
  const statusPriority: Record<ExecutiveEvidenceStatus, number> = {
    critical: 6,
    limited: 5,
    moderate: 4,
    neutral: 3,
    healthy: 2,
    strong: 1,
  };

  return [...signals].sort((left, right) => {
    const statusDifference =
      statusPriority[right.status] -
      statusPriority[left.status];

    if (statusDifference !== 0) {
      return statusDifference;
    }

    return right.importance - left.importance;
  });
}
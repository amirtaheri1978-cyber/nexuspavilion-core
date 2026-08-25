import type { RfqCapabilities } from "@/lib/procurement/rfq-access-contract";

export const RFQ_BUYER_ONLY_INTELLIGENCE_MARKERS = [
  "Executive Decision Center",
  "Award Readiness",
  "Potential Savings",
  "Supplier Coverage",
  "Procurement Health Engine",
  "Health Breakdown",
  "Executive Risk Matrix",
  "Award Path",
] as const;

export type RfqDetailCommandMetric = {
  title: string;
  value: string;
  detail: string;
  accentClassName: string;
};

export function canExposeRfqBuyerExecutiveIntelligence(
  capabilities: Pick<RfqCapabilities, "canViewExecutiveIntelligence">,
) {
  return capabilities.canViewExecutiveIntelligence === true;
}

export function serializeRfqBuyerExecutiveIntelligenceForViewer<T>(
  canViewExecutiveIntelligence: boolean,
  intelligence: T | null | undefined,
): T | null {
  if (!canViewExecutiveIntelligence || intelligence == null) {
    return null;
  }

  return intelligence;
}

export function selectRfqDetailCommandMetrics({
  canViewExecutiveIntelligence,
  procurementHealthMetric,
  sharedMetrics,
}: {
  canViewExecutiveIntelligence: boolean;
  procurementHealthMetric: RfqDetailCommandMetric | null;
  sharedMetrics: readonly RfqDetailCommandMetric[];
}): RfqDetailCommandMetric[] {
  if (!canViewExecutiveIntelligence || !procurementHealthMetric) {
    return [...sharedMetrics];
  }

  return [procurementHealthMetric, ...sharedMetrics];
}

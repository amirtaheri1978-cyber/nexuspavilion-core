import type { ExecutiveInsight } from "@/lib/analytics/executive/executive-insight";
import type { ExecutiveSignal } from "@/lib/analytics/executive/executive-signal";

export type ExecutiveInsightBundle = {
  insight: ExecutiveInsight;
  signals: ExecutiveSignal[];
};
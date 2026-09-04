export type ActivityView = "attention" | "updates" | "history";

export type ActivityCenterNotificationLike = {
  type: string | null;
  created_at: string | null;
};

const ATTENTION_TYPES = new Set([
  "quote",
  "rfi",
  "rfi_response",
  "addendum_action_required",
]);

const UPDATE_TYPES = new Set([
  "rfq",
  "invitation",
  "addendum",
  "addendum_acknowledgement",
  "award",
  "company",
  "approved_vendor",
  "supplier_compliance",
]);

const ATTENTION_PRIORITY: Record<string, number> = {
  addendum_action_required: 0,
  rfi: 1,
  rfi_response: 2,
  quote: 3,
};

function toTimestamp(value: string | null) {
  if (!value) return 0;

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function classifyActivityView(type: string | null): ActivityView {
  const value = String(type || "");

  if (ATTENTION_TYPES.has(value)) return "attention";
  if (UPDATE_TYPES.has(value)) return "updates";
  return "history";
}

export function prioritizeAttentionRows<
  T extends ActivityCenterNotificationLike,
>(rows: readonly T[]): T[] {
  return [...rows].sort((left, right) => {
    const leftPriority =
      ATTENTION_PRIORITY[String(left.type || "")] ?? Number.MAX_SAFE_INTEGER;
    const rightPriority =
      ATTENTION_PRIORITY[String(right.type || "")] ?? Number.MAX_SAFE_INTEGER;

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return toTimestamp(right.created_at) - toTimestamp(left.created_at);
  });
}

export function resolveRfqSourceHref(
  sourceRfqId: string | null | undefined,
  sourceRfqSlugById: ReadonlyMap<string, string>,
) {
  if (!sourceRfqId) return null;

  const slug = sourceRfqSlugById.get(sourceRfqId)?.trim();

  if (!slug) return null;

  return `/rfq/${encodeURIComponent(slug)}`;
}

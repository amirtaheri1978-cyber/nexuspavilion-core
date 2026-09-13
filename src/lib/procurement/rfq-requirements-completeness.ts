import { resolveRfqDeadlineForStorage } from "@/lib/datetime/local-date-time-to-utc";

export type RfqRequirementKey =
  | "title"
  | "description"
  | "category"
  | "location"
  | "submission_deadline"
  | "procurement_scope"
  | "sourcing_method"
  | "contract_framework"
  | "bid_model";

export type RfqPublicationIssueKey = "rfi_deadline" | "project_schedule";

export type RfqRequirementsInput = {
  title?: unknown;
  description?: unknown;
  category?: unknown;
  location?: unknown;
  deadline?: unknown;
  deadline_timezone?: unknown;
  rfi_deadline?: unknown;
  rfi_deadline_timezone?: unknown;
  mobilization_date?: unknown;
  substantial_completion_date?: unknown;
  procurement_scope?: unknown;
  sourcing_method?: unknown;
  contract_framework?: unknown;
  bid_model?: unknown;
};

export type RfqRequirementSignal = {
  key: RfqRequirementKey;
  label: string;
  complete: boolean;
  source: string;
  context: string;
  step: 0 | 1;
};

export type RfqPublicationIssue = {
  key: RfqPublicationIssueKey;
  label: string;
  source: string;
  context: string;
  step: 2;
};

export type RfqRequirementsCompleteness = {
  status: "ready" | "incomplete";
  completedCount: number;
  totalCount: number;
  completionPercent: number;
  signals: RfqRequirementSignal[];
  missingSignals: RfqRequirementSignal[];
  blockingIssues: RfqPublicationIssue[];
};

const PROCUREMENT_SCOPES = new Set([
  "material",
  "subcontractor",
  "equipment",
  "professional_service",
]);
const SOURCING_METHODS = new Set(["open", "invited", "sealed_bid"]);
const CONTRACT_FRAMEWORKS = new Set(["project_specific", "framework"]);
const BID_MODELS = new Set([
  "lump_sum",
  "best_value",
  "construction_management",
]);
const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function isAllowedValue(value: unknown, allowed: Set<string>) {
  return allowed.has(normalizeText(value));
}

function resolveDeadlineInstant(
  deadline: unknown,
  deadlineTimezone: unknown,
): string | null {
  try {
    return resolveRfqDeadlineForStorage({
      deadline,
      deadline_timezone: deadlineTimezone,
    }).deadline;
  } catch {
    return null;
  }
}

function parseDateOnly(value: unknown): number | null {
  const normalized = normalizeText(value);
  if (!normalized) return null;

  const match = DATE_ONLY_PATTERN.exec(normalized);
  if (!match) return Number.NaN;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const instant = Date.UTC(year, month - 1, day);
  const resolved = new Date(instant);

  if (
    resolved.getUTCFullYear() !== year ||
    resolved.getUTCMonth() + 1 !== month ||
    resolved.getUTCDate() !== day
  ) {
    return Number.NaN;
  }

  return instant;
}

export function isRfqPublicationAcknowledged(value: unknown): boolean {
  return value === true;
}

export function evaluateRfqRequirements(
  input: RfqRequirementsInput,
): RfqRequirementsCompleteness {
  const title = normalizeText(input.title);
  const description = normalizeText(input.description);
  const category = normalizeText(input.category);
  const location = normalizeText(input.location);
  const deadline = normalizeText(input.deadline);
  const submissionDeadlineInstant = resolveDeadlineInstant(
    deadline,
    input.deadline_timezone,
  );

  const signals: RfqRequirementSignal[] = [
    {
      key: "title",
      label: "Clear RFQ title",
      complete: title.length >= 3,
      source: "Project · RFQ Title",
      context: "Enter an RFQ title with at least 3 characters.",
      step: 0,
    },
    {
      key: "description",
      label: "Scope of work summary",
      complete: description.length >= 9,
      source: "Project · Scope of Work Summary",
      context: "Provide at least 9 characters for the scope-of-work summary.",
      step: 0,
    },
    {
      key: "category",
      label: "Category / Trade",
      complete: category.length >= 2,
      source: "Project · Category / Trade",
      context: "Enter at least 2 characters for the trade or category.",
      step: 0,
    },
    {
      key: "location",
      label: "Project location",
      complete: location.length >= 2,
      source: "Project · Project Location",
      context: "Enter at least 2 characters for the project location.",
      step: 0,
    },
    {
      key: "submission_deadline",
      label: "Valid submission deadline",
      complete: deadline.length > 0 && submissionDeadlineInstant !== null,
      source: "Project · Submission Closing",
      context:
        "Set a valid supplier submission closing date, time, and IANA timezone.",
      step: 0,
    },
    {
      key: "procurement_scope",
      label: "Procurement scope",
      complete: isAllowedValue(input.procurement_scope, PROCUREMENT_SCOPES),
      source: "Strategy · Procurement Scope",
      context: "Select a supported procurement scope before publication.",
      step: 1,
    },
    {
      key: "sourcing_method",
      label: "Sourcing method",
      complete: isAllowedValue(input.sourcing_method, SOURCING_METHODS),
      source: "Strategy · Sourcing Method",
      context: "Select a supported sourcing method before publication.",
      step: 1,
    },
    {
      key: "contract_framework",
      label: "Contract framework",
      complete: isAllowedValue(input.contract_framework, CONTRACT_FRAMEWORKS),
      source: "Strategy · Contract Framework",
      context: "Select a supported contract framework before publication.",
      step: 1,
    },
    {
      key: "bid_model",
      label: "Evaluation model",
      complete: isAllowedValue(input.bid_model, BID_MODELS),
      source: "Strategy · Evaluation Model",
      context: "Select a supported evaluation model before publication.",
      step: 1,
    },
  ];

  const blockingIssues: RfqPublicationIssue[] = [];
  const rawRfiDeadline = normalizeText(input.rfi_deadline);

  if (rawRfiDeadline) {
    const rfiDeadlineInstant = resolveDeadlineInstant(
      rawRfiDeadline,
      input.rfi_deadline_timezone,
    );

    if (!rfiDeadlineInstant) {
      blockingIssues.push({
        key: "rfi_deadline",
        label: "RFI deadline is invalid",
        source: "Controls · RFI / Clarification Deadline",
        context: "Correct the RFI deadline or timezone before publication.",
        step: 2,
      });
    } else if (
      submissionDeadlineInstant &&
      Date.parse(rfiDeadlineInstant) > Date.parse(submissionDeadlineInstant)
    ) {
      blockingIssues.push({
        key: "rfi_deadline",
        label: "RFI deadline is after submission closing",
        source: "Controls · RFI / Clarification Deadline",
        context:
          "Set the RFI deadline at or before the supplier submission closing deadline.",
        step: 2,
      });
    }
  }

  const mobilization = parseDateOnly(input.mobilization_date);
  const substantialCompletion = parseDateOnly(input.substantial_completion_date);

  if (Number.isNaN(mobilization) || Number.isNaN(substantialCompletion)) {
    blockingIssues.push({
      key: "project_schedule",
      label: "Project schedule date is invalid",
      source: "Controls · Project Schedule",
      context: "Correct the mobilization or substantial completion date.",
      step: 2,
    });
  } else if (
    mobilization !== null &&
    substantialCompletion !== null &&
    mobilization > substantialCompletion
  ) {
    blockingIssues.push({
      key: "project_schedule",
      label: "Mobilization is after substantial completion",
      source: "Controls · Project Schedule",
      context:
        "Set target mobilization on or before the substantial completion date.",
      step: 2,
    });
  }

  const completedCount = signals.filter((signal) => signal.complete).length;
  const totalCount = signals.length;
  const missingSignals = signals.filter((signal) => !signal.complete);
  const status =
    missingSignals.length === 0 && blockingIssues.length === 0
      ? "ready"
      : "incomplete";

  return {
    status,
    completedCount,
    totalCount,
    completionPercent: Math.round((completedCount / totalCount) * 100),
    signals,
    missingSignals,
    blockingIssues,
  };
}

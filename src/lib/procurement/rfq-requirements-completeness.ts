export type RfqRequirementKey =
  | "title"
  | "description"
  | "category"
  | "location"
  | "submission_deadline";

export type RfqRequirementsInput = {
  title?: unknown;
  description?: unknown;
  category?: unknown;
  location?: unknown;
  deadline?: unknown;
};

export type RfqRequirementSignal = {
  key: RfqRequirementKey;
  label: string;
  complete: boolean;
  source: string;
  context: string;
};

export type RfqRequirementsCompleteness = {
  status: "ready" | "incomplete";
  completedCount: number;
  totalCount: number;
  completionPercent: number;
  signals: RfqRequirementSignal[];
  missingSignals: RfqRequirementSignal[];
};

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

export function evaluateRfqRequirements(
  input: RfqRequirementsInput,
): RfqRequirementsCompleteness {
  const title = normalizeText(input.title);
  const description = normalizeText(input.description);
  const category = normalizeText(input.category);
  const location = normalizeText(input.location);
  const deadline = normalizeText(input.deadline);

  const signals: RfqRequirementSignal[] = [
    {
      key: "title",
      label: "Clear RFQ title",
      complete: title.length >= 3,
      source: "RFQ Details · RFQ Title",
      context: "Enter an RFQ title with at least 3 characters.",
    },
    {
      key: "description",
      label: "Scope of work summary",
      complete: description.length >= 9,
      source: "RFQ Details · Scope of Work Summary",
      context: "Provide at least 9 characters for the scope-of-work summary.",
    },
    {
      key: "category",
      label: "Category / Trade",
      complete: category.length >= 2,
      source: "RFQ Details · Category / Trade",
      context: "Enter at least 2 characters for the trade or category.",
    },
    {
      key: "location",
      label: "Project location",
      complete: location.length >= 2,
      source: "RFQ Details · Project Location",
      context: "Enter at least 2 characters for the project location.",
    },
    {
      key: "submission_deadline",
      label: "Submission deadline",
      complete: deadline.length > 0,
      source: "RFQ Details · Submission Closing",
      context: "Set the supplier submission closing date and time.",
    },
  ];

  const completedCount = signals.filter((signal) => signal.complete).length;
  const totalCount = signals.length;
  const missingSignals = signals.filter((signal) => !signal.complete);

  return {
    status: missingSignals.length === 0 ? "ready" : "incomplete",
    completedCount,
    totalCount,
    completionPercent: Math.round((completedCount / totalCount) * 100),
    signals,
    missingSignals,
  };
}

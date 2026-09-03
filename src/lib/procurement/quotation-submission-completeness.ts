export type QuotationSubmissionRequirementKey =
  | "amount"
  | "timeline"
  | "proposal_note";

export type QuotationSubmissionCompletenessInput = {
  amountNumber?: unknown;
  timeline?: unknown;
  message?: unknown;
};

export type QuotationSubmissionCompletenessSignal = {
  key: QuotationSubmissionRequirementKey;
  label: string;
  complete: boolean;
  source: string;
  context: string;
};

export type QuotationSubmissionCompleteness = {
  status: "complete" | "incomplete";
  completedCount: number;
  totalCount: number;
  completionPercent: number;
  signals: QuotationSubmissionCompletenessSignal[];
  missingSignals: QuotationSubmissionCompletenessSignal[];
};

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeAmountNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

export function evaluateQuotationSubmissionCompleteness(
  input: QuotationSubmissionCompletenessInput,
): QuotationSubmissionCompleteness {
  const amountNumber = normalizeAmountNumber(input.amountNumber);
  const timeline = normalizeText(input.timeline);
  const message = normalizeText(input.message);

  const signals: QuotationSubmissionCompletenessSignal[] = [
    {
      key: "amount",
      label: "Quote amount",
      complete: amountNumber >= 1000,
      source: "Quotation / Quote amount",
      context: "Enter the full contract value of at least 1,000.",
    },
    {
      key: "timeline",
      label: "Delivery timeline",
      complete: timeline.length > 0,
      source: "Quotation / Delivery timeline",
      context: "Enter a delivery timeline.",
    },
    {
      key: "proposal_note",
      label: "Proposal note",
      complete: message.length > 0,
      source: "Quotation / Proposal note",
      context: "Include a proposal note.",
    },
  ];

  const completedCount = signals.filter((signal) => signal.complete).length;
  const totalCount = signals.length;
  const missingSignals = signals.filter((signal) => !signal.complete);

  return {
    status: missingSignals.length === 0 ? "complete" : "incomplete",
    completedCount,
    totalCount,
    completionPercent: Math.round((completedCount / totalCount) * 100),
    signals,
    missingSignals,
  };
}

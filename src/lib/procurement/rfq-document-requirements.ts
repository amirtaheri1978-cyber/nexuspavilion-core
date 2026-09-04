import {
  RFQ_ATTACHMENT_TYPE_LABELS,
  RFQ_ATTACHMENT_TYPES,
  isRfqAttachmentType,
  type RfqAttachmentType,
} from "@/lib/procurement/rfq-attachment-types";

export type RfqDocumentRequirementRecord = {
  id: string;
  rfq_id: string;
  attachment_type: string;
  created_by?: string | null;
  created_at?: string | null;
};

export type RfqDocumentAttachmentEvidence = {
  id: string;
  file_name: string;
  attachment_type: string;
  revision_label?: string | null;
  created_at?: string | null;
};

export type RfqDocumentRequirementSignal = {
  key: RfqAttachmentType;
  label: string;
  state: "present" | "missing";
  required: true;
  source: string;
  context: string;
  requirementId: string;
  matchingAttachments: RfqDocumentAttachmentEvidence[];
};

export type RfqDocumentCoverage = {
  coverageStatus: "not_declared" | "complete" | "incomplete";
  requiredCount: number;
  presentCount: number;
  missingCount: number;
  signals: RfqDocumentRequirementSignal[];
  missingSignals: RfqDocumentRequirementSignal[];
};

export type RfqDocumentCoverageUnavailableReason =
  | "requirements_query_failed"
  | "attachments_query_failed";

export type RfqDocumentCoverageState =
  | { kind: "available"; evaluation: RfqDocumentCoverage }
  | {
      kind: "unavailable";
      reason: RfqDocumentCoverageUnavailableReason;
    };

function getRequirementByType(
  requirements: RfqDocumentRequirementRecord[],
) {
  const requirementByType = new Map<
    RfqAttachmentType,
    RfqDocumentRequirementRecord
  >();

  for (const requirement of requirements) {
    if (
      isRfqAttachmentType(requirement.attachment_type) &&
      !requirementByType.has(requirement.attachment_type)
    ) {
      requirementByType.set(requirement.attachment_type, requirement);
    }
  }

  return requirementByType;
}

function getAttachmentsByType(
  attachments: RfqDocumentAttachmentEvidence[],
) {
  const attachmentsByType = new Map<
    RfqAttachmentType,
    RfqDocumentAttachmentEvidence[]
  >();

  for (const attachmentType of RFQ_ATTACHMENT_TYPES) {
    attachmentsByType.set(attachmentType, []);
  }

  for (const attachment of attachments) {
    if (!isRfqAttachmentType(attachment.attachment_type)) continue;

    attachmentsByType.get(attachment.attachment_type)?.push(attachment);
  }

  return attachmentsByType;
}

export function evaluateRfqDocumentCoverage(
  requirements: RfqDocumentRequirementRecord[],
  attachments: RfqDocumentAttachmentEvidence[],
): RfqDocumentCoverage {
  const requirementByType = getRequirementByType(requirements);
  const attachmentsByType = getAttachmentsByType(attachments);

  const signals = RFQ_ATTACHMENT_TYPES.flatMap((attachmentType) => {
    const requirement = requirementByType.get(attachmentType);

    if (!requirement) return [];

    const matchingAttachments = attachmentsByType.get(attachmentType) ?? [];
    const label = RFQ_ATTACHMENT_TYPE_LABELS[attachmentType];
    const present = matchingAttachments.length > 0;

    return [
      {
        key: attachmentType,
        label,
        state: present ? ("present" as const) : ("missing" as const),
        required: true as const,
        source: `RFQ Document Requirements · ${label}`,
        context: present
          ? `${matchingAttachments.length} current RFQ package document${matchingAttachments.length === 1 ? "" : "s"} recorded under ${label}.`
          : `No current RFQ package document is recorded under ${label}.`,
        requirementId: requirement.id,
        matchingAttachments,
      },
    ];
  });

  const requiredCount = signals.length;
  const presentCount = signals.filter(
    (signal) => signal.state === "present",
  ).length;
  const missingSignals = signals.filter(
    (signal) => signal.state === "missing",
  );
  const missingCount = missingSignals.length;

  return {
    coverageStatus:
      requiredCount === 0
        ? "not_declared"
        : missingCount === 0
          ? "complete"
          : "incomplete",
    requiredCount,
    presentCount,
    missingCount,
    signals,
    missingSignals,
  };
}

export function buildRfqDocumentCoverageState({
  requirements,
  attachments,
  unavailableReason = null,
}: {
  requirements: RfqDocumentRequirementRecord[];
  attachments: RfqDocumentAttachmentEvidence[];
  unavailableReason?: RfqDocumentCoverageUnavailableReason | null;
}): RfqDocumentCoverageState {
  if (unavailableReason) {
    return {
      kind: "unavailable",
      reason: unavailableReason,
    };
  }

  return {
    kind: "available",
    evaluation: evaluateRfqDocumentCoverage(requirements, attachments),
  };
}

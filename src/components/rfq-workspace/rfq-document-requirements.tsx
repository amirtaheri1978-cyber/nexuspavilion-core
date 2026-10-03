"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ExecutiveBadge } from "@/components/executive/executive-badge";
import { RFQAmendmentEvidenceFields } from "@/components/rfq-amendment-evidence-fields";
import {
  EXECUTIVE_BUTTON_SECONDARY,
  EXECUTIVE_FEEDBACK_ERROR,
  EXECUTIVE_FEEDBACK_SUCCESS,
  EXECUTIVE_FEEDBACK_WARNING,
  EXECUTIVE_FORM_HELPER,
  type ExecutiveContractBadgeTone,
} from "@/lib/design-system/executive-contract";
import {
  RFQ_ATTACHMENT_TYPE_LABELS,
  RFQ_ATTACHMENT_TYPES,
  type RfqAttachmentType,
} from "@/lib/procurement/rfq-attachment-types";
import {
  buildRfqDocumentCoverageState,
  type RfqDocumentAttachmentEvidence,
  type RfqDocumentCoverageUnavailableReason,
  type RfqDocumentRequirementRecord,
} from "@/lib/procurement/rfq-document-requirements";
import { createClient } from "@/lib/supabase/client";

export const RFQ_DOCUMENT_REQUIREMENTS_UPDATED_EVENT =
  "rfq-document-requirements-updated";
export const RFQ_GOVERNED_REQUIREMENT_HANDOFF_EVENT =
  "rfq-governed-requirement-handoff";

type GovernedRequirementHandoffDetail = {
  rfqId: string;
  title: string;
  reason: string;
  affectedDocuments: string;
};

type RFQDocumentRequirementsProps = {
  rfqId: string;
  rfqStatus?: string | null;
  canManage: boolean;
  initialRequirements: RfqDocumentRequirementRecord[];
  initialDocuments: RfqDocumentAttachmentEvidence[];
  initialUnavailableReason?: RfqDocumentCoverageUnavailableReason | null;
};

type RequirementMutationResponse = {
  addendumId?: string;
  addendumNumber?: number | string | null;
  error?: string;
  success?: boolean;
  changed?: boolean;
  status?:
    | "declared"
    | "already_declared"
    | "removed"
    | "already_not_declared";
  requirement?: RfqDocumentRequirementRecord | null;
};

function getCoveragePresentation(
  coverageStatus: "not_declared" | "complete" | "incomplete",
): {
  label: string;
  tone: ExecutiveContractBadgeTone;
} {
  if (coverageStatus === "complete") {
    return {
      label: "Complete",
      tone: "success",
    };
  }

  if (coverageStatus === "incomplete") {
    return {
      label: "Incomplete",
      tone: "risk",
    };
  }

  return {
    label: "No Requirements Declared",
    tone: "neutral",
  };
}

function getRequirementPresentation({
  required,
  present,
}: {
  required: boolean;
  present: boolean;
}): {
  label: string;
  tone: ExecutiveContractBadgeTone;
} {
  if (!required) {
    return {
      label: "Not Declared as Required",
      tone: "neutral",
    };
  }

  if (present) {
    return {
      label: "Required · Document Present",
      tone: "success",
    };
  }

  return {
    label: "Required · Missing",
    tone: "risk",
  };
}

function getUnavailableMessage(reason: RfqDocumentCoverageUnavailableReason) {
  return reason === "requirements_query_failed"
    ? "The declared required-document checklist could not be loaded. Coverage is unavailable rather than assumed empty."
    : "Current RFQ package documents could not be loaded. Coverage is unavailable rather than treating every declared requirement as missing.";
}

export function RFQDocumentRequirements({
  rfqId,
  rfqStatus = "open",
  canManage,
  initialRequirements,
  initialDocuments,
  initialUnavailableReason = null,
}: RFQDocumentRequirementsProps) {
  const supabase = useMemo(() => createClient(), []);
  const [requirements, setRequirements] =
    useState<RfqDocumentRequirementRecord[]>(initialRequirements);
  const [documents, setDocuments] =
    useState<RfqDocumentAttachmentEvidence[]>(initialDocuments);
  const [unavailableReason, setUnavailableReason] =
    useState<RfqDocumentCoverageUnavailableReason | null>(
      initialUnavailableReason,
    );
  const [mutatingType, setMutatingType] = useState<RfqAttachmentType | null>(
    null,
  );
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [handoffGuidance, setHandoffGuidance] = useState("");
  const [addendumTitle, setAddendumTitle] = useState("");
  const [amendmentReason, setAmendmentReason] = useState("");
  const isPublished = rfqStatus !== "draft";

  const coverageState = useMemo(
    () =>
      buildRfqDocumentCoverageState({
        requirements,
        attachments: documents,
        unavailableReason,
      }),
    [documents, requirements, unavailableReason],
  );

  const requirementByType = useMemo(
    () =>
      new Map(
        requirements
          .filter((requirement) =>
            RFQ_ATTACHMENT_TYPES.includes(
              requirement.attachment_type as RfqAttachmentType,
            ),
          )
          .map((requirement) => [
            requirement.attachment_type as RfqAttachmentType,
            requirement,
          ]),
      ),
    [requirements],
  );

  const refreshDocuments = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from("rfq_attachments")
      .select("id, file_name, attachment_type, revision_label, created_at")
      .eq("rfq_id", rfqId)
      .order("created_at", { ascending: false });

    if (loadError) {
      setUnavailableReason("attachments_query_failed");
      return;
    }

    setDocuments((data ?? []) as RfqDocumentAttachmentEvidence[]);
    setUnavailableReason((current) =>
      current === "attachments_query_failed" ? null : current,
    );
  }, [rfqId, supabase]);

  useEffect(() => {
    function handleDocumentsUpdated() {
      void refreshDocuments();
    }

    window.addEventListener("rfq-documents-updated", handleDocumentsUpdated);

    return () => {
      window.removeEventListener(
        "rfq-documents-updated",
        handleDocumentsUpdated,
      );
    };
  }, [refreshDocuments]);

  useEffect(() => {
    function handleGovernedRequirementHandoff(event: Event) {
      const detail = (event as CustomEvent<GovernedRequirementHandoffDetail>)
        .detail;

      if (!canManage || detail?.rfqId !== rfqId) return;

      setAddendumTitle(detail.title);
      setAmendmentReason(detail.reason);
      setError("");
      setMessage("");
      setHandoffGuidance(
        detail.affectedDocuments
          ? `Choose the matching document category for “${detail.affectedDocuments}”, then declare or remove its requirement.`
          : "Choose the document category, then declare or remove its requirement.",
      );
    }

    window.addEventListener(
      RFQ_GOVERNED_REQUIREMENT_HANDOFF_EVENT,
      handleGovernedRequirementHandoff,
    );

    return () => {
      window.removeEventListener(
        RFQ_GOVERNED_REQUIREMENT_HANDOFF_EVENT,
        handleGovernedRequirementHandoff,
      );
    };
  }, [canManage, rfqId]);

  const mutateRequirement = useCallback(
    async (attachmentType: RfqAttachmentType, required: boolean) => {
      if (!canManage || mutatingType) return;

      if (
        isPublished &&
        (!addendumTitle.trim() || !amendmentReason.trim())
      ) {
        setError(
          "Enter an Addendum title and amendment reason before changing a published RFQ requirement.",
        );
        return;
      }

      setMutatingType(attachmentType);
      setError("");
      setMessage("");

      try {
        const response = await fetch("/api/rfq-document-requirements", {
          method: required ? "POST" : "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            rfqId,
            attachmentType,
            ...(isPublished
              ? {
                  addendumTitle: addendumTitle.trim(),
                  amendmentReason: amendmentReason.trim(),
                }
              : {}),
          }),
        });

        const payload = (await response.json()) as RequirementMutationResponse;

        if (!response.ok) {
          throw new Error(
            payload.error || "Failed to update RFQ document requirements.",
          );
        }

        if (required) {
          const nextRequirement = payload.requirement;

          if (nextRequirement) {
            setRequirements((current) => {
              const filtered = current.filter(
                (item) => item.attachment_type !== attachmentType,
              );
              return [...filtered, nextRequirement];
            });
          }
        } else {
          setRequirements((current) =>
            current.filter(
              (item) => item.attachment_type !== attachmentType,
            ),
          );
        }

        setUnavailableReason((current) =>
          current === "requirements_query_failed" ? null : current,
        );

        window.dispatchEvent(
          new CustomEvent(RFQ_DOCUMENT_REQUIREMENTS_UPDATED_EVENT, {
            detail: {
              rfqId,
              attachmentType,
              required,
            },
          }),
        );

        if (isPublished) {
          setMessage(
            payload.addendumNumber
              ? `Addendum #${payload.addendumNumber} issued. The governed document requirement change is recorded and acknowledgement remains required.`
              : `Governed Addendum issued (${payload.addendumId || "recorded"}). The document requirement change is recorded and acknowledgement remains required.`,
          );
          setHandoffGuidance("");
          setAddendumTitle("");
          setAmendmentReason("");
        }
      } catch (mutationError) {
        setError(
          mutationError instanceof Error
            ? mutationError.message
            : "Failed to update RFQ document requirements.",
        );
      } finally {
        setMutatingType(null);
      }
    },
    [
      addendumTitle,
      amendmentReason,
      canManage,
      isPublished,
      mutatingType,
      rfqId,
    ],
  );

  const coverage =
    coverageState.kind === "available" ? coverageState.evaluation : null;
  const coveragePresentation = coverage
    ? getCoveragePresentation(coverage.coverageStatus)
    : null;

  return (
    <section
      tabIndex={-1}
      className="@container mt-8 min-w-0 border-t border-white/10 pt-8"
      aria-labelledby="rfq-required-document-coverage-title"
      data-rfq-document-requirements="true"
    >
      <div className="flex min-w-0 flex-col gap-4 @3xl:flex-row @3xl:items-start @3xl:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="np-type-eyebrow text-nexus-cyan-bright">
              Required Document Coverage
            </p>
            {!canManage ? (
              <ExecutiveBadge tone="blue">Package review</ExecutiveBadge>
            ) : (
              <ExecutiveBadge tone="gold">Issuer controls</ExecutiveBadge>
            )}
          </div>

          <h3
            id="rfq-required-document-coverage-title"
            className="np-type-h2 mt-3 min-w-0 text-pretty"
          >
            Issuer-declared RFQ package requirements
          </h3>

          <p className="np-type-body mt-3 max-w-4xl min-w-0 text-pretty text-nexus-text-secondary">
            Compare the issuing organization&apos;s declared required document
            categories against the documents currently recorded in this RFQ
            package. Presence confirms only that evidence exists under the
            matching category; it does not assert technical adequacy,
            contractual compliance, or historical package immutability.
          </p>

          {!canManage ? (
            <p className={`${EXECUTIVE_FORM_HELPER} mt-3 min-w-0 text-pretty`}>
              This is respondent review evidence for scoping. Coverage and
              presence states do not recommend whether to bid.
            </p>
          ) : null}
        </div>

        {coveragePresentation && coverage ? (
          <div className="shrink-0 text-left @3xl:text-right">
            <ExecutiveBadge tone={coveragePresentation.tone}>
              {coveragePresentation.label}
            </ExecutiveBadge>
            <p className="np-type-meta mt-2 text-nexus-text-secondary">
              {coverage.requiredCount === 0
                ? "No document requirements declared"
                : `${coverage.presentCount} present · ${coverage.missingCount} missing · ${coverage.requiredCount} required`}
            </p>
          </div>
        ) : null}
      </div>

      {coverageState.kind === "unavailable" ? (
        <div
          className={`mt-6 ${EXECUTIVE_FEEDBACK_WARNING}`}
          role="status"
        >
          <p className="text-sm font-black">
            Required-document coverage unavailable
          </p>
          <p className="mt-2 text-sm font-semibold leading-6 text-nexus-text-primary">
            {getUnavailableMessage(coverageState.reason)}
          </p>
          <p className={`${EXECUTIVE_FORM_HELPER} mt-2 text-pretty`}>
            Evidence unavailable — coverage is not treated as empty, complete,
            or missing.
          </p>
        </div>
      ) : null}

      {error ? (
        <div
          className={`mt-6 text-sm font-bold ${EXECUTIVE_FEEDBACK_ERROR}`}
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {handoffGuidance ? (
        <div
          className={`mt-6 ${EXECUTIVE_FEEDBACK_WARNING}`}
          role="status"
        >
          <p className="text-sm font-black">
            Complete the governed requirement change
          </p>
          <p className="mt-2 text-sm font-semibold leading-6 text-nexus-text-primary">
            {handoffGuidance}
          </p>
        </div>
      ) : null}

      {message ? (
        <div
          className={`mt-6 text-sm font-bold ${EXECUTIVE_FEEDBACK_SUCCESS}`}
          role="status"
          aria-live="polite"
        >
          {message}
        </div>
      ) : null}

      {canManage && isPublished ? (
        <div className="mt-6">
          <RFQAmendmentEvidenceFields
            idPrefix="rfq-requirement"
            title={addendumTitle}
            reason={amendmentReason}
            disabled={Boolean(mutatingType)}
            onTitleChange={setAddendumTitle}
            onReasonChange={setAmendmentReason}
          />
        </div>
      ) : null}

      <div className="mt-6 grid min-w-0 grid-cols-1 gap-4 @2xl:grid-cols-2">
        {RFQ_ATTACHMENT_TYPES.map((attachmentType) => {
          const requirement = requirementByType.get(attachmentType);
          const signal = coverage?.signals.find(
            (item) => item.key === attachmentType,
          );
          const required = Boolean(requirement);
          const present = signal?.state === "present";
          const presentation = getRequirementPresentation({
            required,
            present,
          });
          const matchingAttachments = signal?.matchingAttachments ?? [];
          const isMutating = mutatingType === attachmentType;
          const requirementStateUnavailable =
            coverageState.kind === "unavailable" &&
            coverageState.reason === "requirements_query_failed";
          const attachmentEvidenceUnavailable =
            coverageState.kind === "unavailable" &&
            coverageState.reason === "attachments_query_failed";
          const cardStatusUnavailable =
            requirementStateUnavailable || attachmentEvidenceUnavailable;
          const requirementCurrentlyMissing =
            !cardStatusUnavailable && required && !present;

          return (
            <article
              key={attachmentType}
              className="min-w-0 rounded-executive border border-white/10 bg-black/20 p-5"
              data-rfq-required-document-type={attachmentType}
            >
              <div className="flex min-w-0 flex-col gap-3 @sm:flex-row @sm:items-start @sm:justify-between">
                <div className="min-w-0">
                  <h4 className="np-type-h3 min-w-0 text-pretty text-base">
                    {RFQ_ATTACHMENT_TYPE_LABELS[attachmentType]}
                  </h4>
                  <p className="np-type-body mt-2 min-w-0 text-pretty text-nexus-text-secondary">
                    {requirementStateUnavailable
                      ? "Requirement declaration state is unavailable."
                      : attachmentEvidenceUnavailable
                        ? "Attachment evidence could not be loaded, so current document presence cannot be determined."
                        : signal?.context ||
                          "The issuing organization has not declared this category as required in the structured RFQ checklist."}
                  </p>
                  {requirementCurrentlyMissing ? (
                    <p className={`${EXECUTIVE_FORM_HELPER} mt-2 text-pretty`}>
                      Requirement currently missing. Clarification may be needed
                      before treating this category as package-complete.
                    </p>
                  ) : null}
                </div>

                <ExecutiveBadge
                  tone={cardStatusUnavailable ? "warning" : presentation.tone}
                  className="w-fit max-w-full whitespace-normal text-pretty"
                >
                  {requirementStateUnavailable
                    ? "Requirement Status Unavailable"
                    : attachmentEvidenceUnavailable
                      ? required
                        ? "Required · Evidence Unavailable"
                        : "Evidence Unavailable"
                      : presentation.label}
                </ExecutiveBadge>
              </div>

              {required && matchingAttachments.length > 0 ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3">
                  <p className="np-type-meta text-nexus-text-secondary">
                    Current evidence
                  </p>
                  <div className="mt-2 space-y-2">
                    {matchingAttachments.slice(0, 2).map((attachment) => (
                      <p
                        key={attachment.id}
                        className="np-type-body min-w-0 text-pretty text-nexus-text-primary"
                      >
                        {attachment.file_name}
                        {attachment.revision_label
                          ? ` · ${attachment.revision_label}`
                          : ""}
                      </p>
                    ))}
                    {matchingAttachments.length > 2 ? (
                      <p className="np-type-meta text-nexus-text-secondary">
                        +{matchingAttachments.length - 2} additional matching
                        document
                        {matchingAttachments.length - 2 === 1 ? "" : "s"}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {canManage ? (
                <button
                  type="button"
                  aria-pressed={required}
                  onClick={() =>
                    void mutateRequirement(attachmentType, !required)
                  }
                  disabled={isMutating || requirementStateUnavailable}
                  className={`${EXECUTIVE_BUTTON_SECONDARY} mt-4 min-h-11 w-full`}
                >
                  {isMutating
                    ? "Updating..."
                    : required
                      ? "Remove Requirement"
                      : "Declare Required"}
                </button>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

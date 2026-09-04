"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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

type RFQDocumentRequirementsProps = {
  rfqId: string;
  canManage: boolean;
  initialRequirements: RfqDocumentRequirementRecord[];
  initialDocuments: RfqDocumentAttachmentEvidence[];
  initialUnavailableReason?: RfqDocumentCoverageUnavailableReason | null;
};

type RequirementMutationResponse = {
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
) {
  if (coverageStatus === "complete") {
    return {
      label: "Complete",
      className:
        "border-emerald-300/20 bg-emerald-400/10 text-emerald-300",
    };
  }

  if (coverageStatus === "incomplete") {
    return {
      label: "Incomplete",
      className: "border-red-300/20 bg-red-400/10 text-red-200",
    };
  }

  return {
    label: "No Requirements Declared",
    className: "border-white/10 bg-white/[0.055] text-slate-300",
  };
}

function getRequirementPresentation({
  required,
  present,
}: {
  required: boolean;
  present: boolean;
}) {
  if (!required) {
    return {
      label: "Not Declared as Required",
      className: "border-white/10 bg-white/[0.055] text-slate-400",
    };
  }

  if (present) {
    return {
      label: "Required · Document Present",
      className:
        "border-emerald-300/20 bg-emerald-400/10 text-emerald-300",
    };
  }

  return {
    label: "Required · Missing",
    className: "border-red-300/20 bg-red-400/10 text-red-200",
  };
}

function getUnavailableMessage(reason: RfqDocumentCoverageUnavailableReason) {
  return reason === "requirements_query_failed"
    ? "The declared required-document checklist could not be loaded. Coverage is unavailable rather than assumed empty."
    : "Current RFQ package documents could not be loaded. Coverage is unavailable rather than treating every declared requirement as missing.";
}

export function RFQDocumentRequirements({
  rfqId,
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

  const mutateRequirement = useCallback(
    async (attachmentType: RfqAttachmentType, required: boolean) => {
      if (!canManage || mutatingType) return;

      setMutatingType(attachmentType);
      setError("");

      try {
        const response = await fetch("/api/rfq-document-requirements", {
          method: required ? "POST" : "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            rfqId,
            attachmentType,
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
    [canManage, mutatingType, rfqId],
  );

  const coverage =
    coverageState.kind === "available" ? coverageState.evaluation : null;
  const coveragePresentation = coverage
    ? getCoveragePresentation(coverage.coverageStatus)
    : null;

  return (
    <section
      className="mt-8 min-w-0 border-t border-white/10 pt-8"
      aria-labelledby="rfq-required-document-coverage-title"
      data-rfq-document-requirements="true"
    >
      <div className="flex min-w-0 flex-col gap-4 @3xl:flex-row @3xl:items-start @3xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-nexus-cyan-bright">
            Required Document Coverage
          </p>

          <h3
            id="rfq-required-document-coverage-title"
            className="mt-3 min-w-0 text-pretty text-xl font-black tracking-tight text-nexus-white sm:text-2xl"
          >
            Issuer-declared RFQ package requirements
          </h3>

          <p className="mt-3 max-w-4xl min-w-0 text-pretty text-sm font-semibold leading-7 text-nexus-muted">
            Compare the issuing organization&apos;s declared required document
            categories against the documents currently recorded in this RFQ
            package. Presence confirms only that evidence exists under the
            matching category; it does not assert technical adequacy,
            contractual compliance, or historical package immutability.
          </p>
        </div>

        {coveragePresentation && coverage ? (
          <div className="shrink-0 text-left @3xl:text-right">
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.14em] ${coveragePresentation.className}`}
            >
              {coveragePresentation.label}
            </span>
            <p className="mt-2 text-sm font-bold text-slate-400">
              {coverage.requiredCount === 0
                ? "No document requirements declared"
                : `${coverage.presentCount} present · ${coverage.missingCount} missing · ${coverage.requiredCount} required`}
            </p>
          </div>
        ) : null}
      </div>

      {coverageState.kind === "unavailable" ? (
        <div
          className="mt-6 rounded-executive border border-amber-300/20 bg-amber-400/10 px-5 py-4"
          role="status"
        >
          <p className="text-sm font-black text-amber-200">
            Required-document coverage unavailable
          </p>
          <p className="mt-2 text-sm font-semibold leading-6 text-amber-100/75">
            {getUnavailableMessage(coverageState.reason)}
          </p>
        </div>
      ) : null}

      {error ? (
        <div
          className="mt-6 rounded-executive border border-red-300/20 bg-red-400/10 px-5 py-4 text-sm font-bold text-red-200"
          role="alert"
        >
          {error}
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

          return (
            <article
              key={attachmentType}
              className="min-w-0 rounded-executive border border-white/10 bg-black/20 p-5"
              data-rfq-required-document-type={attachmentType}
            >
              <div className="flex min-w-0 flex-col gap-3 @sm:flex-row @sm:items-start @sm:justify-between">
                <div className="min-w-0">
                  <h4 className="min-w-0 text-pretty text-base font-black text-white">
                    {RFQ_ATTACHMENT_TYPE_LABELS[attachmentType]}
                  </h4>
                  <p className="mt-2 min-w-0 text-pretty text-sm font-semibold leading-6 text-slate-500">
                    {requirementStateUnavailable
                      ? "Requirement declaration state is unavailable."
                      : attachmentEvidenceUnavailable
                        ? "Attachment evidence could not be loaded, so current document presence cannot be determined."
                        : signal?.context ||
                          "The issuing organization has not declared this category as required in the structured RFQ checklist."}
                  </p>
                </div>

                <span
                  className={`w-fit shrink-0 rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${
                    cardStatusUnavailable
                      ? "border-amber-300/20 bg-amber-400/10 text-amber-200"
                      : presentation.className
                  }`}
                >
                  {requirementStateUnavailable
                    ? "Requirement Status Unavailable"
                    : attachmentEvidenceUnavailable
                      ? required
                        ? "Required · Evidence Unavailable"
                        : "Evidence Unavailable"
                      : presentation.label}
                </span>
              </div>

              {required && matchingAttachments.length > 0 ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-[#07111F]/70 px-4 py-3">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                    Current evidence
                  </p>
                  <div className="mt-2 space-y-2">
                    {matchingAttachments.slice(0, 2).map((attachment) => (
                      <p
                        key={attachment.id}
                        className="min-w-0 text-pretty text-sm font-bold text-slate-300"
                      >
                        {attachment.file_name}
                        {attachment.revision_label
                          ? ` · ${attachment.revision_label}`
                          : ""}
                      </p>
                    ))}
                    {matchingAttachments.length > 2 ? (
                      <p className="text-xs font-bold text-slate-500">
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
                  className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[#C8A646]/25 bg-[#C8A646]/10 px-5 py-3 text-sm font-black text-[#F5D77B] transition hover:bg-[#C8A646]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A646]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07111F] disabled:cursor-not-allowed disabled:opacity-50"
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

"use client";

import { useId, useState, type FormEvent, type KeyboardEvent } from "react";

import {
  COMPANY_CAPABILITY_MAX_PER_TYPE,
  COMPANY_CAPABILITY_TYPES,
  COMPANY_CAPABILITY_TYPE_LABELS,
  createEmptyGroupedCapabilities,
  normalizeCapabilityLabel,
  normalizeGroupedCapabilities,
  type CompanyCapabilityType,
  type GroupedCompanyCapabilities,
} from "@/lib/company/capabilities";
import {
  EXECUTIVE_BUTTON_DESTRUCTIVE,
  EXECUTIVE_BUTTON_SECONDARY,
  EXECUTIVE_CTA_PRIMARY,
  EXECUTIVE_FEEDBACK_ERROR,
  EXECUTIVE_FEEDBACK_SUCCESS,
  EXECUTIVE_FEEDBACK_WARNING,
  EXECUTIVE_FOCUS_GOLD,
  EXECUTIVE_FORM_ERROR,
  EXECUTIVE_FORM_HELPER,
  EXECUTIVE_FORM_INPUT,
  EXECUTIVE_FORM_LABEL,
} from "@/lib/design-system/executive-contract";

type CompanyCapabilitiesEditorProps = {
  companyId: string;
  initialCapabilities: GroupedCompanyCapabilities;
  canEdit: boolean;
};

type SaveResponse = {
  success?: boolean;
  error?: string;
  capabilities?: GroupedCompanyCapabilities;
};

function CapabilityGroupEditor({
  capabilityType,
  labels,
  canEdit,
  onAdd,
  onRemove,
}: {
  capabilityType: CompanyCapabilityType;
  labels: string[];
  canEdit: boolean;
  onAdd: (label: string) => void;
  onRemove: (label: string) => void;
}) {
  const inputId = useId();
  const headingId = useId();
  const groupErrorId = useId();
  const [draft, setDraft] = useState("");
  const [groupError, setGroupError] = useState("");
  const atGroupLimit = labels.length >= COMPANY_CAPABILITY_MAX_PER_TYPE;

  function tryAddLabel() {
    if (atGroupLimit) {
      setGroupError(
        `This group supports up to ${COMPANY_CAPABILITY_MAX_PER_TYPE} capabilities.`,
      );
      return;
    }

    const normalized = normalizeCapabilityLabel(draft);

    if (!normalized) {
      setGroupError("Enter a non-empty capability label.");
      return;
    }

    const duplicate = labels.some(
      (label) => label.toLowerCase() === normalized.toLowerCase(),
    );

    if (duplicate) {
      setGroupError("This capability is already listed.");
      return;
    }

    onAdd(normalized);
    setDraft("");
    setGroupError("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      tryAddLabel();
    }
  }

  const groupTitle = COMPANY_CAPABILITY_TYPE_LABELS[capabilityType];

  return (
    <div className="min-w-0 rounded-executive border border-white/10 bg-black/20 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        {canEdit ? (
          <label
            htmlFor={inputId}
            className={`${EXECUTIVE_FORM_LABEL} text-nexus-muted`}
          >
            {groupTitle}
          </label>
        ) : (
          <p
            id={headingId}
            className={`${EXECUTIVE_FORM_LABEL} text-nexus-muted`}
          >
            {groupTitle}
          </p>
        )}

        <p className="np-type-meta text-nexus-text-secondary">
          {labels.length} / {COMPANY_CAPABILITY_MAX_PER_TYPE}
        </p>
      </div>

      {labels.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {labels.map((label) => (
            <span
              key={`${capabilityType}-${label}`}
              className="inline-flex max-w-full items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.055] px-3 py-2 text-xs font-bold leading-5 text-nexus-text-secondary"
            >
              <span className="min-w-0 break-words">{label}</span>
              {canEdit ? (
                <button
                  type="button"
                  onClick={() => onRemove(label)}
                  className={`${EXECUTIVE_BUTTON_DESTRUCTIVE} min-h-8 shrink-0 px-3 py-1 text-[10px]`}
                  aria-label={`Remove ${label}`}
                >
                  Remove
                </button>
              ) : null}
            </span>
          ))}
        </div>
      ) : (
        <p className={`mt-4 ${EXECUTIVE_FORM_HELPER}`}>
          {canEdit ? "No capabilities added yet." : "Not provided"}
        </p>
      )}

      {canEdit ? (
        <div className="mt-4">
          {atGroupLimit ? (
            <p
              role="status"
              className={`${EXECUTIVE_FEEDBACK_WARNING} text-sm font-semibold`}
            >
              This group supports up to {COMPANY_CAPABILITY_MAX_PER_TYPE}{" "}
              capabilities. Remove an entry to add another.
            </p>
          ) : (
            <>
              <input
                id={inputId}
                type="text"
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value);
                  if (groupError) {
                    setGroupError("");
                  }
                }}
                onKeyDown={handleKeyDown}
                placeholder={`Add ${groupTitle.toLowerCase()}`}
                className={`mt-1 min-h-12 ${EXECUTIVE_FORM_INPUT}`}
                maxLength={120}
                aria-invalid={groupError ? true : undefined}
                aria-describedby={groupError ? groupErrorId : undefined}
              />

              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={tryAddLabel}
                  disabled={atGroupLimit}
                  className={`${EXECUTIVE_BUTTON_SECONDARY} min-h-11 px-4 py-2 text-xs`}
                >
                  Add
                </button>
              </div>
            </>
          )}

          {groupError ? (
            <p
              id={groupErrorId}
              className={`mt-3 ${EXECUTIVE_FORM_ERROR}`}
              role="alert"
            >
              {groupError}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function CompanyCapabilitiesEditor({
  companyId,
  initialCapabilities,
  canEdit,
}: CompanyCapabilitiesEditorProps) {
  const statusId = useId();
  const [capabilities, setCapabilities] = useState(initialCapabilities);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  function updateGroup(
    capabilityType: CompanyCapabilityType,
    updater: (labels: string[]) => string[],
  ) {
    setCapabilities((current) => ({
      ...current,
      [capabilityType]: updater(current[capabilityType]),
    }));
    setSuccess("");
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canEdit) {
      return;
    }

    const normalized = normalizeGroupedCapabilities(capabilities);

    if (normalized.error) {
      setError(normalized.error);
      setSuccess("");
      return;
    }

    setSaving(true);
    setSuccess("");
    setError("");

    try {
      const response = await fetch(`/api/companies/${companyId}/capabilities`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          capabilities: normalized.capabilities,
        }),
      });

      const data = (await response.json()) as SaveResponse;

      if (!response.ok || !data.success) {
        setError(data.error || "Failed to save company capabilities.");
        return;
      }

      setCapabilities(data.capabilities ?? normalized.capabilities);
      setSuccess("Company capabilities saved.");
    } catch {
      setError("Failed to save company capabilities. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!canEdit) {
    return (
      <div className="mt-6 space-y-4">
        <p
          role="status"
          className={`${EXECUTIVE_FEEDBACK_WARNING} text-sm font-semibold`}
        >
          Read-only access. Capabilities cannot be changed with your current
          Access Level.
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          {COMPANY_CAPABILITY_TYPES.map((capabilityType) => (
            <CapabilityGroupEditor
              key={capabilityType}
              capabilityType={capabilityType}
              labels={capabilities[capabilityType]}
              canEdit={false}
              onAdd={() => undefined}
              onRemove={() => undefined}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-6">
      <p className={EXECUTIVE_FORM_HELPER}>
        Add capabilities by group, then save. Changes are not stored until you
        select Save Capabilities.
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        {COMPANY_CAPABILITY_TYPES.map((capabilityType) => (
          <CapabilityGroupEditor
            key={capabilityType}
            capabilityType={capabilityType}
            labels={capabilities[capabilityType]}
            canEdit
            onAdd={(label) =>
              updateGroup(capabilityType, (labels) => [...labels, label])
            }
            onRemove={(label) =>
              updateGroup(capabilityType, (labels) =>
                labels.filter((entry) => entry !== label),
              )
            }
          />
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="submit"
          disabled={saving}
          className={`${EXECUTIVE_CTA_PRIMARY} min-h-12 px-6 ${EXECUTIVE_FOCUS_GOLD}`}
        >
          {saving ? "Saving Capabilities..." : "Save Capabilities"}
        </button>

        <div className="min-w-0 space-y-2">
          {success ? (
            <p
              id={statusId}
              role="status"
              aria-live="polite"
              className={`${EXECUTIVE_FEEDBACK_SUCCESS} text-sm font-semibold`}
            >
              {success}
            </p>
          ) : null}
          {error ? (
            <p
              role="alert"
              className={`${EXECUTIVE_FEEDBACK_ERROR} text-sm font-semibold`}
            >
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </form>
  );
}

export function createDefaultCapabilitiesEditorState(): GroupedCompanyCapabilities {
  return createEmptyGroupedCapabilities();
}

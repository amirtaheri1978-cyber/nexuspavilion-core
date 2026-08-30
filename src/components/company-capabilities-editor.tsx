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
  EXECUTIVE_CTA_PRIMARY,
  EXECUTIVE_FOCUS_GOLD,
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

const inputClass = [
  "mt-2 h-[52px] w-full min-w-0 rounded-2xl border border-white/10 bg-[#07111F] px-4 text-sm font-semibold text-white outline-none transition",
  "placeholder:text-slate-500",
  "focus:border-[#C8A646] focus:bg-[#081827] focus:ring-4 focus:ring-[#C8A646]/15",
  EXECUTIVE_FOCUS_GOLD,
  "disabled:cursor-not-allowed disabled:opacity-60",
].join(" ");

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
    <div className="min-w-0 rounded-3xl border border-white/10 bg-[#07111F]/75 p-5">
      {canEdit ? (
        <label
          htmlFor={inputId}
          className="text-xs font-black uppercase tracking-[0.2em] text-slate-400"
        >
          {groupTitle}
        </label>
      ) : (
        <p
          id={headingId}
          className="text-xs font-black uppercase tracking-[0.2em] text-slate-400"
        >
          {groupTitle}
        </p>
      )}

      {labels.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {labels.map((label) => (
            <span
              key={`${capabilityType}-${label}`}
              className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5 text-xs font-bold leading-5 text-slate-200 break-words"
            >
              <span className="min-w-0 break-words">{label}</span>
              {canEdit ? (
                <button
                  type="button"
                  onClick={() => onRemove(label)}
                  className="shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400 transition hover:border-red-400/30 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A646]/70"
                  aria-label={`Remove ${label}`}
                >
                  Remove
                </button>
              ) : null}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm font-semibold text-slate-500">
          {canEdit
            ? "No capabilities added yet."
            : "Not provided"}
        </p>
      )}

      {canEdit ? (
        <div className="mt-4">
          {atGroupLimit ? (
            <p className="text-sm font-semibold text-slate-400" role="status">
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
                className={inputClass}
                maxLength={120}
                aria-invalid={groupError ? true : undefined}
              />

              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={tryAddLabel}
                  disabled={atGroupLimit}
                  className="rounded-full border border-white/10 bg-white/[0.055] px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A646]/70 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Add
                </button>
              </div>
            </>
          )}

          {groupError ? (
            <p className="mt-2 text-sm font-semibold text-red-300" role="alert">
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
      <div className="mt-6 grid gap-6 md:grid-cols-2">
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
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-6">
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
          className={`${EXECUTIVE_CTA_PRIMARY} min-h-12 px-6 disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {saving ? "Saving Capabilities..." : "Save Capabilities"}
        </button>

        <p
          id={statusId}
          className="text-sm font-semibold"
          role="status"
          aria-live="polite"
        >
          {success ? (
            <span className="text-emerald-300">{success}</span>
          ) : null}
          {error ? <span className="text-red-300">{error}</span> : null}
        </p>
      </div>
    </form>
  );
}

export function createDefaultCapabilitiesEditorState(): GroupedCompanyCapabilities {
  return createEmptyGroupedCapabilities();
}

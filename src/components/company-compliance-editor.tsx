"use client";

import { useId, useState, type FormEvent } from "react";

import {
  buildComplianceDedupeKey,
  COMPANY_COMPLIANCE_MAX_PER_TYPE,
  COMPANY_COMPLIANCE_SELF_DECLARED_NOTICE,
  COMPANY_COMPLIANCE_TYPES,
  COMPANY_COMPLIANCE_TYPE_LABELS,
  createEmptyGroupedCompliance,
  deriveCompliancePresentation,
  formatComplianceDate,
  formatComplianceExpiry,
  normalizeComplianceItem,
  normalizeGroupedCompliance,
  type CompanyComplianceInput,
  type CompanyComplianceType,
  type GroupedCompanyCompliance,
} from "@/lib/company/compliance";
import {
  EXECUTIVE_CTA_PRIMARY,
  EXECUTIVE_FOCUS_GOLD,
} from "@/lib/design-system/executive-contract";

type CompanyComplianceEditorProps = {
  companyId: string;
  initialCompliance: GroupedCompanyCompliance;
  canEdit: boolean;
};

type SaveResponse = {
  success?: boolean;
  error?: string;
  compliance?: GroupedCompanyCompliance;
};

const inputClass = [
  "mt-2 h-[52px] w-full min-w-0 rounded-2xl border border-white/10 bg-[#07111F] px-4 text-sm font-semibold text-white outline-none transition",
  "placeholder:text-slate-500",
  "focus:border-[#C8A646] focus:bg-[#081827] focus:ring-4 focus:ring-[#C8A646]/15",
  EXECUTIVE_FOCUS_GOLD,
  "disabled:cursor-not-allowed disabled:opacity-60",
].join(" ");

const labelClass =
  "text-[11px] font-black uppercase tracking-[0.18em] text-slate-500";

const cardActionClass = [
  "inline-flex min-h-11 shrink-0 items-center rounded-full border border-white/10 px-4",
  "text-[11px] font-black uppercase tracking-[0.12em] transition",
  EXECUTIVE_FOCUS_GOLD,
].join(" ");

const formActionClass = [
  "inline-flex min-h-11 items-center justify-center rounded-full border border-white/10",
  "bg-white/[0.055] px-4 text-xs font-black uppercase tracking-[0.12em] text-white",
  "transition hover:bg-white/[0.08]",
  EXECUTIVE_FOCUS_GOLD,
  "disabled:cursor-not-allowed disabled:opacity-60",
].join(" ");

function emptyDraft(): CompanyComplianceInput {
  return {
    name: "",
    provider: null,
    effective_on: null,
    expires_on: null,
  };
}

function resolveComplianceDraft(
  draft: CompanyComplianceInput,
  items: CompanyComplianceInput[],
  excludedIndex: number | null,
): { item: CompanyComplianceInput | null; error: string } {
  const normalized = normalizeComplianceItem(draft);

  if (normalized.error || !normalized.item) {
    return {
      item: null,
      error: normalized.error || "Enter a valid compliance record.",
    };
  }

  const candidateKey = buildComplianceDedupeKey(normalized.item);
  const duplicate = items.some(
    (item, index) =>
      index !== excludedIndex && buildComplianceDedupeKey(item) === candidateKey,
  );

  if (duplicate) {
    return { item: null, error: "This compliance record is already listed." };
  }

  return { item: normalized.item, error: "" };
}

function ComplianceFields({
  value,
  onChange,
}: {
  value: CompanyComplianceInput;
  onChange: (next: CompanyComplianceInput) => void;
}) {
  const nameId = useId();
  const providerId = useId();
  const effectiveOnId = useId();
  const expiresOnId = useId();

  return (
    <>
      <div>
        <label htmlFor={nameId} className={labelClass}>
          Name
        </label>
        <input
          id={nameId}
          type="text"
          value={value.name}
          onChange={(event) => onChange({ ...value, name: event.target.value })}
          className={inputClass}
          maxLength={160}
        />
      </div>

      <div>
        <label htmlFor={providerId} className={labelClass}>
          Provider / Authority
        </label>
        <input
          id={providerId}
          type="text"
          value={value.provider ?? ""}
          onChange={(event) =>
            onChange({ ...value, provider: event.target.value })
          }
          className={inputClass}
          maxLength={160}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor={effectiveOnId} className={labelClass}>
            Effective Date
          </label>
          <input
            id={effectiveOnId}
            type="date"
            value={value.effective_on ?? ""}
            onChange={(event) =>
              onChange({ ...value, effective_on: event.target.value || null })
            }
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor={expiresOnId} className={labelClass}>
            Expiry Date
          </label>
          <input
            id={expiresOnId}
            type="date"
            value={value.expires_on ?? ""}
            onChange={(event) =>
              onChange({ ...value, expires_on: event.target.value || null })
            }
            className={inputClass}
          />
        </div>
      </div>
    </>
  );
}

function ComplianceCard({
  item,
  canEdit,
  onEdit,
  onRemove,
}: {
  item: CompanyComplianceInput;
  canEdit: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-[#07111F]/80 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-black text-white break-words">{item.name}</p>
          <p className="mt-1 text-xs font-semibold text-slate-400 break-words">
            {item.provider || "Provider not provided"}
          </p>
        </div>

        {canEdit ? (
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onEdit}
              aria-label={`Edit ${item.name}`}
              className={`${cardActionClass} text-slate-300 hover:border-[#C8A646]/40 hover:text-white`}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Remove ${item.name}`}
              className={`${cardActionClass} text-slate-400 hover:border-red-400/30 hover:text-red-300`}
            >
              Remove
            </button>
          </div>
        ) : null}
      </div>

      <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
        <div>
          <dt className={labelClass}>Effective</dt>
          <dd className="mt-1 font-semibold text-slate-300">
            {formatComplianceDate(item.effective_on)}
          </dd>
        </div>
        <div>
          <dt className={labelClass}>Expires</dt>
          <dd className="mt-1 font-semibold text-slate-300">
            {formatComplianceExpiry(item.expires_on)}
          </dd>
        </div>
        <div>
          <dt className={labelClass}>Status</dt>
          <dd className="mt-1 font-semibold text-slate-300">
            {deriveCompliancePresentation(item.effective_on, item.expires_on)}
          </dd>
        </div>
      </dl>
    </article>
  );
}

function ComplianceEditCard({
  draft,
  error,
  onChange,
  onCancel,
  onUpdate,
}: {
  draft: CompanyComplianceInput;
  error: string;
  onChange: (next: CompanyComplianceInput) => void;
  onCancel: () => void;
  onUpdate: () => void;
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-[#C8A646]/30 bg-[#07111F]/80 p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#C8A646]">
        Editing Compliance Record
      </p>

      <ComplianceFields value={draft} onChange={onChange} />

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={onUpdate} className={formActionClass}>
          Update Record
        </button>
        <button
          type="button"
          onClick={onCancel}
          className={`${formActionClass} bg-transparent text-slate-300`}
        >
          Cancel
        </button>
      </div>

      {error ? (
        <p className="text-sm font-semibold text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ComplianceGroupEditor({
  complianceType,
  items,
  canEdit,
  onAdd,
  onUpdate,
  onRemove,
}: {
  complianceType: CompanyComplianceType;
  items: CompanyComplianceInput[];
  canEdit: boolean;
  onAdd: (item: CompanyComplianceInput) => void;
  onUpdate: (index: number, item: CompanyComplianceInput) => void;
  onRemove: (index: number) => void;
}) {
  const [draft, setDraft] = useState<CompanyComplianceInput>(emptyDraft());
  const [groupError, setGroupError] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<CompanyComplianceInput>(
    emptyDraft(),
  );
  const [editError, setEditError] = useState("");
  const atGroupLimit = items.length >= COMPANY_COMPLIANCE_MAX_PER_TYPE;
  const groupTitle = COMPANY_COMPLIANCE_TYPE_LABELS[complianceType];

  function cancelEdit() {
    setEditingIndex(null);
    setEditDraft(emptyDraft());
    setEditError("");
  }

  function beginEdit(index: number) {
    setEditingIndex(index);
    setEditDraft({ ...items[index] });
    setEditError("");
    setGroupError("");
  }

  function tryUpdateCompliance() {
    if (editingIndex === null) {
      return;
    }

    const resolved = resolveComplianceDraft(editDraft, items, editingIndex);

    if (!resolved.item) {
      setEditError(resolved.error);
      return;
    }

    onUpdate(editingIndex, resolved.item);
    cancelEdit();
  }

  function tryRemoveCompliance(index: number) {
    cancelEdit();
    setGroupError("");
    onRemove(index);
  }

  function tryAddCompliance() {
    if (atGroupLimit) {
      setGroupError(
        `This group supports up to ${COMPANY_COMPLIANCE_MAX_PER_TYPE} records.`,
      );
      return;
    }

    const resolved = resolveComplianceDraft(draft, items, null);

    if (!resolved.item) {
      setGroupError(resolved.error);
      return;
    }

    onAdd(resolved.item);
    setDraft(emptyDraft());
    setGroupError("");
  }

  return (
    <section className="min-w-0 rounded-3xl border border-white/10 bg-[#07111F]/75 p-5">
      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
        {groupTitle}
      </h3>

      {items.length > 0 ? (
        <div className="mt-4 space-y-3">
          {items.map((item, index) =>
            canEdit && editingIndex === index ? (
              <ComplianceEditCard
                key={`${complianceType}-edit-${index}`}
                draft={editDraft}
                error={editError}
                onChange={(next) => {
                  setEditDraft(next);
                  if (editError) {
                    setEditError("");
                  }
                }}
                onCancel={cancelEdit}
                onUpdate={tryUpdateCompliance}
              />
            ) : (
              <ComplianceCard
                key={`${complianceType}-${item.name}-${index}`}
                item={item}
                canEdit={canEdit}
                onEdit={() => beginEdit(index)}
                onRemove={() => tryRemoveCompliance(index)}
              />
            ),
          )}
        </div>
      ) : (
        <p className="mt-3 text-sm font-semibold text-slate-500">
          {canEdit ? "No compliance records added yet." : "Not provided"}
        </p>
      )}

      {canEdit ? (
        <div className="mt-5 space-y-4 rounded-2xl border border-dashed border-white/10 p-4">
          {atGroupLimit ? (
            <p className="text-sm font-semibold text-slate-400" role="status">
              This group supports up to {COMPANY_COMPLIANCE_MAX_PER_TYPE}{" "}
              records. Remove an entry to add another.
            </p>
          ) : (
            <>
              <ComplianceFields
                value={draft}
                onChange={(next) => {
                  setDraft(next);
                  if (groupError) {
                    setGroupError("");
                  }
                }}
              />

              <button
                type="button"
                onClick={tryAddCompliance}
                disabled={atGroupLimit}
                className={formActionClass}
              >
                Add Record
              </button>
            </>
          )}

          {groupError ? (
            <p className="text-sm font-semibold text-red-300" role="alert">
              {groupError}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export function CompanyComplianceEditor({
  companyId,
  initialCompliance,
  canEdit,
}: CompanyComplianceEditorProps) {
  const statusId = useId();
  const [compliance, setCompliance] = useState(initialCompliance);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  function updateGroup(
    complianceType: CompanyComplianceType,
    updater: (items: CompanyComplianceInput[]) => CompanyComplianceInput[],
  ) {
    setCompliance((current) => ({
      ...current,
      [complianceType]: updater(current[complianceType]),
    }));
    setSuccess("");
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canEdit) {
      return;
    }

    const normalized = normalizeGroupedCompliance(compliance);

    if (normalized.error) {
      setError(normalized.error);
      setSuccess("");
      return;
    }

    setSaving(true);
    setSuccess("");
    setError("");

    try {
      const response = await fetch(`/api/companies/${companyId}/compliance`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          compliance: normalized.compliance,
        }),
      });

      const data = (await response.json()) as SaveResponse;

      if (!response.ok || !data.success) {
        setError(data.error || "Failed to save company compliance.");
        return;
      }

      setCompliance(data.compliance ?? normalized.compliance);
      setSuccess("Company compliance saved.");
    } catch {
      setError("Failed to save company compliance. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const content = (
    <div className="mt-6 grid gap-6 xl:grid-cols-2">
      {COMPANY_COMPLIANCE_TYPES.map((complianceType) => (
        <ComplianceGroupEditor
          key={complianceType}
          complianceType={complianceType}
          items={compliance[complianceType]}
          canEdit={canEdit}
          onAdd={(item) =>
            updateGroup(complianceType, (items) => [...items, item])
          }
          onUpdate={(index, item) =>
            updateGroup(complianceType, (items) =>
              items.map((current, itemIndex) =>
                itemIndex === index ? item : current,
              ),
            )
          }
          onRemove={(index) =>
            updateGroup(complianceType, (items) =>
              items.filter((_, itemIndex) => itemIndex !== index),
            )
          }
        />
      ))}
    </div>
  );

  if (!canEdit) {
    return content;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {content}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="submit"
          disabled={saving}
          className={`${EXECUTIVE_CTA_PRIMARY} min-h-12 px-6 disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {saving ? "Saving Compliance..." : "Save Compliance"}
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

      <p className="text-xs font-semibold leading-6 text-slate-500">
        {COMPANY_COMPLIANCE_SELF_DECLARED_NOTICE}
      </p>
    </form>
  );
}

export function createDefaultComplianceEditorState(): GroupedCompanyCompliance {
  return createEmptyGroupedCompliance();
}

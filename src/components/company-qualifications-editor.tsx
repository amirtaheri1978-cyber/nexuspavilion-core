"use client";

import { useId, useState, type FormEvent } from "react";

import {
  buildQualificationDedupeKey,
  COMPANY_QUALIFICATION_MAX_PER_TYPE,
  COMPANY_QUALIFICATION_TYPES,
  COMPANY_QUALIFICATION_TYPE_LABELS,
  createEmptyGroupedQualifications,
  formatQualificationDate,
  formatQualificationExpiry,
  normalizeGroupedQualifications,
  normalizeQualificationItem,
  type CompanyQualificationInput,
  type CompanyQualificationType,
  type GroupedCompanyQualifications,
} from "@/lib/company/qualifications";
import {
  EXECUTIVE_CTA_PRIMARY,
  EXECUTIVE_FOCUS_GOLD,
} from "@/lib/design-system/executive-contract";

type CompanyQualificationsEditorProps = {
  companyId: string;
  initialQualifications: GroupedCompanyQualifications;
  canEdit: boolean;
};

type SaveResponse = {
  success?: boolean;
  error?: string;
  qualifications?: GroupedCompanyQualifications;
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

function emptyDraft(): CompanyQualificationInput {
  return {
    name: "",
    issuer: null,
    credential_identifier: null,
    issued_on: null,
    expires_on: null,
    is_public: false,
  };
}

function resolveQualificationDraft(
  draft: CompanyQualificationInput,
  items: CompanyQualificationInput[],
  excludedIndex: number | null,
): { item: CompanyQualificationInput | null; error: string } {
  const normalized = normalizeQualificationItem(draft);

  if (normalized.error || !normalized.item) {
    return {
      item: null,
      error: normalized.error || "Enter a valid qualification.",
    };
  }

  const candidateKey = buildQualificationDedupeKey(normalized.item);
  const duplicate = items.some(
    (item, index) =>
      index !== excludedIndex &&
      buildQualificationDedupeKey(item) === candidateKey,
  );

  if (duplicate) {
    return { item: null, error: "This qualification is already listed." };
  }

  return { item: normalized.item, error: "" };
}

function QualificationFields({
  value,
  onChange,
}: {
  value: CompanyQualificationInput;
  onChange: (next: CompanyQualificationInput) => void;
}) {
  const nameId = useId();
  const issuerId = useId();
  const identifierId = useId();
  const issuedOnId = useId();
  const expiresOnId = useId();
  const publicId = useId();

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
          onChange={(event) =>
            onChange({ ...value, name: event.target.value })
          }
          className={inputClass}
          maxLength={160}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor={issuerId} className={labelClass}>
            Issuer
          </label>
          <input
            id={issuerId}
            type="text"
            value={value.issuer ?? ""}
            onChange={(event) =>
              onChange({ ...value, issuer: event.target.value })
            }
            className={inputClass}
            maxLength={160}
          />
        </div>

        <div>
          <label htmlFor={identifierId} className={labelClass}>
            Credential Identifier
          </label>
          <input
            id={identifierId}
            type="text"
            value={value.credential_identifier ?? ""}
            onChange={(event) =>
              onChange({
                ...value,
                credential_identifier: event.target.value,
              })
            }
            className={inputClass}
            maxLength={120}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor={issuedOnId} className={labelClass}>
            Issued Date
          </label>
          <input
            id={issuedOnId}
            type="date"
            value={value.issued_on ?? ""}
            onChange={(event) =>
              onChange({ ...value, issued_on: event.target.value || null })
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

      <label
        htmlFor={publicId}
        className="flex min-h-11 items-start gap-3 py-2 text-sm font-semibold text-slate-300"
      >
        <input
          id={publicId}
          type="checkbox"
          checked={value.is_public}
          onChange={(event) =>
            onChange({ ...value, is_public: event.target.checked })
          }
          className={`mt-1 h-5 w-5 rounded border-white/20 bg-[#07111F] text-[#C8A646] ${EXECUTIVE_FOCUS_GOLD}`}
        />
        <span>
          Show on public company profile. Credential identifiers remain
          workspace-only.
        </span>
      </label>
    </>
  );
}

function QualificationCard({
  item,
  canEdit,
  onEdit,
  onRemove,
}: {
  item: CompanyQualificationInput;
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
            {item.issuer || "Issuer not provided"}
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
          <dt className={labelClass}>Credential Identifier</dt>
          <dd className="mt-1 font-semibold text-slate-300 break-words">
            {item.credential_identifier || "Not provided"}
          </dd>
        </div>
        <div>
          <dt className={labelClass}>Visibility</dt>
          <dd className="mt-1 font-semibold text-slate-300">
            {item.is_public ? "Public profile" : "Workspace only"}
          </dd>
        </div>
        <div>
          <dt className={labelClass}>Issued</dt>
          <dd className="mt-1 font-semibold text-slate-300">
            {formatQualificationDate(item.issued_on)}
          </dd>
        </div>
        <div>
          <dt className={labelClass}>Expires</dt>
          <dd className="mt-1 font-semibold text-slate-300">
            {formatQualificationExpiry(item.expires_on)}
          </dd>
        </div>
      </dl>
    </article>
  );
}

function QualificationEditCard({
  draft,
  error,
  onChange,
  onCancel,
  onUpdate,
}: {
  draft: CompanyQualificationInput;
  error: string;
  onChange: (next: CompanyQualificationInput) => void;
  onCancel: () => void;
  onUpdate: () => void;
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-[#C8A646]/30 bg-[#07111F]/80 p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#C8A646]">
        Editing Qualification
      </p>

      <QualificationFields value={draft} onChange={onChange} />

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={onUpdate} className={formActionClass}>
          Update Qualification
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

function QualificationGroupEditor({
  qualificationType,
  items,
  canEdit,
  onAdd,
  onUpdate,
  onRemove,
}: {
  qualificationType: CompanyQualificationType;
  items: CompanyQualificationInput[];
  canEdit: boolean;
  onAdd: (item: CompanyQualificationInput) => void;
  onUpdate: (index: number, item: CompanyQualificationInput) => void;
  onRemove: (index: number) => void;
}) {
  const [draft, setDraft] = useState<CompanyQualificationInput>(emptyDraft());
  const [groupError, setGroupError] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<CompanyQualificationInput>(
    emptyDraft(),
  );
  const [editError, setEditError] = useState("");
  const atGroupLimit = items.length >= COMPANY_QUALIFICATION_MAX_PER_TYPE;
  const groupTitle = COMPANY_QUALIFICATION_TYPE_LABELS[qualificationType];

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

  function tryUpdateQualification() {
    if (editingIndex === null) {
      return;
    }

    const resolved = resolveQualificationDraft(editDraft, items, editingIndex);

    if (!resolved.item) {
      setEditError(resolved.error);
      return;
    }

    onUpdate(editingIndex, resolved.item);
    cancelEdit();
  }

  function tryRemoveQualification(index: number) {
    cancelEdit();
    setGroupError("");
    onRemove(index);
  }

  function tryAddQualification() {
    if (atGroupLimit) {
      setGroupError(
        `This group supports up to ${COMPANY_QUALIFICATION_MAX_PER_TYPE} qualifications.`,
      );
      return;
    }

    const resolved = resolveQualificationDraft(draft, items, null);

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
              <QualificationEditCard
                key={`${qualificationType}-edit-${index}`}
                draft={editDraft}
                error={editError}
                onChange={(next) => {
                  setEditDraft(next);
                  if (editError) {
                    setEditError("");
                  }
                }}
                onCancel={cancelEdit}
                onUpdate={tryUpdateQualification}
              />
            ) : (
              <QualificationCard
                key={`${qualificationType}-${item.name}-${index}`}
                item={item}
                canEdit={canEdit}
                onEdit={() => beginEdit(index)}
                onRemove={() => tryRemoveQualification(index)}
              />
            ),
          )}
        </div>
      ) : (
        <p className="mt-3 text-sm font-semibold text-slate-500">
          {canEdit ? "No qualifications added yet." : "Not provided"}
        </p>
      )}

      {canEdit ? (
        <div className="mt-5 space-y-4 rounded-2xl border border-dashed border-white/10 p-4">
          {atGroupLimit ? (
            <p className="text-sm font-semibold text-slate-400" role="status">
              This group supports up to {COMPANY_QUALIFICATION_MAX_PER_TYPE}{" "}
              qualifications. Remove an entry to add another.
            </p>
          ) : (
            <>
              <QualificationFields
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
                onClick={tryAddQualification}
                disabled={atGroupLimit}
                className={formActionClass}
              >
                Add Qualification
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

export function CompanyQualificationsEditor({
  companyId,
  initialQualifications,
  canEdit,
}: CompanyQualificationsEditorProps) {
  const statusId = useId();
  const [qualifications, setQualifications] = useState(initialQualifications);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  function updateGroup(
    qualificationType: CompanyQualificationType,
    updater: (items: CompanyQualificationInput[]) => CompanyQualificationInput[],
  ) {
    setQualifications((current) => ({
      ...current,
      [qualificationType]: updater(current[qualificationType]),
    }));
    setSuccess("");
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canEdit) {
      return;
    }

    const normalized = normalizeGroupedQualifications(qualifications);

    if (normalized.error) {
      setError(normalized.error);
      setSuccess("");
      return;
    }

    setSaving(true);
    setSuccess("");
    setError("");

    try {
      const response = await fetch(
        `/api/companies/${companyId}/qualifications`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            qualifications: normalized.qualifications,
          }),
        },
      );

      const data = (await response.json()) as SaveResponse;

      if (!response.ok || !data.success) {
        setError(data.error || "Failed to save company qualifications.");
        return;
      }

      setQualifications(data.qualifications ?? normalized.qualifications);
      setSuccess("Company qualifications saved.");
    } catch {
      setError("Failed to save company qualifications. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const content = (
    <div className="mt-6 grid gap-6 xl:grid-cols-2">
      {COMPANY_QUALIFICATION_TYPES.map((qualificationType) => (
        <QualificationGroupEditor
          key={qualificationType}
          qualificationType={qualificationType}
          items={qualifications[qualificationType]}
          canEdit={canEdit}
          onAdd={(item) =>
            updateGroup(qualificationType, (items) => [...items, item])
          }
          onUpdate={(index, item) =>
            updateGroup(qualificationType, (items) =>
              items.map((current, itemIndex) =>
                itemIndex === index ? item : current,
              ),
            )
          }
          onRemove={(index) =>
            updateGroup(qualificationType, (items) =>
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
          {saving ? "Saving Qualifications..." : "Save Qualifications"}
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

export function createDefaultQualificationsEditorState(): GroupedCompanyQualifications {
  return createEmptyGroupedQualifications();
}

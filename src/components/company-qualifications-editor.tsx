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
  EXECUTIVE_BUTTON_DESTRUCTIVE,
  EXECUTIVE_BUTTON_SECONDARY,
  EXECUTIVE_BUTTON_TERTIARY,
  EXECUTIVE_CTA_PRIMARY,
  EXECUTIVE_FEEDBACK_ERROR,
  EXECUTIVE_FEEDBACK_INFO,
  EXECUTIVE_FEEDBACK_SUCCESS,
  EXECUTIVE_FEEDBACK_WARNING,
  EXECUTIVE_FOCUS_GOLD,
  EXECUTIVE_FORM_CHECKBOX,
  EXECUTIVE_FORM_ERROR,
  EXECUTIVE_FORM_HELPER,
  EXECUTIVE_FORM_INPUT,
  EXECUTIVE_FORM_LABEL,
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

function VisibilityBadge({ isPublic }: { isPublic: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
        isPublic
          ? "border-nexus-cyan/25 bg-nexus-cyan/10 text-nexus-cyan"
          : "border-white/10 bg-white/[0.055] text-nexus-text-secondary"
      }`}
    >
      {isPublic ? "Public Profile" : "Workspace Only"}
    </span>
  );
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
  const publicHintId = useId();

  return (
    <>
      <div className="min-w-0">
        <label htmlFor={nameId} className={EXECUTIVE_FORM_LABEL}>
          Name
        </label>
        <input
          id={nameId}
          type="text"
          value={value.name}
          onChange={(event) =>
            onChange({ ...value, name: event.target.value })
          }
          className={`mt-2 min-h-12 ${EXECUTIVE_FORM_INPUT}`}
          maxLength={160}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="min-w-0">
          <label htmlFor={issuerId} className={EXECUTIVE_FORM_LABEL}>
            Issuer
          </label>
          <input
            id={issuerId}
            type="text"
            value={value.issuer ?? ""}
            onChange={(event) =>
              onChange({ ...value, issuer: event.target.value })
            }
            className={`mt-2 min-h-12 ${EXECUTIVE_FORM_INPUT}`}
            maxLength={160}
          />
        </div>

        <div className="min-w-0">
          <label htmlFor={identifierId} className={EXECUTIVE_FORM_LABEL}>
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
            className={`mt-2 min-h-12 ${EXECUTIVE_FORM_INPUT}`}
            maxLength={120}
          />
          <p className={`mt-2 ${EXECUTIVE_FORM_HELPER}`}>
            Credential Identifier remains Workspace Only and is never shown on
            the Public Profile.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="min-w-0">
          <label htmlFor={issuedOnId} className={EXECUTIVE_FORM_LABEL}>
            Issued Date
          </label>
          <input
            id={issuedOnId}
            type="date"
            value={value.issued_on ?? ""}
            onChange={(event) =>
              onChange({ ...value, issued_on: event.target.value || null })
            }
            className={`mt-2 min-h-12 ${EXECUTIVE_FORM_INPUT}`}
          />
        </div>

        <div className="min-w-0">
          <label htmlFor={expiresOnId} className={EXECUTIVE_FORM_LABEL}>
            Expiry Date
          </label>
          <input
            id={expiresOnId}
            type="date"
            value={value.expires_on ?? ""}
            onChange={(event) =>
              onChange({ ...value, expires_on: event.target.value || null })
            }
            className={`mt-2 min-h-12 ${EXECUTIVE_FORM_INPUT}`}
          />
        </div>
      </div>

      <div className="rounded-executive border border-white/10 bg-white/[0.035] p-4">
        <label
          htmlFor={publicId}
          className="flex min-h-11 items-start gap-3 text-sm font-semibold text-nexus-text-secondary"
        >
          <input
            id={publicId}
            type="checkbox"
            checked={value.is_public}
            onChange={(event) =>
              onChange({ ...value, is_public: event.target.checked })
            }
            aria-describedby={publicHintId}
            className={EXECUTIVE_FORM_CHECKBOX}
          />
          <span className="min-w-0">
            Show on Public Profile
          </span>
        </label>
        <p id={publicHintId} className={`mt-2 ${EXECUTIVE_FORM_HELPER}`}>
          When selected, this qualification may appear on the Public Profile.
          Credential Identifier remains Workspace Only either way.
        </p>
      </div>
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
    <article className="min-w-0 rounded-executive border border-white/10 bg-black/20 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="np-type-body min-w-0 break-words font-black text-nexus-white">
            {item.name}
          </p>
          <p className="np-type-meta mt-2 min-w-0 break-words text-nexus-muted">
            {item.issuer || "Issuer not provided"}
          </p>
          <div className="mt-3">
            <VisibilityBadge isPublic={item.is_public} />
          </div>
        </div>

        {canEdit ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onEdit}
              aria-label={`Edit ${item.name}`}
              className={`${EXECUTIVE_BUTTON_SECONDARY} min-h-11 px-4 py-2 text-xs`}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Remove ${item.name}`}
              className={`${EXECUTIVE_BUTTON_DESTRUCTIVE} min-h-11 px-4 py-2 text-xs`}
            >
              Remove
            </button>
          </div>
        ) : null}
      </div>

      <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
        <div className="min-w-0">
          <dt className={EXECUTIVE_FORM_LABEL}>Credential Identifier</dt>
          <dd className="np-type-body mt-1 min-w-0 break-words text-nexus-text-secondary">
            {item.credential_identifier || "Not provided"}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className={EXECUTIVE_FORM_LABEL}>Visibility</dt>
          <dd className="np-type-body mt-1 text-nexus-text-secondary">
            {item.is_public ? "Public Profile" : "Workspace Only"}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className={EXECUTIVE_FORM_LABEL}>Issued Date</dt>
          <dd className="np-type-body mt-1 text-nexus-text-secondary">
            {formatQualificationDate(item.issued_on)}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className={EXECUTIVE_FORM_LABEL}>Expiry Date</dt>
          <dd className="np-type-body mt-1 text-nexus-text-secondary">
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
    <div className="space-y-4 rounded-executive border border-nexus-gold/30 bg-black/20 p-4 sm:p-5">
      <p className="np-type-eyebrow text-nexus-gold">Editing Qualification</p>

      <QualificationFields value={draft} onChange={onChange} />

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onUpdate}
          className={`${EXECUTIVE_BUTTON_SECONDARY} min-h-11 px-4 py-2 text-xs`}
        >
          Update Qualification
        </button>
        <button
          type="button"
          onClick={onCancel}
          className={`${EXECUTIVE_BUTTON_TERTIARY} min-h-11 px-4 py-2 text-xs`}
        >
          Cancel
        </button>
      </div>

      {error ? (
        <p className={EXECUTIVE_FORM_ERROR} role="alert">
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
    <section className="min-w-0 rounded-executive border border-white/10 bg-black/20 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="np-type-eyebrow text-nexus-gold">
            Qualification Registry
          </p>
          <h3 className="np-type-h3 mt-2 text-nexus-white">{groupTitle}</h3>
        </div>
        <p className="np-type-meta text-nexus-text-secondary">
          {items.length} / {COMPANY_QUALIFICATION_MAX_PER_TYPE}
        </p>
      </div>

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
        <p className={`mt-4 ${EXECUTIVE_FORM_HELPER}`}>
          {canEdit ? "No qualifications added yet." : "Not provided"}
        </p>
      )}

      {canEdit ? (
        <div className="mt-5 space-y-4 rounded-executive border border-dashed border-white/15 bg-white/[0.03] p-4">
          {atGroupLimit ? (
            <p
              role="status"
              className={`${EXECUTIVE_FEEDBACK_WARNING} text-sm font-semibold`}
            >
              This group supports up to {COMPANY_QUALIFICATION_MAX_PER_TYPE}{" "}
              qualifications. Remove an entry to add another.
            </p>
          ) : (
            <>
              <div>
                <p className="np-type-meta text-nexus-muted">Add Qualification</p>
                <p className={`mt-2 ${EXECUTIVE_FORM_HELPER}`}>
                  Complete the fields below, then select Add Qualification.
                  Nothing is stored until you save the registry.
                </p>
              </div>

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
                className={`${EXECUTIVE_BUTTON_SECONDARY} min-h-11 px-4 py-2 text-xs`}
              >
                Add Qualification
              </button>
            </>
          )}

          {groupError ? (
            <p className={EXECUTIVE_FORM_ERROR} role="alert">
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
    return (
      <div className="space-y-4">
        <p
          role="status"
          className={`${EXECUTIVE_FEEDBACK_WARNING} text-sm font-semibold`}
        >
          Read-only access. The Qualification Registry cannot be changed with
          your current Access Level.
        </p>
        {content}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <p className={`${EXECUTIVE_FEEDBACK_INFO} text-sm font-semibold`}>
        Qualification Registry records are workspace-managed. Public Profile
        visibility is optional per qualification. Credential Identifier remains
        Workspace Only.
      </p>

      {content}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="submit"
          disabled={saving}
          className={`${EXECUTIVE_CTA_PRIMARY} min-h-12 px-6 ${EXECUTIVE_FOCUS_GOLD}`}
        >
          {saving ? "Saving Qualifications..." : "Save Qualifications"}
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

export function createDefaultQualificationsEditorState(): GroupedCompanyQualifications {
  return createEmptyGroupedQualifications();
}

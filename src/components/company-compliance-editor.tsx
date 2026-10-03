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
  EXECUTIVE_BUTTON_DESTRUCTIVE,
  EXECUTIVE_BUTTON_SECONDARY,
  EXECUTIVE_BUTTON_TERTIARY,
  EXECUTIVE_CTA_PRIMARY,
  EXECUTIVE_FEEDBACK_ERROR,
  EXECUTIVE_FEEDBACK_INFO,
  EXECUTIVE_FEEDBACK_SUCCESS,
  EXECUTIVE_FEEDBACK_WARNING,
  EXECUTIVE_FOCUS_GOLD,
  EXECUTIVE_FORM_ERROR,
  EXECUTIVE_FORM_HELPER,
  EXECUTIVE_FORM_INPUT,
  EXECUTIVE_FORM_LABEL,
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

function statusBadgeClass(status: string) {
  if (status === "Expired") {
    return "border-status-risk/25 bg-status-risk/10 text-status-risk";
  }

  if (status === "Expiring soon") {
    return "border-status-warning/25 bg-status-warning/10 text-status-warning";
  }

  if (status === "Current") {
    return "border-status-success/25 bg-status-success/10 text-status-success";
  }

  if (status === "Not yet effective") {
    return "border-nexus-cyan/25 bg-nexus-cyan/10 text-nexus-cyan";
  }

  return "border-white/10 bg-white/[0.055] text-nexus-text-secondary";
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${statusBadgeClass(status)}`}
    >
      {status}
    </span>
  );
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
      <div className="min-w-0">
        <label htmlFor={nameId} className={EXECUTIVE_FORM_LABEL}>
          Name
        </label>
        <input
          id={nameId}
          type="text"
          value={value.name}
          onChange={(event) => onChange({ ...value, name: event.target.value })}
          className={`mt-2 min-h-12 ${EXECUTIVE_FORM_INPUT}`}
          maxLength={160}
        />
      </div>

      <div className="min-w-0">
        <label htmlFor={providerId} className={EXECUTIVE_FORM_LABEL}>
          Provider / Authority
        </label>
        <input
          id={providerId}
          type="text"
          value={value.provider ?? ""}
          onChange={(event) =>
            onChange({ ...value, provider: event.target.value })
          }
          className={`mt-2 min-h-12 ${EXECUTIVE_FORM_INPUT}`}
          maxLength={160}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="min-w-0">
          <label htmlFor={effectiveOnId} className={EXECUTIVE_FORM_LABEL}>
            Effective Date
          </label>
          <input
            id={effectiveOnId}
            type="date"
            value={value.effective_on ?? ""}
            onChange={(event) =>
              onChange({ ...value, effective_on: event.target.value || null })
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
  const status = deriveCompliancePresentation(
    item.effective_on,
    item.expires_on,
  );

  return (
    <article className="min-w-0 rounded-executive border border-white/10 bg-black/20 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="np-type-body min-w-0 break-words font-black text-nexus-white">
            {item.name}
          </p>
          <p className="np-type-meta mt-2 min-w-0 break-words text-nexus-muted">
            {item.provider || "Provider not provided"}
          </p>
          <div className="mt-3">
            <StatusBadge status={status} />
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
          <dt className={EXECUTIVE_FORM_LABEL}>Effective Date</dt>
          <dd className="np-type-body mt-1 text-nexus-text-secondary">
            {formatComplianceDate(item.effective_on)}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className={EXECUTIVE_FORM_LABEL}>Expiry Date</dt>
          <dd className="np-type-body mt-1 text-nexus-text-secondary">
            {formatComplianceExpiry(item.expires_on)}
          </dd>
        </div>
        <div className="min-w-0 sm:col-span-2">
          <dt className={EXECUTIVE_FORM_LABEL}>Derived Status</dt>
          <dd className="np-type-body mt-1 text-nexus-text-secondary">
            {status}
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
    <div className="space-y-4 rounded-executive border border-nexus-gold/30 bg-black/20 p-4 sm:p-5">
      <p className="np-type-eyebrow text-nexus-gold">
        Editing Compliance Record
      </p>

      <ComplianceFields value={draft} onChange={onChange} />

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onUpdate}
          className={`${EXECUTIVE_BUTTON_SECONDARY} min-h-11 px-4 py-2 text-xs`}
        >
          Update Record
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
    <section className="min-w-0 rounded-executive border border-white/10 bg-black/20 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="np-type-eyebrow text-nexus-gold">Compliance Records</p>
          <h3 className="np-type-h3 mt-2 text-nexus-white">{groupTitle}</h3>
        </div>
        <p className="np-type-meta text-nexus-text-secondary">
          {items.length} / {COMPANY_COMPLIANCE_MAX_PER_TYPE}
        </p>
      </div>

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
        <p className={`mt-4 ${EXECUTIVE_FORM_HELPER}`}>
          {canEdit ? "No compliance records added yet." : "Not provided"}
        </p>
      )}

      {canEdit ? (
        <div className="mt-5 space-y-4 rounded-executive border border-dashed border-white/15 bg-white/[0.03] p-4">
          {atGroupLimit ? (
            <p
              role="status"
              className={`${EXECUTIVE_FEEDBACK_WARNING} text-sm font-semibold`}
            >
              This group supports up to {COMPANY_COMPLIANCE_MAX_PER_TYPE}{" "}
              records. Remove an entry to add another.
            </p>
          ) : (
            <>
              <div>
                <p className="np-type-meta text-nexus-muted">Add Record</p>
                <p className={`mt-2 ${EXECUTIVE_FORM_HELPER}`}>
                  Complete the fields below, then select Add Record. Nothing is
                  stored until you select Save Compliance.
                </p>
              </div>

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
                className={`${EXECUTIVE_BUTTON_SECONDARY} min-h-11 px-4 py-2 text-xs`}
              >
                Add Record
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

  const notice = (
    <p
      role="status"
      className={`${EXECUTIVE_FEEDBACK_INFO} text-xs font-semibold leading-6`}
    >
      {COMPANY_COMPLIANCE_SELF_DECLARED_NOTICE}
    </p>
  );

  if (!canEdit) {
    return (
      <div className="space-y-4">
        <p
          role="status"
          className={`${EXECUTIVE_FEEDBACK_WARNING} text-sm font-semibold`}
        >
          Read-only access. Compliance records cannot be changed with your
          current Access Level.
        </p>
        {notice}
        {content}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {notice}

      <p className={EXECUTIVE_FORM_HELPER}>
        Derived status is calculated from Effective Date and Expiry Date only.
        It is not a verification, approval, or compliance score.
      </p>

      {content}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="submit"
          disabled={saving}
          className={`${EXECUTIVE_CTA_PRIMARY} min-h-12 px-6 ${EXECUTIVE_FOCUS_GOLD}`}
        >
          {saving ? "Saving Compliance..." : "Save Compliance"}
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

export function createDefaultComplianceEditorState(): GroupedCompanyCompliance {
  return createEmptyGroupedCompliance();
}

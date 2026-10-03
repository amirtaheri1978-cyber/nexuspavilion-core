"use client";

import { useId, useRef, useState } from "react";

import {
  COMPANY_DOCUMENT_MAX_TITLE_LENGTH,
  COMPANY_DOCUMENT_TYPES,
  COMPANY_DOCUMENT_TYPE_LABELS,
  COMPANY_DOCUMENTS_BUCKET,
  COMPANY_DOCUMENTS_SELF_DECLARED_NOTICE,
  deriveDocumentPresentation,
  formatDocumentDate,
  formatDocumentFileSize,
  isCompanyDocumentType,
  normalizeDocumentDate,
  normalizeDocumentText,
  type CompanyDocumentClientRecord,
  type CompanyDocumentType,
} from "@/lib/company/documents";
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
  EXECUTIVE_FORM_HELPER,
  EXECUTIVE_FORM_INPUT,
  EXECUTIVE_FORM_LABEL,
  EXECUTIVE_FORM_SELECT,
} from "@/lib/design-system/executive-contract";
import { createClient } from "@/lib/supabase/client";

type CompanyDocumentsEditorProps = {
  companyId: string;
  initialDocuments: CompanyDocumentClientRecord[];
  canEdit: boolean;
};

type UploadIntentResponse = {
  success?: boolean;
  error?: string;
  documentId?: string;
  path?: string;
  token?: string;
};

type DocumentsResponse = {
  success?: boolean;
  error?: string;
  documents?: CompanyDocumentClientRecord[];
};

type DownloadResponse = {
  success?: boolean;
  downloadUrl?: string;
};

const fileInputClass = [
  `mt-2 min-h-12 ${EXECUTIVE_FORM_INPUT}`,
  "h-auto py-3 file:mr-4 file:rounded-xl file:border-0 file:bg-white/10",
  "file:px-4 file:py-2 file:text-sm file:font-black file:text-white",
].join(" ");

function typeLabel(documentType: string) {
  return isCompanyDocumentType(documentType)
    ? COMPANY_DOCUMENT_TYPE_LABELS[documentType]
    : "Document";
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

async function downloadCompanyDocument(
  companyId: string,
  documentId: string,
): Promise<string> {
  const response = await fetch(
    `/api/companies/${companyId}/documents/${documentId}/download`,
  );
  const data = (await response.json()) as DownloadResponse;

  if (!response.ok || !data.downloadUrl) {
    return "Failed to download the document.";
  }

  window.open(data.downloadUrl, "_blank", "noopener,noreferrer");
  return "";
}

type UploadIntentResult =
  | { ok: true; documentId: string; path: string; token: string }
  | { ok: false; error: string };

async function requestUploadIntent(
  companyId: string,
  file: File,
  documentId?: string,
): Promise<UploadIntentResult> {
  const response = await fetch(`/api/companies/${companyId}/documents/upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      ...(documentId ? { documentId } : {}),
    }),
  });

  const data = (await response.json()) as UploadIntentResponse;

  if (!response.ok || !data.documentId || !data.path || !data.token) {
    return {
      ok: false,
      error: data.error || "Failed to prepare the document upload.",
    };
  }

  return {
    ok: true,
    documentId: data.documentId,
    path: data.path,
    token: data.token,
  };
}

async function uploadToSignedTarget(
  path: string,
  token: string,
  file: File,
): Promise<string> {
  const supabase = createClient();
  const { error } = await supabase.storage
    .from(COMPANY_DOCUMENTS_BUCKET)
    .uploadToSignedUrl(path, token, file);

  if (error) {
    return "Failed to upload the selected file.";
  }

  return "";
}

async function removeOrphanObject(path: string) {
  try {
    const supabase = createClient();
    const { error } = await supabase.storage
      .from(COMPANY_DOCUMENTS_BUCKET)
      .remove([path]);

    if (error) {
      console.error("Company document orphan cleanup failed.", {
        errorCode: "COMPANY_DOCUMENT_ORPHAN_CLEANUP_FAILED",
        operation: "orphan_cleanup",
      });
    }
  } catch {
    console.error("Company document orphan cleanup failed.", {
      errorCode: "COMPANY_DOCUMENT_ORPHAN_CLEANUP_FAILED",
      operation: "orphan_cleanup",
    });
  }
}

function DocumentCard({
  document,
  companyId,
  canEdit,
  onEdit,
  onReplace,
  onDelete,
}: {
  document: CompanyDocumentClientRecord;
  companyId: string;
  canEdit: boolean;
  onEdit: () => void;
  onReplace: () => void;
  onDelete: () => void;
}) {
  const status = deriveDocumentPresentation(document.expires_on);

  return (
    <article className="min-w-0 rounded-executive border border-white/10 bg-black/20 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="np-type-body min-w-0 break-words font-black text-nexus-white">
            {document.title}
          </p>
          <p className="np-type-meta mt-2 text-nexus-muted">
            {typeLabel(document.document_type)}
          </p>
          <div className="mt-3">
            <StatusBadge status={status} />
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              void downloadCompanyDocument(companyId, document.id);
            }}
            aria-label={`Download ${document.title}`}
            className={`${EXECUTIVE_BUTTON_TERTIARY} min-h-11 px-4 py-2 text-xs`}
          >
            Download
          </button>
          {canEdit ? (
            <>
              <button
                type="button"
                onClick={onEdit}
                aria-label={`Edit metadata for ${document.title}`}
                className={`${EXECUTIVE_BUTTON_SECONDARY} min-h-11 px-4 py-2 text-xs`}
              >
                Edit Metadata
              </button>
              <button
                type="button"
                onClick={onReplace}
                aria-label={`Replace file for ${document.title}`}
                className={`${EXECUTIVE_BUTTON_SECONDARY} min-h-11 px-4 py-2 text-xs`}
              >
                Replace File
              </button>
              <button
                type="button"
                onClick={onDelete}
                aria-label={`Delete ${document.title}`}
                className={`${EXECUTIVE_BUTTON_DESTRUCTIVE} min-h-11 px-4 py-2 text-xs`}
              >
                Delete
              </button>
            </>
          ) : null}
        </div>
      </div>

      <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
        <div className="min-w-0">
          <dt className={EXECUTIVE_FORM_LABEL}>File</dt>
          <dd className="np-type-body mt-1 min-w-0 break-words text-nexus-text-secondary">
            {document.file_name}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className={EXECUTIVE_FORM_LABEL}>Size</dt>
          <dd className="np-type-body mt-1 text-nexus-text-secondary">
            {formatDocumentFileSize(document.file_size)}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className={EXECUTIVE_FORM_LABEL}>Issued Date</dt>
          <dd className="np-type-body mt-1 text-nexus-text-secondary">
            {formatDocumentDate(document.issued_on)}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className={EXECUTIVE_FORM_LABEL}>Expiry Date</dt>
          <dd className="np-type-body mt-1 text-nexus-text-secondary">
            {formatDocumentDate(document.expires_on)}
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

export function CompanyDocumentsEditor({
  companyId,
  initialDocuments,
  canEdit,
}: CompanyDocumentsEditorProps) {
  const statusId = useId();
  const titleId = useId();
  const typeId = useId();
  const fileId = useId();
  const issuedId = useId();
  const expiresId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);

  const [documents, setDocuments] = useState(initialDocuments);
  const [documentType, setDocumentType] =
    useState<CompanyDocumentType>("insurance");
  const [title, setTitle] = useState("");
  const [issuedOn, setIssuedOn] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editType, setEditType] = useState<CompanyDocumentType>("insurance");
  const [editIssuedOn, setEditIssuedOn] = useState("");
  const [editExpiresOn, setEditExpiresOn] = useState("");
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  function clearStatus() {
    setSuccess("");
    setError("");
  }

  function applyDocuments(next: CompanyDocumentClientRecord[] | undefined) {
    if (next) {
      setDocuments(next);
    }
  }

  function beginEdit(document: CompanyDocumentClientRecord) {
    setEditingId(document.id);
    setEditTitle(document.title);
    setEditType(
      isCompanyDocumentType(document.document_type)
        ? document.document_type
        : "other",
    );
    setEditIssuedOn(document.issued_on ?? "");
    setEditExpiresOn(document.expires_on ?? "");
    setReplacingId(null);
    clearStatus();
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTitle("");
    setEditIssuedOn("");
    setEditExpiresOn("");
  }

  async function handleUpload() {
    if (!canEdit || !selectedFile) {
      setError("Choose a file before uploading.");
      return;
    }

    const normalizedTitle = normalizeDocumentText(
      title,
      COMPANY_DOCUMENT_MAX_TITLE_LENGTH,
    );

    if (!normalizedTitle) {
      setError("Document title must be non-empty and 160 characters or fewer.");
      return;
    }

    const issued = normalizeDocumentDate(issuedOn || null);
    const expires = normalizeDocumentDate(expiresOn || null);

    if (issued.error || expires.error) {
      setError(issued.error || expires.error || "Document dates are invalid.");
      return;
    }

    if (issued.value && expires.value && expires.value < issued.value) {
      setError("Expiry date must be on or after the issued date.");
      return;
    }

    setBusy(true);
    clearStatus();

    const intent = await requestUploadIntent(companyId, selectedFile);

    if (!intent.ok) {
      setError(intent.error);
      setBusy(false);
      return;
    }

    const uploadError = await uploadToSignedTarget(
      intent.path,
      intent.token,
      selectedFile,
    );

    if (uploadError) {
      setError(uploadError);
      setBusy(false);
      return;
    }

    try {
      const response = await fetch(`/api/companies/${companyId}/documents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: intent.documentId,
          document_type: documentType,
          title: normalizedTitle,
          file_name: selectedFile.name,
          file_path: intent.path,
          file_type: selectedFile.type,
          file_size: selectedFile.size,
          issued_on: issued.value,
          expires_on: expires.value,
        }),
      });

      const data = (await response.json()) as DocumentsResponse;

      if (!response.ok || !data.success) {
        await removeOrphanObject(intent.path);
        setError(data.error || "Failed to save the company document.");
        return;
      }

      applyDocuments(data.documents);
      setTitle("");
      setIssuedOn("");
      setExpiresOn("");
      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setSuccess("Company document uploaded.");
    } catch {
      await removeOrphanObject(intent.path);
      setError("Failed to save the company document.");
    } finally {
      setBusy(false);
    }
  }

  async function handleMetadataUpdate(documentId: string) {
    const normalizedTitle = normalizeDocumentText(
      editTitle,
      COMPANY_DOCUMENT_MAX_TITLE_LENGTH,
    );

    if (!normalizedTitle) {
      setError("Document title must be non-empty and 160 characters or fewer.");
      return;
    }

    const issued = normalizeDocumentDate(editIssuedOn || null);
    const expires = normalizeDocumentDate(editExpiresOn || null);

    if (issued.error || expires.error) {
      setError(issued.error || expires.error || "Document dates are invalid.");
      return;
    }

    if (issued.value && expires.value && expires.value < issued.value) {
      setError("Expiry date must be on or after the issued date.");
      return;
    }

    setBusy(true);
    clearStatus();

    try {
      const response = await fetch(
        `/api/companies/${companyId}/documents/${documentId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            document_type: editType,
            title: normalizedTitle,
            issued_on: issued.value,
            expires_on: expires.value,
          }),
        },
      );

      const data = (await response.json()) as DocumentsResponse;

      if (!response.ok || !data.success) {
        setError(data.error || "Failed to update the company document.");
        return;
      }

      applyDocuments(data.documents);
      cancelEdit();
      setSuccess("Company document updated.");
    } catch {
      setError("Failed to update the company document.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReplace(documentId: string, file: File) {
    setBusy(true);
    clearStatus();

    const current = documents.find((document) => document.id === documentId);

    if (!current) {
      setError("Document not found.");
      setBusy(false);
      return;
    }

    const intent = await requestUploadIntent(companyId, file, documentId);

    if (!intent.ok) {
      setError(intent.error);
      setBusy(false);
      return;
    }

    const uploadError = await uploadToSignedTarget(
      intent.path,
      intent.token,
      file,
    );

    if (uploadError) {
      setError(uploadError);
      setBusy(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/companies/${companyId}/documents/${documentId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            document_type: current.document_type,
            title: current.title,
            issued_on: current.issued_on,
            expires_on: current.expires_on,
            file_name: file.name,
            file_path: intent.path,
            file_type: file.type,
            file_size: file.size,
          }),
        },
      );

      const data = (await response.json()) as DocumentsResponse;

      if (!response.ok || !data.success) {
        await removeOrphanObject(intent.path);
        setError(data.error || "Failed to replace the company document.");
        return;
      }

      applyDocuments(data.documents);
      setReplacingId(null);
      setSuccess("Company document replaced.");
    } catch {
      await removeOrphanObject(intent.path);
      setError("Failed to replace the company document.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(documentId: string) {
    setBusy(true);
    clearStatus();

    try {
      const response = await fetch(
        `/api/companies/${companyId}/documents/${documentId}`,
        {
          method: "DELETE",
        },
      );

      const data = (await response.json()) as DocumentsResponse;

      if (!response.ok || !data.success) {
        setError(data.error || "Failed to delete the company document.");
        return;
      }

      applyDocuments(data.documents);
      cancelEdit();
      setSuccess("Company document deleted.");
    } catch {
      setError("Failed to delete the company document.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <p
        role="status"
        className={`${EXECUTIVE_FEEDBACK_INFO} text-xs font-semibold leading-6`}
      >
        {COMPANY_DOCUMENTS_SELF_DECLARED_NOTICE}
      </p>

      <p className={EXECUTIVE_FORM_HELPER}>
        Document presence does not prove validity or compliance. Derived status
        is calculated from Expiry Date only and is not a verification score.
      </p>

      {!canEdit ? (
        <p
          role="status"
          className={`${EXECUTIVE_FEEDBACK_WARNING} text-sm font-semibold`}
        >
          Read-only access. Documents cannot be uploaded, replaced, or deleted
          with your current Access Level. Download remains available when a
          document exists.
        </p>
      ) : null}

      {documents.length > 0 ? (
        <div className="space-y-3">
          {documents.map((document) =>
            canEdit && editingId === document.id ? (
              <div
                key={`${document.id}-edit`}
                className="space-y-4 rounded-executive border border-nexus-gold/30 bg-black/20 p-4 sm:p-5"
              >
                <p className="np-type-eyebrow text-nexus-gold">
                  Editing Document Metadata
                </p>
                <p className={EXECUTIVE_FORM_HELPER}>
                  Metadata edit does not replace the stored file. Use Replace
                  File to change the uploaded document.
                </p>
                <div className="min-w-0">
                  <label htmlFor={`${typeId}-edit`} className={EXECUTIVE_FORM_LABEL}>
                    Document Type
                  </label>
                  <select
                    id={`${typeId}-edit`}
                    value={editType}
                    onChange={(event) =>
                      setEditType(event.target.value as CompanyDocumentType)
                    }
                    className={`mt-2 min-h-12 ${EXECUTIVE_FORM_SELECT}`}
                  >
                    {COMPANY_DOCUMENT_TYPES.map((value) => (
                      <option key={value} value={value}>
                        {COMPANY_DOCUMENT_TYPE_LABELS[value]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="min-w-0">
                  <label htmlFor={`${titleId}-edit`} className={EXECUTIVE_FORM_LABEL}>
                    Title
                  </label>
                  <input
                    id={`${titleId}-edit`}
                    type="text"
                    value={editTitle}
                    maxLength={160}
                    onChange={(event) => setEditTitle(event.target.value)}
                    className={`mt-2 min-h-12 ${EXECUTIVE_FORM_INPUT}`}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="min-w-0">
                    <label
                      htmlFor={`${issuedId}-edit`}
                      className={EXECUTIVE_FORM_LABEL}
                    >
                      Issued Date
                    </label>
                    <input
                      id={`${issuedId}-edit`}
                      type="date"
                      value={editIssuedOn}
                      onChange={(event) => setEditIssuedOn(event.target.value)}
                      className={`mt-2 min-h-12 ${EXECUTIVE_FORM_INPUT}`}
                    />
                  </div>
                  <div className="min-w-0">
                    <label
                      htmlFor={`${expiresId}-edit`}
                      className={EXECUTIVE_FORM_LABEL}
                    >
                      Expiry Date
                    </label>
                    <input
                      id={`${expiresId}-edit`}
                      type="date"
                      value={editExpiresOn}
                      onChange={(event) => setEditExpiresOn(event.target.value)}
                      className={`mt-2 min-h-12 ${EXECUTIVE_FORM_INPUT}`}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleMetadataUpdate(document.id)}
                    className={`${EXECUTIVE_BUTTON_SECONDARY} min-h-11 px-4 py-2 text-xs`}
                  >
                    Update
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={cancelEdit}
                    className={`${EXECUTIVE_BUTTON_TERTIARY} min-h-11 px-4 py-2 text-xs`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <DocumentCard
                key={document.id}
                document={document}
                companyId={companyId}
                canEdit={canEdit}
                onEdit={() => beginEdit(document)}
                onReplace={() => {
                  setReplacingId(document.id);
                  replaceInputRef.current?.click();
                }}
                onDelete={() => void handleDelete(document.id)}
              />
            ),
          )}
        </div>
      ) : (
        <p className={EXECUTIVE_FORM_HELPER}>
          {canEdit ? "No documents uploaded yet." : "Not provided"}
        </p>
      )}

      {canEdit ? (
        <div className="space-y-4 rounded-executive border border-dashed border-white/15 bg-white/[0.03] p-4 sm:p-5">
          <div>
            <p className="np-type-eyebrow text-nexus-gold">Upload Document</p>
            <p className={`mt-2 ${EXECUTIVE_FORM_HELPER}`}>
              Choose Document Type, Title, and File, then upload. Accepted files:
              PDF, JPEG, PNG, and WebP.
            </p>
          </div>
          <div className="min-w-0">
            <label htmlFor={typeId} className={EXECUTIVE_FORM_LABEL}>
              Document Type
            </label>
            <select
              id={typeId}
              value={documentType}
              onChange={(event) =>
                setDocumentType(event.target.value as CompanyDocumentType)
              }
              className={`mt-2 min-h-12 ${EXECUTIVE_FORM_SELECT}`}
            >
              {COMPANY_DOCUMENT_TYPES.map((value) => (
                <option key={value} value={value}>
                  {COMPANY_DOCUMENT_TYPE_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0">
            <label htmlFor={titleId} className={EXECUTIVE_FORM_LABEL}>
              Title
            </label>
            <input
              id={titleId}
              type="text"
              value={title}
              maxLength={160}
              onChange={(event) => setTitle(event.target.value)}
              className={`mt-2 min-h-12 ${EXECUTIVE_FORM_INPUT}`}
            />
          </div>
          <div className="min-w-0">
            <label htmlFor={fileId} className={EXECUTIVE_FORM_LABEL}>
              File
            </label>
            <input
              id={fileId}
              ref={fileInputRef}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"
              onChange={(event) =>
                setSelectedFile(event.target.files?.[0] ?? null)
              }
              className={fileInputClass}
            />
            {selectedFile ? (
              <p className={`mt-2 min-w-0 break-words ${EXECUTIVE_FORM_HELPER}`}>
                Selected: {selectedFile.name} (
                {formatDocumentFileSize(selectedFile.size)})
              </p>
            ) : null}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="min-w-0">
              <label htmlFor={issuedId} className={EXECUTIVE_FORM_LABEL}>
                Issued Date
              </label>
              <input
                id={issuedId}
                type="date"
                value={issuedOn}
                onChange={(event) => setIssuedOn(event.target.value)}
                className={`mt-2 min-h-12 ${EXECUTIVE_FORM_INPUT}`}
              />
            </div>
            <div className="min-w-0">
              <label htmlFor={expiresId} className={EXECUTIVE_FORM_LABEL}>
                Expiry Date
              </label>
              <input
                id={expiresId}
                type="date"
                value={expiresOn}
                onChange={(event) => setExpiresOn(event.target.value)}
                className={`mt-2 min-h-12 ${EXECUTIVE_FORM_INPUT}`}
              />
            </div>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleUpload()}
            className={`${EXECUTIVE_CTA_PRIMARY} min-h-12 px-6 ${EXECUTIVE_FOCUS_GOLD}`}
          >
            {busy ? "Uploading..." : "Upload Document"}
          </button>
        </div>
      ) : null}

      <input
        ref={replaceInputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          const documentId = replacingId;
          event.target.value = "";

          if (file && documentId) {
            void handleReplace(documentId, file);
          }
        }}
      />

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
  );
}

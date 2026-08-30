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
  type CompanyDocumentRecord,
  type CompanyDocumentType,
} from "@/lib/company/documents";
import {
  EXECUTIVE_CTA_PRIMARY,
  EXECUTIVE_FOCUS_GOLD,
} from "@/lib/design-system/executive-contract";
import { createClient } from "@/lib/supabase/client";

type CompanyDocumentsEditorProps = {
  companyId: string;
  initialDocuments: CompanyDocumentRecord[];
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
  documents?: CompanyDocumentRecord[];
};

type DownloadResponse = {
  success?: boolean;
  downloadUrl?: string;
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

function typeLabel(documentType: string) {
  return isCompanyDocumentType(documentType)
    ? COMPANY_DOCUMENT_TYPE_LABELS[documentType]
    : "Document";
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
  document: CompanyDocumentRecord;
  companyId: string;
  canEdit: boolean;
  onEdit: () => void;
  onReplace: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-[#07111F]/80 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-black text-white break-words">
            {document.title}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            {typeLabel(document.document_type)}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              void downloadCompanyDocument(companyId, document.id);
            }}
            className={`${cardActionClass} text-slate-300 hover:border-[#C8A646]/40 hover:text-white`}
          >
            Download
          </button>
          {canEdit ? (
            <>
              <button
                type="button"
                onClick={onEdit}
                className={`${cardActionClass} text-slate-300 hover:border-[#C8A646]/40 hover:text-white`}
              >
                Edit Metadata
              </button>
              <button
                type="button"
                onClick={onReplace}
                className={`${cardActionClass} text-slate-300 hover:border-[#C8A646]/40 hover:text-white`}
              >
                Replace File
              </button>
              <button
                type="button"
                onClick={onDelete}
                className={`${cardActionClass} text-slate-400 hover:border-red-400/30 hover:text-red-300`}
              >
                Delete
              </button>
            </>
          ) : null}
        </div>
      </div>

      <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
        <div>
          <dt className={labelClass}>File</dt>
          <dd className="mt-1 font-semibold text-slate-300 break-words">
            {document.file_name}
          </dd>
        </div>
        <div>
          <dt className={labelClass}>Size</dt>
          <dd className="mt-1 font-semibold text-slate-300">
            {formatDocumentFileSize(document.file_size)}
          </dd>
        </div>
        <div>
          <dt className={labelClass}>Issued</dt>
          <dd className="mt-1 font-semibold text-slate-300">
            {formatDocumentDate(document.issued_on)}
          </dd>
        </div>
        <div>
          <dt className={labelClass}>Expires</dt>
          <dd className="mt-1 font-semibold text-slate-300">
            {formatDocumentDate(document.expires_on)}
          </dd>
        </div>
        <div>
          <dt className={labelClass}>Status</dt>
          <dd className="mt-1 font-semibold text-slate-300">
            {deriveDocumentPresentation(document.expires_on)}
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

  function applyDocuments(next: CompanyDocumentRecord[] | undefined) {
    if (next) {
      setDocuments(next);
    }
  }

  function beginEdit(document: CompanyDocumentRecord) {
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
      {documents.length > 0 ? (
        <div className="space-y-3">
          {documents.map((document) =>
            canEdit && editingId === document.id ? (
              <div
                key={`${document.id}-edit`}
                className="space-y-4 rounded-2xl border border-[#C8A646]/30 bg-[#07111F]/80 p-4"
              >
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#C8A646]">
                  Editing Document Metadata
                </p>
                <div>
                  <label htmlFor={`${typeId}-edit`} className={labelClass}>
                    Document Type
                  </label>
                  <select
                    id={`${typeId}-edit`}
                    value={editType}
                    onChange={(event) =>
                      setEditType(event.target.value as CompanyDocumentType)
                    }
                    className={inputClass}
                  >
                    {COMPANY_DOCUMENT_TYPES.map((value) => (
                      <option key={value} value={value}>
                        {COMPANY_DOCUMENT_TYPE_LABELS[value]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor={`${titleId}-edit`} className={labelClass}>
                    Title
                  </label>
                  <input
                    id={`${titleId}-edit`}
                    type="text"
                    value={editTitle}
                    maxLength={160}
                    onChange={(event) => setEditTitle(event.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label htmlFor={`${issuedId}-edit`} className={labelClass}>
                      Issued Date
                    </label>
                    <input
                      id={`${issuedId}-edit`}
                      type="date"
                      value={editIssuedOn}
                      onChange={(event) => setEditIssuedOn(event.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor={`${expiresId}-edit`} className={labelClass}>
                      Expiry Date
                    </label>
                    <input
                      id={`${expiresId}-edit`}
                      type="date"
                      value={editExpiresOn}
                      onChange={(event) => setEditExpiresOn(event.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleMetadataUpdate(document.id)}
                    className={cardActionClass}
                  >
                    Update
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={cancelEdit}
                    className={`${cardActionClass} text-slate-300`}
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
        <p className="text-sm font-semibold text-slate-500">
          {canEdit ? "No documents uploaded yet." : "Not provided"}
        </p>
      )}

      {canEdit ? (
        <div className="space-y-4 rounded-2xl border border-dashed border-white/10 p-4">
          <div>
            <label htmlFor={typeId} className={labelClass}>
              Document Type
            </label>
            <select
              id={typeId}
              value={documentType}
              onChange={(event) =>
                setDocumentType(event.target.value as CompanyDocumentType)
              }
              className={inputClass}
            >
              {COMPANY_DOCUMENT_TYPES.map((value) => (
                <option key={value} value={value}>
                  {COMPANY_DOCUMENT_TYPE_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={titleId} className={labelClass}>
              Title
            </label>
            <input
              id={titleId}
              type="text"
              value={title}
              maxLength={160}
              onChange={(event) => setTitle(event.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor={fileId} className={labelClass}>
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
              className={`${inputClass} h-auto py-3 file:mr-4 file:rounded-xl file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:font-black file:text-white`}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor={issuedId} className={labelClass}>
                Issued Date
              </label>
              <input
                id={issuedId}
                type="date"
                value={issuedOn}
                onChange={(event) => setIssuedOn(event.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor={expiresId} className={labelClass}>
                Expiry Date
              </label>
              <input
                id={expiresId}
                type="date"
                value={expiresOn}
                onChange={(event) => setExpiresOn(event.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleUpload()}
            className={`${EXECUTIVE_CTA_PRIMARY} min-h-12 px-6 disabled:cursor-not-allowed disabled:opacity-60`}
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
        onChange={(event) => {
          const file = event.target.files?.[0];
          const documentId = replacingId;
          event.target.value = "";

          if (file && documentId) {
            void handleReplace(documentId, file);
          }
        }}
      />

      <p
        id={statusId}
        className="text-sm font-semibold"
        role="status"
        aria-live="polite"
      >
        {success ? <span className="text-emerald-300">{success}</span> : null}
        {error ? <span className="text-red-300">{error}</span> : null}
      </p>

      <p className="text-xs font-semibold leading-6 text-slate-500">
        {COMPANY_DOCUMENTS_SELF_DECLARED_NOTICE}
      </p>
    </div>
  );
}

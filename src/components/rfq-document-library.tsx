"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { RFQAmendmentEvidenceFields } from "@/components/rfq-amendment-evidence-fields";
import {
  RFQ_ATTACHMENT_TYPE_FOLDER_LABELS,
  RFQ_ATTACHMENT_TYPE_LABELS,
  RFQ_ATTACHMENT_TYPES,
  isRfqAttachmentType,
} from "@/lib/procurement/rfq-attachment-types";
import { createClient } from "@/lib/supabase/client";

export type RFQAttachment = {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  attachment_type: string;
  revision_label: string | null;
  created_at: string | null;
  cleanup_pending?: boolean;
  cleanup_addendum_id?: string | null;
};

type RFQDocumentLibraryProps = {
  rfqId: string;
  rfqStatus?: string | null;
  initialDocuments?: RFQAttachment[];
  canManage?: boolean;
};

const DOCUMENT_FOLDERS = RFQ_ATTACHMENT_TYPES.map((key) => ({
  key,
  title: RFQ_ATTACHMENT_TYPE_FOLDER_LABELS[key],
}));

const SIGNED_URL_TTL_SECONDS = 60 * 5;

function formatFileSize(bytes: number | null) {
  if (!bytes) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value: string | null) {
  if (!value) return "N/A";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function getFileIcon(fileName: string) {
  const name = fileName.toLowerCase();

  if (name.endsWith(".pdf")) return "📄";
  if (name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".csv")) {
    return "📊";
  }
  if (name.endsWith(".doc") || name.endsWith(".docx")) return "📝";
  if (
    name.endsWith(".png") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".webp")
  ) {
    return "🖼️";
  }
  if (name.endsWith(".zip")) return "🗂️";
  return "📎";
}

function getAttachmentLabel(type: string) {
  return isRfqAttachmentType(type)
    ? RFQ_ATTACHMENT_TYPE_LABELS[type]
    : "Supporting";
}

export default function RFQDocumentLibrary({
  rfqId,
  rfqStatus = "open",
  initialDocuments = [],
  canManage = false,
}: RFQDocumentLibraryProps) {
  const supabase = useMemo(() => createClient(), []);

  const [documents, setDocuments] = useState<RFQAttachment[]>(initialDocuments);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [cleanupPendingId, setCleanupPendingId] = useState("");
  const [openingPath, setOpeningPath] = useState("");
  const [error, setError] = useState("");
  const [addendumTitle, setAddendumTitle] = useState("");
  const [amendmentReason, setAmendmentReason] = useState("");
  const isPublished = rfqStatus !== "draft";

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/rfq-attachments?rfqId=${encodeURIComponent(rfqId)}`,
        { cache: "no-store" },
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to load documents.");
      }

      setDocuments(
        Array.isArray(result.attachments)
          ? (result.attachments as RFQAttachment[])
          : [],
      );
      setCleanupPendingId("");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load documents.",
      );
    } finally {
      setLoading(false);
    }
  }, [rfqId]);

  useEffect(() => {
    const initialLoadTimer = window.setTimeout(() => {
      void loadDocuments();
    }, 0);

    function handleDocumentsUpdated() {
      void loadDocuments();
    }

    window.addEventListener("rfq-documents-updated", handleDocumentsUpdated);

    return () => {
      window.clearTimeout(initialLoadTimer);
      window.removeEventListener(
        "rfq-documents-updated",
        handleDocumentsUpdated,
      );
    };
  }, [loadDocuments]);

  const mintSignedUrl = useCallback(
    async (filePath: string) => {
      const { data, error: signedUrlError } = await supabase.storage
        .from("rfq-attachments")
        .createSignedUrl(filePath, SIGNED_URL_TTL_SECONDS);

      if (signedUrlError || !data?.signedUrl) {
        throw new Error(
          signedUrlError?.message || "Could not create a temporary file URL.",
        );
      }

      return data.signedUrl;
    },
    [supabase],
  );

  const handleOpen = useCallback(
    async (document: RFQAttachment, mode: "preview" | "download") => {
      setOpeningPath(document.file_path);
      setError("");

      try {
        const signedUrl = await mintSignedUrl(document.file_path);

        if (mode === "download") {
          const anchor = window.document.createElement("a");
          anchor.href = signedUrl;
          anchor.download = document.file_name;
          anchor.rel = "noreferrer";
          window.document.body.appendChild(anchor);
          anchor.click();
          anchor.remove();
        } else {
          window.open(signedUrl, "_blank", "noopener,noreferrer");
        }
      } catch (openError) {
        setError(
          openError instanceof Error
            ? openError.message
            : "Failed to open document.",
        );
      } finally {
        setOpeningPath("");
      }
    },
    [mintSignedUrl],
  );

  const handleDelete = useCallback(
    async (document: RFQAttachment) => {
      if (!canManage) return;

      const isCleanupRetry =
        document.cleanup_pending === true || cleanupPendingId === document.id;

      if (
        isPublished &&
        !isCleanupRetry &&
        (!addendumTitle.trim() || !amendmentReason.trim())
      ) {
        setError(
          "Enter an Addendum title and amendment reason before removing a published RFQ document.",
        );
        return;
      }

      const confirmed = window.confirm(
        isCleanupRetry
          ? `Retry storage cleanup for ${document.file_name}? The governed removal is already recorded and this will not issue another Addendum.`
          : `Delete ${document.file_name}? This removes the document from this RFQ.`,
      );

      if (!confirmed) return;

      setDeletingId(document.id);
      setError("");

      try {
        const response = await fetch("/api/rfq-attachments", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            attachmentId: document.id,
            ...(isPublished && !isCleanupRetry
              ? {
                  addendumTitle: addendumTitle.trim(),
                  amendmentReason: amendmentReason.trim(),
                }
              : {}),
          }),
        });
        const result = await response.json();

        if (!response.ok) {
          if (result.storageCleanupPending && result.retryable) {
            setCleanupPendingId(document.id);
          }

          throw new Error(
            result.error || "The RFQ document could not be removed.",
          );
        }

        setDocuments((current) =>
          current.filter((item) => item.id !== document.id),
        );
        setCleanupPendingId((current) =>
          current === document.id ? "" : current,
        );
        setAddendumTitle("");
        setAmendmentReason("");
        window.dispatchEvent(new CustomEvent("rfq-documents-updated"));
      } catch (deleteError) {
        setError(
          deleteError instanceof Error
            ? deleteError.message
            : "The RFQ document could not be removed.",
        );
      } finally {
        setDeletingId("");
      }
    },
    [
      addendumTitle,
      amendmentReason,
      canManage,
      cleanupPendingId,
      isPublished,
    ],
  );

  const visibleFolders = useMemo(
    () =>
      DOCUMENT_FOLDERS.map((folder) => ({
        ...folder,
        documents: documents.filter(
          (document) => document.attachment_type === folder.key,
        ),
      })).filter((folder) => folder.documents.length > 0),
    [documents],
  );

  const hasCleanupPending =
    Boolean(cleanupPendingId) ||
    documents.some((document) => document.cleanup_pending === true);
  const hasLiveDocuments = documents.some(
    (document) => document.cleanup_pending !== true,
  );

  return (
    <section className="min-w-0 @container" data-rfq-document-library="true">
      <div className="flex min-w-0 flex-col gap-4 @md:flex-row @md:items-start @md:justify-between">
        <div className="min-w-0">
          <p className="np-type-meta">Uploaded documents</p>
          <p className="np-type-body mt-2 min-w-0 text-pretty">
            RFQ drawings, specifications, BOQ files, addenda, photos, and
            supporting documents are grouped by package type.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadDocuments()}
          disabled={loading}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.055] px-5 py-3 text-sm font-black text-white transition hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2CC4E8]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07111F] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error ? (
        <div className="mt-6 rounded-2xl border border-red-300/20 bg-red-400/10 px-4 py-3 text-sm font-bold text-red-200">
          {error}
        </div>
      ) : null}

      {hasCleanupPending ? (
        <div
          className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm font-bold leading-6 text-amber-100"
          role="status"
        >
          Storage cleanup is pending. The governed removal and Addendum are
          already recorded. Use Retry cleanup on the retained document; the
          retry removes only its governed storage object and creates no new
          Addendum.
        </div>
      ) : null}

      {canManage && isPublished && hasLiveDocuments ? (
        <div className="mt-6">
          <RFQAmendmentEvidenceFields
            idPrefix="rfq-document-removal"
            title={addendumTitle}
            reason={amendmentReason}
            disabled={Boolean(deletingId)}
            onTitleChange={setAddendumTitle}
            onReasonChange={setAmendmentReason}
          />
        </div>
      ) : null}

      {documents.length === 0 ? (
        <div
          className="mt-6 rounded-executive border border-dashed border-white/10 px-5 py-8 text-center"
          role="status"
        >
          <p className="np-type-h3 min-w-0 text-pretty">
            No construction documents uploaded yet.
          </p>

          <p className="mt-3 min-w-0 text-pretty text-sm font-semibold leading-6 text-slate-500">
            Uploaded drawings, specifications, BOQs, photos, addenda, and
            supporting documents will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-5">
          {visibleFolders.map((folder) => (
            <DocumentFolder
              key={folder.key}
              title={folder.title}
              documents={folder.documents}
              canManage={canManage}
              deletingId={deletingId}
              cleanupPendingId={cleanupPendingId}
              openingPath={openingPath}
              onOpen={handleOpen}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function DocumentFolder({
  title,
  documents,
  canManage,
  deletingId,
  cleanupPendingId,
  openingPath,
  onOpen,
  onDelete,
}: {
  title: string;
  documents: RFQAttachment[];
  canManage: boolean;
  deletingId: string;
  cleanupPendingId: string;
  openingPath: string;
  onOpen: (document: RFQAttachment, mode: "preview" | "download") => void;
  onDelete: (document: RFQAttachment) => void;
}) {
  return (
    <section className="min-w-0 rounded-executive border border-white/10 p-5">
      <div className="flex min-w-0 flex-col gap-3 border-b border-white/10 pb-4 @sm:flex-row @sm:items-center @sm:justify-between">
        <div className="min-w-0">
          <h4 className="min-w-0 text-pretty text-lg font-black text-white">
            {title}
          </h4>

          <p className="mt-1 text-sm font-semibold text-slate-500">
            {documents.length} document{documents.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {documents.map((document) => (
          <DocumentRow
            key={document.id}
            document={document}
            canManage={canManage}
            deletingId={deletingId}
            cleanupPendingId={cleanupPendingId}
            openingPath={openingPath}
            onOpen={onOpen}
            onDelete={onDelete}
          />
        ))}
      </div>
    </section>
  );
}

function DocumentRow({
  document,
  canManage,
  deletingId,
  cleanupPendingId,
  openingPath,
  onOpen,
  onDelete,
}: {
  document: RFQAttachment;
  canManage: boolean;
  deletingId: string;
  cleanupPendingId: string;
  openingPath: string;
  onOpen: (document: RFQAttachment, mode: "preview" | "download") => void;
  onDelete: (document: RFQAttachment) => void;
}) {
  const isOpening = openingPath === document.file_path;
  const isCleanupPending =
    document.cleanup_pending === true || cleanupPendingId === document.id;

  return (
    <article className="min-w-0 rounded-executive border border-white/10 bg-black/20 p-4">
      <div className="flex min-w-0 flex-col gap-4 @md:flex-row @md:items-start @md:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#2CC4E8]/20 bg-[#2CC4E8]/10 text-xl"
            aria-hidden="true"
          >
            {getFileIcon(document.file_name)}
          </div>

          <div className="min-w-0">
            <p className="min-w-0 text-pretty text-lg font-black text-white">
              {document.file_name}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-[#2CC4E8]/25 bg-[#2CC4E8]/10 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#9BE8F8]">
                {getAttachmentLabel(document.attachment_type)}
              </span>

              <span className="rounded-full border border-[#C8A646]/25 bg-[#C8A646]/10 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#F5D77B]">
                {document.revision_label || "Rev 0"}
              </span>

              <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                {formatFileSize(document.file_size)}
              </span>

              <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                {formatDate(document.created_at)}
              </span>
            </div>
          </div>
        </div>

        <div
          className="flex min-w-0 flex-wrap gap-3"
          aria-label="Document actions"
        >
          {isCleanupPending ? (
            <span className="inline-flex min-h-11 items-center justify-center rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-amber-100">
              Cleanup pending
            </span>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onOpen(document, "preview")}
                disabled={isOpening}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#2CC4E8]/25 bg-[#2CC4E8]/10 px-5 py-3 text-sm font-black text-[#9BE8F8] transition hover:bg-[#2CC4E8]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2CC4E8]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07111F] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isOpening ? "Opening..." : "Preview"}
              </button>

              <button
                type="button"
                onClick={() => onOpen(document, "download")}
                disabled={isOpening}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.055] px-5 py-3 text-sm font-black text-white transition hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2CC4E8]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07111F] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isOpening ? "Opening..." : "Download"}
              </button>
            </>
          )}

          {canManage ? (
            <button
              type="button"
              onClick={() => onDelete(document)}
              disabled={deletingId === document.id}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-red-300/15 bg-red-400/10 px-5 py-3 text-sm font-black text-red-300 transition hover:bg-red-400/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07111F] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deletingId === document.id
                ? isCleanupPending
                  ? "Retrying cleanup..."
                  : "Deleting..."
                : isCleanupPending
                  ? "Retry cleanup"
                  : "Delete"}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

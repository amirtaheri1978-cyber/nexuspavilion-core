"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export type RFQAttachment = {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  attachment_type: string;
  revision_label: string | null;
  created_at: string | null;
};

type RFQDocumentLibraryProps = {
  rfqId: string;
  initialDocuments?: RFQAttachment[];
  canManage?: boolean;
};

const DOCUMENT_FOLDERS = [
  { key: "drawing", title: "Drawings" },
  { key: "specification", title: "Specifications" },
  { key: "boq", title: "BOQ / Bid Forms" },
  { key: "photo", title: "Photos" },
  { key: "addenda", title: "Addenda" },
  { key: "supporting", title: "Supporting Documents" },
];

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
  if (type === "drawing") return "Drawing";
  if (type === "specification") return "Specification";
  if (type === "boq") return "BOQ";
  if (type === "photo") return "Photo";
  if (type === "addenda") return "Addenda";
  return "Supporting";
}

export default function RFQDocumentLibrary({
  rfqId,
  initialDocuments = [],
  canManage = false,
}: RFQDocumentLibraryProps) {
  const supabase = useMemo(() => createClient(), []);

  const [documents, setDocuments] = useState<RFQAttachment[]>(initialDocuments);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [openingPath, setOpeningPath] = useState("");
  const [error, setError] = useState("");

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError("");

    const { data, error: loadError } = await supabase
      .from("rfq_attachments")
      .select(
        "id, file_name, file_path, file_size, attachment_type, revision_label, created_at",
      )
      .eq("rfq_id", rfqId)
      .order("created_at", { ascending: false });

    if (loadError) {
      setError(loadError.message || "Failed to load documents.");
      setLoading(false);
      return;
    }

    setDocuments((data || []) as RFQAttachment[]);
    setLoading(false);
  }, [rfqId, supabase]);

  useEffect(() => {
    function handleDocumentsUpdated() {
      void loadDocuments();
    }

    window.addEventListener("rfq-documents-updated", handleDocumentsUpdated);

    return () => {
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

      const confirmed = window.confirm(
        `Delete ${document.file_name}? This removes the document from this RFQ.`,
      );

      if (!confirmed) return;

      setDeletingId(document.id);
      setError("");

      const { error: storageError } = await supabase.storage
        .from("rfq-attachments")
        .remove([document.file_path]);

      if (storageError) {
        setError(storageError.message || "Failed to remove storage file.");
        setDeletingId("");
        return;
      }

      const { error: dbError } = await supabase
        .from("rfq_attachments")
        .delete()
        .eq("id", document.id);

      if (dbError) {
        setError(
          dbError.message ||
            "Storage object removed, but the document record could not be deleted. Refresh and retry if the row remains.",
        );
        setDeletingId("");
        return;
      }

      setDocuments((current) =>
        current.filter((item) => item.id !== document.id),
      );
      setDeletingId("");
    },
    [canManage, supabase],
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
  openingPath,
  onOpen,
  onDelete,
}: {
  title: string;
  documents: RFQAttachment[];
  canManage: boolean;
  deletingId: string;
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
  openingPath,
  onOpen,
  onDelete,
}: {
  document: RFQAttachment;
  canManage: boolean;
  deletingId: string;
  openingPath: string;
  onOpen: (document: RFQAttachment, mode: "preview" | "download") => void;
  onDelete: (document: RFQAttachment) => void;
}) {
  const isOpening = openingPath === document.file_path;

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

          {canManage ? (
            <button
              type="button"
              onClick={() => onDelete(document)}
              disabled={deletingId === document.id}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-red-300/15 bg-red-400/10 px-5 py-3 text-sm font-black text-red-300 transition hover:bg-red-400/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07111F] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deletingId === document.id ? "Deleting..." : "Delete"}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export type RFQAttachment = {
id: string;
file_name: string;
file_url: string;
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
const [error, setError] = useState("");

const loadDocuments = useCallback(async () => {
setLoading(true);
setError("");

const { data, error: loadError } = await supabase
.from("rfq_attachments")
.select("*")
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
handleDocumentsUpdated
);
};
}, [loadDocuments]);

const handleDelete = useCallback(
async (document: RFQAttachment) => {
if (!canManage) return;

const confirmed = window.confirm(
`Delete ${document.file_name}? This removes the document from this RFQ.`
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
setError(dbError.message || "Failed to delete document record.");
setDeletingId("");
return;
}

setDocuments((current) =>
current.filter((item) => item.id !== document.id)
);
setDeletingId("");
},
[canManage, supabase]
);

const visibleFolders = useMemo(
() =>
DOCUMENT_FOLDERS.map((folder) => ({
...folder,
documents: documents.filter(
(document) => document.attachment_type === folder.key
),
})).filter((folder) => folder.documents.length > 0),
[documents]
);

return (
<section className="mt-8 rounded-[32px] border border-white/10 bg-[#061426]/90 p-6 text-white shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-8">
<div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
<div>
<p className="text-xs font-black uppercase tracking-[0.3em] text-[#C8A646]">
Uploaded Documents
</p>

<h2 className="mt-3 text-3xl font-black text-white">
Construction Document Library
</h2>

<p className="mt-3 max-w-4xl text-sm font-semibold leading-7 text-slate-400">
RFQ drawings, specifications, BOQ files, addenda, photos, and
supporting documents are grouped into construction folders.
</p>
</div>

<button
type="button"
onClick={() => void loadDocuments()}
disabled={loading}
className="rounded-full border border-white/10 bg-white/[0.055] px-5 py-3 text-sm font-black text-white transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
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
<div className="mt-8 rounded-[26px] border border-dashed border-white/10 bg-[#07111F]/70 p-10 text-center">
<p className="text-xl font-black text-white">
No construction documents uploaded yet.
</p>

<p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
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
onDelete,
}: {
title: string;
documents: RFQAttachment[];
canManage: boolean;
deletingId: string;
onDelete: (document: RFQAttachment) => void;
}) {
return (
<section className="rounded-[28px] border border-white/10 bg-[#07111F]/70 p-5">
<div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
<div>
<p className="text-xl font-black text-white">📁 {title}</p>

<p className="mt-1 text-sm font-semibold text-slate-500">
{documents.length} document{documents.length === 1 ? "" : "s"}
</p>
</div>

<span className="w-fit rounded-full border border-[#2CC4E8]/25 bg-[#2CC4E8]/10 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#9BE8F8]">
{documents.length} Files
</span>
</div>

<div className="mt-5 space-y-4">
{documents.map((document) => (
<DocumentRow
key={document.id}
document={document}
canManage={canManage}
deletingId={deletingId}
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
onDelete,
}: {
document: RFQAttachment;
canManage: boolean;
deletingId: string;
onDelete: (document: RFQAttachment) => void;
}) {
return (
<article className="rounded-[24px] border border-white/10 bg-[#061426]/75 p-5">
<div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
<div className="flex min-w-0 items-start gap-4">
<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#2CC4E8]/20 bg-[#2CC4E8]/10 text-xl">
{getFileIcon(document.file_name)}
</div>

<div className="min-w-0">
<p className="truncate text-lg font-black text-white">
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

<div className="flex flex-wrap gap-3">
<a
href={document.file_url}
target="_blank"
rel="noreferrer"
className="rounded-full border border-[#2CC4E8]/25 bg-[#2CC4E8]/10 px-5 py-3 text-sm font-black text-[#9BE8F8] transition hover:bg-[#2CC4E8]/15"
>
Preview
</a>

<a
href={document.file_url}
download
className="rounded-full border border-white/10 bg-white/[0.055] px-5 py-3 text-sm font-black text-white transition hover:bg-white/[0.08]"
>
Download
</a>

{canManage ? (
<button
type="button"
onClick={() => onDelete(document)}
disabled={deletingId === document.id}
className="rounded-full border border-red-300/15 bg-red-400/10 px-5 py-3 text-sm font-black text-red-300 transition hover:bg-red-400/15 disabled:cursor-not-allowed disabled:opacity-50"
>
{deletingId === document.id ? "Deleting..." : "Delete"}
</button>
) : null}
</div>
</div>
</article>
);
}

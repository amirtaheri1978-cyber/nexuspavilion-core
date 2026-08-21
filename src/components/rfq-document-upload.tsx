"use client";

import { useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type AttachmentType =
| "drawing"
| "specification"
| "boq"
| "photo"
| "addenda"
| "supporting";

type RFQDocumentUploadProps = {
rfqId: string;
companyId: string;
attachmentType: AttachmentType;
title: string;
description: string;
};

function formatFileSize(bytes: number) {
if (bytes < 1024) return `${bytes} B`;
if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function RFQDocumentUpload({
rfqId,
companyId,
attachmentType,
title,
description,
}: RFQDocumentUploadProps) {
const supabase = createClient();
const inputRef = useRef<HTMLInputElement | null>(null);

const [revisionLabel, setRevisionLabel] = useState("Rev 0");
const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
const [dragActive, setDragActive] = useState(false);
const [uploading, setUploading] = useState(false);
const [message, setMessage] = useState("");
const [error, setError] = useState("");

function updateSelectedFiles(files: FileList | null) {
if (!files || files.length === 0) return;

setSelectedFiles(Array.from(files));
setMessage("");
setError("");
}

async function uploadFiles(filesToUpload: File[]) {
if (filesToUpload.length === 0) {
setError("Please choose at least one file before uploading.");
return;
}

const normalizedRevision = revisionLabel.trim() || "Rev 0";

setUploading(true);
setMessage("");
setError("");

try {
const uploadResults = await Promise.all(
filesToUpload.map(async (file) => {
const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
const filePath = `${companyId}/${rfqId}/${attachmentType}/${Date.now()}-${safeName}`;

const { error: uploadError } = await supabase.storage
.from("rfq-attachments")
.upload(filePath, file, {
cacheControl: "3600",
upsert: false,
});

if (uploadError) {
throw new Error(uploadError.message);
}

const { data: signedUrlData, error: signedUrlError } =
await supabase.storage
.from("rfq-attachments")
.createSignedUrl(filePath, 60 * 60 * 24 * 7);

if (signedUrlError || !signedUrlData?.signedUrl) {
throw new Error(
signedUrlError?.message || "Could not create signed file URL."
);
}

const response = await fetch("/api/rfq-attachments", {
method: "POST",
headers: {
"Content-Type": "application/json",
},
body: JSON.stringify({
rfqId,
companyId,
fileName: file.name,
fileUrl: signedUrlData.signedUrl,
filePath,
fileType: file.type,
fileSize: file.size,
attachmentType,
revisionLabel: normalizedRevision,
}),
});

const data = await response.json();

if (!response.ok) {
throw new Error(data.error || "Failed to save attachment metadata.");
}

return data.attachment;
})
);

setMessage(
`${uploadResults.length} file(s) uploaded successfully as ${normalizedRevision}. Refresh the document library below to view the latest files.`
);

setSelectedFiles([]);

if (inputRef.current) {
inputRef.current.value = "";
}

window.dispatchEvent(new CustomEvent("rfq-documents-updated"));
} catch (uploadError) {
console.error(uploadError);
setError(
uploadError instanceof Error
? uploadError.message
: "Upload failed. Please try again."
);
} finally {
setUploading(false);
setDragActive(false);
}
}

return (
<div className="min-w-0 @container rounded-executive border border-white/10 bg-black/20 p-5">
<div className="flex min-w-0 flex-col gap-3 @sm:flex-row @sm:items-start @sm:justify-between">
<div className="min-w-0">
<p className="min-w-0 text-pretty text-lg font-black text-white">{title}</p>

<p className="mt-2 min-w-0 text-pretty text-sm font-semibold leading-6 text-slate-400">
{description}
</p>
</div>

<span className="w-fit shrink-0 rounded-full border border-[#2CC4E8]/25 bg-[#2CC4E8]/10 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#9BE8F8]">
Optional
</span>
</div>

<label className="mt-5 block">
<span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-400">
Revision Label
</span>

<input
value={revisionLabel}
onChange={(event) => setRevisionLabel(event.target.value)}
disabled={uploading}
placeholder="Rev 0"
className="w-full rounded-2xl border border-white/10 bg-[#07111F] px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-[#2CC4E8]/40 disabled:cursor-not-allowed disabled:opacity-60"
/>
</label>

<div
className={`mt-4 rounded-[22px] border border-dashed p-5 transition ${
dragActive
? "border-[#2CC4E8]/45 bg-[#2CC4E8]/10"
: "border-white/10 bg-[#07111F]/80"
}`}
onDragOver={(event) => {
event.preventDefault();
setDragActive(true);
}}
onDragLeave={() => setDragActive(false)}
onDrop={(event) => {
event.preventDefault();
setDragActive(false);
updateSelectedFiles(event.dataTransfer.files);
}}
>
<input
ref={inputRef}
type="file"
multiple
disabled={uploading}
onChange={(event) => updateSelectedFiles(event.target.files)}
className="hidden"
/>

<div className="text-center">
<p className="text-sm font-black text-white">
Drag and drop files here
</p>

<p className="mt-2 text-xs font-semibold text-slate-400">
or choose files from your device
</p>

<button
type="button"
onClick={() => inputRef.current?.click()}
disabled={uploading}
className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full border border-[#C8A646]/25 bg-[#C8A646]/10 px-5 py-3 text-sm font-black text-[#F5D77B] transition hover:bg-[#C8A646]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A646]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07111F] disabled:cursor-not-allowed disabled:opacity-50"
>
Choose Files
</button>
</div>
</div>

{selectedFiles.length > 0 ? (
<div className="mt-4 space-y-3">
{selectedFiles.map((file) => (
<div
key={`${file.name}-${file.size}`}
className="rounded-2xl border border-white/10 bg-[#07111F]/80 px-4 py-3"
>
<p className="min-w-0 text-pretty text-sm font-black text-white">
{file.name}
</p>

<p className="mt-1 text-xs font-semibold text-slate-400">
{formatFileSize(file.size)} · {file.type || "Unknown file type"}
</p>
</div>
))}
</div>
) : null}

{uploading ? (
<div className="mt-4 rounded-2xl border border-[#2CC4E8]/20 bg-[#2CC4E8]/10 px-4 py-3">
<p className="text-sm font-black text-[#9BE8F8]">
Uploading document package...
</p>

<div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
<div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-[#2CC4E8] to-[#F5D77B]" />
</div>
</div>
) : null}

{message ? (
<p className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-300">
{message}
</p>
) : null}

{error ? (
<p className="mt-4 rounded-2xl border border-red-300/20 bg-red-400/10 px-4 py-3 text-sm font-bold text-red-200">
{error}
</p>
) : null}

<button
type="button"
onClick={() => void uploadFiles(selectedFiles)}
disabled={uploading || selectedFiles.length === 0}
className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#B9902F] via-[#C8A646] to-[#F5D77B] px-5 py-3 text-sm font-black text-slate-950 shadow-[0_18px_55px_rgba(200,166,70,0.18)] transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A646]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07111F]"
>
{uploading ? "Uploading..." : "Upload Selected Files"}
</button>
</div>
);
}
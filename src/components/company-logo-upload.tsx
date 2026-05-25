"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

type Props = {
companyId: string;
onUploadComplete?: (url: string) => void;
};

export default function CompanyLogoUpload({
companyId,
onUploadComplete,
}: Props) {
const supabase = createClient();

const [uploading, setUploading] = useState(false);
const [error, setError] = useState("");
const [success, setSuccess] = useState("");

async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
const file = event.target.files?.[0];

if (!file) return;

try {
setUploading(true);
setError("");
setSuccess("");

const fileExt = file.name.split(".").pop();
const safeFileName = `${Date.now()}-${companyId}.${fileExt}`;
const filePath = `logos/${safeFileName}`;

const { error: uploadError } = await supabase.storage
.from("Company-logos")
.upload(filePath, file, {
upsert: true,
});

if (uploadError) {
console.error(uploadError);
setError("Failed to upload logo.");
return;
}

const {
data: { publicUrl },
} = supabase.storage.from("Company-logos").getPublicUrl(filePath);

const { error: updateError } = await supabase
.from("companies")
.update({
logo_url: publicUrl,
})
.eq("id", companyId);

if (updateError) {
console.error(updateError);
setError("Logo uploaded, but failed to save URL.");
return;
}

setSuccess("Logo uploaded successfully.");

if (onUploadComplete) {
onUploadComplete(publicUrl);
}
} catch (err) {
console.error(err);
setError("Failed to upload logo.");
} finally {
setUploading(false);
}
}

return (
<div className="rounded-2xl border border-slate-200 bg-white p-5">
<h3 className="text-lg font-semibold text-slate-900">Company Logo</h3>

<p className="mt-1 text-sm text-slate-500">
Upload a public enterprise logo for your company profile.
</p>

<input
type="file"
accept="image/*"
onChange={handleUpload}
disabled={uploading}
className="mt-4 block w-full text-sm text-slate-600"
/>

{uploading && (
<p className="mt-3 text-sm text-amber-700">Uploading logo...</p>
)}

{success && (
<p className="mt-3 text-sm text-emerald-700">{success}</p>
)}

{error && <p className="mt-3 text-sm text-red-600">{error}</p>}
</div>
);
}
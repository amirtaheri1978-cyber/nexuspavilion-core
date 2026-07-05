"use client";

import Image from "next/image";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

type CompanyLogoUploadProps = {
companyId: string;
currentLogoUrl?: string | null;
};

export default function CompanyLogoUpload({
companyId,
currentLogoUrl,
}: CompanyLogoUploadProps) {
const supabase = createClient();

const [logoUrl, setLogoUrl] = useState(currentLogoUrl || "");
const [uploading, setUploading] = useState(false);
const [message, setMessage] = useState("");

async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
const file = event.target.files?.[0];

if (!file) return;

setUploading(true);
setMessage("");

const fileExt = file.name.split(".").pop();
const filePath = `${companyId}-${Date.now()}.${fileExt}`;

const { error: uploadError } = await supabase.storage
.from("Company-logos")
.upload(filePath, file, {
cacheControl: "3600",
upsert: true,
});

if (uploadError) {
console.error(uploadError);
setMessage("Logo upload failed.");
setUploading(false);
return;
}

const { data } = supabase.storage.from("Company-logos").getPublicUrl(filePath);

const publicUrl = data.publicUrl;

const { error: updateError } = await supabase
.from("companies")
.update({
logo_url: publicUrl,
})
.eq("id", companyId);

if (updateError) {
console.error(updateError);
setMessage("Logo uploaded, but company profile was not updated.");
setUploading(false);
return;
}

setLogoUrl(publicUrl);
setMessage("Logo uploaded successfully.");
setUploading(false);
}

return (
<div className="rounded-3xl border border-white/10 bg-[#0B1B2C] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
<p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">
Company Branding
</p>

<h2 className="mt-3 text-3xl font-black text-white">Company Logo</h2>

{logoUrl ? (
<div className="mt-6">
<Image
src={logoUrl}
alt="Company logo"
width={112}
height={112}
className="h-28 w-28 rounded-2xl border border-slate-200 object-contain p-3"
/>
</div>
) : null}

<div className="mt-6">
<input
type="file"
accept="image/*"
onChange={handleUpload}
disabled={uploading}
className="w-full rounded-2xl border border-slate-200 p-4"
/>
</div>

{message ? (
<p className="mt-4 text-sm font-semibold text-slate-700">{message}</p>
) : null}

{uploading ? (
<p className="mt-4 text-sm text-slate-500">Uploading logo...</p>
) : null}
</div>
);
}
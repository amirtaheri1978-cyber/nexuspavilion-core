"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
registerSchema,
type RegisterSchemaType,
} from "@/lib/validators/register.schema";

import Button from "@/components/ui/Button";

export default function RegisterForm() {
const router = useRouter();

const [loading, setLoading] = useState(false);
const [serverError, setServerError] = useState<string | null>(null);

const {
register,
handleSubmit,
formState: { errors },
} = useForm<RegisterSchemaType>({
resolver: zodResolver(registerSchema),

defaultValues: {
legalName: "",
taxId: "",
email: "",
phoneNumber: "",
regionalHub: "",
roleType: "",
mainCategory: "",
},
});

const onSubmit = async (data: RegisterSchemaType) => {
setLoading(true);
setServerError(null);

try {
const response = await fetch("/api/v1/auth/register", {
method: "POST",

headers: {
"Content-Type": "application/json",
},

body: JSON.stringify({
legalName: data.legalName,
taxId: data.taxId,
roleType: data.roleType,
regionalHub: data.regionalHub,
mainCategory: data.mainCategory,

user: {
email: data.email,
phoneNumber: data.phoneNumber,
firstName: "System",
lastName: "Admin",
},
}),
});

const result = await response.json();

if (!response.ok) {
if (
response.status === 409 ||
result.errorCode === "DUPLICATE_TAX_ID"
) {
throw new Error(
"This Tax Identification Number is already registered inside the selected Regional Hub."
);
}

throw new Error(
result.message || "An unexpected error occurred."
);
}

router.push("/dashboard");
} catch (error: any) {
setServerError(error.message);
} finally {
setLoading(false);
}
};

return (
<form
onSubmit={handleSubmit(onSubmit)}
className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
>
<div>
<h2 className="text-3xl font-bold tracking-tight text-slate-900">
Corporate Registration
</h2>

<p className="mt-2 text-sm text-slate-500">
Register your organization to access enterprise governance systems.
</p>
</div>

{serverError && (
<div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
{serverError}
</div>
)}

<div className="mt-8 space-y-5">
{/* Corporate Legal Name */}
<div>
<input
type="text"
placeholder="Corporate Legal Name"
{...register("legalName")}
className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-slate-900"
/>

{errors.legalName && (
<p className="mt-1 text-xs text-red-500">
{errors.legalName.message}
</p>
)}
</div>

{/* Tax ID */}
<div>
<input
type="text"
placeholder="Tax ID / Business Number"
{...register("taxId")}
className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-slate-900"
/>

{errors.taxId && (
<p className="mt-1 text-xs text-red-500">
{errors.taxId.message}
</p>
)}
</div>

{/* Email */}
<div>
<input
type="email"
placeholder="Corporate Email"
{...register("email")}
className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-slate-900"
/>

{errors.email && (
<p className="mt-1 text-xs text-red-500">
{errors.email.message}
</p>
)}
</div>

{/* Phone */}
<div>
<input
type="text"
placeholder="Phone Number"
{...register("phoneNumber")}
className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-slate-900"
/>

{errors.phoneNumber && (
<p className="mt-1 text-xs text-red-500">
{errors.phoneNumber.message}
</p>
)}
</div>

{/* Regional Hub */}
<div>
<input
type="text"
placeholder="Regional Hub"
{...register("regionalHub")}
className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-slate-900"
/>

{errors.regionalHub && (
<p className="mt-1 text-xs text-red-500">
{errors.regionalHub.message}
</p>
)}
</div>

{/* Role Type */}
<div>
<select
{...register("roleType")}
className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-slate-900"
>
<option value="">Role Type</option>

<option value="OWNER_DEVELOPER">
Owner / Developer
</option>

<option value="GENERAL_CONTRACTOR">
General Contractor
</option>

<option value="INDUSTRIAL_SUPPLIER">
Industrial Supplier
</option>
</select>

{errors.roleType && (
<p className="mt-1 text-xs text-red-500">
{errors.roleType.message}
</p>
)}
</div>

{/* Primary Category */}
<div>
<input
type="text"
placeholder="Primary Category"
{...register("mainCategory")}
className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-slate-900"
/>

{errors.mainCategory && (
<p className="mt-1 text-xs text-red-500">
{errors.mainCategory.message}
</p>
)}
</div>

{/* Submit */}
<div className="pt-2">
<Button
type="submit"
disabled={loading}
>
{loading
? "Initializing..."
: "Initialize Sandbox Account"}
</Button>
</div>
</div>
</form>
);
} 
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
import ErrorMessage from "@/components/ui/ErrorMessage";
import FormInput from "@/components/ui/FormInput";

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

const onSubmit = async () => {
setLoading(true);
setServerError(null);

try {
setTimeout(() => {
router.push("/dashboard");
}, 1200);
} catch {
setServerError("Registration failed. Please try again.");
setLoading(false);
}
};

return (
<form
onSubmit={handleSubmit(onSubmit)}
className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
>
<h2 className="text-3xl font-bold tracking-tight text-slate-900">
Corporate Registration
</h2>

<p className="mt-2 text-sm text-slate-500">
Register your organization to access enterprise governance systems.
</p>

{serverError && (
<div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
{serverError}
</div>
)}

<div className="mt-8 space-y-5">
<FormInput
placeholder="Corporate Legal Name"
error={errors.legalName?.message}
{...register("legalName")}
/>

<FormInput
placeholder="Tax ID / Business Number"
error={errors.taxId?.message}
{...register("taxId")}
/>

<FormInput
type="email"
placeholder="Corporate Email"
error={errors.email?.message}
{...register("email")}
/>

<FormInput
placeholder="Phone Number"
error={errors.phoneNumber?.message}
{...register("phoneNumber")}
/>

<FormInput
placeholder="Regional Hub"
error={errors.regionalHub?.message}
{...register("regionalHub")}
/>

<div>
<select
{...register("roleType")}
defaultValue=""
className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 outline-none transition-all focus:border-slate-900"
>
<option value="" disabled>
Role Type
</option>
<option value="OWNER">Owner / Developer</option>
<option value="CONTRACTOR">General Contractor</option>
<option value="SUPPLIER">Industrial Supplier</option>
</select>

<ErrorMessage message={errors.roleType?.message} />
</div>

<FormInput
placeholder="Primary Category"
error={errors.mainCategory?.message}
{...register("mainCategory")}
/>

<div className="pt-2">
<Button type="submit" disabled={loading}>
{loading ? "Initializing..." : "Initialize Sandbox Account"}
</Button>
</div>
</div>
</form>
);
}
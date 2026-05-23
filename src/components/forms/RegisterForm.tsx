"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import Button from "@/components/ui/Button";
import FormInput from "@/components/ui/FormInput";
import ErrorMessage from "@/components/ui/ErrorMessage";

import {
saveEnterpriseSession,
type MockEnterpriseSession,
} from "@/lib/mockEnterpriseSession";

export default function RegisterForm() {
const router = useRouter();

const [loading, setLoading] = useState(false);

const [formData, setFormData] = useState({
legalName: "",
taxId: "",
email: "",
phone: "",
regionalHub: "",
roleType: "",
primaryCategory: "",
});

const [errors, setErrors] = useState({
legalName: "",
taxId: "",
email: "",
phone: "",
regionalHub: "",
roleType: "",
primaryCategory: "",
});

function validateForm() {
const newErrors = {
legalName: "",
taxId: "",
email: "",
phone: "",
regionalHub: "",
roleType: "",
primaryCategory: "",
};

let isValid = true;

if (!formData.legalName.trim()) {
newErrors.legalName = "Corporate legal name is required.";
isValid = false;
}

if (!formData.taxId.trim()) {
newErrors.taxId = "Tax ID is required.";
isValid = false;
}

if (!formData.email.trim()) {
newErrors.email = "Corporate email is required.";
isValid = false;
}

if (!formData.phone.trim()) {
newErrors.phone = "Phone number is required.";
isValid = false;
}

if (!formData.regionalHub.trim()) {
newErrors.regionalHub = "Regional hub is required.";
isValid = false;
}

if (!formData.roleType.trim()) {
newErrors.roleType = "Role type is required.";
isValid = false;
}

if (!formData.primaryCategory.trim()) {
newErrors.primaryCategory = "Primary category is required.";
isValid = false;
}

setErrors(newErrors);

return isValid;
}

async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
event.preventDefault();

const isValid = validateForm();

if (!isValid) {
return;
}

setLoading(true);

const sessionData: MockEnterpriseSession = {
...formData,
verificationStatus: "SANDBOX",
};

saveEnterpriseSession(sessionData);

await new Promise((resolve) => setTimeout(resolve, 2000));

router.push("/dashboard");
}

function handleChange(
event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
) {
setFormData({
...formData,
[event.target.name]: event.target.value,
});
}

return (
<form
onSubmit={handleSubmit}
className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-10 shadow-sm"
>
<div className="space-y-6">
<div>
<h1 className="text-4xl font-bold text-slate-950">
Corporate Registration
</h1>

<p className="mt-3 text-sm text-slate-500">
Register your organization to access enterprise governance systems.
</p>
</div>

<FormInput
name="legalName"
placeholder="Corporate Legal Name"
value={formData.legalName}
onChange={handleChange}
error={errors.legalName}
/>

<FormInput
name="taxId"
placeholder="Tax ID / Business Number"
value={formData.taxId}
onChange={handleChange}
error={errors.taxId}
/>

<FormInput
type="email"
name="email"
placeholder="Corporate Email"
value={formData.email}
onChange={handleChange}
error={errors.email}
/>

<FormInput
name="phone"
placeholder="Phone Number"
value={formData.phone}
onChange={handleChange}
error={errors.phone}
/>

<FormInput
name="regionalHub"
placeholder="Regional Hub"
value={formData.regionalHub}
onChange={handleChange}
error={errors.regionalHub}
/>

<div>
<select
name="roleType"
value={formData.roleType}
onChange={handleChange}
className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-slate-900"
>
<option value="">Role Type</option>
<option value="OWNER">Owner / Developer</option>
<option value="CONTRACTOR">General Contractor</option>
<option value="SUPPLIER">Industrial Supplier</option>
</select>

<ErrorMessage message={errors.roleType} />
</div>

<FormInput
name="primaryCategory"
placeholder="Primary Category"
value={formData.primaryCategory}
onChange={handleChange}
error={errors.primaryCategory}
/>

<Button type="submit" disabled={loading}>
{loading
? "Initializing Enterprise Workspace..."
: "Initialize Sandbox Account"}
</Button>
</div>
</form>
);
}
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function RegisterForm() {
const router = useRouter();

const [loading, setLoading] = useState(false);

const [formData, setFormData] = useState({
legalName: "",
taxId: "",
email: "",
phoneNumber: "",
regionalHub: "",
roleType: "",
mainCategory: "",
});

const handleSubmit = async (e: React.FormEvent) => {
e.preventDefault();

setLoading(true);

setTimeout(() => {
router.push("/dashboard");
}, 1200);
};

return (
<form
onSubmit={handleSubmit}
className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
>
<h2 className="text-2xl font-bold text-slate-900">
Corporate Registration
</h2>

<p className="mt-2 text-sm text-slate-500">
Register your organization to access enterprise governance systems.
</p>

<div className="mt-8 grid grid-cols-1 gap-4">

<Input
placeholder="Corporate Legal Name"
value={formData.legalName}
onChange={(value) =>
setFormData({
...formData,
legalName: value,
})
}
/>

<Input
placeholder="Tax ID / Business Number"
value={formData.taxId}
onChange={(value) =>
setFormData({
...formData,
taxId: value,
})
}
/>

<Input
type="email"
placeholder="Corporate Email"
value={formData.email}
onChange={(value) =>
setFormData({
...formData,
email: value,
})
}
/>

<Input
placeholder="Phone Number"
value={formData.phoneNumber}
onChange={(value) =>
setFormData({
...formData,
phoneNumber: value,
})
}
/>

<Input
placeholder="Regional Hub"
value={formData.regionalHub}
onChange={(value) =>
setFormData({
...formData,
regionalHub: value,
})
}
/>

<Input
placeholder="Role Type"
value={formData.roleType}
onChange={(value) =>
setFormData({
...formData,
roleType: value,
})
}
/>

<Input
placeholder="Primary Category"
value={formData.mainCategory}
onChange={(value) =>
setFormData({
...formData,
mainCategory: value,
})
}
/>

</div>

<div className="mt-6">
<Button
type="submit"
disabled={loading}
>
{loading ? "Initializing..." : "Initialize Sandbox Account"}
</Button>
</div>
</form>
);
} 
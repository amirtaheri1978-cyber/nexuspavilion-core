"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

// شبیه‌سازی API
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
<input
type="text"
placeholder="Corporate Legal Name"
className="rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-slate-900"
value={formData.legalName}
onChange={(e) =>
setFormData({
...formData,
legalName: e.target.value,
})
}
/>

<input
type="text"
placeholder="Tax ID / Business Number"
className="rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-slate-900"
value={formData.taxId}
onChange={(e) =>
setFormData({
...formData,
taxId: e.target.value,
})
}
/>

<input
type="email"
placeholder="Corporate Email"
className="rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-slate-900"
value={formData.email}
onChange={(e) =>
setFormData({
...formData,
email: e.target.value,
})
}
/>

<input
type="text"
placeholder="Phone Number"
className="rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-slate-900"
value={formData.phoneNumber}
onChange={(e) =>
setFormData({
...formData,
phoneNumber: e.target.value,
})
}
/>

<input
type="text"
placeholder="Regional Hub"
className="rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-slate-900"
value={formData.regionalHub}
onChange={(e) =>
setFormData({
...formData,
regionalHub: e.target.value,
})
}
/>

<input
type="text"
placeholder="Role Type"
className="rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-slate-900"
value={formData.roleType}
onChange={(e) =>
setFormData({
...formData,
roleType: e.target.value,
})
}
/>

<input
type="text"
placeholder="Primary Category"
className="rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-slate-900"
value={formData.mainCategory}
onChange={(e) =>
setFormData({
...formData,
mainCategory: e.target.value,
})
}
/>
</div>

<button
type="submit"
disabled={loading}
className="mt-6 w-full rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
>
{loading ? "Initializing..." : "Initialize Sandbox Account"}
</button>
</form>
);
} 
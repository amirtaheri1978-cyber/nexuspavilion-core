"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type DeleteCompanyButtonProps = {
id: string;
companyName: string;
};

export default function DeleteCompanyButton({
id,
companyName,
}: DeleteCompanyButtonProps) {
const router = useRouter();
const [isDeleting, setIsDeleting] = useState(false);

async function handleDelete() {
const confirmed = window.confirm(
`Are you sure you want to delete "${companyName}"?`
);

if (!confirmed) return;

setIsDeleting(true);

try {
const response = await fetch(`/api/companies/${id}`, {
method: "DELETE",
});

const data = await response.json();

if (!response.ok) {
alert(data.error || "Failed to delete company.");
return;
}

alert("Company deleted successfully.");

router.push("/connections");
router.refresh();
} catch (err) {
console.error(err);
alert("Unexpected error.");
} finally {
setIsDeleting(false);
}
}

return (
<button
onClick={handleDelete}
disabled={isDeleting}
className="inline-flex rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
>
{isDeleting ? "Deleting..." : "Delete Company"}
</button>
);
}
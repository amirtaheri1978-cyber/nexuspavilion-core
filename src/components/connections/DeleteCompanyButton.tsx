"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type DeleteCompanyButtonProps = {
id: string;
companyName: string;
};

export default function DeleteCompanyButton({
id,
companyName,
}: DeleteCompanyButtonProps) {
const router = useRouter();

async function handleDelete() {
const confirmed = window.confirm(
`Are you sure you want to delete "${companyName}"?`
);

if (!confirmed) return;

try {
const { error } = await supabase
.from("companies")
.delete()
.eq("id", id);

if (error) {
console.error(error);
alert("Failed to delete company.");
return;
}

alert("Company deleted successfully.");

router.push("/connections");
router.refresh();
} catch (err) {
console.error(err);
alert("Unexpected error.");
}
}

return (
<button
onClick={handleDelete}
className="inline-flex rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 transition"
>
Delete Company
</button>
);
}
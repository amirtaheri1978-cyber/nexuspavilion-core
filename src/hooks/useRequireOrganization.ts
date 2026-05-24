import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
fetchCurrentOrganization,
} from "@/lib/api/organization";

import type { OrganizationData } from "@/lib/storage";

export function useRequireOrganization() {
const router = useRouter();

const [organization, setOrganization] =
useState<OrganizationData | null>(null);

const [loading, setLoading] = useState(true);

useEffect(() => {
async function checkOrganization() {
const currentOrganization = await fetchCurrentOrganization();

if (!currentOrganization) {
router.push("/register");
return;
}

setOrganization(currentOrganization);
setLoading(false);
}

checkOrganization();
}, [router]);

return {
organization,
loading,
};
}
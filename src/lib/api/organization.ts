import {
getOrganization,
saveOrganization,
clearOrganization,
type OrganizationData,
} from "@/lib/storage";

function delay(ms: number) {
return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function registerOrganization(
data: OrganizationData
): Promise<OrganizationData> {
await delay(1200);

saveOrganization(data);

return data;
}

export async function fetchCurrentOrganization(): Promise<OrganizationData | null> {
await delay(400);

return getOrganization();
}

export async function logoutOrganization(): Promise<void> {
await delay(300);

clearOrganization();
}
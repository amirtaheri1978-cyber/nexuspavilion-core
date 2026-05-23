export const STORAGE_KEY = "nexus-pavilion-org";

export type OrganizationData = {
companyName: string;
taxId: string;
email: string;
phone: string;
regionalHub: string;
roleType: string;
primaryCategory: string;
};

export function saveOrganization(data: OrganizationData) {
localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getOrganization(): OrganizationData | null {
const data = localStorage.getItem(STORAGE_KEY);

if (!data) {
return null;
}

return JSON.parse(data);
}

export function clearOrganization() {
localStorage.removeItem(STORAGE_KEY);
}
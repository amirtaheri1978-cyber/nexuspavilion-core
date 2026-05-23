export type MockEnterpriseSession = {
legalName: string;
taxId: string;
email: string;
phone: string;
regionalHub: string;
roleType: string;
primaryCategory: string;
verificationStatus: "SANDBOX";
};

const SESSION_KEY = "nexuspavilion_enterprise_session";

export function saveEnterpriseSession(data: MockEnterpriseSession) {
localStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

export function getEnterpriseSession(): MockEnterpriseSession | null {
const raw = localStorage.getItem(SESSION_KEY);

if (!raw) {
return null;
}

return JSON.parse(raw) as MockEnterpriseSession;
}
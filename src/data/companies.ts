export type CompanyRole = "OWNER" | "CONTRACTOR" | "SUPPLIER";

export type CompanyStatus = "VERIFIED" | "SANDBOX" | "PENDING";

export type Company = {
id: string;
slug: string;
name: string;
role: CompanyRole;
category: string;
region: string;
status: CompanyStatus;
capabilities: string[];
complianceNotes: string;
};

export const companies: Company[] = [
{
id: "cmp-001",
slug: "northline-development-group",
name: "Northline Development Group",
role: "OWNER",
category: "Mixed-use Development",
region: "Toronto, ON",
status: "VERIFIED",
capabilities: [
"Urban mixed-use development",
"Project financing coordination",
"Owner-side procurement oversight",
],
complianceNotes:
"Verified enterprise owner profile with active procurement participation.",
},
{
id: "cmp-002",
slug: "atlas-build-partners",
name: "Atlas Build Partners",
role: "CONTRACTOR",
category: "General Contracting",
region: "Mississauga, ON",
status: "VERIFIED",
capabilities: [
"Commercial construction delivery",
"Trade coordination",
"Bid package management",
],
complianceNotes:
"Verified contractor profile with approved sandbox directory access.",
},
{
id: "cmp-003",
slug: "clare-interiors-inc",
name: "Clare Interiors Inc.",
role: "SUPPLIER",
category: "Interior Systems",
region: "Vaughan, ON",
status: "SANDBOX",
capabilities: [
"Interior acoustic systems",
"Ceiling and wall panel supply",
"Shop drawing coordination",
],
complianceNotes:
"Sandbox supplier profile pending enterprise verification.",
},
{
id: "cmp-004",
slug: "ironbridge-envelope-supply",
name: "IronBridge Envelope Supply",
role: "SUPPLIER",
category: "Building Envelope",
region: "Brampton, ON",
status: "PENDING",
capabilities: [
"Facade material supply",
"Envelope accessory coordination",
"Regional logistics support",
],
complianceNotes:
"Pending review for expanded network participation.",
},
{
id: "cmp-005",
slug: "summitworks-construction",
name: "SummitWorks Construction",
role: "CONTRACTOR",
category: "Commercial Construction",
region: "Hamilton, ON",
status: "VERIFIED",
capabilities: [
"Commercial construction management",
"Subcontractor coordination",
"Procurement schedule alignment",
],
complianceNotes:
"Verified construction partner with active directory visibility.",
},
];
export type RFQStatus = "OPEN" | "REVIEWING" | "AWARDED";

export type RFQ = {
id: string;
slug: string;
project: string;
tradePackage: string;
status: RFQStatus;
dueDate: string;
budgetRange: string;
scopeOfWork: string;
requiredCertifications: string[];
procurementContact: string;
};

export const rfqs: RFQ[] = [
{
id: "RFQ-2041",
slug: "rfq-2041",
project: "Downtown Mixed-Use Tower",
tradePackage: "Interior Acoustics",
status: "OPEN",
dueDate: "2026-06-18",
budgetRange: "$250K - $500K",
scopeOfWork:
"Supply and coordination of interior acoustic wall and ceiling systems for mixed-use tower amenity and commercial floors.",
requiredCertifications: [
"Commercial liability insurance",
"WSIB clearance",
"Product technical data sheets",
],
procurementContact: "procurement@nexuspavilion.internal",
},
{
id: "RFQ-2042",
slug: "rfq-2042",
project: "Transit Hub Expansion",
tradePackage: "Curtain Wall Systems",
status: "REVIEWING",
dueDate: "2026-06-22",
budgetRange: "$1M - $2.5M",
scopeOfWork:
"Curtain wall supply coordination, shop drawing support, and delivery planning for transit hub envelope expansion.",
requiredCertifications: [
"Envelope system compliance documentation",
"Installation partner references",
"Material warranty documentation",
],
procurementContact: "envelope@nexuspavilion.internal",
},
{
id: "RFQ-2043",
slug: "rfq-2043",
project: "Healthcare Campus Phase 2",
tradePackage: "Metal Ceilings",
status: "AWARDED",
dueDate: "2026-05-30",
budgetRange: "$150K - $350K",
scopeOfWork:
"Metal ceiling package for healthcare corridors, clinical support areas, and selected public-facing interior zones.",
requiredCertifications: [
"Healthcare project experience",
"Fire rating documentation",
"Acoustic performance data",
],
procurementContact: "healthcare@nexuspavilion.internal",
},
];
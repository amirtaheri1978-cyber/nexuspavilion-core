"use client";

import { useMemo, useState } from "react";

type ExportStatus = "Available" | "Not Operational" | "Coming Soon";

type ExportAction = {
id: string;
label: string;
title: string;
status: ExportStatus;
description: string;
};

const exportActions: ExportAction[] = [
{
id: "board-report",
label: "Executive",
title: "Print / Save Board Report",
status: "Available",
description:
"Uses the browser print workflow to save the currently generated executive report as PDF.",
},
{
id: "export-summary",
label: "Executive",
title: "Copy Export Readiness Summary",
status: "Available",
description:
"Copies a production-readiness summary for board reporting and export workflow status.",
},
{
id: "cfo-summary",
label: "Finance",
title: "Export CFO Summary",
status: "Coming Soon",
description:
"Requires awarded value, quote variance, savings calculations, and budget exposure analytics.",
},
{
id: "supplier-portfolio",
label: "Supplier",
title: "Export Supplier Portfolio",
status: "Coming Soon",
description:
"Requires validated supplier portfolio report rendering and export packaging.",
},
];

function getStatusClass(status: ExportStatus) {
if (status === "Available") {
return "border-emerald-300/20 bg-emerald-400/10 text-emerald-300";
}

if (status === "Coming Soon") {
return "border-[#2CC4E8]/25 bg-[#2CC4E8]/10 text-[#9BE8F8]";
}

return "border-orange-300/20 bg-orange-400/10 text-orange-300";
}

export default function ExecutiveExportPanel() {
const [activeAction, setActiveAction] = useState<string | null>(null);
const [copied, setCopied] = useState(false);
const [message, setMessage] = useState("");

const generatedAt = useMemo(() => {
return new Date().toLocaleDateString("en-US", {
year: "numeric",
month: "long",
day: "numeric",
});
}, []);

const readinessSummary = `Nexus Pavilion Executive Export Center

Generated:
${generatedAt}

Available Export Workflows:
- Print / Save Board Report
- Copy Export Readiness Summary

Coming Soon:
- CFO Summary Export
- Supplier Portfolio Export

Export Governance:
Nexus Pavilion does not export placeholder executive reports, fake financial summaries, or unverified AI narratives. Export workflows are enabled only when report rendering is connected to validated procurement intelligence.`;

function runExportAction(action: ExportAction) {
setActiveAction(action.id);
setMessage("");
setCopied(false);

if (action.status !== "Available") {
setMessage(
`${action.title} is not operational yet. This workflow remains locked until the required validated data and rendering pipeline are available.`,
);
return;
}

if (action.id === "board-report") {
window.print();
setMessage("Browser print opened. Choose Save as PDF to export.");
return;
}

if (action.id === "export-summary") {
navigator.clipboard.writeText(readinessSummary);
setCopied(true);
setMessage("Export readiness summary copied.");

window.setTimeout(() => {
setCopied(false);
}, 2500);
}
}

return (
<section className="mt-8 rounded-[34px] border border-white/10 bg-[#061426]/88 p-6 text-white shadow-executive sm:p-8">
<div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
<div>
<p className="text-[11px] font-black uppercase tracking-[0.34em] text-[#C8A646]">
Executive Export Center
</p>

<h2 className="mt-4 text-3xl font-black leading-tight text-white sm:text-4xl">
Board Report Export Controls
</h2>

<p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-slate-400">
Export workflows are available only for validated executive report
output. Financial and supplier exports remain locked until their
reporting pipelines are backed by complete operating data.
</p>
</div>

<span className="inline-flex rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">
Partially Available
</span>
</div>

{message ? (
<div className="mt-6 rounded-2xl border border-[#2CC4E8]/20 bg-[#2CC4E8]/10 p-4 text-sm font-bold text-[#9BE8F8]">
{message}
</div>
) : null}

<div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
{exportActions.map((action) => (
<button
key={action.id}
type="button"
onClick={() => runExportAction(action)}
className={[
"rounded-[26px] border p-5 text-left transition hover:-translate-y-1",
activeAction === action.id
? "border-[#2CC4E8]/35 bg-[#2CC4E8]/10 shadow-[0_0_45px_rgba(44,196,232,0.12)]"
: "border-white/10 bg-white/[0.045] hover:border-[#2CC4E8]/25 hover:bg-white/[0.06]",
].join(" ")}
>
<div className="flex items-start justify-between gap-3">
<p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C8A646]">
{action.label}
</p>

<span
className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${getStatusClass(
action.status,
)}`}
>
{action.id === "export-summary" && copied
? "Copied"
: action.status}
</span>
</div>

<p className="mt-5 text-lg font-black text-white">
{action.title}
</p>

<p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
{action.description}
</p>
</button>
))}
</div>

<div className="mt-8 rounded-[28px] border border-emerald-300/20 bg-emerald-400/10 p-6">
<p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">
Export Readiness
</p>

<p className="mt-3 text-sm font-semibold leading-7 text-slate-300">
Status: Partially Available. Board report PDF export is available
through the browser print workflow. CFO, supplier, and automated board
deck exports remain locked until their data pipelines and rendering
workflows are validated.
</p>
</div>
</section>
);
}
type RFQ = {
id: string;
title: string | null;
category: string | null;
procurement_scope: string | null;
sourcing_method: string | null;
contract_framework: string | null;
status: string | null;
};

type CompanyRFQPipelineProps = {
rfqList: RFQ[];
procurementScopeLabels: Record<string, string>;
sourcingMethodLabels: Record<string, string>;
contractFrameworkLabels: Record<string, string>;
};

export function CompanyRFQPipeline({
rfqList,
procurementScopeLabels,
sourcingMethodLabels,
contractFrameworkLabels,
}: CompanyRFQPipelineProps) {
return (
<section className="mt-8 rounded-3xl border border-white/10 bg-[#061426]/88 p-8 text-white shadow-executive">
<p className="text-xs font-black uppercase tracking-[0.25em] text-[#C8A646]">
Company RFQ Pipeline
</p>

<div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
<table className="w-full min-w-[980px] text-left">
<thead className="bg-[#07111F] text-white">
<tr>
<th className="px-5 py-4 text-sm">RFQ</th>
<th className="px-5 py-4 text-sm">Category</th>
<th className="px-5 py-4 text-sm">Scope</th>
<th className="px-5 py-4 text-sm">Sourcing</th>
<th className="px-5 py-4 text-sm">Framework</th>
<th className="px-5 py-4 text-sm">Status</th>
</tr>
</thead>

<tbody className="bg-[#061426]/70">
{rfqList.map((rfq) => (
<tr key={rfq.id} className="border-t border-white/10">
<td className="px-5 py-4 font-bold text-white">
{rfq.title || "Untitled RFQ"}
</td>

<td className="px-5 py-4 text-slate-300">
{rfq.category || "Uncategorized"}
</td>

<td className="px-5 py-4 text-slate-300">
{getLabel(procurementScopeLabels, rfq.procurement_scope)}
</td>

<td className="px-5 py-4 text-slate-300">
{getLabel(sourcingMethodLabels, rfq.sourcing_method)}
</td>

<td className="px-5 py-4 text-slate-300">
{getLabel(contractFrameworkLabels, rfq.contract_framework)}
</td>

<td className="px-5 py-4">
<span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-sm font-bold text-slate-200">
{rfq.status || "open"}
</span>
</td>
</tr>
))}

{rfqList.length === 0 ? (
<tr>
<td
colSpan={6}
className="px-5 py-10 text-center text-sm font-semibold text-slate-500"
>
No company RFQs found.
</td>
</tr>
) : null}
</tbody>
</table>
</div>
</section>
);
}

function getLabel(labels: Record<string, string>, value: string | null) {
if (!value) return "Not Classified";

return labels[value] || value;
}

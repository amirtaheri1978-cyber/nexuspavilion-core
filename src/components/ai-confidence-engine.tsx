type AIConfidenceEngineProps = {
aiConfidenceScore: string;
dataQualityScore: number;
supplierReliabilityScore: number;
predictionAccuracy: number;
awardPredictionConfidence: string;
};

export default function AIConfidenceEngine({
aiConfidenceScore,
dataQualityScore,
supplierReliabilityScore,
predictionAccuracy,
awardPredictionConfidence,
}: AIConfidenceEngineProps) {
return (
<section className="mt-8 rounded-[34px] border border-white/10 bg-[#061426]/88 p-8 text-white shadow-executive">
<div className="flex flex-wrap items-start justify-between gap-6">
<div>
<p className="text-[11px] font-black uppercase tracking-[0.34em] text-[#C8A646]">
AI Confidence Engine
</p>

<h2 className="mt-4 text-4xl font-black">
Executive Prediction Confidence
</h2>

<p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-slate-400">
Confidence indicators are generated only from validated procurement
intelligence. Nexus Pavilion never inflates confidence using
placeholder AI metrics or simulated analytics.
</p>
</div>

<div className="rounded-[24px] border border-[#2CC4E8]/20 bg-[#2CC4E8]/10 px-5 py-4">
<p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#8FE6FF]">
Decision Trust
</p>

<p className="mt-2 text-lg font-black text-white">
Enterprise AI
</p>
</div>
</div>

<div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
<ConfidenceCard
title="AI Confidence"
value={aiConfidenceScore}
accent="gold"
/>

<ConfidenceCard
title="Data Quality"
value={`${dataQualityScore}/100`}
accent="blue"
/>

<ConfidenceCard
title="Supplier Reliability"
value={`${supplierReliabilityScore}/100`}
accent="green"
/>

<ConfidenceCard
title="Prediction Accuracy"
value={`${predictionAccuracy}%`}
accent="purple"
/>

<ConfidenceCard
title="Award Confidence"
value={awardPredictionConfidence}
accent="orange"
/>
</div>

<div className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.05] p-6">
<p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C8A646]">
Executive Confidence Policy
</p>

<p className="mt-4 text-sm font-semibold leading-7 text-slate-300">
AI confidence reflects procurement evidence, supplier participation,
RFQ quality, award history, and validated operational intelligence.
Executive recommendations are intentionally blocked whenever evidence
quality is insufficient.
</p>
</div>
</section>
);
}

function ConfidenceCard({
title,
value,
accent,
}: {
title: string;
value: string;
accent: "gold" | "blue" | "green" | "purple" | "orange";
}) {
const accentClass = {
gold: "border-[#C8A646]/25 bg-[#C8A646]/10 text-[#F4D67A]",
blue: "border-sky-400/25 bg-sky-400/10 text-sky-300",
green: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
purple: "border-violet-400/25 bg-violet-400/10 text-violet-300",
orange: "border-orange-400/25 bg-orange-400/10 text-orange-300",
}[accent];

return (
<div className="rounded-[28px] border border-white/10 bg-[#071A2C] p-6 transition duration-300 hover:-translate-y-1 hover:border-[#2CC4E8]/25 hover:shadow-[0_0_40px_rgba(44,196,232,.12)]">
<div
className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${accentClass}`}
>
{title}
</div>

<p className="mt-6 text-4xl font-black text-white">{value}</p>

<div className="mt-6 h-1 rounded-full bg-white/10">
<div
className={`h-1 rounded-full ${
accent === "gold"
? "bg-[#C8A646]"
: accent === "blue"
? "bg-sky-400"
: accent === "green"
? "bg-emerald-400"
: accent === "purple"
? "bg-violet-400"
: "bg-orange-400"
}`}
style={{ width: "75%" }}
/>
</div>
</div>
);
}
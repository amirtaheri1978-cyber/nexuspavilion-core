type ProcurementCopilotIntelligenceProps = {
procurementRiskIndex: number;
supplierDependencyRisk: string;
awardPredictionConfidence: string;
predictionAccuracy: number;
executiveStatus: string;
};

export default function ProcurementCopilotIntelligence({
procurementRiskIndex,
supplierDependencyRisk,
awardPredictionConfidence,
predictionAccuracy,
executiveStatus,
}: ProcurementCopilotIntelligenceProps) {
const insights: {
level: "success" | "warning" | "danger";
title: string;
message: string;
}[] = [];

if (procurementRiskIndex >= 60) {
insights.push({
level: "danger",
title: "Procurement Risk Elevated",
message:
"Procurement risk exceeds recommended thresholds. Review supplier concentration and award performance.",
});
}

if (supplierDependencyRisk === "Critical") {
insights.push({
level: "danger",
title: "Supplier Dependency Risk",
message:
"Business operations are highly dependent on a limited supplier base.",
});
}

if (awardPredictionConfidence === "Low") {
insights.push({
level: "warning",
title: "Low Award Confidence",
message:
"Award forecasting confidence is below target and requires review.",
});
}

if (predictionAccuracy >= 80) {
insights.push({
level: "success",
title: "Forecast Accuracy Strong",
message:
"Prediction models are performing above enterprise target levels.",
});
}

if (executiveStatus === "Excellent") {
insights.push({
level: "success",
title: "Executive Performance",
message:
"Enterprise procurement performance is operating at a high level.",
});
}

if (insights.length === 0) {
insights.push({
level: "warning",
title: "Monitoring Procurement Activity",
message:
"Continue monitoring supplier participation, risk exposure, and forecasting performance.",
});
}

return (
<section className="mt-8 rounded-3xl border border-slate-200 bg-slate-950 p-8 text-white">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-400">
Enterprise Procurement Copilot
</p>

<h2 className="mt-3 text-4xl font-black">
Executive Decision Intelligence
</h2>

<div className="mt-8 space-y-4">
{insights.map((insight, index) => (
<div
key={index}
className="rounded-2xl border border-white/10 bg-white/5 p-5"
>
<div className="flex items-center gap-3">
<div
className={`h-3 w-3 rounded-full ${
insight.level === "success"
? "bg-green-500"
: insight.level === "warning"
? "bg-yellow-500"
: "bg-red-500"
}`}
/>

<p className="font-black">{insight.title}</p>
</div>

<p className="mt-3 text-sm leading-7 text-slate-300">
{insight.message}
</p>
</div>
))}
</div>
</section>
);
}
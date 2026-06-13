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
<section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
<p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
AI Confidence Engine
</p>

<h2 className="mt-3 text-3xl font-black text-slate-950">
Prediction Confidence Center
</h2>

<div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-5">
<ConfidenceMetric title="AI Confidence" value={aiConfidenceScore} />
<ConfidenceMetric title="Data Quality" value={`${dataQualityScore}/100`} />
<ConfidenceMetric
title="Supplier Reliability"
value={`${supplierReliabilityScore}/100`}
/>
<ConfidenceMetric
title="Prediction Accuracy"
value={`${predictionAccuracy}%`}
/>
<ConfidenceMetric
title="Award Confidence"
value={awardPredictionConfidence}
/>
</div>
</section>
);
}

function ConfidenceMetric({ title, value }: { title: string; value: string }) {
return (
<div className="rounded-3xl border border-slate-200 bg-white p-7">
<p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
{title}
</p>

<p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
</div>
);
}
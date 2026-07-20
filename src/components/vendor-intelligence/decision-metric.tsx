type DecisionMetricProps = {
  label: string;
  value: string;
  detail: string;
};

export function DecisionMetric({
  label,
  value,
  detail,
}: DecisionMetricProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black tracking-[-0.03em] text-white">
        {value}
      </p>

      <p className="mt-1 text-[10px] font-black text-slate-400">
        {detail}
      </p>
    </div>
  );
}

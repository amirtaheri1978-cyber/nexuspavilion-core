type ExecutiveCommandMetricProps = {
  title: string;
  value: string;
  detail: string;
  accentClassName: string;
};

export function ExecutiveCommandMetric({
  title,
  value,
  detail,
  accentClassName,
}: ExecutiveCommandMetricProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
        {title}
      </p>

      <p className={`mt-3 text-3xl font-black ${accentClassName}`}>{value}</p>

      <p className="mt-2 text-xs font-bold leading-5 text-slate-300">
        {detail}
      </p>
    </div>
  );
}
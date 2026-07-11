type ExecutiveCommandMetricProps = {
  title: string;
  value: string;
  detail: string;
  accentClassName: string;
  className?: string;
  valueClassName?: string;
};

export function ExecutiveCommandMetric({
  title,
  value,
  detail,
  accentClassName,
  className = "",
  valueClassName = "",
}: ExecutiveCommandMetricProps) {
  return (
    <div
      className={[
        "h-full min-w-0 rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
        {title}
      </p>

      <p
        className={[
          "mt-3 break-words text-3xl font-black",
          accentClassName,
          valueClassName,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {value}
      </p>

      <p className="mt-2 text-xs font-bold leading-5 text-slate-300">
        {detail}
      </p>
    </div>
  );
}
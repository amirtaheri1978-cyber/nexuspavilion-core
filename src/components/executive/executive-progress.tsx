type ExecutiveProgressProps = {
  value: number;
  className?: string;
  label?: string;
};

export function ExecutiveProgress({
  value,
  className = "",
  label = "Progress",
}: ExecutiveProgressProps) {
  const safeValue = Number.isFinite(value)
    ? Math.max(0, Math.min(100, Math.round(value)))
    : 0;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={safeValue}
      aria-valuetext={`${safeValue}%`}
      className={`h-2 overflow-hidden rounded-full bg-white/10 ${className}`}
    >
      <div
        aria-hidden="true"
        className="h-full rounded-full bg-[#C8A646] transition-[width] duration-300 motion-reduce:transition-none"
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}
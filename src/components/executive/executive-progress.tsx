type ExecutiveProgressProps = {
  value: number;
  className?: string;
};

export function ExecutiveProgress({
  value,
  className = "",
}: ExecutiveProgressProps) {
  const safeValue = Number.isFinite(value)
    ? Math.max(0, Math.min(100, Math.round(value)))
    : 0;

  return (
    <div
      className={`h-2 overflow-hidden rounded-full bg-white/10 ${className}`}
    >
      <div
        className="h-full rounded-full bg-[#C8A646]"
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}
import {
  EXECUTIVE_PROGRESS_TRACK,
  EXECUTIVE_PROGRESS_VALUE,
} from "@/lib/design-system/executive-contract";

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
      className={`${EXECUTIVE_PROGRESS_TRACK} ${className}`}
    >
      <div
        aria-hidden="true"
        className={EXECUTIVE_PROGRESS_VALUE}
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}
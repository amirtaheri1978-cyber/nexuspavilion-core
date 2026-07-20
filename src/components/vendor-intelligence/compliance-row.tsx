function formatStatus(value: string | null | undefined) {
  if (!value) return "Missing";

  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getStatusClass(value: string | null | undefined) {
  if (value === "valid" || value === "approved") {
    return "border border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  }

  if (value === "expiring_soon" || value === "pending") {
    return "border border-orange-400/20 bg-orange-400/10 text-orange-300";
  }

  if (value === "expired" || value === "suspended") {
    return "border border-red-400/20 bg-red-400/10 text-red-300";
  }

  return "border border-white/10 bg-white/[0.05] text-slate-300";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not provided";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not provided";
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function daysUntil(value: string | null | undefined) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  const now = new Date();
  const diff = date.getTime() - now.getTime();

  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getExpirySignal(value: string | null | undefined) {
  const days = daysUntil(value);

  if (days === null) return "Missing";
  if (days < 0) return "Expired";
  if (days <= 30) return `${days} days`;
  if (days <= 90) return `${days} days`;

  return "Current";
}

function getExpiryClass(value: string | null | undefined) {
  const days = daysUntil(value);

  if (days === null) return "text-slate-500";
  if (days < 0) return "text-red-300";
  if (days <= 30) return "text-red-300";
  if (days <= 90) return "text-orange-300";

  return "text-emerald-300";
}

type ComplianceRowProps = {
  title: string;
  status: string | null | undefined;
  expiry: string | null | undefined;
};

export function ComplianceRow({
  title,
  status,
  expiry,
}: ComplianceRowProps) {
  return (
    <div className="grid gap-3 border-b border-white/10 bg-white/[0.02] px-4 py-3 last:border-b-0 sm:grid-cols-[1fr_auto_auto] sm:items-center">
      <div>
        <p className="text-xs font-black text-white">{title}</p>

        <p className="mt-1 text-[10px] font-bold text-slate-500">
          {expiry ? formatDate(expiry) : "No expiry date recorded"}
        </p>
      </div>

      <span
        className={`w-fit rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${getStatusClass(
          status
        )}`}
      >
        {formatStatus(status)}
      </span>

      <p
        className={`text-xs font-black sm:min-w-20 sm:text-right ${
          expiry ? getExpiryClass(expiry) : "text-slate-500"
        }`}
      >
        {expiry ? getExpirySignal(expiry) : "No Expiry"}
      </p>
    </div>
  );
}
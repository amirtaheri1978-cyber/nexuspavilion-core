import {
  COMPANY_CAPABILITY_TYPES,
  COMPANY_CAPABILITY_TYPE_LABELS,
  hasAnyGroupedCapabilities,
  type GroupedCompanyCapabilities,
} from "@/lib/company/capabilities";

type CompanyCapabilitiesDisplayProps = {
  capabilities: GroupedCompanyCapabilities;
  variant?: "internal" | "public";
  className?: string;
};

function CapabilityChip({ label }: { label: string }) {
  return (
    <span className="inline-flex max-w-full items-center rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5 text-xs font-bold leading-5 text-slate-200 break-words">
      {label}
    </span>
  );
}

function CapabilityGroup({
  title,
  labels,
  variant,
}: {
  title: string;
  labels: string[];
  variant: "internal" | "public";
}) {
  if (variant === "public" && labels.length === 0) {
    return null;
  }

  return (
    <div className="min-w-0">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
        {title}
      </p>

      {labels.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {labels.map((label) => (
            <CapabilityChip key={`${title}-${label}`} label={label} />
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm font-semibold text-slate-500">
          Not provided
        </p>
      )}
    </div>
  );
}

export function CompanyCapabilitiesDisplay({
  capabilities,
  variant = "internal",
  className = "",
}: CompanyCapabilitiesDisplayProps) {
  if (variant === "public" && !hasAnyGroupedCapabilities(capabilities)) {
    return null;
  }

  return (
    <section className={className}>
      <p className="text-xs font-black uppercase tracking-[0.3em] text-[#C8A646]">
        Company Capabilities
      </p>

      <h2 className="mt-3 text-2xl font-black text-white sm:text-3xl">
        What We Deliver
      </h2>

      <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-400">
        {variant === "public"
          ? "Capabilities describe what this organization delivers and where it operates."
          : "Capabilities describe what your organization delivers and where it operates."}
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {COMPANY_CAPABILITY_TYPES.map((capabilityType) => (
          <CapabilityGroup
            key={capabilityType}
            title={COMPANY_CAPABILITY_TYPE_LABELS[capabilityType]}
            labels={capabilities[capabilityType]}
            variant={variant}
          />
        ))}
      </div>
    </section>
  );
}

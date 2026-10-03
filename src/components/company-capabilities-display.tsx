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
  headingId?: string;
};

function CapabilityChip({ label }: { label: string }) {
  return (
    <span className="inline-flex max-w-full items-center rounded-2xl border border-white/10 bg-white/[0.055] px-3 py-2 text-xs font-bold leading-5 text-nexus-text-secondary break-words">
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
      <h3 className="np-type-meta text-nexus-muted">{title}</h3>

      {labels.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {labels.map((label) => (
            <CapabilityChip key={`${title}-${label}`} label={label} />
          ))}
        </div>
      ) : (
        <p className="np-type-body mt-3 text-nexus-muted">Not provided</p>
      )}
    </div>
  );
}

export function CompanyCapabilitiesDisplay({
  capabilities,
  variant = "internal",
  className = "",
  headingId,
}: CompanyCapabilitiesDisplayProps) {
  const hasCapabilities = hasAnyGroupedCapabilities(capabilities);

  if (variant === "public" && !hasCapabilities) {
    return (
      <section className={className}>
        <p className="np-type-eyebrow text-nexus-gold">Company Capabilities</p>

        <h2
          id={headingId}
          className="np-type-h2 mt-3 text-nexus-white"
        >
          Capabilities
        </h2>

        <p className="np-type-body mt-3 max-w-3xl text-pretty text-nexus-muted">
          Capabilities describe what this organization delivers and where it
          operates.
        </p>

        <p className="np-type-body mt-6 text-nexus-muted">
          No published capabilities.
        </p>
      </section>
    );
  }

  return (
    <section className={className}>
      <p className="np-type-eyebrow text-nexus-gold">Company Capabilities</p>

      <h2 id={headingId} className="np-type-h2 mt-3 text-nexus-white">
        {variant === "public" ? "Capabilities" : "What We Deliver"}
      </h2>

      <p className="np-type-body mt-3 max-w-3xl text-pretty text-nexus-muted">
        {variant === "public"
          ? "Capabilities describe what this organization delivers and where it operates."
          : "Capabilities describe what your organization delivers and where it operates."}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
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

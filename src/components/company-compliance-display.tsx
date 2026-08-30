import {
  COMPANY_COMPLIANCE_SELF_DECLARED_NOTICE,
  COMPANY_COMPLIANCE_TYPES,
  COMPANY_COMPLIANCE_TYPE_LABELS,
  deriveCompliancePresentation,
  formatComplianceDate,
  formatComplianceExpiry,
  hasAnyGroupedCompliance,
  type CompanyComplianceInput,
  type GroupedCompanyCompliance,
} from "@/lib/company/compliance";

type CompanyComplianceDisplayProps = {
  compliance: GroupedCompanyCompliance;
  className?: string;
};

function ComplianceSummary({ item }: { item: CompanyComplianceInput }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="min-w-0">
        <p className="text-sm font-black text-white break-words">{item.name}</p>
        {item.provider ? (
          <p className="mt-1 text-xs font-semibold text-slate-400 break-words">
            {item.provider}
          </p>
        ) : null}
      </div>

      <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
        <div>
          <dt className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
            Effective
          </dt>
          <dd className="mt-1 font-semibold text-slate-300">
            {formatComplianceDate(item.effective_on)}
          </dd>
        </div>

        <div>
          <dt className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
            Expires
          </dt>
          <dd className="mt-1 font-semibold text-slate-300">
            {formatComplianceExpiry(item.expires_on)}
          </dd>
        </div>

        <div>
          <dt className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
            Status
          </dt>
          <dd className="mt-1 font-semibold text-slate-300">
            {deriveCompliancePresentation(item.effective_on, item.expires_on)}
          </dd>
        </div>
      </dl>
    </article>
  );
}

function ComplianceGroup({
  title,
  items,
}: {
  title: string;
  items: CompanyComplianceInput[];
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
        {title}
      </p>

      {items.length > 0 ? (
        <div className="mt-3 space-y-3">
          {items.map((item, index) => (
            <ComplianceSummary key={`${title}-${item.name}-${index}`} item={item} />
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

export function CompanyComplianceDisplay({
  compliance,
  className = "",
}: CompanyComplianceDisplayProps) {
  const hasAny = hasAnyGroupedCompliance(compliance);

  return (
    <section className={className}>
      <p className="text-xs font-black uppercase tracking-[0.3em] text-[#C8A646]">
        Company Governance
      </p>

      <h2 className="mt-3 text-2xl font-black text-white sm:text-3xl">
        Compliance Standing
      </h2>

      <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-400">
        Insurance, workers&rsquo; compensation, and safety records recorded by
        your organization. {COMPANY_COMPLIANCE_SELF_DECLARED_NOTICE}
      </p>

      {hasAny ? (
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {COMPANY_COMPLIANCE_TYPES.map((complianceType) => (
            <ComplianceGroup
              key={complianceType}
              title={COMPANY_COMPLIANCE_TYPE_LABELS[complianceType]}
              items={compliance[complianceType]}
            />
          ))}
        </div>
      ) : (
        <p className="mt-6 text-sm font-semibold text-slate-500">
          Not provided
        </p>
      )}
    </section>
  );
}

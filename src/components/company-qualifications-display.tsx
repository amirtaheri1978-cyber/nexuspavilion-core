import {
  COMPANY_QUALIFICATION_TYPES,
  COMPANY_QUALIFICATION_TYPE_LABELS,
  formatQualificationDate,
  formatQualificationExpiry,
  hasAnyGroupedQualifications,
  hasAnyPublicGroupedQualifications,
  type CompanyQualificationInput,
  type GroupedCompanyQualifications,
} from "@/lib/company/qualifications";

type CompanyQualificationsDisplayProps = {
  qualifications: GroupedCompanyQualifications;
  variant?: "internal" | "public";
  className?: string;
};

function QualificationSummary({
  item,
  variant,
}: {
  item: CompanyQualificationInput;
  variant: "internal" | "public";
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="min-w-0">
        <p className="text-sm font-black text-white break-words">{item.name}</p>
        {item.issuer ? (
          <p className="mt-1 text-xs font-semibold text-slate-400 break-words">
            {item.issuer}
          </p>
        ) : null}
      </div>

      <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
        {variant === "internal" ? (
          <div>
            <dt className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
              Credential Identifier
            </dt>
            <dd className="mt-1 font-semibold text-slate-300 break-words">
              {item.credential_identifier || "Not provided"}
            </dd>
          </div>
        ) : null}

        {variant === "internal" ? (
          <div>
            <dt className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
              Visibility
            </dt>
            <dd className="mt-1 font-semibold text-slate-300">
              {item.is_public ? "Public profile" : "Workspace only"}
            </dd>
          </div>
        ) : null}

        <div>
          <dt className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
            Issued
          </dt>
          <dd className="mt-1 font-semibold text-slate-300">
            {formatQualificationDate(item.issued_on)}
          </dd>
        </div>

        <div>
          <dt className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
            Expires
          </dt>
          <dd className="mt-1 font-semibold text-slate-300">
            {formatQualificationExpiry(item.expires_on)}
          </dd>
        </div>
      </dl>
    </article>
  );
}

function QualificationGroup({
  title,
  items,
  variant,
}: {
  title: string;
  items: CompanyQualificationInput[];
  variant: "internal" | "public";
}) {
  const visibleItems =
    variant === "public"
      ? items.filter((item) => item.is_public)
      : items;

  if (variant === "public" && visibleItems.length === 0) {
    return null;
  }

  return (
    <div className="min-w-0">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
        {title}
      </p>

      {visibleItems.length > 0 ? (
        <div className="mt-3 space-y-3">
          {visibleItems.map((item, index) => (
            <QualificationSummary
              key={`${title}-${item.name}-${index}`}
              item={item}
              variant={variant}
            />
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

export function CompanyQualificationsDisplay({
  qualifications,
  variant = "internal",
  className = "",
}: CompanyQualificationsDisplayProps) {
  if (
    variant === "public" &&
    !hasAnyPublicGroupedQualifications(qualifications)
  ) {
    return null;
  }

  if (variant === "internal" && !hasAnyGroupedQualifications(qualifications)) {
    return (
      <section className={className}>
        <p className="text-xs font-black uppercase tracking-[0.3em] text-[#C8A646]">
          Company Qualifications
        </p>

        <h2 className="mt-3 text-2xl font-black text-white sm:text-3xl">
          Qualification Registry
        </h2>

        <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-400">
          Qualifications describe licenses, certifications, accreditations, and
          registrations recorded by your organization.
        </p>

        <p className="mt-6 text-sm font-semibold text-slate-500">
          Not provided
        </p>
      </section>
    );
  }

  return (
    <section className={className}>
      <p className="text-xs font-black uppercase tracking-[0.3em] text-[#C8A646]">
        Company Qualifications
      </p>

      <h2 className="mt-3 text-2xl font-black text-white sm:text-3xl">
        {variant === "public"
          ? "Published Qualifications"
          : "Qualification Registry"}
      </h2>

      <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-400">
        {variant === "public"
          ? "Public qualifications are details this organization has chosen to publish."
          : "Qualifications describe licenses, certifications, accreditations, and registrations recorded by your organization."}
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {COMPANY_QUALIFICATION_TYPES.map((qualificationType) => (
          <QualificationGroup
            key={qualificationType}
            title={COMPANY_QUALIFICATION_TYPE_LABELS[qualificationType]}
            items={qualifications[qualificationType]}
            variant={variant}
          />
        ))}
      </div>
    </section>
  );
}

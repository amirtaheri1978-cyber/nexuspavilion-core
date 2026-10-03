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
  headingId?: string;
};

function QualificationSummary({
  item,
  variant,
}: {
  item: CompanyQualificationInput;
  variant: "internal" | "public";
}) {
  return (
    <article className="min-w-0 rounded-executive border border-white/10 bg-white/[0.04] p-4 sm:p-5">
      <div className="min-w-0">
        <p className="np-type-body min-w-0 break-words font-black text-nexus-white">
          {item.name}
        </p>
        {item.issuer ? (
          <p className="np-type-meta mt-2 min-w-0 break-words text-nexus-muted">
            Issuer: {item.issuer}
          </p>
        ) : null}
      </div>

      <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
        {variant === "internal" ? (
          <div className="min-w-0">
            <dt className="np-type-meta text-nexus-muted">
              Credential Identifier
            </dt>
            <dd className="np-type-body mt-1 min-w-0 break-words text-nexus-text-secondary">
              {item.credential_identifier || "Not provided"}
            </dd>
          </div>
        ) : null}

        {variant === "internal" ? (
          <div className="min-w-0">
            <dt className="np-type-meta text-nexus-muted">Visibility</dt>
            <dd className="np-type-body mt-1 text-nexus-text-secondary">
              {item.is_public ? "Public profile" : "Workspace only"}
            </dd>
          </div>
        ) : null}

        <div className="min-w-0">
          <dt className="np-type-meta text-nexus-muted">Issued</dt>
          <dd className="np-type-body mt-1 text-nexus-text-secondary">
            {formatQualificationDate(item.issued_on)}
          </dd>
        </div>

        <div className="min-w-0">
          <dt className="np-type-meta text-nexus-muted">Expires</dt>
          <dd className="np-type-body mt-1 text-nexus-text-secondary">
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
      <h3 className="np-type-meta text-nexus-muted">{title}</h3>

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
        <p className="np-type-body mt-3 text-nexus-muted">Not provided</p>
      )}
    </div>
  );
}

export function CompanyQualificationsDisplay({
  qualifications,
  variant = "internal",
  className = "",
  headingId,
}: CompanyQualificationsDisplayProps) {
  if (
    variant === "public" &&
    !hasAnyPublicGroupedQualifications(qualifications)
  ) {
    return (
      <section className={className}>
        <p className="np-type-eyebrow text-nexus-gold">
          Company Qualifications
        </p>

        <h2 id={headingId} className="np-type-h2 mt-3 text-nexus-white">
          Published Qualifications
        </h2>

        <p className="np-type-body mt-3 max-w-3xl text-pretty text-nexus-muted">
          Public qualifications are details this organization has chosen to
          publish.
        </p>

        <p className="np-type-body mt-6 text-nexus-muted">
          No Published Qualifications
        </p>
      </section>
    );
  }

  if (variant === "internal" && !hasAnyGroupedQualifications(qualifications)) {
    return (
      <section className={className}>
        <p className="np-type-eyebrow text-nexus-gold">
          Company Qualifications
        </p>

        <h2 id={headingId} className="np-type-h2 mt-3 text-nexus-white">
          Qualification Registry
        </h2>

        <p className="np-type-body mt-3 max-w-3xl text-pretty text-nexus-muted">
          Qualifications describe licenses, certifications, accreditations, and
          registrations recorded by your organization.
        </p>

        <p className="np-type-body mt-6 text-nexus-muted">Not provided</p>
      </section>
    );
  }

  return (
    <section className={className}>
      <p className="np-type-eyebrow text-nexus-gold">Company Qualifications</p>

      <h2 id={headingId} className="np-type-h2 mt-3 text-nexus-white">
        {variant === "public"
          ? "Published Qualifications"
          : "Qualification Registry"}
      </h2>

      <p className="np-type-body mt-3 max-w-3xl text-pretty text-nexus-muted">
        {variant === "public"
          ? "Public qualifications are details this organization has chosen to publish."
          : "Qualifications describe licenses, certifications, accreditations, and registrations recorded by your organization."}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
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

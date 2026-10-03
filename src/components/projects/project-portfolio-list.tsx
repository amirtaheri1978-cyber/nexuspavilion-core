import Link from "next/link";

import { ExecutiveBadge } from "@/components/executive/executive-badge";
import { ExecutiveMetricCard } from "@/components/executive/executive-metric-card";
import { ExecutivePanel } from "@/components/executive/executive-panel";
import {
  EXECUTIVE_CTA_PRIMARY,
  EXECUTIVE_CTA_SECONDARY,
  EXECUTIVE_EMPTY_BODY,
  EXECUTIVE_EMPTY_COMPACT,
  EXECUTIVE_EMPTY_LIVE,
  EXECUTIVE_EMPTY_ROLE,
  EXECUTIVE_EMPTY_TITLE,
  EXECUTIVE_FEEDBACK_INFO,
  EXECUTIVE_FOCUS_CYAN,
} from "@/lib/design-system/executive-contract";
import type {
  ProjectProcurementAssociation,
  ProjectRecord,
} from "@/lib/projects/project-contract";
import {
  buildProjectInsights,
  type ProjectInsightAvailability,
  type ProjectInsightRatio,
  type ProjectInsights,
} from "@/lib/projects/project-insights";

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function displayValue(value: string | null, fallback: string) {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function formatRfqStatus(value: string) {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return "Status unavailable";
  }

  const statusLabels: Record<string, string> = {
    draft: "Draft",
    open: "Open",
    awarded: "Awarded",
    closed: "Closed",
    cancelled: "Cancelled",
    canceled: "Cancelled",
  };

  if (statusLabels[normalized]) {
    return statusLabels[normalized];
  }

  return normalized
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getRfqStatusTone(
  value: string,
): "blue" | "success" | "warning" | "neutral" {
  const normalized = value.trim().toLowerCase();

  if (normalized === "awarded") {
    return "success";
  }

  if (normalized === "draft") {
    return "warning";
  }

  if (!normalized || normalized === "closed" || normalized === "cancelled") {
    return "neutral";
  }

  return "blue";
}

function hasVerifiedAward(association: ProjectProcurementAssociation) {
  return (
    association.status.trim().toLowerCase() === "awarded" &&
    Boolean(association.awardedAt)
  );
}

function hasOpenProcurement(association: ProjectProcurementAssociation) {
  return association.status.trim().toLowerCase() === "open";
}

function getAvailabilityLabel(value: ProjectInsightAvailability) {
  if (value === "available") return "Available";
  if (value === "limited") return "Limited Evidence";
  return "Insufficient Data";
}

function getAvailabilityTone(
  value: ProjectInsightAvailability,
): "success" | "warning" | "neutral" {
  if (value === "available") return "success";
  if (value === "limited") return "warning";
  return "neutral";
}

function formatRatioValue(ratio: ProjectInsightRatio) {
  if (ratio.percentage === null) return "Insufficient Data";
  return `${ratio.percentage.toLocaleString("en-CA", {
    maximumFractionDigits: 1,
  })}%`;
}

export function ProjectPortfolioList({
  projects,
  canCreateProject,
}: {
  projects: ProjectRecord[];
  canCreateProject: boolean;
}) {
  const projectInsights = buildProjectInsights(projects);

  return (
    <ExecutivePanel
      className="mt-8 min-w-0"
      variant="operational"
      padding="lg"
      tone="blue"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="np-type-eyebrow text-nexus-gold">
            Company Project Portfolio
          </p>

          <h2 className="np-type-h2 mt-3 min-w-0 text-pretty text-nexus-white">
            Company Projects
          </h2>

          <p className="np-type-body mt-3 max-w-3xl min-w-0 text-pretty text-nexus-muted">
            First-class Project records remain the company source of truth while
            verified RFQ and award-recorded context is surfaced alongside them.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ExecutiveBadge tone={projects.length > 0 ? "success" : "warning"}>
            {projects.length} {projects.length === 1 ? "Project" : "Projects"}
          </ExecutiveBadge>

          {canCreateProject ? (
            <Link href="/projects/new" className={EXECUTIVE_CTA_PRIMARY}>
              Create Project
            </Link>
          ) : null}
        </div>
      </div>

      <ProjectInsightsPanel insights={projectInsights} />

      {projects.length === 0 ? (
        <div
          className={`mt-8 min-w-0 ${EXECUTIVE_EMPTY_COMPACT}`}
          role={EXECUTIVE_EMPTY_ROLE}
          aria-live={EXECUTIVE_EMPTY_LIVE}
        >
          <p className="np-type-eyebrow text-nexus-cyan-bright">
            No Project Records
          </p>

          <h3 className={`${EXECUTIVE_EMPTY_TITLE} min-w-0 text-pretty`}>
            No company Projects have been recorded yet.
          </h3>

          <p className={`${EXECUTIVE_EMPTY_BODY} min-w-0 text-pretty text-nexus-muted`}>
            Projects are maintained independently from RFQs. Create the company
            Project record first; verified procurement associations appear when
            matching company Project identifiers are available.
          </p>

          {canCreateProject ? (
            <div className="mt-7">
              <Link href="/projects/new" className={EXECUTIVE_CTA_PRIMARY}>
                Create First Project
              </Link>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <article
              key={project.id}
              className="min-w-0 rounded-executive border border-white/10 bg-white/[0.03] p-6"
            >
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:justify-between">
                <div className="min-w-0 w-full sm:flex-1">
                  <p className="np-type-meta text-nexus-gold">Project</p>

                  <h3 className="np-type-h3 mt-2 break-words text-pretty text-nexus-white">
                    {project.name}
                  </h3>
                </div>

                <div className="shrink-0 self-start">
                  <ExecutiveBadge tone="blue">Company Record</ExecutiveBadge>
                </div>
              </div>

              <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                <ProjectField
                  label="Project Code"
                  value={displayValue(project.projectCode, "Not assigned")}
                />
                <ProjectField
                  label="Owner / Client"
                  value={displayValue(project.ownerClient, "Not recorded")}
                />
                <ProjectField
                  label="Location"
                  value={displayValue(project.location, "Not recorded")}
                />
                <ProjectField
                  label="Last Updated"
                  value={formatDate(project.updatedAt)}
                />
              </dl>

              <ProjectSignals
                associations={project.procurementAssociations}
              />

              <ProjectProcurementContext
                associations={project.procurementAssociations}
              />
            </article>
          ))}
        </div>
      )}

      <div className="mt-7 flex flex-wrap gap-3 border-t border-white/10 pt-6">
        <Link href="/dashboard" className={EXECUTIVE_CTA_SECONDARY}>
          Executive Overview
        </Link>
        <Link href="/company/settings" className={EXECUTIVE_CTA_SECONDARY}>
          Workspace Settings
        </Link>
      </div>
    </ExecutivePanel>
  );
}

function ProjectInsightsPanel({ insights }: { insights: ProjectInsights }) {
  const linkedEvidenceAvailable =
    insights.linkedProcurementAvailability !== "insufficient_data";

  return (
    <section
      className="mt-8 min-w-0"
      aria-labelledby="project-insights-title"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl min-w-0">
          <p className="np-type-eyebrow text-nexus-cyan-bright">
            Project Insights
          </p>
          <h3
            id="project-insights-title"
            className="np-type-h3 mt-2 min-w-0 text-pretty text-nexus-white"
          >
            Project Association Evidence
          </h3>
          <p className="np-type-body mt-2 min-w-0 text-pretty text-nexus-muted">
            Descriptive company-scoped evidence from existing Project records
            and verified RFQ associations. No Project spend, schedule,
            performance, health, or risk is inferred.
          </p>
        </div>

        <ExecutiveBadge tone={getAvailabilityTone(insights.availability)}>
          {getAvailabilityLabel(insights.availability)}
        </ExecutiveBadge>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ExecutiveMetricCard
          label="Total Projects"
          value={
            insights.totalProjects > 0
              ? insights.totalProjects.toLocaleString("en-CA")
              : "Insufficient Data"
          }
          insight="Current company Project records."
          tone="gold"
        />
        <ExecutiveMetricCard
          label="Identifier Coverage"
          value={formatRatioValue(insights.identifierCoverage)}
          insight={
            insights.identifierCoverage.denominator > 0
              ? `${insights.identifierCoverage.numerator.toLocaleString("en-CA")} / ${insights.identifierCoverage.denominator.toLocaleString("en-CA")} Projects`
              : insights.identifierCoverage.definition
          }
          tone="blue"
        />
        <ExecutiveMetricCard
          label="Linked Project Coverage"
          value={formatRatioValue(insights.associationCoverage)}
          insight={
            insights.associationCoverage.denominator > 0
              ? `${insights.associationCoverage.numerator.toLocaleString("en-CA")} / ${insights.associationCoverage.denominator.toLocaleString("en-CA")} identifiable Projects`
              : insights.associationCoverage.definition
          }
          tone="blue"
        />
        <ExecutiveMetricCard
          label="Linked RFQs"
          value={
            linkedEvidenceAvailable
              ? insights.linkedRfqCount.toLocaleString("en-CA")
              : "Insufficient Data"
          }
          insight="Verified RFQ associations in the current Project payload."
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <ExecutiveMetricCard
          label="Open Linked RFQs"
          value={
            linkedEvidenceAvailable
              ? insights.openLinkedRfqCount.toLocaleString("en-CA")
              : "Insufficient Data"
          }
          insight="Current linked RFQs with open status."
          tone="blue"
        />
        <ExecutiveMetricCard
          label="Verified Awarded RFQs"
          value={
            linkedEvidenceAvailable
              ? insights.verifiedAwardedRfqCount.toLocaleString("en-CA")
              : "Insufficient Data"
          }
          insight="Awarded status with a recorded award timestamp."
          tone="success"
        />
        <ExecutiveMetricCard
          label="Identifier Gaps"
          value={
            insights.totalProjects > 0
              ? insights.identifierGapCount.toLocaleString("en-CA")
              : "Insufficient Data"
          }
          insight="Project records without a nonblank Project Code."
          tone="risk"
        />
      </div>

      <div className={`mt-5 min-w-0 ${EXECUTIVE_FEEDBACK_INFO}`}>
        <p className="np-type-meta">Evidence Basis &amp; Limitations</p>
        <ul className="mt-3 space-y-2 text-xs font-semibold leading-5 text-nexus-text-primary">
          {insights.limitations.map((limitation) => (
            <li key={limitation} className="flex gap-2">
              <span aria-hidden="true" className="text-nexus-gold">
                •
              </span>
              <span className="min-w-0 text-pretty">{limitation}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ProjectSignals({
  associations,
}: {
  associations: ProjectProcurementAssociation[];
}) {
  const hasActiveProcurement = associations.some(hasOpenProcurement);
  const hasAwardedContract = associations.some(hasVerifiedAward);
  const hasSupportedSignal = hasActiveProcurement || hasAwardedContract;

  return (
    <section className="mt-6 border-t border-white/10 pt-6">
      <div>
        <p className="np-type-meta text-nexus-gold">Project Signals</p>
        <p className="np-type-body mt-2 text-nexus-muted">
          Evidence-backed signals are limited to verified linked procurement
          records. Project risk is not inferred from procurement activity.
        </p>
      </div>

      <div className="mt-4 flex w-full flex-wrap gap-2">
        {hasActiveProcurement ? (
          <ExecutiveBadge tone="blue">Procurement Active</ExecutiveBadge>
        ) : null}

        {hasAwardedContract ? (
          <ExecutiveBadge tone="awarded">Award Recorded</ExecutiveBadge>
        ) : null}

        {!hasSupportedSignal ? (
          <ExecutiveBadge tone="neutral">No Supported Signal</ExecutiveBadge>
        ) : null}
      </div>

      {!hasSupportedSignal ? (
        <p className="np-type-body mt-3 text-nexus-muted">
          No supported Project status or risk signal is available from current
          verified data.
        </p>
      ) : null}
    </section>
  );
}

function ProjectProcurementContext({
  associations,
}: {
  associations: ProjectProcurementAssociation[];
}) {
  return (
    <section className="mt-6 border-t border-white/10 pt-6">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="np-type-meta text-nexus-cyan-bright">
            Procurement Context
          </p>
          <p className="np-type-body mt-2 text-nexus-muted">
            Verified same-company RFQ and award records associated with this
            Project.
          </p>
        </div>

        <ExecutiveBadge tone={associations.length > 0 ? "blue" : "neutral"}>
          {associations.length}{" "}
          {associations.length === 1 ? "Linked RFQ" : "Linked RFQs"}
        </ExecutiveBadge>
      </div>

      {associations.length === 0 ? (
        <div className="mt-4 min-w-0 rounded-executive border border-dashed border-white/10 bg-white/[0.025] p-4">
          <p className="np-type-body text-nexus-muted">
            No verified procurement associations are linked to this Project
            record.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {associations.map((association) => {
            const verifiedAward = hasVerifiedAward(association);

            return (
              <div
                key={association.id}
                className="min-w-0 rounded-executive border border-white/10 bg-white/[0.035] p-4"
              >
                <div className="flex flex-col gap-3">
                  <div className="min-w-0 w-full">
                    <p className="np-type-meta">Linked RFQ</p>
                    <Link
                      href={`/rfq/${association.slug}`}
                      className={`mt-2 block min-h-11 break-words text-sm font-black leading-6 text-nexus-white transition-colors hover:text-nexus-cyan-bright ${EXECUTIVE_FOCUS_CYAN}`}
                    >
                      {association.title}
                    </Link>
                  </div>

                  <div className="flex w-full flex-wrap gap-2">
                    <ExecutiveBadge tone={getRfqStatusTone(association.status)}>
                      {formatRfqStatus(association.status)}
                    </ExecutiveBadge>
                    {verifiedAward ? (
                      <ExecutiveBadge tone="awarded">
                        Award Recorded
                      </ExecutiveBadge>
                    ) : null}
                  </div>
                </div>

                {verifiedAward && association.awardedAt ? (
                  <p className="np-type-body mt-3 text-nexus-muted">
                    Award recorded {formatDate(association.awardedAt)}.
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ProjectField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-executive border border-white/10 bg-white/[0.035] p-4">
      <dt className="np-type-meta">{label}</dt>
      <dd className="np-type-body mt-2 break-words text-pretty text-nexus-text-primary">
        {value}
      </dd>
    </div>
  );
}

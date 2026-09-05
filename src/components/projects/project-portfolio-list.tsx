import Link from "next/link";

import { ExecutiveBadge } from "@/components/executive/executive-badge";
import {
  EXECUTIVE_CTA_PRIMARY,
  EXECUTIVE_CTA_SECONDARY,
} from "@/lib/design-system/executive-contract";
import type {
  ProjectProcurementAssociation,
  ProjectRecord,
} from "@/lib/projects/project-contract";

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

export function ProjectPortfolioList({
  projects,
  canCreateProject,
}: {
  projects: ProjectRecord[];
  canCreateProject: boolean;
}) {
  return (
    <section className="mt-8 rounded-[34px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.28)] sm:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#C8A646]">
            Company Project Portfolio
          </p>

          <h2 className="mt-3 text-3xl font-black tracking-[-0.03em] text-white">
            Company Projects
          </h2>

          <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-400">
            First-class Project records remain the company source of truth while
            verified RFQ and contract-award context is surfaced alongside them.
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

      {projects.length === 0 ? (
        <div className="mt-8 rounded-[28px] border border-dashed border-white/15 bg-[#061426]/62 p-7 sm:p-9">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[#9BE8F8]">
            No Project Records
          </p>

          <h3 className="mt-3 text-2xl font-black text-white">
            No company Projects have been recorded yet.
          </h3>

          <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-slate-400">
            Projects are maintained independently from RFQs. Create the company
            Project record first; verified procurement associations appear when
            matching company Project identifiers are available.
          </p>

          {canCreateProject ? (
            <div className="mt-6">
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
              className="min-w-0 rounded-[28px] border border-white/10 bg-[#061426]/72 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)]"
            >
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:justify-between">
                <div className="min-w-0 w-full sm:flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C8A646]">
                    Project
                  </p>

                  <h3 className="mt-2 break-words text-2xl font-black leading-tight text-white">
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
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#9BE8F8]">
            Procurement Context
          </p>
          <p className="mt-2 text-xs font-semibold leading-5 text-slate-400">
            Verified same-company RFQ and award records associated with this
            Project.
          </p>
        </div>

        <ExecutiveBadge tone={associations.length > 0 ? "blue" : "neutral"}>
          {associations.length} {associations.length === 1 ? "Linked RFQ" : "Linked RFQs"}
        </ExecutiveBadge>
      </div>

      {associations.length === 0 ? (
        <div className="mt-4 rounded-[18px] border border-dashed border-white/10 bg-white/[0.025] p-4">
          <p className="text-sm font-semibold leading-6 text-slate-400">
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
                className="min-w-0 rounded-[18px] border border-white/10 bg-white/[0.035] p-4"
              >
                <div className="flex flex-col gap-3">
                  <div className="min-w-0 w-full">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                      Linked RFQ
                    </p>
                    <Link
                      href={`/rfq/${association.slug}`}
                      className="mt-2 block break-words text-sm font-black leading-6 text-white transition-colors hover:text-[#9BE8F8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9BE8F8]/70"
                    >
                      {association.title}
                    </Link>
                  </div>

                  <div className="flex w-full flex-wrap gap-2">
                    <ExecutiveBadge tone={getRfqStatusTone(association.status)}>
                      {formatRfqStatus(association.status)}
                    </ExecutiveBadge>
                    {verifiedAward ? (
                      <ExecutiveBadge tone="awarded">Contract Awarded</ExecutiveBadge>
                    ) : null}
                  </div>
                </div>

                {verifiedAward && association.awardedAt ? (
                  <p className="mt-3 text-xs font-semibold leading-5 text-slate-400">
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
    <div className="min-w-0 rounded-[18px] border border-white/10 bg-white/[0.035] p-4">
      <dt className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
        {label}
      </dt>
      <dd className="mt-2 break-words text-sm font-black text-slate-200">
        {value}
      </dd>
    </div>
  );
}

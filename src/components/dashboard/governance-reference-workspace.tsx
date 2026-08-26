import Image from "next/image";
import Link from "next/link";

import { ExecutiveBadge } from "@/components/executive/executive-badge";
import { ExecutivePanel } from "@/components/executive/executive-panel";
import { ExecutiveProgress } from "@/components/executive/executive-progress";
import { EXECUTIVE_FOCUS_CYAN } from "@/lib/design-system/executive-contract";

type GovernanceTask = {
  id: string;
  title: string;
  description: string;
  href: string;
};

type NavigationItem = {
  title: string;
  description: string;
  href: string;
};

type GovernanceReferenceWorkspaceProps = {
  company: {
    label: string;
    name: string;
    logoUrl: string | null;
    category: string;
    location: string;
    networkRole: string;
    href: string;
  };
  readiness: {
    score: number;
    status: string;
    incompleteTasksCount: number;
    tasks: GovernanceTask[];
  };
  navigation: NavigationItem[];
  unreadNotificationCount?: number;
};

export function GovernanceReferenceWorkspace({
  company,
  readiness,
  navigation,
  unreadNotificationCount = 0,
}: GovernanceReferenceWorkspaceProps) {
  const readinessTone =
    readiness.incompleteTasksCount === 0
      ? "success"
      : readiness.score >= 55
        ? "warning"
        : "blue";

  return (
    <ExecutivePanel
      variant="operational"
      padding="lg"
      className="np-region-major"
      aria-labelledby="executive-governance-heading"
    >
      <div className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="np-type-eyebrow">Workspace</p>
          <h2 id="executive-governance-heading" className="np-type-h2 mt-3">
            Workspace and drill-down
          </h2>
          <p className="np-type-body mt-3 max-w-4xl">
            Company profile, remaining setup requirements, and routes into
            primary workspaces. Event history and alerts live in Activity
            Center.
          </p>
        </div>

        <ExecutiveBadge tone={readinessTone} size="md">
          {readiness.status}
        </ExecutiveBadge>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-executive border border-white/10 bg-black/15 p-5 sm:p-6">
          <p className="np-type-meta">{company.label}</p>
          <div className="mt-5 flex items-center gap-4">
            {company.logoUrl ? (
              <Image
                src={company.logoUrl}
                alt={`${company.name} logo`}
                width={64}
                height={64}
                className="h-16 w-16 rounded-2xl border border-white/10 bg-white p-2 object-contain"
              />
            ) : (
              <div
                aria-hidden="true"
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-2xl font-black text-nexus-text-muted"
              >
                {company.name.trim().charAt(0) || "C"}
              </div>
            )}

            <div className="min-w-0">
              <h3 className="truncate text-xl font-black text-white">
                {company.name}
              </h3>
              <p className="np-type-body mt-1">
                {company.category} · {company.location}
              </p>
              <p className="np-type-meta mt-1 uppercase tracking-[0.16em]">
                {company.networkRole}
              </p>
            </div>
          </div>

          <Link
            href={company.href}
            className={`mt-6 inline-flex min-h-11 items-center justify-center rounded-2xl border border-nexus-cyan/25 bg-nexus-cyan/10 px-5 py-2.5 text-sm font-black text-nexus-cyan-bright transition-colors hover:bg-nexus-cyan/15 ${EXECUTIVE_FOCUS_CYAN}`}
          >
            Open Company Workspace
          </Link>
        </section>

        <section
          className="rounded-executive border border-white/10 bg-white/[0.03] p-5 sm:p-6"
          aria-labelledby="executive-readiness-heading"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="np-type-meta">Operational Readiness</p>
              <h3 id="executive-readiness-heading" className="mt-2 text-xl font-black text-white">
                Workspace setup
              </h3>
            </div>
            <p className="np-type-kpi text-3xl">{readiness.score}%</p>
          </div>

          <ExecutiveProgress value={readiness.score} className="mt-5" />

          <div className="mt-5">
            {readiness.tasks.length > 0 ? (
              <div className="divide-y divide-white/10 overflow-hidden rounded-executive border border-white/10 bg-black/15">
                {readiness.tasks.map((task) => (
                  <Link
                    key={task.id}
                    href={task.href}
                    className={`group flex min-h-11 items-start justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-white/[0.04] ${EXECUTIVE_FOCUS_CYAN}`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-black text-white transition-colors group-hover:text-nexus-cyan-bright">
                        {task.title}
                      </p>
                      <p className="np-type-meta mt-1">{task.description}</p>
                    </div>
                    <ExecutiveBadge tone="pending" size="sm">
                      Required
                    </ExecutiveBadge>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-executive border border-emerald-400/15 bg-emerald-400/[0.04] px-5 py-6">
                <ExecutiveBadge tone="success" size="sm">
                  Setup Complete
                </ExecutiveBadge>
                <p className="np-type-body mt-3">
                  All current workspace setup requirements are complete.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="mt-7 grid gap-6 border-t border-white/10 pt-7 xl:grid-cols-[1.2fr_0.8fr]">
        <section aria-labelledby="executive-activity-center-heading">
          <p className="np-type-meta">Activity Center</p>
          <h3
            id="executive-activity-center-heading"
            className="mt-2 text-xl font-black text-white"
          >
            Events and workflow history
          </h3>
          <p className="np-type-body mt-3 max-w-2xl">
            Alerts, notifications, and procurement events are recorded in
            Activity Center. They are not duplicated here as action queue items.
          </p>

          <Link
            href="/notifications"
            className={`mt-5 inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-black text-white transition-colors hover:bg-white/[0.06] ${EXECUTIVE_FOCUS_CYAN}`}
          >
            Open Activity Center
            {unreadNotificationCount > 0 ? (
              <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-nexus-cyan-bright">
                {unreadNotificationCount} unread
              </span>
            ) : null}
            <span aria-hidden="true">→</span>
          </Link>
        </section>

        <section aria-labelledby="executive-nav-heading">
          <p className="np-type-meta">Drill Down</p>
          <h3 id="executive-nav-heading" className="mt-2 text-xl font-black text-white">
            Primary workspaces
          </h3>

          <div className="mt-4 divide-y divide-white/10 overflow-hidden rounded-executive border border-white/10 bg-black/15">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex min-h-11 items-center justify-between gap-4 px-4 py-4 transition-colors hover:bg-white/[0.04] ${EXECUTIVE_FOCUS_CYAN}`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-black text-white transition-colors group-hover:text-nexus-cyan-bright">
                    {item.title}
                  </p>
                  <p className="np-type-meta mt-1">{item.description}</p>
                </div>
                <span
                  aria-hidden="true"
                  className="shrink-0 text-sm font-black text-nexus-text-muted transition-colors group-hover:text-nexus-cyan-bright"
                >
                  →
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </ExecutivePanel>
  );
}

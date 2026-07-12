import Image from "next/image";
import Link from "next/link";

import { ExecutiveBadge } from "@/components/executive/executive-badge";
import { ExecutivePanel } from "@/components/executive/executive-panel";
import { ExecutiveProgress } from "@/components/executive/executive-progress";

type GovernanceTask = {
  id: string;
  title: string;
  description: string;
  href: string;
};

type ActivityItem = {
  id: string;
  title: string;
  description: string;
  type: string;
  severity: "success" | "info" | "warning" | "critical";
  relativeTime: string;
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
  activity: {
    label: string;
    title: string;
    items: ActivityItem[];
  };
  navigation: NavigationItem[];
};

const activityTone = {
  success: "success",
  info: "blue",
  warning: "warning",
  critical: "risk",
} as const;

const activityDotClass = {
  success: "bg-emerald-400",
  info: "bg-[#2CC4E8]",
  warning: "bg-amber-400",
  critical: "bg-red-400",
} as const;

export function GovernanceReferenceWorkspace({
  company,
  readiness,
  activity,
  navigation,
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
      className="mt-8"
    >
      <div className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">
            Governance &amp; Reference
          </p>

          <h2 className="mt-3 text-xl font-black text-white sm:text-2xl">
            Workspace Governance and Activity
          </h2>

          <p className="mt-3 max-w-4xl text-sm font-semibold leading-7 text-slate-400">
            Company context, operational readiness, recent activity, and
            utility navigation supporting accountable workspace administration.
          </p>
        </div>

        <ExecutiveBadge tone={readinessTone} size="md">
          {readiness.status}
        </ExecutiveBadge>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-[26px] border border-white/10 bg-black/15 p-5 sm:p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
            {company.label}
          </p>

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
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-2xl font-black text-slate-500"
              >
                {company.name.trim().charAt(0) || "C"}
              </div>
            )}

            <div className="min-w-0">
              <h3 className="truncate text-xl font-black text-white">
                {company.name}
              </h3>

              <p className="mt-1 text-sm font-semibold text-slate-400">
                {company.category} · {company.location}
              </p>

              <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                {company.networkRole}
              </p>
            </div>
          </div>

          <Link
            href={company.href}
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full border border-[#2CC4E8]/25 bg-[#2CC4E8]/10 px-5 py-2.5 text-sm font-black text-[#9BE8F8] transition-colors hover:bg-[#2CC4E8]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2CC4E8]/40"
          >
            Open Company Workspace →
          </Link>
        </section>

        <section className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
                Operational Readiness
              </p>

              <h3 className="mt-2 text-xl font-black text-white">
                Workspace Setup Requirements
              </h3>
            </div>

            <p className="text-3xl font-black tabular-nums text-white">
              {readiness.score}%
            </p>
          </div>

          <ExecutiveProgress value={readiness.score} className="mt-5" />

          <div className="mt-5">
            {readiness.tasks.length > 0 ? (
              <div className="divide-y divide-white/10 overflow-hidden rounded-[20px] border border-white/10 bg-black/15">
                {readiness.tasks.map((task) => (
                  <Link
                    key={task.id}
                    href={task.href}
                    className="group flex items-start justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2CC4E8]/40"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-black text-white transition-colors group-hover:text-[#9BE8F8]">
                        {task.title}
                      </p>

                      <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                        {task.description}
                      </p>
                    </div>

                    <ExecutiveBadge tone="warning" size="sm">
                      Required
                    </ExecutiveBadge>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-[20px] border border-emerald-400/15 bg-emerald-400/[0.04] px-5 py-6">
                <ExecutiveBadge tone="success" size="sm">
                  Setup Complete
                </ExecutiveBadge>

                <p className="mt-3 text-sm font-semibold leading-6 text-slate-300">
                  All current workspace setup requirements are complete.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="mt-7 grid gap-6 border-t border-white/10 pt-7 xl:grid-cols-[1.2fr_0.8fr]">
        <section>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
                {activity.label}
              </p>

              <h3 className="mt-2 text-xl font-black text-white">
                {activity.title}
              </h3>
            </div>

            <ExecutiveBadge tone="neutral" size="sm">
              {activity.items.length} Events
            </ExecutiveBadge>
          </div>

          <div className="mt-4">
            {activity.items.length > 0 ? (
              <div className="divide-y divide-white/10 overflow-hidden rounded-[22px] border border-white/10 bg-black/15">
                {activity.items.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="group flex items-start gap-4 px-4 py-4 transition-colors hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2CC4E8]/40"
                  >
                    <span
                      aria-hidden="true"
                      className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${activityDotClass[item.severity]}`}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <p className="text-sm font-black text-white transition-colors group-hover:text-[#9BE8F8]">
                          {item.title}
                        </p>

                        <div className="flex shrink-0 items-center gap-2">
                          <ExecutiveBadge
                            tone={activityTone[item.severity]}
                            size="sm"
                          >
                            {item.type}
                          </ExecutiveBadge>

                          <span className="text-xs font-bold text-slate-500">
                            {item.relativeTime}
                          </span>
                        </div>
                      </div>

                      <p className="mt-2 text-xs font-semibold leading-5 text-slate-400">
                        {item.description}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-[22px] border border-dashed border-white/15 bg-white/[0.025] px-5 py-8 text-center">
                <p className="text-sm font-bold text-slate-500">
                  No recent workspace activity.
                </p>
              </div>
            )}
          </div>
        </section>

        <section>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
            Workspace Navigation
          </p>

          <h3 className="mt-2 text-xl font-black text-white">
            Primary Workspaces
          </h3>

          <div className="mt-4 divide-y divide-white/10 overflow-hidden rounded-[22px] border border-white/10 bg-black/15">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center justify-between gap-4 px-4 py-4 transition-colors hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2CC4E8]/40"
              >
                <div className="min-w-0">
                  <p className="text-sm font-black text-white transition-colors group-hover:text-[#9BE8F8]">
                    {item.title}
                  </p>

                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                    {item.description}
                  </p>
                </div>

                <span
                  aria-hidden="true"
                  className="shrink-0 text-sm font-black text-slate-500 transition-colors group-hover:text-[#9BE8F8]"
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
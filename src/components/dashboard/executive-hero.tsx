import Link from "next/link";

import { ExecutiveBadge } from "@/components/executive/executive-badge";
import { ExecutivePanel } from "@/components/executive/executive-panel";
import { ExecutiveProgress } from "@/components/executive/executive-progress";

type ExecutiveHeroProps = {
  welcomeTitle: string;
  welcomeDescription: string;
  briefLabel: string;
  companyName: string;
  readinessScore: number;
  readinessTone: "success" | "warning" | "blue" | "neutral";
  continueHref: string;
  continueLabel: string;
};

export function ExecutiveHero({
  welcomeTitle,
  welcomeDescription,
  briefLabel,
  companyName,
  readinessScore,
  readinessTone,
  continueHref,
  continueLabel,
}: ExecutiveHeroProps) {
  const readinessStatus =
    readinessScore >= 100
      ? "Workspace Ready"
      : readinessScore >= 55
        ? "Setup In Progress"
        : "Setup Required";

  return (
    <ExecutivePanel
      variant="executive"
      padding="md"
      tone="gold"
      className="bg-gradient-to-br from-[#07111F] via-[#061426] to-[#020617] p-6 shadow-[0_32px_110px_rgba(0,0,0,0.42)] sm:p-8"
    >
      <div className="grid gap-7 xl:grid-cols-[1.2fr_0.8fr] xl:items-center">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.34em] text-[#C8A646]">
            Executive Position
          </p>

          <h1 className="mt-4 max-w-5xl text-3xl font-black leading-tight text-white sm:text-4xl xl:text-5xl">
            {welcomeTitle}
          </h1>

          <p className="mt-4 max-w-4xl text-base font-semibold leading-8 text-slate-400">
            {welcomeDescription}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <ExecutiveBadge tone={readinessTone} size="sm">
              {readinessStatus}
            </ExecutiveBadge>

            <ExecutiveBadge tone="blue" size="sm">
              {briefLabel}
            </ExecutiveBadge>

            <ExecutiveBadge tone="neutral" size="sm">
              {companyName}
            </ExecutiveBadge>
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href={continueHref}
              className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-gradient-to-r from-[#B9902F] via-[#C8A646] to-[#F5D77B] px-6 text-sm font-black uppercase tracking-[0.12em] text-slate-950 shadow-[0_18px_55px_rgba(200,166,70,0.3)] transition-[box-shadow,transform] duration-200 hover:-translate-y-px hover:shadow-[0_22px_65px_rgba(200,166,70,0.34)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5D77B]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#030712]"
            >
              {continueLabel}
            </Link>

            <Link
              href="/rfq/new"
              className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.045] px-6 text-sm font-black text-white transition-[border-color,background-color] duration-200 hover:border-[#2CC4E8]/25 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2CC4E8]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#030712]"
            >
              Create RFQ
            </Link>
          </div>
        </div>

        <aside className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C8A646]">
                Operational Readiness
              </p>

              <p className="mt-3 text-4xl font-black tabular-nums text-white">
                {readinessScore}%
              </p>
            </div>

            <ExecutiveBadge tone={readinessTone} size="sm">
              {readinessStatus}
            </ExecutiveBadge>
          </div>

          <ExecutiveProgress value={readinessScore} className="mt-5 h-3" />

          <p className="mt-4 text-sm font-semibold leading-6 text-slate-400">
            Detailed setup requirements and governance tasks are available in
            the Governance &amp; Reference workspace below.
          </p>
        </aside>
      </div>
    </ExecutivePanel>
  );
}
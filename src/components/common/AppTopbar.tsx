"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NexusPavilionLogo } from "@/components/branding/nexus-pavilion-logo";
import { ExecutiveBadge } from "@/components/executive/executive-badge";
import SignOutButton from "@/components/sign-out-button";
import {
  EXECUTIVE_FOCUS_CYAN,
  EXECUTIVE_FOCUS_GOLD,
} from "@/lib/design-system/executive-contract";
import {
  BOARDROOM_INTELLIGENCE_TITLE,
  getAppSectionTitle,
} from "@/lib/navigation/application-nav";

const TOPBAR_ACTION = [
  "inline-flex min-h-11 items-center rounded-full border px-4 py-2",
  "text-xs font-black uppercase tracking-wide",
  "transition-[background-color,border-color] duration-[var(--motion-duration-fast)]",
  "motion-reduce:transition-none",
].join(" ");

export default function AppTopbar() {
  const pathname = usePathname() ?? "/";
  const title = getAppSectionTitle(pathname) || BOARDROOM_INTELLIGENCE_TITLE;

  return (
    <header className="hidden h-[76px] min-w-0 items-center justify-between gap-4 overflow-x-clip border-b border-white/10 bg-nexus-navy/95 px-4 text-white backdrop-blur sm:px-6 lg:flex lg:px-8">
      <div className="flex min-w-0 items-center gap-4">
        <NexusPavilionLogo
          className="hidden shrink-0 xl:flex"
          variant="icon"
          size={38}
        />

        <div className="min-w-0">
          <p className="np-type-eyebrow">
            Executive Command
          </p>

          <p className="mt-1 truncate text-lg font-black text-white">
            {title}
          </p>
        </div>
      </div>

      <div className="flex min-w-0 flex-wrap items-center justify-end gap-3">
        <Link
          href="/notifications"
          className={`${TOPBAR_ACTION} border-nexus-gold/25 bg-nexus-gold/10 text-nexus-gold-bright hover:bg-nexus-gold/15 ${EXECUTIVE_FOCUS_GOLD}`}
        >
          Alerts
        </Link>

        <Link
          href="/analytics"
          className={`${TOPBAR_ACTION} border-nexus-cyan/25 bg-nexus-cyan/10 text-nexus-cyan-bright hover:bg-nexus-cyan/15 ${EXECUTIVE_FOCUS_CYAN}`}
        >
          Insights
        </Link>

        <ExecutiveBadge tone="success" size="sm">
          Live
        </ExecutiveBadge>

        <SignOutButton />
      </div>
    </header>
  );
}

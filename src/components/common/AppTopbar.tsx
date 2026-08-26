"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NexusPavilionLogo } from "@/components/branding/nexus-pavilion-logo";
import SignOutButton from "@/components/sign-out-button";
import {
  EXECUTIVE_FOCUS_CYAN,
  EXECUTIVE_FOCUS_GOLD,
} from "@/lib/design-system/executive-contract";
import {
  BOARDROOM_INTELLIGENCE_TITLE,
  getAppSectionTitle,
} from "@/lib/navigation/application-nav";

export default function AppTopbar() {
  const pathname = usePathname() ?? "/";
  const title = getAppSectionTitle(pathname) || BOARDROOM_INTELLIGENCE_TITLE;

  return (
    <header className="hidden h-[76px] items-center justify-between border-b border-white/10 bg-[#07111F]/95 px-4 text-white backdrop-blur sm:px-6 lg:flex lg:px-8">
      <div className="flex min-w-0 items-center gap-4">
        <NexusPavilionLogo
          className="hidden shrink-0 xl:flex"
          variant="icon"
          size={38}
        />

        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C8A646]">
            Executive Command
          </p>

          <p className="mt-1 truncate text-lg font-black text-white">
            {title}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/notifications"
          className={`hidden min-h-11 items-center rounded-full border border-[#C8A646]/25 bg-[#C8A646]/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-[#F5D77B] transition hover:bg-[#C8A646]/15 sm:inline-flex ${EXECUTIVE_FOCUS_GOLD}`}
        >
          Alerts
        </Link>

        <Link
          href="/analytics"
          className={`hidden min-h-11 items-center rounded-full border border-[#2CC4E8]/25 bg-[#2CC4E8]/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-[#9BE8F8] transition hover:bg-[#2CC4E8]/15 md:inline-flex ${EXECUTIVE_FOCUS_CYAN}`}
        >
          Insights
        </Link>

        <div className="hidden items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 lg:flex">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />

          <span className="text-[10px] font-black uppercase tracking-wide text-emerald-300">
            Live
          </span>
        </div>

        <SignOutButton />
      </div>
    </header>
  );
}

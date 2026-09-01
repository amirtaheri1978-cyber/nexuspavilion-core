"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import { NexusPavilionLogo } from "@/components/branding/nexus-pavilion-logo";
import SignOutButton from "@/components/sign-out-button";
import { EXECUTIVE_FOCUS_CYAN } from "@/lib/design-system/executive-contract";
import {
  DEFAULT_APPLICATION_NAV_STATS,
  flattenNavigation,
  getExperience,
  getExperienceLabel,
  getNavigation,
  isActivePath,
  type ApplicationNavItem,
  type ApplicationNavStats,
  type ApplicationUserContext,
} from "@/lib/navigation/application-nav";
import { createClient } from "@/lib/supabase/client";

const defaultStats: ApplicationNavStats = DEFAULT_APPLICATION_NAV_STATS;

export default function Sidebar() {
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [stats, setStats] = useState<ApplicationNavStats>(defaultStats);
  const [context, setContext] = useState<ApplicationUserContext>({
    role: null,
    networkRole: null,
    companyName: null,
    companyStatus: null,
  });

  const experience = getExperience(context);
  const navSections = getNavigation(experience, stats);
  const navItems = flattenNavigation(experience, stats);

  useEffect(() => {
    if (!mobileOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      try {
        const response = await fetch("/api/sidebar-stats", {
          cache: "no-store",
        });

        if (!response.ok || cancelled) return;

        const data = (await response.json()) as Partial<ApplicationNavStats>;

        setStats({
          activeRfqs: Number(data.activeRfqs || 0),
          unreadNotifications: Number(data.unreadNotifications || 0),
          awardedContracts: Number(data.awardedContracts || 0),
          supplierQuotes: Number(data.supplierQuotes || 0),
        });
      } catch {
        if (!cancelled) setStats(defaultStats);
      }
    }

    async function loadUserContext() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user || cancelled) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("role, company_id")
          .eq("id", user.id)
          .maybeSingle();

        if (cancelled) return;

        if (!profile?.company_id) {
          setContext({
            role: profile?.role || null,
            networkRole: null,
            companyName: null,
            companyStatus: null,
          });
          return;
        }

        const { data: company } = await supabase
          .from("companies")
          .select("name, network_role, status")
          .eq("id", profile.company_id)
          .maybeSingle();

        if (cancelled) return;

        setContext({
          role: profile.role || null,
          networkRole: company?.network_role || null,
          companyName: company?.name || null,
          companyStatus: company?.status || null,
        });
      } catch {
        if (!cancelled) {
          setContext({
            role: null,
            networkRole: null,
            companyName: null,
            companyStatus: null,
          });
        }
      }
    }

    loadStats();
    loadUserContext();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  function renderNavItem(item: ApplicationNavItem) {
    const isActive = isActivePath(pathname, item.href);
    const hasBadge = Boolean(item.badge && item.badge !== "0");

    return (
      <Link
        key={`${item.key}-${item.href}`}
        href={item.href}
        aria-current={isActive ? "page" : undefined}
        onClick={() => setMobileOpen(false)}
        className={[
          "group flex min-h-11 items-center gap-3 rounded-[14px] px-3 py-3 text-sm transition",
          isActive
            ? "bg-gradient-to-r from-[#0B3D91]/45 to-[#2CC4E8]/10 text-white ring-1 ring-[#2CC4E8]/25"
            : "text-slate-300 hover:bg-white/[0.045] hover:text-white",
          EXECUTIVE_FOCUS_CYAN,
        ].join(" ")}
      >
        <span
          className={[
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border text-[13px] font-black",
            isActive
              ? "border-[#2CC4E8]/30 bg-[#2CC4E8]/12 text-[#9BE8F8]"
              : "border-white/10 bg-[#061426]/80 text-slate-400 group-hover:text-[#C8A646]",
          ].join(" ")}
        >
          {getNavGlyph(item.key)}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold leading-5">
            {item.label}
          </span>
          <span className="mt-0.5 block break-words text-[11px] font-medium leading-4 text-slate-400">
            {item.description}
          </span>
        </span>

        {hasBadge ? (
          <span
            className={[
              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide",
              item.badge === "Live"
                ? "bg-emerald-400/12 text-emerald-300 ring-1 ring-emerald-300/20"
                : "bg-white/[0.06] text-white ring-1 ring-white/10",
            ].join(" ")}
          >
            {item.badge}
          </span>
        ) : null}
      </Link>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#07111F]/95 px-4 py-3 text-white backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className={`flex min-w-0 items-center gap-3 rounded-xl ${EXECUTIVE_FOCUS_CYAN}`}
          >
            <NexusPavilionLogo
              className="shrink-0"
              variant="icon"
              size={44}
              priority
            />

            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#C8A646]">
                NexusPavilion
              </p>

              <p className="mt-1 truncate text-sm font-black text-white">
                {context.companyName || "Procurement Workspace"}
              </p>
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              aria-expanded={mobileOpen}
              aria-controls="np-mobile-nav"
              aria-label={mobileOpen ? "Close workspace menu" : "Open workspace menu"}
              onClick={() => setMobileOpen((open) => !open)}
              className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-white/[0.06] px-4 text-xs font-black text-white ring-1 ring-white/10 ${EXECUTIVE_FOCUS_CYAN}`}
            >
              {mobileOpen ? "Close" : "Menu"}
            </button>

            <SignOutButton />
          </div>
        </div>

        {mobileOpen ? (
          <nav
            id="np-mobile-nav"
            aria-label="Workspace navigation"
            className="mt-3 space-y-1.5 border-t border-white/10 pt-3"
          >
            {navItems.map((item) => renderNavItem(item))}
          </nav>
        ) : null}
      </header>

      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[330px] border-r border-white/10 bg-[#061426] text-nexus-white shadow-executive lg:flex lg:flex-col">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(44,196,232,0.18),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(200,166,70,0.14),transparent_32%)]" />

        <div className="relative shrink-0 px-6 pb-6 pt-8">
          <Link
            href="/dashboard"
            className="block rounded-[28px] px-3 py-3 transition hover:bg-white/[0.045]"
            aria-label="Go to NexusPavilion dashboard"
          >
            <NexusPavilionLogo variant="horizontal" size={72} priority />

            <div className="mt-4 rounded-[20px] border border-white/10 bg-[#07111F]/72 px-4 py-3">
              <p className="text-[9px] font-black uppercase tracking-[0.26em] text-[#C8A646]">
                Intelligence Converges
              </p>

              <p className="mt-1 text-xs font-semibold text-slate-400">
                Decisions Deliver.
              </p>
            </div>
          </Link>
        </div>

        <nav
          aria-label="Primary navigation"
          className="relative flex-1 overflow-y-auto px-5 pb-5 [scrollbar-color:#1E293B_#07111F] [scrollbar-width:thin]"
        >
          {navSections.map((section, index) => (
            <div key={section.title} className={index > 0 ? "mt-6" : undefined}>
              <p className="mb-3 px-3 text-[10px] font-black uppercase tracking-[0.28em] text-[#C8A646]">
                {section.title}
              </p>

              <div className="space-y-1.5">{section.items.map(renderNavItem)}</div>
            </div>
          ))}
        </nav>

        <div className="relative shrink-0 space-y-4 border-t border-white/10 px-5 py-5">
          <div className="rounded-[22px] border border-[#2CC4E8]/10 bg-[#2CC4E8]/[0.055] p-4 shadow-[0_0_45px_rgba(44,196,232,0.12)]">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#2CC4E8]/20 bg-[#2CC4E8]/10 text-2xl text-[#9BE8F8]">
              ◈
            </div>

            <p className="text-center text-sm font-black uppercase tracking-[0.08em] text-white">
              NexusPavilion Intelligence
            </p>

            <p className="mt-1 text-center text-xs font-medium text-slate-400">
              Procurement Decision Support
            </p>

            <Link
              href="/analytics"
              className={`mt-4 flex min-h-11 items-center justify-center gap-2 rounded-[14px] border border-white/10 bg-[#07111F]/75 px-4 py-2.5 text-xs font-black text-white transition hover:border-[#2CC4E8]/30 hover:bg-[#2CC4E8]/10 ${EXECUTIVE_FOCUS_CYAN}`}
            >
              Open Intelligence
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className="flex items-center justify-between rounded-[18px] border border-white/10 bg-[#07111F]/75 px-4 py-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                Workspace
              </p>
              <p className="mt-1 truncate text-xs font-black text-white">
                {context.companyName || "Company Workspace"}
              </p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {getExperienceLabel(experience)}
              </p>
            </div>

            <StatusPill tone="success">
              {context.companyStatus || "Verified"}
            </StatusPill>
          </div>

          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
            <span className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              v 2.0.0 · Enterprise
            </span>

            <Link
              href="/notifications"
              className={`rounded-md text-slate-400 hover:text-white ${EXECUTIVE_FOCUS_CYAN}`}
            >
              Activity
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}

function StatusPill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-300/20"
      : tone === "warning"
        ? "bg-orange-400/10 text-orange-300 ring-1 ring-orange-300/20"
        : "bg-white/[0.06] text-white ring-1 ring-white/10";

  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${toneClass}`}
    >
      {children}
    </span>
  );
}

function getNavGlyph(key: string) {
  const glyphs: Record<string, string> = {
    dashboard: "⌂",
    analytics: "◇",
    directory: "☷",
    rfq: "▣",
    notifications: "!",
    company: "◼",
    "vendor-dashboard": "◷",
  };

  return glyphs[key] || "•";
}

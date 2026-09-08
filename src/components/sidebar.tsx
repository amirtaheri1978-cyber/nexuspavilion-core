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

type SidebarProps = {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
};

export default function Sidebar({
  collapsed,
  onCollapsedChange,
}: SidebarProps) {
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
  const experienceLabel = getExperienceLabel(experience);
  const navSections = getNavigation(experience, stats);
  const navItems = flattenNavigation(experience, stats);
  const workspaceName = context.companyName || "Company Workspace";
  const workspaceStatus = context.companyStatus || "Verified";
  const compactWorkspaceLabel = `${workspaceName} · ${experienceLabel} · ${workspaceStatus}`;
  const workspaceInitial = workspaceName.trim().charAt(0).toUpperCase() || "W";

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

  function renderNavItem(item: ApplicationNavItem, compact = false) {
    const isActive = isActivePath(pathname, item.href);
    const hasBadge = Boolean(item.badge && item.badge !== "0");
    const compactAriaLabel = hasBadge
      ? `${item.label}, ${item.badge}. ${item.description}`
      : `${item.label}. ${item.description}`;

    return (
      <Link
        key={`${item.key}-${item.href}`}
        href={item.href}
        aria-current={isActive ? "page" : undefined}
        aria-label={compact ? compactAriaLabel : undefined}
        title={compact ? item.label : undefined}
        onClick={() => setMobileOpen(false)}
        className={[
          "group relative flex min-h-11 items-center rounded-[14px] text-sm transition",
          compact ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-3",
          isActive
            ? "bg-gradient-to-r from-[#0B3D91]/45 to-[#2CC4E8]/10 text-white ring-1 ring-[#2CC4E8]/25"
            : "text-slate-300 hover:bg-white/[0.045] hover:text-white",
          EXECUTIVE_FOCUS_CYAN,
        ].join(" ")}
      >
        <span
          aria-hidden={compact ? "true" : undefined}
          className={[
            "flex shrink-0 items-center justify-center rounded-[10px] border text-[13px] font-black",
            compact ? "h-10 w-10" : "h-8 w-8",
            isActive
              ? "border-[#2CC4E8]/30 bg-[#2CC4E8]/12 text-[#9BE8F8]"
              : "border-white/10 bg-[#061426]/80 text-slate-400 group-hover:text-[#C8A646]",
          ].join(" ")}
        >
          {getNavGlyph(item.key)}
        </span>

        {compact ? null : (
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold leading-5">
              {item.label}
            </span>
            <span className="mt-0.5 block break-words text-[11px] font-medium leading-4 text-slate-400">
              {item.description}
            </span>
          </span>
        )}

        {hasBadge ? (
          compact ? (
            <span
              aria-hidden="true"
              className={[
                "absolute right-1 top-1 max-w-8 truncate rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide",
                item.badge === "Live"
                  ? "bg-emerald-400/12 text-emerald-300 ring-1 ring-emerald-300/20"
                  : "bg-white/[0.08] text-white ring-1 ring-white/10",
              ].join(" ")}
            >
              {item.badge}
            </span>
          ) : (
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
          )
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

      <aside
        id="np-desktop-sidebar"
        className={[
          "fixed left-0 top-0 z-40 hidden h-screen border-r border-white/10 bg-[#061426] text-nexus-white shadow-executive lg:flex lg:flex-col",
          collapsed ? "w-[96px]" : "w-[330px]",
        ].join(" ")}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(44,196,232,0.18),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(200,166,70,0.14),transparent_32%)]" />

        <div
          className={[
            "relative shrink-0",
            collapsed ? "px-3 pb-4 pt-6" : "px-6 pb-6 pt-8",
          ].join(" ")}
        >
          <Link
            href="/dashboard"
            className={[
              "rounded-[28px] transition hover:bg-white/[0.045]",
              collapsed
                ? "flex items-center justify-center px-2 py-3"
                : "block px-3 py-3",
              EXECUTIVE_FOCUS_CYAN,
            ].join(" ")}
            aria-label="Go to NexusPavilion dashboard"
            title={collapsed ? "NexusPavilion dashboard" : undefined}
          >
            <NexusPavilionLogo
              variant={collapsed ? "icon" : "horizontal"}
              size={collapsed ? 44 : 72}
              priority
            />

            {collapsed ? null : (
              <div className="mt-4 rounded-[20px] border border-white/10 bg-[#07111F]/72 px-4 py-3">
                <p className="text-[9px] font-black uppercase tracking-[0.26em] text-[#C8A646]">
                  Intelligence Converges
                </p>

                <p className="mt-1 text-xs font-semibold text-slate-400">
                  Decisions Deliver.
                </p>
              </div>
            )}
          </Link>

          <button
            type="button"
            aria-controls="np-desktop-sidebar"
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => onCollapsedChange(!collapsed)}
            className={`mx-auto mt-3 flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/10 bg-[#07111F]/80 text-sm font-black text-slate-300 transition hover:border-[#2CC4E8]/30 hover:bg-[#2CC4E8]/10 hover:text-white ${EXECUTIVE_FOCUS_CYAN}`}
          >
            <span aria-hidden="true">{collapsed ? "›" : "‹"}</span>
          </button>
        </div>

        <nav
          aria-label="Primary navigation"
          className={[
            "relative flex-1 overflow-y-auto pb-5 [scrollbar-color:#1E293B_#07111F] [scrollbar-width:thin]",
            collapsed ? "px-3" : "px-5",
          ].join(" ")}
        >
          {navSections.map((section, index) => (
            <div key={section.title} className={index > 0 ? "mt-6" : undefined}>
              <p
                className={
                  collapsed
                    ? "sr-only"
                    : "mb-3 px-3 text-[10px] font-black uppercase tracking-[0.28em] text-[#C8A646]"
                }
              >
                {section.title}
              </p>

              <div className={collapsed ? "space-y-2" : "space-y-1.5"}>
                {section.items.map((item) => renderNavItem(item, collapsed))}
              </div>
            </div>
          ))}
        </nav>

        <div
          className={[
            "relative shrink-0 border-t border-white/10",
            collapsed ? "space-y-3 px-3 py-4" : "space-y-4 px-5 py-5",
          ].join(" ")}
        >
          {collapsed ? (
            <>
              <Link
                href="/analytics"
                aria-label="Open NexusPavilion Intelligence"
                title="NexusPavilion Intelligence"
                className={`mx-auto flex min-h-11 min-w-11 items-center justify-center rounded-[14px] border border-[#2CC4E8]/15 bg-[#2CC4E8]/[0.07] text-xl text-[#9BE8F8] shadow-[0_0_32px_rgba(44,196,232,0.1)] hover:border-[#2CC4E8]/30 hover:bg-[#2CC4E8]/10 ${EXECUTIVE_FOCUS_CYAN}`}
              >
                <span aria-hidden="true">◈</span>
              </Link>

              <div
                role="group"
                aria-label={compactWorkspaceLabel}
                title={compactWorkspaceLabel}
                className="relative mx-auto flex h-11 w-11 items-center justify-center rounded-[14px] border border-white/10 bg-[#07111F]/75 text-xs font-black text-white"
              >
                <span aria-hidden="true">{workspaceInitial}</span>
                <span
                  aria-hidden="true"
                  className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-[#07111F]"
                />
              </div>

              <Link
                href="/notifications"
                aria-label="Open workspace activity"
                title="Activity"
                className={`mx-auto flex min-h-11 min-w-11 items-center justify-center rounded-[14px] border border-white/10 bg-[#07111F]/75 text-sm font-black text-slate-300 hover:border-[#2CC4E8]/30 hover:text-white ${EXECUTIVE_FOCUS_CYAN}`}
              >
                <span aria-hidden="true">!</span>
              </Link>
            </>
          ) : (
            <>
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
                    {workspaceName}
                  </p>
                  <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    {experienceLabel}
                  </p>
                </div>

                <StatusPill tone="success">{workspaceStatus}</StatusPill>
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
            </>
          )}
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

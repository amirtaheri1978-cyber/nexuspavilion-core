"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NexusPavilionLogo } from "@/components/branding/nexus-pavilion-logo";
import { EXECUTIVE_FOCUS_CYAN } from "@/lib/design-system/executive-contract";

type NavigationItem = {
  href: string;
  label: string;
};

type NavigationSection = {
  label: string;
  items: NavigationItem[];
};

const NAVIGATION_SECTIONS: NavigationSection[] = [
  {
    label: "Executive",
    items: [
      {
        href: "/dashboard",
        label: "Executive Dashboard",
      },
      {
        href: "/analytics",
        label: "Boardroom Intelligence",
      },
    ],
  },
  {
    label: "Procurement",
    items: [
      {
        href: "/rfq",
        label: "RFQs & Sourcing",
      },
      {
        href: "/directory",
        label: "Supplier Intelligence",
      },
    ],
  },
  {
    label: "Workspace",
    items: [
      {
        href: "/company/settings",
        label: "Company Workspace",
      },
      {
        href: "/notifications",
        label: "Workspace & Procurement Activity",
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        href: "/contact",
        label: "Support & Contact",
      },
    ],
  },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="min-h-screen w-64 border-r border-white/10 bg-[#061426] px-5 py-7 text-white">
      <Link
        href="/dashboard"
        className={`block rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-4 transition hover:bg-white/[0.055] ${EXECUTIVE_FOCUS_CYAN}`}
      >
        <NexusPavilionLogo
          variant="horizontal"
          size={58}
          priority
        />

        <p className="mt-4 text-[9px] font-black uppercase tracking-[0.24em] text-[#C8A646]">
          Intelligence Converges
        </p>

        <p className="mt-1 text-xs font-semibold text-slate-400">
          Decisions Deliver.
        </p>
      </Link>

      <nav
        aria-label="Primary navigation"
        className="mt-8 space-y-6"
      >
        {NAVIGATION_SECTIONS.map((section) => (
          <section key={section.label}>
            <p className="px-3 text-[10px] font-black uppercase tracking-[0.24em] text-[#C8A646]">
              {section.label}
            </p>

            <div className="mt-3 space-y-2">
              {section.items.map((item) => (
                <AppSidebarLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  active={isActivePath(
                    pathname,
                    item.href,
                  )}
                />
              ))}
            </div>
          </section>
        ))}

        <section>
          <p className="px-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
            Platform Status
          </p>

          <div className="mt-3 rounded-2xl border border-emerald-300/15 bg-emerald-400/10 px-4 py-3">
            <p className="text-xs font-black text-emerald-300">
              Available
            </p>

            <p className="mt-1 text-xs font-semibold leading-5 text-slate-400">
              Core procurement and company workspace services are
              active. Advanced intelligence modules display confidence
              states when data is insufficient.
            </p>
          </div>
        </section>
      </nav>
    </aside>
  );
}

function AppSidebarLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={[
        "block min-h-11 rounded-xl px-3 py-2.5 text-sm font-bold transition",
        active
          ? "bg-[#0B3D91]/45 text-white ring-1 ring-[#2CC4E8]/25"
          : "text-slate-300 hover:bg-white/[0.055] hover:text-white",
        EXECUTIVE_FOCUS_CYAN,
      ].join(" ")}
    >
      {label}
    </Link>
  );
}
"use client";

import Link from "next/link";
import {
  type ReactNode,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

import { NexusPavilionLogo } from "@/components/branding/nexus-pavilion-logo";
import { createClient } from "@/lib/supabase/client";

const WORKSPACE_LINKS = [
  {
    href: "/dashboard",
    label: "Executive Dashboard",
    description: "Command center, executive brief, and workspace overview.",
    icon: "📊",
  },
  {
    href: "/company/settings",
    label: "Company Command",
    description: "Governance, members, invitations, and company settings.",
    icon: "🏢",
  },
  {
    href: "/rfq",
    label: "Procurement Workspace",
    description: "RFQs, opportunities, sourcing, and supplier activity.",
    icon: "📑",
  },
  {
    href: "/directory",
    label: "Supplier Network",
    description: "Supplier directory, scorecards, and marketplace signals.",
    icon: "🤝",
  },
  {
    href: "/analytics",
    label: "Executive Analytics",
    description: "Board reporting, risk, confidence, and intelligence.",
    icon: "📈",
  },
  {
    href: "/notifications",
    label: "Activity Center",
    description: "Alerts, workflow signals, and recent workspace activity.",
    icon: "🔔",
  },
] as const;

type SignOutButtonMode = "workspace-menu" | "logout-only";

type SignOutButtonProps = {
  mode?: SignOutButtonMode;
  className?: string;
};

type MenuPosition = {
  top: number;
  right: number;
};

const subscribeToClient = () => () => {};

function useHasMounted() {
  return useSyncExternalStore(
    subscribeToClient,
    () => true,
    () => false,
  );
}

export default function SignOutButton({
  mode = "workspace-menu",
  className = "",
}: SignOutButtonProps) {
  const router = useRouter();
  const supabase = createClient();
  const mounted = useHasMounted();

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const [menuPosition, setMenuPosition] = useState<MenuPosition>({
    top: 0,
    right: 16,
  });

  useEffect(() => {
    if (mode !== "workspace-menu" || !open) return;

    function updateMenuPosition() {
      const trigger = triggerRef.current;

      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const viewportPadding = 16;

      setMenuPosition({
        top: rect.bottom + 12,
        right: Math.max(viewportPadding, window.innerWidth - rect.right),
      });
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;

      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }

      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    updateMenuPosition();

    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mode, open]);

  async function handleSignOut() {
    if (signingOut) return;

    setSigningOut(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("[SignOutButton] Sign out failed", error);
      setSigningOut(false);
      return;
    }

    setOpen(false);
    router.push("/login");
    router.refresh();
  }

  if (mode === "logout-only") {
    return (
      <button
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
        aria-label="Securely sign out of Nexus Pavilion"
        className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-red-300/20 bg-red-400/10 px-4 py-2 text-sm font-black text-red-200 transition-colors hover:border-red-300/30 hover:bg-red-400/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/40 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      >
        <span>{signingOut ? "Signing out..." : "Secure Logout"}</span>

        <span aria-hidden="true">⏻</span>
      </button>
    );
  }

  const menu =
    mounted && open
      ? createPortal(
          <div
            ref={menuRef}
            id="executive-workspace-menu"
            role="menu"
            aria-label="Executive workspace navigation"
            style={{
              top: menuPosition.top,
              right: menuPosition.right,
            }}
            className="fixed z-[9999] max-h-[calc(100vh-2rem)] w-[360px] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-[28px] border border-white/10 bg-[#061426] p-3 shadow-[0_28px_90px_rgba(0,0,0,0.65)] backdrop-blur-xl"
          >
            <div className="rounded-[22px] border border-white/10 bg-white/[0.045] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C8A646]">
                Nexus Pavilion
              </p>

              <div className="mt-3 flex items-center gap-3">
                <NexusPavilionLogo variant="icon" size={34} />

                <div>
                  <p className="text-sm font-black text-white">
                    Executive Workspace
                  </p>

                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Secure enterprise session
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-3 space-y-1">
              {WORKSPACE_LINKS.map((item) => (
                <MenuLink
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  description={item.description}
                  onNavigate={() => setOpen(false)}
                >
                  {item.label}
                </MenuLink>
              ))}
            </div>

            <div className="mt-3 border-t border-white/10 pt-3">
              <button
                type="button"
                role="menuitem"
                onClick={handleSignOut}
                disabled={signingOut}
                className="flex min-h-11 w-full items-center justify-between rounded-[18px] border border-red-300/15 bg-red-400/10 px-4 py-3 text-sm font-black text-red-300 transition-colors hover:bg-red-400/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {signingOut ? "Signing out..." : "Secure Logout"}

                <span aria-hidden="true">⏻</span>
              </button>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div className="relative z-[120]">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-controls="executive-workspace-menu"
          className={`flex items-center gap-3 rounded-full border border-white/10 bg-[#061426]/90 px-3 py-2 text-left text-white shadow-executive backdrop-blur transition-colors hover:border-[#2CC4E8]/30 hover:bg-[#07111F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2CC4E8]/40 ${className}`}
        >
          <NexusPavilionLogo variant="icon" size={32} />

          <div className="hidden min-w-0 xl:block">
            <p className="text-xs font-black leading-none text-white">
              Executive Workspace
            </p>

            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Verified Access
            </p>
          </div>

          <span
            aria-hidden="true"
            className="hidden text-slate-500 transition-transform xl:inline"
          >
            {open ? "▴" : "▾"}
          </span>
        </button>
      </div>

      {menu}
    </>
  );
}

function MenuLink({
  href,
  icon,
  description,
  children,
  onNavigate,
}: {
  href: string;
  icon: string;
  description: string;
  children: ReactNode;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onNavigate}
      className="group flex min-h-11 items-start gap-3 rounded-[18px] px-4 py-3 text-sm transition-colors hover:bg-white/[0.055] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2CC4E8]/40"
    >
      <span
        aria-hidden="true"
        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.055] text-sm"
      >
        {icon}
      </span>

      <span className="min-w-0">
        <span className="block font-black text-slate-200 transition-colors group-hover:text-white">
          {children}
        </span>

        <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">
          {description}
        </span>
      </span>
    </Link>
  );
}
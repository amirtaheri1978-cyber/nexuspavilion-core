import Link from "next/link";
import type { ReactNode } from "react";

import { NexusPavilionLogo } from "@/components/branding/nexus-pavilion-logo";
import { EXECUTIVE_FOCUS_CYAN } from "@/lib/design-system/executive-contract";

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-nexus-border bg-nexus-dark text-nexus-white">
      <div className="mx-auto max-w-7xl px-6 py-14 sm:px-8 lg:py-16">
        <div className="grid gap-12 lg:grid-cols-[1.25fr_0.75fr_0.75fr_0.75fr_0.75fr]">
          <div>
            <NexusPavilionLogo variant="footer" size={90} />

            <p className="mt-8 text-sm font-black text-nexus-white">
              NexusPavilion Inc.
            </p>

            <p className="mt-3 max-w-md text-sm font-semibold leading-7 text-nexus-muted">
              NexusPavilion Intelligent Procurement — a NexusPavilion Inc. product
            </p>
          </div>

          <FooterColumn title="Company">
            <FooterLink href="/about">About</FooterLink>
            <FooterLink href="/contact">Contact</FooterLink>
          </FooterColumn>

          <FooterColumn title="Products / Projects">
            <FooterLink href="/login">Intelligent Procurement</FooterLink>
            <FooterLink href="/#products-projects">
              Products / Projects
            </FooterLink>
          </FooterColumn>

          <FooterColumn title="Resources">
            <FooterLink href="/pricing">
              Intelligent Procurement Pricing
            </FooterLink>
          </FooterColumn>

          <FooterColumn title="Legal">
            <FooterLink href="/privacy">Privacy</FooterLink>
            <FooterLink href="/terms">Terms</FooterLink>
          </FooterColumn>
        </div>

        <div className="mt-12 flex flex-col gap-6 border-t border-white/10 pt-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <NexusPavilionLogo variant="icon" size={56} />

            <div>
              <p className="text-sm font-black text-nexus-white">
                NexusPavilion Inc.
              </p>
              <p className="mt-1 text-xs font-semibold text-nexus-muted">
                NexusPavilion Intelligent Procurement — a NexusPavilion Inc. product
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <nav aria-label={title}>
      <h2 className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">
        {title}
      </h2>

      <div className="mt-5 flex flex-col gap-1">{children}</div>
    </nav>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={[
        "inline-flex min-h-11 items-center text-sm font-bold text-nexus-muted",
        "transition-[color] duration-200 hover:text-nexus-white",
        EXECUTIVE_FOCUS_CYAN,
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

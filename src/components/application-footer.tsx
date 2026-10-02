import Link from "next/link";
import type { ReactNode } from "react";

import packageMetadata from "../../package.json";
import { EXECUTIVE_FOCUS_CYAN } from "@/lib/design-system/executive-contract";

const footerLinkClass = [
  "inline-flex min-h-11 items-center px-1 text-xs font-semibold",
  "text-nexus-text-muted underline-offset-4",
  "hover:text-nexus-text-primary hover:underline",
  EXECUTIVE_FOCUS_CYAN,
].join(" ");

const releaseVersion = packageMetadata.version.trim();
const runtimeEnvironment = process.env.NODE_ENV?.trim() ?? "";

export default function ApplicationFooter() {
  const releaseLabel = [releaseVersion ? `Version ${releaseVersion}` : "", runtimeEnvironment]
    .filter(Boolean)
    .join(" · ");

  return (
    <footer className="border-t border-white/10 px-4 py-4 sm:px-8 lg:px-10">
      <div className="mx-auto flex w-full min-w-0 max-w-[var(--layout-content-max)] flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="np-type-meta">
            Intelligent Procurement · A Nexus Pavilion Inc. product
          </p>
          <p className="np-type-meta mt-1">
            Company Workspace · Confidential procurement workspace
          </p>
          {releaseLabel ? <p className="np-type-meta mt-1">{releaseLabel}</p> : null}
        </div>

        <nav aria-label="Product trust" className="min-w-0">
          <ul className="flex flex-wrap items-center gap-x-1 gap-y-1">
            <TrustLink href="/privacy">Privacy</TrustLink>
            <Separator />
            <TrustLink href="/terms">Terms</TrustLink>
            <Separator />
            <TrustLink href="/contact">Support</TrustLink>
          </ul>
        </nav>
      </div>
    </footer>
  );
}

function TrustLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <li>
      <Link href={href} className={footerLinkClass}>
        {children}
      </Link>
    </li>
  );
}

function Separator() {
  return (
    <li aria-hidden="true" className="px-1 text-[11px] text-slate-600">
      ·
    </li>
  );
}

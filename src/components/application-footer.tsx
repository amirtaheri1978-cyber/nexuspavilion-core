import Link from "next/link";
import type { ReactNode } from "react";

import { EXECUTIVE_FOCUS_CYAN } from "@/lib/design-system/executive-contract";

const footerLinkClass = [
  "inline-flex min-h-11 items-center px-1 text-xs font-semibold text-slate-300",
  "underline-offset-4 hover:text-white hover:underline",
  EXECUTIVE_FOCUS_CYAN,
].join(" ");

export default function ApplicationFooter() {
  return (
    <footer className="border-t border-white/10 px-4 py-4 text-slate-400 sm:px-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 text-xs font-semibold leading-5">
          <p className="text-slate-300">
            Intelligent Procurement · A NexusPavilion Inc. product
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Company Workspace · Confidential procurement workspace
          </p>
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

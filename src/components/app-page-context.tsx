"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { EXECUTIVE_FOCUS_CYAN } from "@/lib/design-system/executive-contract";
import { getAppBreadcrumbs } from "@/lib/navigation/application-nav";

export default function AppPageContext() {
  const pathname = usePathname() ?? "/";
  const crumbs = getAppBreadcrumbs(pathname);

  if (crumbs.length < 2) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className="mx-auto w-full max-w-[1680px] px-4 pt-6 sm:px-8 lg:px-10"
    >
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-slate-400">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;

          return (
            <li key={`${crumb.href}-${crumb.label}`} className="flex min-w-0 items-center gap-2">
              {index > 0 ? (
                <span aria-hidden="true" className="text-slate-400">
                  /
                </span>
              ) : null}

              {last ? (
                <span className="truncate text-white" aria-current="page">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className={`truncate rounded-md text-slate-400 hover:text-white ${EXECUTIVE_FOCUS_CYAN}`}
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

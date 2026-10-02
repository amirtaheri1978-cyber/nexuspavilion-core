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
      className="mx-auto w-full min-w-0 max-w-[var(--layout-content-max)] px-[var(--np-page-pad-inline)] pt-[var(--np-page-pad-block)]"
    >
      <ol className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;

          return (
            <li key={`${crumb.href}-${crumb.label}`} className="flex max-w-full min-w-0 items-center gap-2">
              {index > 0 ? (
                <span aria-hidden="true" className="np-type-meta shrink-0">
                  /
                </span>
              ) : null}

              {last ? (
                <span className="min-w-0 max-w-full truncate text-sm font-semibold text-nexus-text-primary" aria-current="page">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className={`np-type-meta max-w-full min-w-0 truncate rounded-md hover:text-nexus-text-primary ${EXECUTIVE_FOCUS_CYAN}`}
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

"use client";

import { usePathname } from "next/navigation";

import AppTopbar from "@/components/common/AppTopbar";
import Footer from "@/components/footer";
import Sidebar from "@/components/sidebar";

const AUTHENTICATION_ROUTES = [
  "/login",
  "/register",
  "/signup",
  "/forgot-password",
  "/set-password",
  "/invite",
];

const ONBOARDING_ROUTES = ["/create-company"];

const PUBLIC_ROUTES = [
  "/",
  "/about",
  "/contact",
  "/pricing",
  "/privacy",
  "/terms",
];

function matchesRoute(pathname: string, routes: readonly string[]) {
  return routes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isAuthenticationRoute = matchesRoute(
    pathname,
    AUTHENTICATION_ROUTES,
  );

  const isOnboardingRoute = matchesRoute(pathname, ONBOARDING_ROUTES);

  const isPublicRoute = matchesRoute(pathname, PUBLIC_ROUTES);

  /*
   * Authentication and onboarding routes intentionally exclude the public
   * footer so users remain focused on account access, invitation acceptance,
   * and workspace enrollment.
   */
  if (isAuthenticationRoute || isOnboardingRoute) {
    return (
      <div className="min-h-screen bg-[#07111F] text-white">
        {children}
      </div>
    );
  }

  /*
   * Public marketing and legal routes retain the public footer but do not
   * render authenticated workspace navigation.
   */
  if (isPublicRoute) {
    return (
      <div className="min-h-screen bg-[#07111F] text-white">
        {children}
        <Footer />
      </div>
    );
  }

  /*
   * All remaining routes use the authenticated application shell.
   * Access control must still be enforced independently by middleware,
   * server-side session validation, and data authorization.
   */
  return (
    <div className="min-h-screen bg-[#07111F] text-white">
      <Sidebar />

      <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(44,196,232,0.08),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(200,166,70,0.055),transparent_38%),#07111F] lg:ml-[330px]">
        <AppTopbar />

        <main className="min-h-[calc(100vh-76px)]">{children}</main>

        <Footer />
      </div>
    </div>
  );
}
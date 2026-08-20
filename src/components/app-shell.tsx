"use client";

import { usePathname } from "next/navigation";

import ApplicationFooter from "@/components/application-footer";
import AppPageContext from "@/components/app-page-context";
import AppTopbar from "@/components/common/AppTopbar";
import Footer from "@/components/footer";
import Sidebar from "@/components/sidebar";
import { getAppShellKind } from "@/lib/navigation/application-nav";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const shellKind = getAppShellKind(pathname);

  /*
   * Authentication, onboarding, invitation-token, and local preview routes
   * intentionally exclude application chrome so users remain focused on
   * account access and enrollment. Access control is still enforced by
   * middleware, session validation, and data authorization.
   */
  if (shellKind === "chromeless") {
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
  if (shellKind === "public") {
    return (
      <div className="min-h-screen bg-[#07111F] text-white">
        {children}
        <Footer />
      </div>
    );
  }

  /*
   * All remaining routes use the authenticated application shell.
   * Hidden navigation is not an authorization boundary.
   */
  return (
    <div className="min-h-screen bg-[#07111F] text-white">
      <Sidebar />

      <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(44,196,232,0.08),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(200,166,70,0.055),transparent_38%),#07111F] lg:ml-[330px]">
        <AppTopbar />

        <main className="min-h-[calc(100vh-76px)] min-w-0">
          <AppPageContext />
          {children}
        </main>

        <ApplicationFooter />
      </div>
    </div>
  );
}

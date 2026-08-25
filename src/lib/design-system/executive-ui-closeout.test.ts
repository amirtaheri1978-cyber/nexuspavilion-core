import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  EXECUTIVE_CTA_PRIMARY,
  EXECUTIVE_FOCUS_CYAN,
  EXECUTIVE_FOCUS_GOLD,
  EXECUTIVE_PAGE_CLASS,
  EXECUTIVE_TEXT_MUTED,
} from "@/lib/design-system/executive-contract";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const launchCritical = {
  dashboard: readSource("src/app/dashboard/page.tsx"),
  dashboardHero: readSource("src/components/dashboard/executive-hero.tsx"),
  pipeline: readSource(
    "src/components/dashboard/procurement-operations-workspace.tsx",
  ),
  settings: readSource("src/app/company/settings/page.tsx"),
  company: readSource("src/app/company/page.tsx"),
  command: readSource("src/components/company-command-center.tsx"),
  governance: readSource("src/components/company-governance-center.tsx"),
  sidebar: readSource("src/components/sidebar.tsx"),
  topbar: readSource("src/components/common/AppTopbar.tsx"),
  appSidebar: readSource("src/components/common/AppSidebar.tsx"),
  directory: readSource("src/app/directory/page.tsx"),
  notifications: readSource("src/app/notifications/page.tsx"),
  rfqList: readSource("src/app/rfq/page.tsx"),
  rfqNew: readSource("src/app/rfq/new/page.tsx"),
  rfqCompare: readSource("src/app/rfq/[slug]/compare/page.tsx"),
  rfqSubmit: readSource("src/components/rfq-workspace/rfq-submit-workspace.tsx"),
  recover: readSource("src/components/recover-ownership-button.tsx"),
  actionCard: readSource("src/components/executive/executive-action-card.tsx"),
  inviteForm: readSource("src/components/invite-user-form.tsx"),
  settingsForm: readSource("src/components/company-settings-form.tsx"),
  enrollmentState: readSource(
    "src/components/executive/enrollment/executive-enrollment-state.tsx",
  ),
  publicCompany: readSource("src/app/company/[slug]/page.tsx"),
  members: readSource("src/components/company-members-center.tsx"),
  identityDisplay: readSource("src/components/member-identity-display.tsx"),
};

const launchCriticalCtaFiles = [
  launchCritical.company,
  launchCritical.command,
  launchCritical.directory,
  launchCritical.rfqList,
  launchCritical.rfqNew,
  launchCritical.inviteForm,
  launchCritical.settingsForm,
  launchCritical.recover,
  launchCritical.actionCard,
  launchCritical.enrollmentState,
];

describe("NP-MASTER-22-B05 launch-critical closeout", () => {
  it("removes launch-critical orange CTAs", () => {
    expect(launchCritical.recover).not.toContain("bg-orange-500");
    expect(launchCritical.recover).not.toContain("hover:bg-orange-600");
    expect(launchCritical.recover).toContain("EXECUTIVE_CTA_PRIMARY");
    expect(launchCritical.enrollmentState).not.toContain("#c49a4d");
    expect(launchCritical.command).not.toContain("bg-white p-6");
  });

  it("removes hover-scale from launch-critical primary actions", () => {
    for (const source of launchCriticalCtaFiles) {
      expect(source).not.toContain("hover:scale");
      expect(source).not.toContain("hover:-translate");
    }
    expect(EXECUTIVE_CTA_PRIMARY).not.toContain("hover:scale");
  });

  it("keeps canonical focus rings on shell and key controls", () => {
    expect(EXECUTIVE_FOCUS_GOLD).toContain("focus-visible:ring-2");
    expect(EXECUTIVE_FOCUS_CYAN).toContain("focus-visible:ring-2");
    expect(launchCritical.sidebar).toContain("EXECUTIVE_FOCUS_CYAN");
    expect(launchCritical.sidebar).toContain('aria-current={isActive ? "page" : undefined}');
    expect(launchCritical.appSidebar).toContain("EXECUTIVE_FOCUS_CYAN");
    expect(launchCritical.topbar).toContain("EXECUTIVE_FOCUS_GOLD");
    expect(launchCritical.inviteForm).toContain("focus-visible:ring-2");
    expect(launchCritical.rfqNew).toContain('aria-current={activeStep === index ? "step" : undefined}');
    expect(launchCritical.directory).toContain('aria-label="Search supplier network"');
  });

  it("keeps one page h1 on key launch surfaces", () => {
    expect(launchCritical.dashboardHero.match(/<h1[\s>]/g) || []).toHaveLength(1);
    expect(launchCritical.notifications.match(/<h1[\s>]/g) || []).toHaveLength(1);
    expect(launchCritical.directory.match(/<h1[\s>]/g) || []).toHaveLength(1);
    expect(launchCritical.topbar).not.toMatch(/<h1[\s>]/);
  });

  it("uses canonical muted contrast on touched executive surfaces", () => {
    expect(EXECUTIVE_TEXT_MUTED).toBe("#94A3B8");
    expect(launchCritical.sidebar).toContain("text-slate-400");
    expect(launchCritical.sidebar).not.toContain("text-slate-500");
    expect(launchCritical.command).not.toContain("hover:text-slate-950");
    expect(launchCritical.identityDisplay).not.toContain("text-slate-500");
  });

  it("keeps RFQ compare/submit free of light islands", () => {
    expect(launchCritical.rfqCompare).not.toContain("bg-[#f6f6f3]");
    expect(launchCritical.rfqSubmit).not.toContain("bg-[#f6f6f3]");
    expect(launchCritical.rfqCompare).toContain("bg-nexus-navy");
    expect(launchCritical.rfqSubmit).toContain("bg-nexus-navy");
    expect(launchCritical.command).not.toContain("bg-white p-6");
  });

  it("keeps company/settings and dashboard on frozen primitives", () => {
    expect(launchCritical.settings).toContain("EXECUTIVE_PAGE_CLASS");
    expect(launchCritical.settings).toContain("EXECUTIVE_CTA_PRIMARY");
    expect(launchCritical.dashboard).toContain("EXECUTIVE_PAGE_CLASS");
    expect(EXECUTIVE_PAGE_CLASS).toContain("np-page");
    expect(launchCritical.notifications).toContain("EXECUTIVE_PAGE_CLASS");
    expect(launchCritical.directory).toContain("EXECUTIVE_PAGE_CLASS");
  });

  it("keeps member identity canonical and does not disclose public first/last", () => {
    expect(launchCritical.members).toContain("formatMemberIdentity");
    expect(launchCritical.identityDisplay).toContain("formatMemberIdentity");
    expect(launchCritical.publicCompany).not.toContain("first_name");
    expect(launchCritical.publicCompany).not.toContain("last_name");
    expect(launchCritical.directory).not.toContain("first_name");
  });

  it("does not change RFQ scoring or wrap tablet grids into five squeezed columns", () => {
    expect(launchCritical.rfqCompare).toContain(
      "priceScore * 0.6 + validityScore * 0.2 + budgetDisciplineScore * 0.2",
    );
    expect(launchCritical.governance).not.toContain("md:grid-cols-5");
    expect(launchCritical.governance).toContain("sm:grid-cols-2 xl:grid-cols-5");
    expect(launchCritical.pipeline).not.toContain("min-w-[640px]");
    expect(launchCritical.rfqNew).toContain("sm:grid-cols-2 xl:grid-cols-5");
  });
});

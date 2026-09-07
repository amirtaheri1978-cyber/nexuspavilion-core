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
  analytics: readSource("src/app/analytics/page.tsx"),
  rfqList: readSource("src/app/rfq/page.tsx"),
  rfqNew: readSource("src/app/rfq/new/page.tsx"),
  rfqDraftAutosave: readSource("src/hooks/use-rfq-draft-autosave.ts"),
  rfqCompare: readSource("src/app/rfq/[slug]/compare/page.tsx"),
  rfqSubmit: readSource("src/components/rfq-workspace/rfq-submit-workspace.tsx"),
  supplierCommand: readSource(
    "src/components/vendor-workspace/supplier-command-center.tsx",
  ),
  supplierPipeline: readSource(
    "src/components/vendor-workspace/supplier-opportunity-pipeline.tsx",
  ),
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
  launchCritical.actionCard,
  launchCritical.enrollmentState,
];

describe("NP-MASTER-22-B05 launch-critical closeout", () => {
  it("removes launch-critical orange CTAs", () => {
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
    expect(launchCritical.directory).toContain('aria-label="Search company network"');
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

  it("keeps canonical RFQ scoring delegation and avoids squeezed tablet grids", () => {
    expect(launchCritical.rfqCompare).toContain(
      "buildCommercialIntelligence({",
    );
    expect(launchCritical.rfqCompare).not.toContain(
      "priceScore * 0.6 + validityScore * 0.2 + budgetDisciplineScore * 0.2",
    );
    expect(launchCritical.governance).not.toContain("md:grid-cols-5");
    expect(launchCritical.governance).toContain("sm:grid-cols-2 xl:grid-cols-5");
    expect(launchCritical.pipeline).not.toContain("min-w-[640px]");
    expect(launchCritical.rfqNew).toContain("sm:grid-cols-2 xl:grid-cols-5");
  });

  it("keeps frozen launch-critical typography hierarchy on Task 13-01 surfaces", () => {
    expect(launchCritical.analytics).toContain("np-type-eyebrow");
    expect(launchCritical.analytics).toContain("np-type-h1");
    expect(launchCritical.analytics).toContain("np-type-h2");
    expect(launchCritical.analytics).toContain("np-type-body");
    expect(launchCritical.analytics).toContain("np-type-meta");
    expect(launchCritical.analytics).toContain("np-type-kpi");

    expect(launchCritical.company).toContain("np-type-eyebrow");
    expect(launchCritical.company).toContain("np-type-h1");
    expect(launchCritical.company).toContain("np-type-body");
    expect(launchCritical.company).toContain("np-type-meta");
    expect(launchCritical.company).toContain("np-type-kpi");

    expect(launchCritical.rfqList).toContain("np-type-eyebrow");
    expect(launchCritical.rfqList).toContain("np-type-h1");
    expect(launchCritical.rfqList).toContain("np-type-h2");
    expect(launchCritical.rfqList).toContain("np-type-h3");
    expect(launchCritical.rfqList).toContain("np-type-body");
    expect(launchCritical.rfqList).toContain("np-type-meta");
    expect(launchCritical.rfqList).toContain("np-type-kpi");

    expect(launchCritical.rfqNew).toContain("np-type-eyebrow");
    expect(launchCritical.rfqNew).toContain("np-type-h1");
    expect(launchCritical.rfqNew).toContain("np-type-h2");
    expect(launchCritical.rfqNew).toContain("np-type-h3");
    expect(launchCritical.rfqNew).toContain("np-type-body");
    expect(launchCritical.rfqNew).toContain("np-type-meta");
    expect(launchCritical.rfqNew).toContain("np-type-kpi");

    expect(launchCritical.supplierCommand).toContain("np-type-eyebrow");
    expect(launchCritical.supplierCommand).toContain("np-type-h1");
    expect(launchCritical.supplierCommand).toContain("np-type-h2");
    expect(launchCritical.supplierCommand).toContain("np-type-body");
    expect(launchCritical.supplierCommand).toContain("np-type-meta");
    expect(launchCritical.supplierCommand).toContain("np-type-kpi");

    expect(launchCritical.supplierPipeline).toContain("np-type-h2");
    expect(launchCritical.supplierPipeline).toContain("np-type-h3");
    expect(launchCritical.supplierPipeline).toContain("np-type-body");
    expect(launchCritical.supplierPipeline).toContain("np-type-meta");
    expect(launchCritical.supplierPipeline).toContain("np-type-kpi");

    expect(launchCritical.settingsForm).toContain("np-type-meta");

    expect(launchCritical.rfqList).not.toContain("xl:text-[64px]");
    expect(launchCritical.rfqNew).not.toContain("xl:text-[64px]");
    expect(launchCritical.supplierCommand).not.toContain("lg:text-6xl");
  });

  it("keeps Task 13-01 semantic accent colors authoritative over np-type-* defaults", () => {
    expect(launchCritical.analytics).toContain("text-red-300!");
    expect(launchCritical.analytics).toContain("text-emerald-300!");
    expect(launchCritical.analytics).toContain("text-[#9BE8F8]!");
    expect(launchCritical.analytics).toContain("text-amber-300!");

    expect(launchCritical.rfqNew).toContain("text-[#F5D77B]!");
    expect(launchCritical.rfqNew).toContain(
      'np-type-h3 text-center text-white!',
    );

    expect(launchCritical.supplierCommand).toContain("text-cyan-300!");
    expect(launchCritical.supplierCommand).toContain("text-nexus-gold!");
    expect(launchCritical.supplierCommand).toContain("text-nexus-white!");

    expect(launchCritical.supplierPipeline).toContain("text-cyan-300!");
    expect(launchCritical.supplierPipeline).toContain("text-nexus-gold!");
    expect(launchCritical.supplierPipeline).toContain("text-emerald-300!");
  });

  it("keeps RFQ draft autosave hydration-safe and draftValue memoized", () => {
    expect(launchCritical.rfqDraftAutosave).toContain(
      "const [hasStoredDraft, setHasStoredDraft] = useState(false);",
    );
    expect(launchCritical.rfqDraftAutosave).toContain(
      "setHasStoredDraft(readHasStoredDraft(storageKey));",
    );
    expect(launchCritical.rfqDraftAutosave).toMatch(/useEffect\(\(\) => \{/);
    expect(launchCritical.rfqDraftAutosave).toContain("}, [storageKey]);");
    expect(launchCritical.rfqDraftAutosave).not.toMatch(
      /useState\(\(\)\s*=>\s*readHasStoredDraft\(storageKey\)/,
    );
    expect(launchCritical.rfqDraftAutosave).not.toContain(
      "useState(() =>\nreadHasStoredDraft(storageKey)",
    );

    expect(launchCritical.rfqNew).toContain("const draftValue = useMemo(");
    expect(launchCritical.rfqNew).toContain("[activeStep, formData],");
    expect(launchCritical.rfqNew).toContain("value: draftValue,");
    expect(launchCritical.rfqNew).not.toContain("value: {\nactiveStep,\nformData,\n},");
  });
});

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
  analyticsSource: readSource(
    "src/lib/analytics/source-data/load-analytics-source-data.ts",
  ),
  vendorDashboard: readSource("src/app/vendor-dashboard/page.tsx"),
  marketplaceViewModel: readSource(
    "src/lib/procurement/marketplace-view-model.ts",
  ),
  supplierScorecard: readSource(
    "src/components/vendor-workspace/supplier-scorecard.tsx",
  ),
  rfqList: readSource("src/app/rfq/page.tsx"),
  rfqNew: readSource("src/app/rfq/new/page.tsx"),
  rfqDraftAutosave: readSource("src/hooks/use-rfq-draft-autosave.ts"),
  rfqCompare: readSource("src/app/rfq/[slug]/compare/page.tsx"),
  rfqQuoteWorkspace: readSource(
    "src/components/rfq-workspace/rfq-quote-workspace.tsx",
  ),
  rfqSupplierQuotes: readSource(
    "src/components/rfq-workspace/rfq-supplier-quotes.tsx",
  ),
  rfqQuoteComparison: readSource(
    "src/components/rfq-workspace/rfq-quote-comparison.tsx",
  ),
  rfqSubmitPage: readSource("src/app/rfq/[slug]/submit/page.tsx"),
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
  logoUpload: readSource("src/components/company-logo-upload.tsx"),
  memberActions: readSource("src/components/member-actions.tsx"),
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
    expect(launchCritical.logoUpload).toContain('htmlFor="company-logo-upload"');
    expect(launchCritical.logoUpload).toContain('id="company-logo-upload"');
    expect(launchCritical.logoUpload).toContain("Upload company logo");
    expect(launchCritical.memberActions).toContain(
      'aria-label={`Access Level for ${formatMemberRemovalSubject(',
    );
    expect(launchCritical.rfqNew).toContain('aria-current={activeStep === index ? "step" : undefined}');
    expect(launchCritical.rfqNew).toMatch(
      /type="button"\s+disabled=\{loading\}\s+aria-pressed=\{selected\}/,
    );
    expect(launchCritical.rfqNew).toMatch(
      /type="button"\s+aria-pressed=\{checked\}\s+onClick=\{onChange\}/,
    );
    expect(launchCritical.rfqNew).toContain("EXECUTIVE_FOCUS_CYAN");
    expect(launchCritical.rfqNew).not.toContain("onKeyDown=");
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

  it("keeps canonical supplier and generic quote terminology on launch-critical surfaces", () => {
    expect(launchCritical.marketplaceViewModel).toContain("Open Opportunities");
    expect(launchCritical.marketplaceViewModel).toContain("My Quotes");
    expect(launchCritical.vendorDashboard).toContain("Submitted Quote Value");
    expect(launchCritical.vendorDashboard).toContain("Average Submitted Quote");
    expect(launchCritical.rfqNew).toContain("Evaluation Model");
    expect(launchCritical.rfqNew).not.toContain("Bidding Model");
    expect(launchCritical.supplierScorecard).toContain("Open Opportunities");
    expect(launchCritical.supplierScorecard).toContain("Submitted Quote Value");
    expect(launchCritical.rfqSubmit).toContain("Commercial note");
    expect(launchCritical.rfqSubmit).not.toContain("Proposal note");
    expect(launchCritical.rfqSupplierQuotes).toContain("Quote validity");
    expect(launchCritical.rfqSupplierQuotes).toContain("Commercial note");
    expect(launchCritical.rfqQuoteComparison).toContain("Lowest quote");
    expect(launchCritical.rfqQuoteComparison).toContain("Highest quote");
    expect(launchCritical.rfqQuoteComparison).not.toContain("Lowest bid");
    expect(launchCritical.rfqCompare).toContain("Submitted quote set");
    expect(launchCritical.rfqCompare).toContain("Blind bidding active");
    expect(launchCritical.rfqCompare).not.toContain('label="Recommended bid"');
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

  it("keeps truthful RFQ quote empty-state and locked-submission presentation", () => {
    expect(launchCritical.rfqCompare).not.toContain(
      "Submit supplier quotes to activate procurement intelligence.",
    );
    expect(launchCritical.rfqCompare).toContain("Insufficient Data");
    expect(launchCritical.rfqCompare).toContain("No quotes");
    expect(launchCritical.rfqCompare).toContain(
      "No supplier quotations are available for comparison yet. Review RFQ participation and sourcing status.",
    );
    expect(launchCritical.rfqCompare).toContain(
      'commercialEvaluationUnlocked && recommendedQuote\n                ? formatMoney(Math.max(potentialSavings, 0))\n                : insufficientComparisonLabel',
    );

    expect(launchCritical.rfqQuoteWorkspace).toContain(
      "No supplier quote submissions have been received yet. Commercial pricing and ranking will remain protected until the RFQ deadline.",
    );
    expect(launchCritical.rfqQuoteWorkspace).toContain(
      "Supplier quote submissions have been received, but commercial pricing and quote comparison remain protected until the authorized commercial opening stage.",
    );
    expect(launchCritical.rfqQuoteWorkspace).toContain(
      "receivedSubmissionCount > 0",
    );
  });

  it("keeps P0 fail-closed error states for critical decision and membership surfaces", () => {
    expect(launchCritical.dashboard).toContain("rfqResult.error");
    expect(launchCritical.dashboard).toContain("quotesError");
    expect(launchCritical.dashboard).toContain(
      'throw new Error("Unable to load company procurement portfolio.")',
    );

    expect(launchCritical.analyticsSource).toContain("rfqError");
    expect(launchCritical.analyticsSource).toContain("quotesError");
    expect(launchCritical.analyticsSource).toContain("companiesError");
    expect(launchCritical.analyticsSource).toContain(
      'throw new Error("Unable to load analytics RFQ source data.")',
    );

    expect(launchCritical.vendorDashboard).toContain("profileError");
    expect(launchCritical.vendorDashboard).toContain(
      'throw new Error("Unable to load supplier workspace profile.")',
    );
    expect(launchCritical.vendorDashboard).toContain("quotesError");
    expect(launchCritical.vendorDashboard).toContain("rfqsError");
    expect(launchCritical.vendorDashboard).toContain(
      'throw new Error("Unable to load supplier quotation history.")',
    );

    expect(launchCritical.notifications).toContain("authError");
    expect(launchCritical.notifications).toContain(
      'throw new Error("Unable to verify Activity Center identity.")',
    );
    expect(launchCritical.notifications).toMatch(
      /if \(authError\)[\s\S]*throw new Error\("Unable to verify Activity Center identity\."\)[\s\S]*if \(!user\)[\s\S]*redirect\("\/login"\)/,
    );
    expect(launchCritical.notifications).toContain("profileError");
    expect(launchCritical.notifications).toContain(
      'throw new Error("Unable to load company activity profile.")',
    );
    expect(launchCritical.notifications).toContain("notificationsError");
    expect(launchCritical.notifications).toContain(
      'throw new Error("Unable to load company activity.")',
    );
    expect(launchCritical.notifications).toMatch(
      /if \(profileError\)[\s\S]*throw new Error\("Unable to load company activity profile\."\)[\s\S]*if \(!profile\?\.company_id\)[\s\S]*redirect\("\/create-company"\)/,
    );

    expect(launchCritical.directory).toContain("loadError");
    expect(launchCritical.directory).toContain("quotesError");
    expect(launchCritical.directory).toContain("approvedVendorError");
    expect(launchCritical.directory).toContain(
      "Company Network ranking quote load failed.",
    );
    expect(launchCritical.directory).toContain(
      "Company Network approved vendor load failed.",
    );
    expect(launchCritical.directory).toContain("Company network unavailable");
    expect(launchCritical.directory).toContain(
      "We couldn't load the company network. Please try again.",
    );
    expect(launchCritical.directory).toContain("!loading && !loadError");
    expect(launchCritical.directory).toContain(
      "else if (quotesError)",
    );
    expect(launchCritical.directory).toContain(
      "approvedVendorQueryRequired && approvedVendorError",
    );

    expect(launchCritical.rfqSubmitPage).toContain("if (profileError)");
    expect(launchCritical.rfqSubmitPage).toContain(
      'throw new Error("Unable to verify company workspace.")',
    );
    expect(launchCritical.rfqSubmitPage).toContain("if (rfqError)");
    expect(launchCritical.rfqSubmitPage).toContain(
      'throw new Error("Unable to verify RFQ access.")',
    );
    expect(launchCritical.rfqSubmitPage).toContain("if (accessError)");
    expect(launchCritical.rfqSubmitPage).toContain(
      "<RfqSubmitWorkspace slug={slug} initialRfq={rfq} />",
    );
    expect(launchCritical.rfqSubmit).toContain("const rfq = initialRfq;");
    expect(launchCritical.rfqSubmit).toContain(
      "const submissionClosed = isSubmissionClosed(rfq);",
    );
    expect(launchCritical.rfqSubmit).toContain(
      "disabled={loading || submissionClosed}",
    );
    expect(launchCritical.rfqSubmit).not.toContain("rfqStatusError");
    expect(launchCritical.rfqSubmit).not.toContain("rfqLoading");

    expect(launchCritical.inviteForm).toContain(
      "We couldn't send the workspace invitation. Please try again.",
    );
    expect(launchCritical.inviteForm).not.toContain(
      "Request failed: ${requestError.message}",
    );
    expect(launchCritical.inviteForm).not.toContain("rawText.slice");
    expect(launchCritical.inviteForm).toContain("workspace invitation");
    expect(launchCritical.inviteForm).toContain(
      "Workspace membership is separate from RFQ invitations",
    );
  });

  it("keeps P1 fail-closed company workspace governance error states", () => {
    expect(launchCritical.company).toContain("organizationMembersResult.error");
    expect(launchCritical.company).toContain("invitationsResult.error");
    expect(launchCritical.company).toContain("auditResult.error");
    expect(launchCritical.company).toContain(
      "Workspace membership could not be loaded.",
    );
    expect(launchCritical.company).toContain(
      "Workspace invitations could not be loaded.",
    );
    expect(launchCritical.company).toContain(
      "Workspace activity could not be loaded.",
    );
    expect(launchCritical.company).toMatch(
      /if \(organizationMembersResult\.error\)[\s\S]*return \([\s\S]*SystemState/,
    );
    expect(launchCritical.company).toMatch(
      /if \(invitationsResult\.error\)[\s\S]*return \([\s\S]*SystemState/,
    );
    expect(launchCritical.company).toMatch(
      /if \(auditResult\.error\)[\s\S]*return \([\s\S]*SystemState/,
    );
    expect(launchCritical.company).toContain("loadCompanyCapabilities");
    expect(launchCritical.company).toContain(
      "Company capabilities lookup failed.",
    );
    expect(launchCritical.company).toContain(
      "createEmptyGroupedCapabilities()",
    );

    expect(launchCritical.settings).toContain("authError");
    expect(launchCritical.settings).toContain(
      'throw new Error("Unable to verify company settings identity.")',
    );
    expect(launchCritical.settings).toMatch(
      /if \(authError\)[\s\S]*throw new Error\("Unable to verify company settings identity\."\)[\s\S]*if \(!user\)[\s\S]*WorkspaceUnavailable/,
    );
    expect(launchCritical.settings).toContain("profileError");
    expect(launchCritical.settings).toContain(
      'throw new Error("Unable to load company settings profile.")',
    );
    expect(launchCritical.settings).toMatch(
      /if \(profileError\)[\s\S]*throw new Error\("Unable to load company settings profile\."\)[\s\S]*if \(!currentProfile\?\.company_id\)[\s\S]*WorkspaceUnavailable/,
    );
    expect(launchCritical.settings).toContain("companyError");
    expect(launchCritical.settings).toContain(
      'throw new Error("Unable to load company workspace settings.")',
    );
    expect(launchCritical.settings).toMatch(
      /\.from\("companies"\)[\s\S]*\.maybeSingle\(\)[\s\S]*if \(companyError\)[\s\S]*throw new Error\("Unable to load company workspace settings\."\)[\s\S]*if \(!company\)[\s\S]*CompanyNotFound/,
    );
    expect(launchCritical.settings).not.toMatch(
      /\.from\("companies"\)[\s\S]*\.single\(\)[\s\S]*if \(companyError\)/,
    );
    expect(launchCritical.settings).toContain("organizationMembersError");
    expect(launchCritical.settings).toContain(
      'throw new Error("Unable to load company workspace membership.")',
    );
    expect(launchCritical.settings).toContain("invitationsError");
    expect(launchCritical.settings).toContain(
      'throw new Error("Unable to load company workspace invitations.")',
    );
    expect(launchCritical.settings).toContain("auditLogsError");
    expect(launchCritical.settings).toContain(
      'throw new Error("Unable to load company workspace activity.")',
    );
    expect(launchCritical.settings).toContain("pendingTransferError");
    expect(launchCritical.settings).toContain(
      'throw new Error("Unable to load company ownership transfer status.")',
    );
    expect(launchCritical.settings).toContain("rfqCountError");
    expect(launchCritical.settings).toContain(
      'throw new Error("Unable to load company workspace readiness evidence.")',
    );
    expect(launchCritical.settings).toContain(
      'throw new Error("Unable to verify company workspace management authority.")',
    );
    expect(launchCritical.settings).toMatch(
      /error\.code === "UNAUTHENTICATED"[\s\S]*WorkspaceUnavailable[\s\S]*throw new Error\("Unable to verify company workspace management authority\."\)/,
    );
    expect(launchCritical.settings).toContain(
      "Workspace Access",
    );
    expect(launchCritical.settings).toContain(
      'supabase.rpc("get_company_workspace_invitations")',
    );
    expect(launchCritical.inviteForm).toContain(
      "Workspace membership is separate from RFQ invitations",
    );
  });

  it("keeps Task 13-05 public Procurement Portfolio responsive containment", () => {
    const source = launchCritical.publicCompany;

    expect(source).toContain(
      'className="flex flex-col items-start gap-6 sm:flex-row sm:justify-between"',
    );
    expect(source).not.toContain(
      'className="flex items-start justify-between gap-6"',
    );
    expect(source).toContain('className="min-w-0 flex-1"');
    expect(source).toContain(
      'className="mt-3 break-words text-2xl font-black text-white"',
    );

    expect(source).toContain(
      'className="max-w-full break-words rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 text-xs font-black text-slate-300"',
    );
    expect(source).not.toContain("whitespace-nowrap");

    expect(source).toContain(
      'className="flex flex-col items-start gap-5 sm:flex-row sm:justify-between"',
    );
    expect(source).not.toContain(
      'className="flex items-start justify-between gap-5"',
    );
    expect(source).toContain('className="min-w-0"');
    expect(source).toContain(
      'className="break-words text-lg font-black text-white"',
    );

    expect(source).toContain("CompanyQualificationsDisplay");
  });
});

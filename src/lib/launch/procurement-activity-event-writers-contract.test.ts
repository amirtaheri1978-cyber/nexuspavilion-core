import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const migration = readSource(
  "supabase/migrations/20260835000000_expand_procurement_activity_event_writers.sql",
);
const fanoutMigration = readSource(
  "supabase/migrations/20260836000000_deliver_addendum_respondent_activity.sql",
);
const helper = readSource(
  "src/lib/procurement/record-procurement-activity.ts",
);
const invitesRoute = readSource("src/app/api/invites/route.ts");
const rfiRoute = readSource("src/app/api/rfq-rfis/route.ts");
const addendaRoute = readSource("src/app/api/rfq-addenda/route.ts");
const acknowledgementRoute = readSource(
  "src/app/api/rfq-addendum-acknowledgements/route.ts",
);
const quotesRoute = readSource("src/app/api/quotes/route.ts");
const awardRoute = readSource("src/app/api/award-contract/route.ts");
const notificationsPage = readSource("src/app/notifications/page.tsx");
const activityPrioritization = readSource(
  "src/lib/procurement/activity-center-prioritization.ts",
);
const companyInvitationsRoute = readSource(
  "src/app/api/company-invitations/route.ts",
);

const functionBody = migration.slice(
  migration.indexOf("create or replace function public.record_procurement_activity"),
  migration.indexOf(
    "comment on function public.record_procurement_activity",
  ),
);

const fanoutFunctionBody = fanoutMigration.slice(
  fanoutMigration.indexOf(
    "create or replace function public.record_procurement_activity",
  ),
  fanoutMigration.indexOf(
    "comment on function public.record_procurement_activity",
  ),
);

const addendumPublishedBranch = fanoutFunctionBody.slice(
  fanoutFunctionBody.indexOf("-- addendum_published"),
  fanoutFunctionBody.indexOf("-- addendum_acknowledged"),
);

describe("Cursor 05B procurement activity event writers", () => {
  it("extends the helper union with five new activity kinds", () => {
    expect(helper).toContain('"rfq_invitation_sent"');
    expect(helper).toContain('"rfi_submitted"');
    expect(helper).toContain('"rfi_responded"');
    expect(helper).toContain('"addendum_published"');
    expect(helper).toContain('"addendum_acknowledged"');
    expect(helper).toContain('"rfq_created"');
    expect(helper).toContain('"quote_submitted"');
  });

  it("routes RFQ invitations through the trusted activity helper only", () => {
    expect(invitesRoute).toContain("recordTrustedProcurementActivity");
    expect(invitesRoute).toContain('"rfq_invitation_sent"');
    expect(invitesRoute).not.toContain('.from("audit_logs")');
    expect(invitesRoute).not.toContain('.from("notifications")');
    expect(invitesRoute).toContain("existingInvite");
    expect(invitesRoute).toContain(
      "Supplier has already been invited to this RFQ.",
    );

    const existingInviteBlock = invitesRoute.slice(
      invitesRoute.indexOf("if (existingInvite)"),
      invitesRoute.indexOf("const token = generateToken()"),
    );
    expect(existingInviteBlock).not.toContain(
      "recordTrustedProcurementActivity",
    );
  });

  it("records RFI submit and respond activity with the correct kinds", () => {
    expect(rfiRoute).toContain("recordTrustedProcurementActivity");
    expect(rfiRoute).toContain('"rfi_submitted"');
    expect(rfiRoute).toContain('"rfi_responded"');
    expect(rfiRoute).not.toContain('.from("notifications")');
    expect(rfiRoute).not.toContain('.from("audit_logs")');
  });

  it("records addendum publish and new acknowledgement activity only", () => {
    expect(addendaRoute).toContain("recordTrustedProcurementActivity");
    expect(addendaRoute).toContain('"addendum_published"');
    expect(acknowledgementRoute).toContain("recordTrustedProcurementActivity");
    expect(acknowledgementRoute).toContain('"addendum_acknowledged"');

    const activityCallSites = (
      acknowledgementRoute.match(
        /await recordTrustedProcurementActivity\(/g,
      ) || []
    ).length;
    expect(activityCallSites).toBe(1);

    const newAckBlock = acknowledgementRoute.slice(
      acknowledgementRoute.indexOf("if (!error && data)"),
      acknowledgementRoute.indexOf("if (isUniqueViolation(error))"),
    );
    expect(newAckBlock).toContain("recordTrustedProcurementActivity");
    expect(newAckBlock).toContain('"addendum_acknowledged"');
    expect(newAckBlock).toContain("idempotent: false");

    const idempotentBlock = acknowledgementRoute.slice(
      acknowledgementRoute.indexOf("if (isUniqueViolation(error))"),
    );
    expect(idempotentBlock).toContain("idempotent: true");
    expect(idempotentBlock).not.toContain("recordTrustedProcurementActivity");
  });

  it("keeps the migration as a trusted SECURITY DEFINER writer", () => {
    expect(functionBody).toContain("security definer");
    expect(functionBody).toContain("set search_path = ''");
    expect(functionBody).toContain("actor_user_id uuid := auth.uid()");
    expect(functionBody).toContain("'rfq_invitation_sent'");
    expect(functionBody).toContain("'rfi_submitted'");
    expect(functionBody).toContain("'rfi_responded'");
    expect(functionBody).toContain("'addendum_published'");
    expect(functionBody).toContain("'addendum_acknowledged'");
    expect(functionBody).toContain("'RFQ_INVITATION_SENT'");
    expect(functionBody).toContain("'RFI_SUBMITTED'");
    expect(functionBody).toContain("'RFI_RESPONDED'");
    expect(functionBody).toContain("'ADDENDUM_PUBLISHED'");
    expect(functionBody).toContain("'ADDENDUM_ACKNOWLEDGED'");
    expect(functionBody).toContain("'invitation'");
    expect(functionBody).toContain("'rfi'");
    expect(functionBody).toContain("'rfi_response'");
    expect(functionBody).toContain("'addendum'");
    expect(functionBody).toContain("'addendum_acknowledgement'");
    expect(functionBody).toContain("buyer_company_id");
    expect(migration).not.toMatch(
      /grant\s+insert\s+on\s+table\s+public\.(notifications|audit_logs)/i,
    );
    expect(migration).not.toContain(
      'create policy "Company members can create company notifications"',
    );
    expect(migration).not.toContain(
      'create policy "Company members can create company audit logs"',
    );
  });

  it("counts invitation type and invitation tone for Activity Center", () => {
    expect(notificationsPage).toContain("isInvitationNotification");
    expect(notificationsPage).toContain('value.includes("invitation")');
    expect(notificationsPage).toContain('value.includes("invite")');
    expect(notificationsPage).toContain(
      "isInvitationNotification(notification.type)",
    );
  });

  it("preserves quote buyer-only audience and award flow unchanged", () => {
    expect(quotesRoute).toContain('"quote_submitted"');
    expect(quotesRoute).toContain("recordTrustedProcurementActivity");
    expect(functionBody).toContain("buyer_company_id");
    expect(functionBody).toContain(
      "'quote',\n      false,\n      buyer_company_id",
    );
    expect(awardRoute).toContain('"award_rfq_quote"');
    expect(awardRoute).not.toContain("recordTrustedProcurementActivity");
    expect(migration).not.toContain("award_rfq_quote");
    expect(migration).not.toContain("record_rfq_award_workspace_activity");
  });

  it("leaves workspace invitation flows untouched", () => {
    expect(companyInvitationsRoute).not.toContain(
      "recordTrustedProcurementActivity",
    );
    expect(migration).not.toContain("accept_organization_invitation");
    expect(migration).not.toContain("company-invitations");
  });
});

describe("Cursor 05G R-43 addendum respondent activity fanout", () => {
  it("fans out from S1 quotes, S2 rfq_rfis, and S3 acknowledgements only", () => {
    expect(addendumPublishedBranch).toContain("from public.quotes q");
    expect(addendumPublishedBranch).toContain("q.company_id");
    expect(addendumPublishedBranch).toContain(
      "where q.rfq_id = addendum_row.rfq_id",
    );
    expect(addendumPublishedBranch).toContain("from public.rfq_rfis rfi");
    expect(addendumPublishedBranch).toContain("rfi.respondent_company_id");
    expect(addendumPublishedBranch).toContain(
      "where rfi.rfq_id = addendum_row.rfq_id",
    );
    expect(addendumPublishedBranch).toContain(
      "from public.rfq_addendum_acknowledgements ack",
    );
    expect(addendumPublishedBranch).toContain("ack.company_id");
    expect(addendumPublishedBranch).toContain(
      "where ack.rfq_id = addendum_row.rfq_id",
    );
    expect(addendumPublishedBranch).toContain(
      "select distinct established.company_id",
    );
    expect(addendumPublishedBranch).toContain(
      "and q.company_id <> issuer_company_id",
    );
    expect(addendumPublishedBranch).toContain(
      "and rfi.respondent_company_id <> issuer_company_id",
    );
    expect(addendumPublishedBranch).toContain(
      "and ack.company_id <> issuer_company_id",
    );
  });

  it("does not use invitation email bridges or open-market broadcast", () => {
    const fanoutLoop = addendumPublishedBranch.slice(
      addendumPublishedBranch.indexOf("for respondent_company_id in"),
    );

    expect(fanoutLoop).not.toContain("profiles.company_id");
    expect(fanoutLoop).not.toContain("from public.profiles");
    expect(fanoutLoop).not.toContain("from public.rfq_invites");
    expect(fanoutLoop).not.toContain("from public.organization_memberships");
    expect(fanoutLoop).not.toContain("network_role");
    expect(fanoutLoop).not.toContain("from public.companies");
    expect(addendumPublishedBranch).not.toContain("profiles.company_id");
    expect(addendumPublishedBranch).not.toContain("from public.rfq_invites");
  });

  it("classifies required open Addenda as addendum_action_required", () => {
    expect(addendumPublishedBranch).toContain(
      "addendum_row.requires_acknowledgement = true",
    );
    expect(addendumPublishedBranch).toContain("rfq_row.status = 'open'");
    expect(addendumPublishedBranch).toContain(
      "notification_type := 'addendum_action_required'",
    );
    expect(addendumPublishedBranch).toContain(
      "'Addendum Acknowledgement Required'",
    );
    expect(addendumPublishedBranch).toContain(
      "Acknowledgement is required before quote submission.",
    );
    expect(addendumPublishedBranch).not.toContain("deadline");
    expect(addendumPublishedBranch).not.toContain("urgent");
  });

  it("uses informational addendum type when acknowledgement is not required or RFQ is not open", () => {
    expect(addendumPublishedBranch).toContain(
      "notification_type := 'addendum'",
    );
    expect(addendumPublishedBranch).toContain("'Addendum Published'");

    const fanoutTypeBlock = addendumPublishedBranch.slice(
      addendumPublishedBranch.indexOf(
        "if addendum_row.requires_acknowledgement = true",
      ),
      addendumPublishedBranch.lastIndexOf("insert into public.notifications ("),
    );
    expect(fanoutTypeBlock).toContain(
      "notification_type := 'addendum_action_required'",
    );
    expect(fanoutTypeBlock).toContain("else");
    expect(fanoutTypeBlock).toContain("notification_type := 'addendum'");
  });

  it("preserves issuer publish behavior and early ADDENDUM_PUBLISHED idempotency", () => {
    expect(addendumPublishedBranch).toContain(
      "audit_action := 'ADDENDUM_PUBLISHED'",
    );
    expect(addendumPublishedBranch).toContain(
      "notification_company_id := issuer_company_id",
    );
    expect(addendumPublishedBranch).toContain(
      "notification_type := 'addendum'",
    );
    expect(addendumPublishedBranch).toContain("'idempotent', true");
    expect(
      addendumPublishedBranch.indexOf("if existing_audit_id is not null"),
    ).toBeLessThan(
      addendumPublishedBranch.indexOf("for respondent_company_id in"),
    );
    expect(
      addendumPublishedBranch.indexOf("insert into public.audit_logs"),
    ).toBeLessThan(
      addendumPublishedBranch.indexOf("for respondent_company_id in"),
    );
  });

  it("does not add per-recipient audit actions or new activity kinds", () => {
    expect(fanoutMigration).not.toContain("ADDENDUM_RESPONDENT_NOTIFIED");
    expect(fanoutFunctionBody).toMatch(
      /activity_kind not in \(\s*'rfq_created',\s*'quote_submitted',\s*'rfq_invitation_sent',\s*'rfi_submitted',\s*'rfi_responded',\s*'addendum_published',\s*'addendum_acknowledged'\s*\)/,
    );
    expect(helper).not.toContain("addendum_action_required");
    expect(fanoutFunctionBody).not.toMatch(
      /activity_kind not in \([^)]*'addendum_action_required'/,
    );
  });

  it("keeps trusted writer privileges without restoring client INSERT", () => {
    expect(fanoutFunctionBody).toContain("security definer");
    expect(fanoutFunctionBody).toContain("set search_path = ''");
    expect(fanoutFunctionBody).toContain("actor_user_id uuid := auth.uid()");
    expect(fanoutMigration).toContain(
      "grant execute\non function public.record_procurement_activity(text, uuid)\nto authenticated;",
    );
    expect(fanoutMigration).toContain(
      "revoke all\non function public.record_procurement_activity(text, uuid)\nfrom anon;",
    );
    expect(fanoutMigration).not.toMatch(
      /grant\s+insert\s+on\s+table\s+public\.(notifications|audit_logs)/i,
    );
    expect(fanoutMigration).not.toContain(
      'create policy "Company members can create company notifications"',
    );
    expect(fanoutMigration).not.toContain(
      'create policy "Company members can create company audit logs"',
    );
  });
});

const sidebarStatsRoute = readSource("src/app/api/sidebar-stats/route.ts");
const sidebarSource = readSource("src/components/sidebar.tsx");
const applicationNavSource = readSource(
  "src/lib/navigation/application-nav.ts",
);
const dashboardPage = readSource("src/app/dashboard/page.tsx");
const governanceWorkspace = readSource(
  "src/components/dashboard/governance-reference-workspace.tsx",
);

function extractStringSetMembers(source: string, constName: string) {
  const match = source.match(
    new RegExp(
      `const\\s+${constName}\\s*=\\s*new\\s+Set\\(\\[([\\s\\S]*?)\\]\\)`,
    ),
  );
  expect(match).not.toBeNull();
  const body = match?.[1] ?? "";
  return [...body.matchAll(/"([^"]+)"/g)].map((entry) => entry[1]);
}

function extractFunctionBody(source: string, functionName: string) {
  const start = source.indexOf(`function ${functionName}(`);
  expect(start).toBeGreaterThanOrEqual(0);
  const braceStart = source.indexOf("{", start);
  expect(braceStart).toBeGreaterThan(start);

  let depth = 0;
  for (let index = braceStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(braceStart, index + 1);
      }
    }
  }

  throw new Error(`Unable to extract function body for ${functionName}`);
}

function assertNoCaseInsensitiveUiTerm(source: string, term: string) {
  const withoutCompatibilityReadField = source.replace(/\bis_read\b/g, "");
  expect(withoutCompatibilityReadField).not.toMatch(
    new RegExp(`\\b${term}\\b`, "i"),
  );
}

describe("Phase 6 Activity Center launch information architecture", () => {
  const attentionTypes = extractStringSetMembers(
    activityPrioritization,
    "ATTENTION_TYPES",
  );
  const updateTypes = extractStringSetMembers(
    activityPrioritization,
    "UPDATE_TYPES",
  );
  const classifyBody = extractFunctionBody(
    activityPrioritization,
    "classifyActivityView",
  );
  const resolveViewBody = extractFunctionBody(
    notificationsPage,
    "resolveActivityView",
  );
  const eventToneBody = extractFunctionBody(notificationsPage, "getEventTone");
  const enterpriseLabelBody = extractFunctionBody(
    notificationsPage,
    "getEnterpriseEventLabel",
  );

  it("locks the exact Needs Attention taxonomy", () => {
    expect(attentionTypes).toEqual([
      "quote",
      "rfi",
      "rfi_response",
      "addendum_action_required",
    ]);

    for (const forbidden of [
      "award",
      "rfq",
      "invitation",
      "addendum",
      "addendum_acknowledgement",
      "company",
      "approved_vendor",
      "supplier_compliance",
    ]) {
      expect(attentionTypes).not.toContain(forbidden);
    }
  });

  it("locks the exact Updates taxonomy with award included", () => {
    expect(updateTypes).toEqual([
      "rfq",
      "invitation",
      "addendum",
      "addendum_acknowledgement",
      "award",
      "company",
      "approved_vendor",
      "supplier_compliance",
    ]);
    expect(updateTypes).toContain("award");
    expect(updateTypes).not.toContain("addendum_action_required");
  });

  it("classifies known types and falls unknown types into History", () => {
    expect(classifyBody).toContain("ATTENTION_TYPES.has(value)");
    expect(classifyBody).toContain('return "attention"');
    expect(classifyBody).toContain("UPDATE_TYPES.has(value)");
    expect(classifyBody).toContain('return "updates"');
    expect(classifyBody).toContain('return "history"');

    expect(notificationsPage).toContain(
      'view === "attention"\n      ? attentionRows',
    );
    expect(notificationsPage).toContain(
      ': view === "updates"\n        ? updateRows\n        : notificationList',
    );
    expect(
      (notificationsPage.match(/\.from\("notifications"\)/g) || []).length,
    ).toBe(1);
  });

  it("keeps view query params presentation-only and company-scoped", () => {
    expect(resolveViewBody).toContain('if (raw === "updates") return "updates"');
    expect(resolveViewBody).toContain('if (raw === "history") return "history"');
    expect(resolveViewBody).toContain('return "attention"');

    expect(notificationsPage).toContain(
      '.eq("company_id", profile.company_id)',
    );
    expect(notificationsPage).toContain(
      "const view = resolveActivityView(params.view)",
    );

    for (const forbidden of [
      "params.company",
      "params.company_id",
      "params.companyId",
      "searchParams.company",
      "searchParams.company_id",
      "searchParams.companyId",
      'params["company"]',
      'params["company_id"]',
      'params["companyId"]',
      'searchParams["company"]',
      'searchParams["company_id"]',
      'searchParams["companyId"]',
    ]) {
      expect(notificationsPage).not.toContain(forbidden);
    }
  });

  it("does not render My Tasks or personal task derivation on Activity Center", () => {
    expect(notificationsPage).not.toContain("My Tasks");
    expect(notificationsPage).not.toContain("assigned_to");
    expect(notificationsPage).not.toContain("recipient_user_id");
    expect(notificationsPage).not.toContain("due_date");
    expect(notificationsPage).not.toContain("task_status");
    expect(notificationsPage).not.toContain("completed_at");
    expect(notificationsPage).not.toMatch(/\.completed\b/);
    expect(notificationsPage).not.toMatch(/\bcompleted\s*:/);
  });

  it("removes user-visible Unread semantics while allowing is_read compatibility select", () => {
    expect(notificationsPage).toContain(
      '"id, title, message, type, is_read, created_at, company_id, source_rfq_id"',
    );
    expect(notificationsPage).not.toContain("!notification.is_read");
    expect(notificationsPage).not.toContain("notification.is_read");
    assertNoCaseInsensitiveUiTerm(notificationsPage, "unread");
    assertNoCaseInsensitiveUiTerm(notificationsPage, "urgent");
    assertNoCaseInsensitiveUiTerm(notificationsPage, "overdue");
  });

  it("keeps launch metrics and removes old Unread/Awards/Invitations KPI cards", () => {
    expect(notificationsPage).toContain('label="Attention Signals"');
    expect(notificationsPage).toContain('label="Updates"');
    expect(notificationsPage).toContain('label="Total Activity"');
    expect(notificationsPage).not.toContain('title="Unread"');
    expect(notificationsPage).not.toContain('label="Unread"');
    expect(notificationsPage).not.toContain('title="Awards"');
    expect(notificationsPage).not.toContain('label="Awards"');
    expect(notificationsPage).not.toContain('title="Invitations"');
    expect(notificationsPage).not.toContain('label="Invitations"');
    assertNoCaseInsensitiveUiTerm(notificationsPage, "unread");
  });

  it("presents addendum_action_required as an Attention acknowledgement signal", () => {
    expect(attentionTypes).toContain("addendum_action_required");
    expect(enterpriseLabelBody).toContain(
      'if (value === "addendum_action_required")',
    );
    expect(enterpriseLabelBody).toContain(
      'return "Addendum Acknowledgement Required"',
    );
    expect(notificationsPage).toContain(
      'notification.type === "addendum_action_required"\n                    ? "Acknowledgement Required"',
    );
    expect(eventToneBody).toContain("classifyActivityView(type)");
    expect(eventToneBody).toContain('if (view === "attention") return "warning"');
    assertNoCaseInsensitiveUiTerm(notificationsPage, "urgent");
    assertNoCaseInsensitiveUiTerm(notificationsPage, "overdue");
  });

  it("keeps award in Updates with success tone only", () => {
    expect(updateTypes).toContain("award");
    expect(attentionTypes).not.toContain("award");
    expect(eventToneBody).toContain('if (value === "award") return "success"');
  });

  it("keeps one generic Procurement Center destination without notification-derived entity links", () => {
    expect(notificationsPage).toContain("Open Procurement Center");
    expect((notificationsPage.match(/href="\/rfq"/g) || []).length).toBe(1);
    expect(notificationsPage).not.toContain("href={`/rfq/${");
    expect(notificationsPage).not.toContain('href="/rfq/" +');
    expect(notificationsPage).not.toMatch(
      /href=\{[^}]*notification\.(title|message)/,
    );
    expect(notificationsPage).not.toMatch(
      /\/rfq\/\$\{[^}]*notification/,
    );
    expect(notificationsPage).toContain("{notification.title}");
    expect(notificationsPage).toContain("{notification.message}");
  });

  it("keeps sidebar-stats company-context compatible without notification reads", () => {
    expect(sidebarStatsRoute).toContain("getProcurementContext");
    expect(sidebarStatsRoute).not.toContain('.from("notifications")');
    expect(sidebarStatsRoute).toContain("unreadNotifications: 0");
    expect(sidebarStatsRoute).not.toContain("searchParams");
    expect(sidebarStatsRoute).not.toContain("request.url");
    expect(sidebarStatsRoute).not.toContain("companyId=");
    expect(sidebarStatsRoute).not.toContain("company_id=");
  });

  it("removes shell Activity unread badges while keeping unreadNotifications compatibility fields", () => {
    expect(applicationNavSource).toContain(
      "unreadNotifications: number;",
    );
    expect(applicationNavSource).toContain("unreadNotifications: 0");
    expect(applicationNavSource).not.toContain(
      "badge: formatCountBadge(stats.unreadNotifications)",
    );

    expect(sidebarSource).toContain(
      "unreadNotifications: Number(data.unreadNotifications || 0)",
    );
    expect(sidebarSource).not.toContain("stats.unreadNotifications > 0");
    expect(sidebarSource).not.toContain("{stats.unreadNotifications}");
  });

  it("removes dashboard and governance user-facing unread Activity counts", () => {
    expect(dashboardPage).not.toContain("unreadNotificationCount");
    expect(governanceWorkspace).not.toContain("unreadNotificationCount");
    assertNoCaseInsensitiveUiTerm(governanceWorkspace, "unread");
  });

  it("keeps Activity Center free of Workspace Invitation accept/action wiring", () => {
    expect(notificationsPage).not.toContain("company-invitations");
    expect(notificationsPage).not.toContain("accept_organization_invitation");
    expect(notificationsPage).not.toContain("/api/company-invitations");
  });
});

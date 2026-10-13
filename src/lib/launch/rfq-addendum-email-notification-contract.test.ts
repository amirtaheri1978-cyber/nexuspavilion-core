import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => undefined,
    set: () => undefined,
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/auth/membership", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/membership")>();

  return {
    ...actual,
    getActiveMembershipForUserCompany: vi.fn(),
  };
});

vi.mock("@/lib/email/send-email", () => ({
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/ops/public-site-url", () => ({
  getPublicSiteUrl: () => "https://example.test",
  joinPublicSitePath: (path: string) => `https://example.test${path}`,
}));

import { PATCH } from "@/app/api/rfq-addenda/route";
import { getActiveMembershipForUserCompany } from "@/lib/auth/membership";
import { sendEmail } from "@/lib/email/send-email";
import { createClient } from "@/lib/supabase/server";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const addendaRoute = readSource("src/app/api/rfq-addenda/route.ts");
const addendumCommunication = readSource(
  "src/lib/procurement/rfq-addendum-communication.ts",
);
const documentRequirementsRoute = readSource(
  "src/app/api/rfq-document-requirements/route.ts",
);
const acknowledgementRoute = readSource(
  "src/app/api/rfq-addendum-acknowledgements/route.ts",
);
const quotesRoute = readSource("src/app/api/quotes/route.ts");
const activityFanoutMigration = readSource(
  "supabase/legacy-migrations/pre-baseline-v2/20260836000000_deliver_addendum_respondent_activity.sql",
);
const historicalNotificationMigration = readSource(
  "supabase/legacy-migrations/pre-baseline-v2/20260909050709_resolve_rfq_addendum_notification_recipients.sql",
);
const notificationMigration = readSource(
  "supabase/migrations/20260913093326_harden_deadline_locked_communications_audit.sql",
);
const retryAuthorityMigration = readSource(
  "supabase/migrations/20260914072604_authorize_issuer_addendum_recipient_retry.sql",
);

const USER_ID = "22222222-2222-4222-8222-222222222222";
const COMPANY_ID = "11111111-1111-4111-8111-111111111111";
const RFQ_ID = "33333333-3333-4333-8333-333333333333";
const ADDENDUM_ID = "44444444-4444-4444-8444-444444444444";
const RECIPIENT_EMAIL = "eligible@example.com";
const createClientMock = vi.mocked(createClient);
const membershipMock = vi.mocked(getActiveMembershipForUserCompany);
const sendEmailMock = vi.mocked(sendEmail);

describe("14-05 RFQ Addendum email notification contract", () => {
  it("wires Addendum email delivery after successful publication and activity", () => {
    expect(addendumCommunication).toContain('from "@/lib/email/send-email"');
    expect(addendumCommunication).toContain(
      'from "@/lib/email/templates/rfq-addendum-email"',
    );
    expect(addendumCommunication).toContain("buildRfqAddendumEmail({");
    expect(addendumCommunication).toContain(
      "joinPublicSitePath(`/rfq/${rfqSlug}`)",
    );
    expect(addendaRoute).toContain(
      'select("id, company_id, title, slug, status")',
    );
    expect(addendumCommunication).toContain(
      'recordTrustedProcurementActivity(\n    deliveryInput.supabase,\n    "addendum_published"',
    );
    expect(addendaRoute).toContain("deliverAddendumNotificationEmails");
    expect(addendumCommunication).toContain(
      'rpc(\n    "resolve_rfq_addendum_notification_recipients"',
    );
    expect(addendumCommunication).toContain("p_addendum_id: addendumId");
    expect(addendumCommunication).toContain("await sendEmail({");
    expect(addendaRoute).toContain(
      "success: true, addendum: data, email",
    );
    expect(addendumCommunication).toContain("recipients:");
    expect(addendumCommunication).toContain("sent:");
    expect(addendumCommunication).toContain("skipped:");
    expect(addendumCommunication).toContain("failed:");
    expect(addendumCommunication).not.toContain("createServiceRoleClient");
    expect(addendumCommunication).not.toContain("service_role");
    expect(addendumCommunication).not.toContain('.from("profiles")');
    expect(addendumCommunication).not.toMatch(
      /buildRfqAddendumEmail\(\{[^}]*description/,
    );
    expect(addendumCommunication).not.toMatch(
      /buildRfqAddendumEmail\(\{[^}]*affected/,
    );
    expect(addendumCommunication).not.toContain("to: recipientEmails");
    expect(addendumCommunication).not.toContain("email: recipientEmail");
    expect(addendumCommunication).not.toContain("emails:");

    const postStart = addendaRoute.indexOf("export async function POST");
    const insertStart = addendaRoute.indexOf(
      ".insert({\n        rfq_id: rfqId,",
      postStart,
    );
    const deliverStart = addendaRoute.indexOf(
      "recordAndDeliverAddendumCommunication",
      postStart,
    );
    const activityStart = addendumCommunication.indexOf(
      '"addendum_published"',
    );
    const emailDeliveryStart = addendumCommunication.indexOf(
      "deliverAddendumNotificationEmails(deliveryInput)",
      activityStart,
    );

    expect(postStart).toBeGreaterThan(-1);
    expect(insertStart).toBeGreaterThan(-1);
    expect(deliverStart).toBeGreaterThan(insertStart);
    expect(activityStart).toBeGreaterThan(-1);
    expect(emailDeliveryStart).toBeGreaterThan(activityStart);
  });

  it("keeps Addendum email aggregate summary privacy-safe and non-provider-leaking", () => {
    expect(addendumCommunication).not.toContain("lastError = result.error");
    expect(addendumCommunication).not.toContain("result.error ?? lastError");
    expect(addendumCommunication).not.toContain("error: result.error");
    expect(addendumCommunication).not.toContain("id: result.id");
    expect(addendumCommunication).toContain(
      'error = "One or more Addendum notification emails could not be delivered."',
    );
    expect(addendumCommunication).toContain(
      'error = "One or more Addendum notification emails were skipped."',
    );
    expect(addendumCommunication).toContain(
      "return emptyAddendumEmailSummary(null);",
    );
    expect(addendumCommunication).not.toContain(
      "No established Addendum notification recipients were available.",
    );
    expect(addendumCommunication).toContain(
      "for (const recipientEmail of recipientEmails)",
    );
    expect(addendumCommunication).toContain("failed += 1;");
    expect(addendumCommunication).toContain("skipped += 1;");
    expect(addendumCommunication).toMatch(
      /return \{\s*recipients: recipientEmails\.length,\s*sent,\s*skipped,\s*failed,\s*error,\s*\}/,
    );
    expect(addendaRoute).not.toMatch(
      /return \{\s*success: true,\s*addendum: data,\s*email:[\s\S]*recipientEmail/,
    );
    expect(addendaRoute).not.toContain("emails:");
    expect(addendumCommunication).toContain(
      "Addendum notification recipients could not be resolved.",
    );
  });

  it("uses deterministic per-recipient provider idempotency without caller-writable delivery suppression", () => {
    expect(addendumCommunication).toContain(
      'import { createHash } from "node:crypto"',
    );
    expect(addendumCommunication).toContain("hashAddendumEmailRecipient");
    expect(addendumCommunication).toContain(
      "buildAddendumEmailIdempotencyKey",
    );
    expect(addendumCommunication).toContain(
      ".update(`rfq-addendum-email:v1:${addendumId}:${recipientHash}`)",
    );
    expect(addendumCommunication).toContain("idempotencyKey:");
    expect(addendumCommunication).not.toContain('from("audit_logs")');
    expect(addendumCommunication).not.toContain(
      '.eq("action", "ADDENDUM_EMAIL_DELIVERY")',
    );
    expect(addendumCommunication).not.toContain("wasAddendumEmailDelivered");
    expect(addendumCommunication).not.toContain(
      "recordTrustedAddendumEmailDelivery",
    );
    expect(addendumCommunication).not.toContain("providerMessageId");
    expect(addendumCommunication).not.toContain("p_recipient_email");
    expect(addendumCommunication).not.toMatch(
      /console\.(?:error|warn|info)\([^)]*recipientEmail/s,
    );
  });

  it("routes governed package mutations through the canonical Addendum communication workflow", () => {
    expect(documentRequirementsRoute).toContain(
      'from "@/lib/procurement/rfq-addendum-communication"',
    );
    expect(documentRequirementsRoute).toContain(
      "recordAndDeliverAddendumCommunication({",
    );
    expect(documentRequirementsRoute).toContain(
      ".eq(\"id\", addendumId)",
    );
    expect(documentRequirementsRoute).toContain(
      "addendumId: result.addendum_id",
    );
    expect(documentRequirementsRoute).toContain(
      "requiresAcknowledgement: Boolean(addendum.requires_acknowledgement)",
    );
    expect(documentRequirementsRoute).toContain("email: communication.email");
    expect(documentRequirementsRoute).not.toContain('.from("notifications")');
    expect(documentRequirementsRoute).not.toContain('.from("audit_logs")');
    expect(documentRequirementsRoute).not.toContain('.from("quotes")');
    expect(documentRequirementsRoute).not.toContain('from("rfq_addenda").insert');
    expect(
      documentRequirementsRoute.match(/"amend_published_rfq_package"/g),
    ).toHaveLength(2);
  });

  it("exposes an authorized retry without creating another Addendum or Activity fanout", () => {
    const patchStart = addendaRoute.indexOf("export async function PATCH");
    const postStart = addendaRoute.indexOf("export async function POST");
    const patchSource = addendaRoute.slice(patchStart, postStart);

    expect(patchStart).toBeGreaterThan(-1);
    expect(postStart).toBeGreaterThan(patchStart);
    expect(patchSource).toContain("const addendumId = normalizeText(body.addendumId)");
    expect(patchSource).toContain('.from("rfq_addenda")');
    expect(patchSource).toContain('.from("rfqs")');
    expect(patchSource).toContain("getActiveMembershipForUserCompany(");
    expect(patchSource).toContain("canCreateCompanyRfq(");
    expect(patchSource).toContain("ADDENDUM_EMAIL_SAFE_RETRY_WINDOW_MS");
    expect(patchSource).toContain('error_code: "SAFE_RETRY_WINDOW_EXPIRED"');
    expect(patchSource).toContain("deliverAddendumNotificationEmails({");
    expect(patchSource).toContain(
      "return NextResponse.json({ success: true, addendumId, email });",
    );
    expect(patchSource).not.toContain(".insert(");
    expect(patchSource).not.toContain("recordTrustedProcurementActivity(");
    expect(patchSource).not.toContain('"addendum_published"');
  });

  it("authorizes issuer managers consistently without changing R-50 recipients", () => {
    expect(retryAuthorityMigration).toContain(
      "create or replace function public.resolve_rfq_addendum_notification_recipients(",
    );
    expect(retryAuthorityMigration).toContain("security definer");
    expect(retryAuthorityMigration).toContain("set search_path = ''");
    expect(retryAuthorityMigration).toContain("auth.uid()");
    expect(retryAuthorityMigration).toContain(
      "om.membership_status = 'active'",
    );
    expect(retryAuthorityMigration).toContain(
      "om.workspace_role in ('owner', 'admin')",
    );
    expect(retryAuthorityMigration).toContain(
      "om.procurement_function = 'buyer'",
    );
    expect(retryAuthorityMigration).not.toContain("a.created_by = v_uid");
    expect(retryAuthorityMigration).toContain("join public.rfq_invites as i");
    expect(retryAuthorityMigration).toContain("join public.quotes as q");
    expect(retryAuthorityMigration).toContain("join public.rfq_rfis as rfi");
    expect(retryAuthorityMigration).toContain(
      "join public.rfq_addendum_acknowledgements as ack",
    );
    expect(
      retryAuthorityMigration.match(/v\.parsed_deadline is not null/g),
    ).toHaveLength(3);
    expect(
      retryAuthorityMigration.match(/v\.parsed_deadline < now\(\)/g),
    ).toHaveLength(3);
    expect(retryAuthorityMigration).not.toContain("sourcing_method = 'open'");
    expect(retryAuthorityMigration).toContain("from public;");
    expect(retryAuthorityMigration).toContain("from anon;");
    expect(retryAuthorityMigration).toContain("to authenticated;");
  });

  it("secures the purpose-bound Addendum notification recipient RPC", () => {
    expect(notificationMigration).toContain(
      "create or replace function public.resolve_rfq_addendum_notification_recipients(",
    );
    expect(notificationMigration).toContain("p_addendum_id uuid");
    expect(notificationMigration).toContain("returns table (\n  email text\n)");
    expect(notificationMigration).toContain("security definer");
    expect(notificationMigration).toContain("set search_path = ''");
    expect(notificationMigration).toContain("auth.uid()");
    expect(notificationMigration).toContain("raise exception 'Unauthorized'");
    expect(notificationMigration).toContain(
      "om.membership_status = 'active'",
    );
    expect(notificationMigration).toContain(
      "om.workspace_role in ('owner', 'admin')",
    );
    expect(notificationMigration).toContain(
      "om.procurement_function = 'buyer'",
    );
    expect(notificationMigration).toContain("join public.rfq_invites as i");
    expect(notificationMigration).toContain(
      "i.status in ('sent', 'invited')",
    );
    expect(notificationMigration).toContain("join public.quotes as q");
    expect(notificationMigration).toContain("join public.rfq_rfis as rfi");
    expect(notificationMigration).toContain(
      "join public.rfq_addendum_acknowledgements as ack",
    );
    expect(notificationMigration).toContain(
      "join public.organization_memberships as om",
    );
    expect(notificationMigration).toContain("join public.profiles as p");
    expect(notificationMigration).toContain("nullif(lower(btrim(");
    expect(notificationMigration).toContain("union");
    expect(notificationMigration).toContain("issuer_emails");
    expect(notificationMigration).not.toContain("p_user_id");
    expect(notificationMigration).not.toContain("p_email");
    expect(notificationMigration).not.toContain("p_company_id");
    expect(notificationMigration).not.toContain("sourcing_method = 'open'");
    expect(notificationMigration).toContain(
      "public.parse_rfq_deadline_timestamptz(r.deadline) as parsed_deadline",
    );
    expect(
      notificationMigration.match(/v\.parsed_deadline is not null/g),
    ).toHaveLength(3);
    expect(
      notificationMigration.match(/v\.parsed_deadline < now\(\)/g),
    ).toHaveLength(3);
    const inviteBlock = notificationMigration.slice(
      notificationMigration.indexOf("invite_emails as ("),
      notificationMigration.indexOf("participant_companies as ("),
    );
    expect(inviteBlock).not.toContain("parsed_deadline");
    expect(notificationMigration).not.toContain("service_role");
    expect(historicalNotificationMigration).toContain(
      "revoke all\non function public.resolve_rfq_addendum_notification_recipients(uuid)\nfrom public;",
    );
    expect(historicalNotificationMigration).toContain(
      "revoke all\non function public.resolve_rfq_addendum_notification_recipients(uuid)\nfrom anon;",
    );
    expect(historicalNotificationMigration).toContain(
      "grant execute\non function public.resolve_rfq_addendum_notification_recipients(uuid)\nto authenticated;",
    );
    expect(notificationMigration.toLowerCase()).not.toMatch(
      /\b(?:grant|revoke)\b/,
    );
  });

  it("preserves Addendum acknowledgement, quote enforcement, and Activity fanout contracts", () => {
    expect(acknowledgementRoute).toContain("insert({");
    expect(acknowledgementRoute).toContain("addendum_id: addendumId");
    expect(acknowledgementRoute).toContain("company_id: profile.company_id");
    expect(acknowledgementRoute).not.toContain("sendEmail");
    expect(acknowledgementRoute).not.toContain(
      "resolve_rfq_addendum_notification_recipients",
    );

    expect(quotesRoute).toContain(
      "Required RFQ addenda must be acknowledged before submitting a quotation.",
    );
    expect(quotesRoute).toContain('eq("requires_acknowledgement", true)');

    expect(activityFanoutMigration).toContain(
      "-- Established respondent fanout: S1 quotes + S2 RFIs + S3 prior",
    );
    expect(activityFanoutMigration).toContain(
      "if activity_kind = 'addendum_published' then",
    );
    expect(activityFanoutMigration).not.toContain(
      "resolve_rfq_addendum_notification_recipients",
    );
  });
});

function retryRequest(overrides: Record<string, unknown> = {}) {
  return new Request("http://localhost/api/rfq-addenda", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ addendumId: ADDENDUM_ID, ...overrides }),
  });
}

function mockRetrySupabase({
  createdAt = new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  recipients = [{ email: RECIPIENT_EMAIL }],
  user = { id: USER_ID },
}: {
  createdAt?: string;
  recipients?: Array<{ email: string }>;
  user?: { id: string } | null;
} = {}) {
  const rpcCalls: Array<{ fn: string; args: Record<string, unknown> }> = [];

  createClientMock.mockResolvedValue({
    auth: {
      getUser: async () => ({ data: { user }, error: null }),
    },
    from(table: string) {
      const data =
        table === "rfq_addenda"
          ? {
              id: ADDENDUM_ID,
              rfq_id: RFQ_ID,
              addendum_number: 7,
              title: "Safety clarification",
              requires_acknowledgement: true,
              created_at: createdAt,
              created_by: "99999999-9999-4999-8999-999999999999",
            }
          : table === "rfqs"
            ? {
                id: RFQ_ID,
                company_id: COMPANY_ID,
                title: "Mechanical upgrade",
                slug: "mechanical-upgrade",
              }
            : null;
      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: async () => ({ data, error: null }),
      };

      return query;
    },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      rpcCalls.push({ fn, args });
      return { data: recipients, error: null };
    },
  } as never);

  return rpcCalls;
}

async function responseJson(response: Response) {
  return (await response.json()) as Record<string, unknown>;
}

describe("18-25B Addendum provider-idempotent retry runtime", () => {
  beforeEach(() => {
    createClientMock.mockReset();
    membershipMock.mockReset();
    sendEmailMock.mockReset();
    membershipMock.mockResolvedValue({
      id: "membership-1",
      userId: USER_ID,
      companyId: COMPANY_ID,
      workspaceRole: "admin",
      procurementFunction: "none",
      membershipType: "member",
      membershipStatus: "active",
      jobTitle: null,
      jobFunction: null,
      invitedBy: null,
      joinedAt: null,
    });
    sendEmailMock.mockResolvedValue({
      success: true,
      skipped: false,
      id: "provider-message-1",
      error: null,
    });
  });

  it("lets an authorized non-creator manager retry and reuses the identical provider key", async () => {
    const rpcCalls = mockRetrySupabase();

    const first = await PATCH(
      retryRequest({
        recipientHash: "forged",
        status: "sent",
        providerMessageId: "forged-provider-id",
      }),
    );
    const second = await PATCH(retryRequest());

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(sendEmailMock).toHaveBeenCalledTimes(2);
    expect(sendEmailMock.mock.calls[0]?.[0].idempotencyKey).toBe(
      sendEmailMock.mock.calls[1]?.[0].idempotencyKey,
    );
    expect(sendEmailMock.mock.calls[0]?.[0].idempotencyKey).toMatch(
      /^[0-9a-f]{64}$/,
    );
    expect(rpcCalls).toEqual([
      {
        fn: "resolve_rfq_addendum_notification_recipients",
        args: { p_addendum_id: ADDENDUM_ID },
      },
      {
        fn: "resolve_rfq_addendum_notification_recipients",
        args: { p_addendum_id: ADDENDUM_ID },
      },
    ]);
  });

  it("denies an unauthorized or cross-company caller before recipient resolution", async () => {
    const rpcCalls = mockRetrySupabase();
    membershipMock.mockResolvedValue(null);

    const response = await PATCH(retryRequest());

    expect(response.status).toBe(403);
    expect(rpcCalls).toHaveLength(0);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("rejects retry at 23 hours before recipient resolution or provider send", async () => {
    const rpcCalls = mockRetrySupabase({
      createdAt: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
    });

    const response = await PATCH(retryRequest());

    expect(response.status).toBe(409);
    expect(await responseJson(response)).toMatchObject({
      success: false,
      error_code: "SAFE_RETRY_WINDOW_EXPIRED",
    });
    expect(rpcCalls).toHaveLength(0);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it.each([
    {
      label: "provider failure",
      result: { success: false, skipped: false, id: null, error: "private" },
      status: 502,
      errorCode: "ADDENDUM_EMAIL_DELIVERY_FAILED",
    },
    {
      label: "configuration skip",
      result: { success: false, skipped: true, id: null, error: "private" },
      status: 503,
      errorCode: "ADDENDUM_EMAIL_DELIVERY_SKIPPED",
    },
  ])("returns non-2xx for $label", async ({ result, status, errorCode }) => {
    mockRetrySupabase();
    sendEmailMock.mockResolvedValue(result);

    const response = await PATCH(retryRequest());
    const body = await responseJson(response);

    expect(response.status).toBe(status);
    expect(body).toMatchObject({ success: false, error_code: errorCode });
    expect(JSON.stringify(body)).not.toContain("private");
  });
});

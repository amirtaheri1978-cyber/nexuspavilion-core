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
  "supabase/legacy-migrations/pre-baseline-v2/20260834000000_rfi_collaboration_persistence_foundation.sql",
);
const governedAmendmentMigration = readSource(
  "supabase/migrations/20260913151319_govern_published_rfq_amendments.sql",
);
const attachmentCleanupRetryMigration = readSource(
  "supabase/migrations/20260914020637_govern_rfq_attachment_cleanup_retry.sql",
);
const launchBaseline = readSource(
  "supabase/migrations/20260911000000_launch_candidate_baseline_v2.sql",
);
const rfqCreate = readSource("src/app/api/rfqs/route.ts");
const addendaApi = readSource("src/app/api/rfq-addenda/route.ts");
const documentRequirementsApi = readSource(
  "src/app/api/rfq-document-requirements/route.ts",
);
const acknowledgementApi = readSource(
  "src/app/api/rfq-addendum-acknowledgements/route.ts",
);
const attachmentsApi = readSource("src/app/api/rfq-attachments/route.ts");
const attachmentsDeleteApi =
  attachmentsApi.split("export async function DELETE")[1] || "";
const quotesApi = readSource("src/app/api/quotes/route.ts");
const rfiApi = readSource("src/app/api/rfq-rfis/route.ts");
const upload = readSource("src/components/rfq-document-upload.tsx");
const library = readSource("src/components/rfq-document-library.tsx");
const documentRequirements = readSource(
  "src/components/rfq-workspace/rfq-document-requirements.tsx",
);
const addendaManager = readSource("src/components/rfq-addenda-manager.tsx");
const rfiWorkspace = readSource(
  "src/components/rfq-workspace/rfq-rfi-workspace.tsx",
);
const documentWorkspace = readSource(
  "src/components/rfq-workspace/rfq-document-workspace.tsx",
);

describe("Cursor 04C RFI collaboration contract", () => {
  it("finalizes private collaboration migration contracts", () => {
    expect(migration).toContain("create table public.rfq_addenda");
    expect(migration).toContain(
      "create table public.rfq_addendum_acknowledgements",
    );
    expect(migration).toContain("create table public.rfq_attachments");
    expect(migration).toContain("create table public.rfq_rfis");
    expect(migration).not.toContain("shared_rfis");
    expect(migration).not.toContain("rfi_threads");
    expect(migration).not.toContain("file_url");
    expect(migration).toContain("security invoker");
    expect(migration).not.toContain("security definer");
    expect(migration).toContain(
      "insert into storage.buckets (id, name, public)",
    );
    expect(migration).toContain("'rfq-attachments'");
    expect(migration).toContain("public = false");
    expect(migration).toContain(
      "RFQ participants can read rfq-attachments objects",
    );
    expect(migration).toContain(
      "Issuer procurement users can upload rfq-attachments objects",
    );
    expect(migration).toContain(
      "Issuer procurement users can delete rfq-attachments objects",
    );
    expect(migration).toContain("revoke all on table public.rfq_addenda from anon");
    expect(migration).toContain(
      "revoke all on table public.rfq_addendum_acknowledgements from authenticated",
    );
    expect(migration).toContain("grant insert (addendum_id, company_id)");
    expect(migration).toContain(
      "grant insert (rfq_id, respondent_company_id, question)",
    );
    expect(migration).toContain(
      "grant update (response_text) on table public.rfq_rfis",
    );
    expect(migration).toContain("grant delete on table public.rfq_attachments");
    expect(migration).toContain("rfq_rfis_state_consistency");
    expect(migration).toContain("for update");
    expect(migration).toContain("parse_rfq_deadline_timestamptz");
    expect(migration).toContain(
      "Supplier members can submit company quotes",
    );
    expect(migration).toContain("requires_acknowledgement = true");
    expect(migration).toContain(
      "ack.company_id = quotes.company_id",
    );
    expect(migration).not.toContain(
      "grant update on table public.rfq_addendum_acknowledgements",
    );
    expect(migration).not.toContain(
      "grant insert, update on table public.rfq_addendum_acknowledgements",
    );
  });

  it("retains historical participant RFQ/package access without opening drafts", () => {
    expect(migration).toContain(
      'drop policy if exists "Authenticated users can read permitted RFQs"',
    );
    expect(migration).toContain(
      'create policy "Authenticated users can read permitted RFQs"',
    );

    // Open-market discovery remains open + open sourcing only.
    expect(migration).toContain("rfqs.status = 'open'");
    expect(migration).toContain("rfqs.sourcing_method = 'open'");

    // Explicit participant relationship is not wrapped entirely by status='open'.
    expect(migration).toContain("rfqs.status <> 'draft'");
    expect(migration).toContain(
      "public.current_user_has_supplier_rfq_access(rfqs.id)",
    );

    // Package/storage SELECT mirrors the same lifecycle split.
    expect(migration).toContain("r.status = 'open'");
    expect(migration).toContain("r.sourcing_method = 'open'");
    expect(migration).toContain("r.status <> 'draft'");
    expect(migration).toContain(
      "public.current_user_has_supplier_rfq_access(r.id)",
    );
    expect(migration).toContain("RFQ participants can read addenda");
    expect(migration).toContain("RFQ participants can read attachments");
    expect(migration).toContain(
      "RFQ participants can read rfq-attachments objects",
    );

    // Private RFI competitor isolation unchanged.
    expect(migration).toContain(
      "Respondent companies can read own RFQ RFIs",
    );
    expect(migration).toContain(
      "om.company_id = rfq_rfis.respondent_company_id",
    );
    expect(migration).not.toContain("shared_rfis");
  });

  it("hardens RFQ create RFI deadline normalization through the existing helper", () => {
    expect(rfqCreate).toContain("resolveRfqDeadlineForStorage");
    expect(rfqCreate).toContain("rawRfiDeadline");
    expect(rfqCreate).toContain("deadline: rawRfiDeadline");
    expect(rfqCreate).toContain("deadline_timezone: body.rfi_deadline_timezone");
    expect(rfqCreate).toContain("rfi_deadline: rfiDeadline");
  });

  it("hardens addenda, acknowledgement, attachment, and quote APIs", () => {
    expect(addendaApi).toContain("canCreateCompanyRfq");
    expect(addendaApi).toContain("getActiveMembershipForUserCompany");
    expect(addendaApi).not.toContain("body.companyId");
    expect(addendaApi).not.toContain("body.addendumNumber");
    expect(addendaApi).not.toMatch(/\.insert\(\{[\s\S]*?addendumNumber/);
    expect(addendaApi).not.toMatch(
      /\.insert\(\{[\s\S]*?addendum_number:\s*body\./,
    );
    expect(addendaApi).toContain("rfq_id: rfqId");
    expect(addendaApi).toContain("title");
    expect(addendaApi).toContain("requires_acknowledgement");

    expect(acknowledgementApi).toContain("insert({");
    expect(acknowledgementApi).toContain("addendum_id: addendumId");
    expect(acknowledgementApi).toContain("company_id: profile.company_id");
    expect(acknowledgementApi).not.toContain("upsert");
    expect(acknowledgementApi).toContain('code === "23505"');
    expect(acknowledgementApi).toContain("idempotent: true");
    expect(acknowledgementApi).not.toContain("acknowledged_by:");
    expect(acknowledgementApi).not.toContain("acknowledged_at:");
    expect(acknowledgementApi).not.toContain("rfq_id: rfqId");
    expect(acknowledgementApi).toContain(
      "This RFQ is no longer open for addendum acknowledgement.",
    );

    expect(attachmentsApi).toContain("canCreateCompanyRfq");
    expect(attachmentsApi).not.toContain("body.companyId");
    expect(attachmentsApi).not.toContain("fileUrl");
    expect(attachmentsApi).not.toContain("file_url");
    expect(attachmentsApi).toContain("file_path: filePath");

    expect(quotesApi).toContain(
      "Required RFQ addenda must be acknowledged before submitting a quotation.",
    );
    expect(quotesApi).toContain('eq("requires_acknowledgement", true)');
    expect(quotesApi).toContain("canSubmitCompanyQuote");
    expect(quotesApi).toContain("canRespondToRfqSourcing");
  });

  it("implements private RFI API and workspace contracts", () => {
    expect(rfiApi).toContain("export async function GET");
    expect(rfiApi).toContain("export async function POST");
    expect(rfiApi).toContain("export async function PATCH");
    expect(rfiApi).toContain("respondent_company_id: profile.company_id");
    expect(rfiApi).toContain("question");
    expect(rfiApi).not.toContain("submitted_by:");
    expect(rfiApi).toContain("response_text: responseText");
    expect(rfiApi).toContain("canCreateCompanyRfq");
    expect(rfiApi).toContain("canRespondToRfqSourcing");
    expect(rfiApi).toContain(
      "Issuing companies cannot submit private respondent RFIs on their own RFQ.",
    );
    expect(rfiApi).toContain('rpc(\n    "parse_rfq_deadline_timestamptz"');
    expect(rfiApi).toContain("p_deadline:");
    expect(rfiApi).toContain("Unable to verify the RFI deadline.");
    expect(rfiApi).not.toContain("new Date(rfq.deadline)");

    expect(rfiWorkspace).toContain('data-rfq-rfi-workspace="true"');
    expect(rfiWorkspace).toContain("Private respondent inquiry");
    expect(rfiWorkspace).toContain("Material clarifications");
    expect(rfiWorkspace).toContain("formal");
    expect(rfiWorkspace).toContain("Addendum workflow");
    expect(rfiWorkspace).toContain('fetch("/api/rfq-rfis"');
    expect(rfiWorkspace).toContain('method: "PATCH"');
    expect(rfiWorkspace).toContain('const errorId = "rfq-rfi-error";');
    expect(rfiWorkspace).toContain('validationTarget === "question"');
    expect(rfiWorkspace).toContain("aria-invalid={validationTarget === \"question\"}");
    expect(rfiWorkspace).toContain("aria-describedby={");
    expect(rfiWorkspace).toContain("`response:${rfiId}`");
    expect(rfiWorkspace).toContain(
      "aria-invalid={validationTarget === `response:${rfi.id}`}",
    );
    expect(documentWorkspace).toContain("RFQRfiWorkspace");
    expect(documentWorkspace).toContain("rfiDeadline={rfiDeadline}");
  });

  it("enforces canonical deadline and open-only acknowledgement integrity", () => {
    const detail = readSource("src/app/rfq/[slug]/page.tsx");

    expect(detail).toContain("effectiveRfiDeadline");
    expect(detail).toContain("effectiveRfiDeadlineTimezone");
    expect(detail).toContain('rpc("parse_rfq_deadline_timestamptz"');
    expect(detail).toContain("rfiDeadline={effectiveRfiDeadline}");
    expect(detail).toContain(
      "rfiDeadlineTimezone={effectiveRfiDeadlineTimezone}",
    );
    expect(detail).not.toContain("rfiDeadline={rfq.rfi_deadline}");

    expect(migration).toContain(
      "public.parse_rfq_deadline_timestamptz(r.deadline) is not null",
    );
    expect(migration).toContain(
      "now() <= public.parse_rfq_deadline_timestamptz(r.deadline)",
    );

    expect(migration).toContain(
      "Respondent companies can acknowledge required addenda",
    );
    expect(migration).toMatch(
      /Respondent companies can acknowledge required addenda[\s\S]*?r\.status = 'open'[\s\S]*?requires_acknowledgement = true/,
    );
  });

  it("keeps document upload metadata durable and preview URLs ephemeral", () => {
    expect(upload).not.toContain("fileUrl");
    expect(upload).not.toContain("createSignedUrl");
    expect(upload).toContain("filePath");
    expect(upload).toContain(".remove([filePath])");
    expect(library).toContain("createSignedUrl");
    expect(library).toContain("SIGNED_URL_TTL_SECONDS");
    expect(library).not.toContain("file_url");
    expect(addendaManager).not.toContain("companyId:");
    expect(addendaManager).toContain("Preview Addendum #");
  });

  it("wires private RFI response notification after successful response persistence", () => {
    expect(rfiApi).toContain(".update({ response_text: responseText })");
    expect(rfiApi).not.toContain('status: "answered"');
    expect(rfiApi).not.toContain("status: 'answered'");
    expect(rfiApi).not.toContain("responded_by:");
    expect(rfiApi).not.toContain("responded_at:");
    expect(rfiApi).toContain(
      'recordTrustedProcurementActivity(supabase, "rfi_responded"',
    );
    expect(rfiApi).toContain("deliverRfiResponseNotificationEmail");
    expect(rfiApi).toContain("await sendEmail({");
    expect(rfiApi).toContain(
      'rpc(\n    "resolve_rfi_response_notification_recipient"',
    );
    expect(rfiApi).toContain("p_rfi_id: rfiId");
    expect(rfiApi).toContain('from "@/lib/email/send-email"');
    expect(rfiApi).toContain(
      'from "@/lib/email/templates/rfi-response-email"',
    );
    expect(rfiApi).toContain("buildRfiResponseEmail({");
    expect(rfiApi).toContain("joinPublicSitePath(`/rfq/${rfqSlug}`)");
    expect(rfiApi).toContain('select("id, company_id, title, slug")');
    expect(rfiApi).not.toContain("createServiceRoleClient");
    expect(rfiApi).not.toContain("service_role");
    expect(rfiApi).not.toContain('.from("profiles")\n    .select("email")');
    expect(rfiApi).toContain('rfqTitle: rfqTitle || "Procurement RFQ"');
    expect(rfiApi).toContain("workspaceUrl,");
    expect(rfiApi).toMatch(
      /buildRfiResponseEmail\(\{\s*rfqTitle: rfqTitle \|\| "Procurement RFQ",\s*workspaceUrl,\s*\}\)/,
    );
    expect(rfiApi).not.toMatch(
      /buildRfiResponseEmail\(\{[^}]*responseText/,
    );
    expect(rfiApi).not.toMatch(
      /buildRfiResponseEmail\(\{[^}]*response_text/,
    );
    expect(rfiApi).toContain("success: true, rfi: data, email");
    expect(rfiApi).toContain("RFI response saved, but email delivery failed.");

    const patchStart = rfiApi.indexOf("export async function PATCH");
    const deliverStart = rfiApi.indexOf(
      "deliverRfiResponseNotificationEmail",
      patchStart,
    );
    const updateStart = rfiApi.indexOf(
      ".update({ response_text: responseText })",
      patchStart,
    );
    const activityStart = rfiApi.indexOf(
      'recordTrustedProcurementActivity(supabase, "rfi_responded"',
      patchStart,
    );

    expect(patchStart).toBeGreaterThan(-1);
    expect(updateStart).toBeGreaterThan(-1);
    expect(activityStart).toBeGreaterThan(updateStart);
    expect(deliverStart).toBeGreaterThan(activityStart);
  });

  it("hardens acknowledgement API/UI for RFQ terminal state (14-08)", () => {
    const detail = readSource("src/app/rfq/[slug]/page.tsx");
    const acknowledgementCenter = readSource(
      "src/components/rfq-addendum-acknowledgement-center.tsx",
    );
    const terminalMigration = readSource(
      "supabase/legacy-migrations/pre-baseline-v2/20260909090225_harden_rfq_addendum_acknowledgement_terminal_state.sql",
    );

    expect(acknowledgementApi).toContain(
      "id, company_id, status, sourcing_method, deadline, deadline_timezone, awarded_quote_id, awarded_at",
    );
    expect(acknowledgementApi).toContain('rpc(\n    "parse_rfq_deadline_timestamptz"');
    expect(acknowledgementApi).toContain("p_deadline: rfq.deadline ?? null");
    expect(acknowledgementApi).toContain(
      "Unable to verify the RFQ deadline.",
    );
    expect(acknowledgementApi).toContain(
      "This RFQ deadline has passed. Addendum acknowledgements are closed.",
    );
    expect(acknowledgementApi).toContain("rfq.awarded_quote_id || rfq.awarded_at");
    expect(acknowledgementApi).toContain(
      "This RFQ is no longer open for addendum acknowledgement.",
    );
    expect(acknowledgementApi).toContain('code === "23505"');
    expect(acknowledgementApi).toContain("idempotent: true");
    expect(acknowledgementApi).not.toContain("new Date(rfq.deadline)");

    expect(detail).toContain("awarded_quote_id: string | null;");
    expect(detail).toContain("awarded_at: string | null;");
    expect(detail).toContain("!rfq.awarded_quote_id");
    expect(detail).toContain("!rfq.awarded_at");
    expect(detail).toContain("canAcknowledge={isOpen}");
    expect(documentWorkspace).toContain("canAcknowledge?: boolean");
    expect(documentWorkspace).toContain("canAcknowledge = true");
    expect(documentWorkspace).toContain("canAcknowledge={canAcknowledge}");
    expect(acknowledgementCenter).toContain("canAcknowledge?: boolean");
    expect(acknowledgementCenter).toContain("canAcknowledge = true");
    expect(acknowledgementCenter).toContain("if (!canAcknowledge)");
    expect(acknowledgementCenter).toContain(
      "canAcknowledge &&\n                  requiresAcknowledgement &&\n                  !acknowledged",
    );
    expect(acknowledgementCenter).toContain(
      "Acknowledgements are closed for this RFQ. Issued addenda remain",
    );
    expect(acknowledgementCenter).toContain("initialAddenda.map((addendum)");
    expect(acknowledgementCenter).toContain("data-rfq-addenda-history");

    expect(terminalMigration).toContain(
      'drop policy if exists "Respondent companies can acknowledge required addenda"',
    );
    expect(terminalMigration).toContain(
      'create policy "Respondent companies can acknowledge required addenda"',
    );
    expect(terminalMigration).toContain(
      "public.parse_rfq_deadline_timestamptz(r.deadline) is not null",
    );
    expect(terminalMigration).toContain(
      "now() <= public.parse_rfq_deadline_timestamptz(r.deadline)",
    );
    expect(terminalMigration).toContain("r.status = 'open'");
    expect(terminalMigration).toContain("om.membership_status = 'active'");
    expect(terminalMigration).toContain(
      "or public.current_user_has_supplier_rfq_access(r.id)",
    );
    expect(terminalMigration).toContain("a.requires_acknowledgement = true");
    expect(terminalMigration).toContain("r.awarded_quote_id is null");
    expect(terminalMigration).toContain("r.awarded_at is null");
    expect(terminalMigration).not.toContain("for select");
    expect(terminalMigration).not.toContain("grant ");
    expect(terminalMigration).not.toContain("security definer");
    expect(terminalMigration).not.toContain("get_rfq_invitation_context");
  });

  it("secures the purpose-bound RFI response notification recipient RPC", () => {
    const notificationMigration = readSource(
      "supabase/legacy-migrations/pre-baseline-v2/20260909032250_resolve_rfi_response_notification_recipient.sql",
    );

    expect(notificationMigration).toContain(
      "create or replace function public.resolve_rfi_response_notification_recipient(",
    );
    expect(notificationMigration).toContain("p_rfi_id uuid");
    expect(notificationMigration).toContain("returns table (\n  email text\n)");
    expect(notificationMigration).toContain("security definer");
    expect(notificationMigration).toContain("set search_path = ''");
    expect(notificationMigration).toContain("auth.uid()");
    expect(notificationMigration).toContain("raise exception 'Unauthorized'");
    expect(notificationMigration).toContain("rfi.status = 'answered'");
    expect(notificationMigration).toContain("rfi.responded_by = v_uid");
    expect(notificationMigration).toContain(
      "om.membership_status = 'active'",
    );
    expect(notificationMigration).toContain(
      "om.workspace_role in ('owner', 'admin')",
    );
    expect(notificationMigration).toContain(
      "om.procurement_function = 'buyer'",
    );
    expect(notificationMigration).toContain("p.id = rfi.submitted_by");
    expect(notificationMigration).toContain("from public.rfq_rfis as rfi");
    expect(notificationMigration).toContain("join public.profiles as p");
    expect(notificationMigration).not.toContain("p_user_id");
    expect(notificationMigration).not.toContain("p_email");
    expect(notificationMigration).not.toContain("p_company_id");
    expect(notificationMigration).toContain(
      "revoke all\non function public.resolve_rfi_response_notification_recipient(uuid)\nfrom public;",
    );
    expect(notificationMigration).toContain(
      "revoke all\non function public.resolve_rfi_response_notification_recipient(uuid)\nfrom anon;",
    );
    expect(notificationMigration).toContain(
      "grant execute\non function public.resolve_rfi_response_notification_recipient(uuid)\nto authenticated;",
    );
  });
});

describe("18-24 governed published RFQ amendment migration", () => {
  const expectedGovernedFields = [
    "title",
    "description",
    "category",
    "location",
    "budget",
    "project_name",
    "owner_client",
    "mobilization_date",
    "substantial_completion_date",
    "performance_bond_required",
    "bid_bond_required",
    "insurance_required",
    "insurance_notes",
    "safety_requirements",
    "prequalification_notes",
  ];

  it("reuses legacy Addenda with nullable structured immutable evidence", () => {
    expect(governedAmendmentMigration).toContain(
      "alter table public.rfq_addenda",
    );
    expect(governedAmendmentMigration).not.toContain(
      "create table public.rfq_amendments",
    );
    expect(governedAmendmentMigration).toContain(
      "add column if not exists affected_fields text[]",
    );
    expect(governedAmendmentMigration).toContain(
      "add column if not exists amendment_before jsonb",
    );
    expect(governedAmendmentMigration).toContain(
      "add column if not exists amendment_after jsonb",
    );
    expect(governedAmendmentMigration).toContain(
      "add column if not exists amendment_reason text",
    );
    expect(governedAmendmentMigration).toContain(
      "Structured RFQ amendment evidence is immutable.",
    );
    expect(governedAmendmentMigration).toContain(
      "before update or delete on public.rfq_addenda",
    );
    expect(governedAmendmentMigration).toContain(
      "NULL remains valid for legacy Addenda.",
    );
  });

  it("routes governed published RFQ field changes through the existing Addendum route", () => {
    expect(addendaApi).toContain("body.changes");
    expect(addendaApi).toContain("hasGovernedChanges");
    expect(addendaApi).toContain('"amend_published_rfq"');
    expect(addendaApi).toContain("p_changes: governedChanges");
    expect(addendaApi).toContain("p_title: title");
    expect(addendaApi).toContain("p_reason: amendmentReason");
    expect(addendaApi).toContain("p_requires_acknowledgement: true");
    expect(addendaApi).not.toContain(
      "p_requires_acknowledgement: requiresAcknowledgement",
    );
    expect(addendaApi).toContain(
      "Published RFQ changes require an Addendum title and amendment reason.",
    );
    expect(addendaApi).toContain(
      "Draft RFQ fields must be edited through the existing draft workflow.",
    );
  });

  it("routes published document requirement changes through governed Addenda", () => {
    expect(documentRequirementsApi).toContain(
      '.select("id, company_id, status")',
    );
    expect(documentRequirementsApi).toContain(
      'authorization.rfq.status !== "draft"',
    );
    expect(documentRequirementsApi).toContain(
      '"amend_published_rfq_package"',
    );
    expect(documentRequirementsApi).toContain(
      'operation: "add_document_requirement"',
    );
    expect(documentRequirementsApi).toContain(
      'operation: "remove_document_requirement"',
    );
    expect(documentRequirementsApi).toContain("p_title: evidence.title");
    expect(documentRequirementsApi).toContain("p_reason: evidence.reason");
    expect(documentRequirements).toContain("rfqStatus?: string | null");
    expect(documentRequirements).toContain("RFQAmendmentEvidenceFields");
    expect(documentRequirements).toContain("addendumTitle");
    expect(documentRequirements).toContain("amendmentReason");
  });

  it("routes published attachment registration and removal through governed Addenda", () => {
    expect(attachmentsApi).toContain('.select("id, company_id, status")');
    expect(attachmentsApi).toContain('rfq.status === "draft"');
    expect(attachmentsApi).toContain('"amend_published_rfq_package"');
    expect(attachmentsApi).toContain('operation: "add_attachment"');
    expect(attachmentsApi).toContain('operation: "remove_attachment"');
    expect(attachmentsApi).toContain("export async function DELETE");
    expect(upload).toContain("RFQAmendmentEvidenceFields");
    expect(upload).toContain("addendumTitle");
    expect(upload).toContain("amendmentReason");
    expect(upload).toContain("multiple={!isPublished}");
    expect(upload).toContain("isPublished && files.length > 1");
    expect(upload).toContain("isPublished && filesToUpload.length > 1");
    expect(upload).toContain(
      "Published RFQ attachments must be uploaded one file per governed Addendum.",
    );
    expect(library).toContain('fetch("/api/rfq-attachments"');
    expect(library).toContain('method: "DELETE"');
    expect(library).toContain("RFQAmendmentEvidenceFields");
    expect(library).not.toContain(
      '.from("rfq_attachments")\n        .delete()',
    );
  });

  it("limits orphan cleanup visibility to the installed batch-delete operation", () => {
    expect(attachmentCleanupRetryMigration).toContain(
      "storage.allow_only_operation('storage.object.delete_many')",
    );
    expect(attachmentCleanupRetryMigration).not.toContain(
      "storage.allow_any_operation",
    );
    expect(attachmentCleanupRetryMigration).not.toMatch(
      /storage\.object\.(?:list|list_v2|get_authenticated|get_signed)/,
    );
    expect(attachmentCleanupRetryMigration).toContain(
      "bucket_id = 'rfq-attachments'",
    );
    expect(attachmentCleanupRetryMigration).toContain(
      "om.membership_status = 'active'",
    );
    expect(attachmentCleanupRetryMigration).toContain(
      "om.workspace_role in ('owner', 'admin')",
    );
    expect(attachmentCleanupRetryMigration).toContain(
      "or om.procurement_function = 'buyer'",
    );
    expect(attachmentCleanupRetryMigration).toContain(
      "addendum.company_id = r.company_id",
    );
    expect(attachmentCleanupRetryMigration).toContain(
      "evidence.value ->> 'file_path' = storage.objects.name",
    );
    expect(attachmentCleanupRetryMigration).toContain(
      "jsonb_typeof(addendum.amendment_after -> evidence.key) = 'null'",
    );
  });

  it("keeps governed storage cleanup retryable without caller paths or duplicate Addenda", () => {
    expect(attachmentsApi).toContain("findGovernedRemovalEvidence");
    expect(attachmentsApi).toContain(
      '.contains("affected_fields", [affectedKey])',
    );
    expect(attachmentsApi).toContain(
      "normalizeText(attachmentBefore.file_path)",
    );
    expect(attachmentsDeleteApi).not.toContain("body.filePath");
    expect(attachmentsApi).toContain('operation: "retry_cleanup"');
    expect(attachmentsApi).toContain("storageCleanupRetried: true");
    expect(attachmentsApi).toContain("storageCleanupPending: true");
    expect(attachmentsApi).toContain("{ status: 502 }");
    expect(library).toContain("Retry cleanup");
    expect(library).toContain("cleanupPendingId");
  });

  it("exposes one purpose-bound security-definer amendment command", () => {
    expect(governedAmendmentMigration).toContain(
      "create or replace function public.amend_published_rfq(",
    );
    expect(governedAmendmentMigration).toContain("p_rfq_id uuid");
    expect(governedAmendmentMigration).toContain("p_changes jsonb");
    expect(governedAmendmentMigration).toContain("p_reason text");
    expect(governedAmendmentMigration).toContain("security definer");
    expect(governedAmendmentMigration).toContain("set search_path = ''");
    expect(governedAmendmentMigration).toContain(
      "actor_user_id uuid := auth.uid()",
    );
    expect(governedAmendmentMigration).toContain(
      "om.membership_status = 'active'",
    );
    expect(governedAmendmentMigration).toContain(
      "om.workspace_role in ('owner', 'admin')",
    );
    expect(governedAmendmentMigration).toContain(
      "or om.procurement_function = 'buyer'",
    );
    expect(governedAmendmentMigration).toContain("for update");

    const rfqRpcStart = governedAmendmentMigration.indexOf(
      "create or replace function public.amend_published_rfq(",
    );
    const rfqRpcEnd = governedAmendmentMigration.indexOf(
      "comment on function public.amend_published_rfq(",
      rfqRpcStart,
    );
    const rfqRpc = governedAmendmentMigration.slice(rfqRpcStart, rfqRpcEnd);

    expect(rfqRpc).toContain("if p_requires_acknowledgement is not true then");
    expect(rfqRpc).toContain("ACKNOWLEDGEMENT_REQUIRED");
    expect(rfqRpc).toMatch(
      /insert into public\.rfq_addenda[\s\S]*?btrim\(p_title\)[\s\S]*?\n\s*true,/,
    );
    expect(rfqRpc).not.toContain("coalesce(p_requires_acknowledgement, true)");
    expect(governedAmendmentMigration).toContain("target_rfq.status <> 'open'");
    expect(governedAmendmentMigration).toContain(
      "target_rfq.awarded_quote_id is not null",
    );
    expect(governedAmendmentMigration).toContain(
      "target_rfq.awarded_at is not null",
    );
    expect(governedAmendmentMigration).toContain(
      "public.parse_rfq_deadline_timestamptz(target_rfq.deadline)",
    );
    expect(governedAmendmentMigration).toContain(
      "parsed_deadline is null or now() > parsed_deadline",
    );
    expect(governedAmendmentMigration).toContain(
      "COMMERCIAL_OPENING_UNLOCKED",
    );
    expect(governedAmendmentMigration).toContain(
      "insert into public.rfq_addenda",
    );
    expect(
      governedAmendmentMigration.indexOf("update public.rfqs"),
    ).toBeLessThan(
      governedAmendmentMigration.indexOf("insert into public.rfq_addenda"),
    );
    expect(governedAmendmentMigration).toContain(
      "revoke all\non function public.amend_published_rfq(uuid, jsonb, text, text, text, text, boolean)\nfrom public;",
    );
    expect(governedAmendmentMigration).toContain(
      "revoke all\non function public.amend_published_rfq(uuid, jsonb, text, text, text, text, boolean)\nfrom anon;",
    );
    expect(governedAmendmentMigration).toContain(
      "grant execute\non function public.amend_published_rfq(uuid, jsonb, text, text, text, text, boolean)\nto authenticated;",
    );
  });

  it("retains the existing locked Addendum numbering and actor-time authority", () => {
    expect(migration).toMatch(
      /select r\.company_id\s+into v_company_id\s+from public\.rfqs r\s+where r\.id = new\.rfq_id\s+for update;/,
    );
    expect(migration).toMatch(
      /select coalesce\(max\(a\.addendum_number\), 0\) \+ 1\s+into v_next_number\s+from public\.rfq_addenda a\s+where a\.rfq_id = new\.rfq_id;/,
    );
    expect(migration).toContain("new.company_id := v_company_id;");
    expect(migration).toContain("new.created_by := auth.uid();");
    expect(migration).toContain("new.created_at := now();");
    expect(migration).toContain("new.addendum_number := v_next_number;");
    const governedAddendumColumnLists = [
      ...governedAmendmentMigration.matchAll(
        /insert into public\.rfq_addenda \(([\s\S]*?)\n  \)\n  values/g,
      ),
    ].map((match) => match[1]);

    expect(governedAddendumColumnLists).toHaveLength(2);
    for (const columnList of governedAddendumColumnLists) {
      expect(columnList).not.toMatch(
        /\b(?:company_id|created_by|created_at|addendum_number)\b/i,
      );
    }
  });

  it("whitelists only the 18-24 respondent-facing amendment fields", () => {
    const whitelistStart = governedAmendmentMigration.indexOf(
      "governed_fields constant text[] := array[",
    );
    const whitelistEnd = governedAmendmentMigration.indexOf(
      "];",
      whitelistStart,
    );
    const whitelist = governedAmendmentMigration.slice(
      whitelistStart,
      whitelistEnd,
    );

    expect(whitelistStart).toBeGreaterThan(-1);
    expect(whitelistEnd).toBeGreaterThan(whitelistStart);

    for (const field of expectedGovernedFields) {
      expect(whitelist).toContain(`'${field}'`);
    }

    expect((whitelist.match(/^\s*'[^']+',?$/gm) ?? []).length).toBe(
      expectedGovernedFields.length,
    );

    for (const prohibitedField of [
      "deadline",
      "deadline_timezone",
      "rfi_deadline",
      "rfi_deadline_timezone",
      "procurement_scope",
      "sourcing_method",
      "contract_framework",
      "bid_model",
      "nda_required",
      "advanced_controls_enabled",
      "status",
      "awarded_quote_id",
      "awarded_at",
      "company_id",
      "user_id",
      "slug",
    ]) {
      expect(whitelist).not.toContain(`'${prohibitedField}'`);
    }

    expect(governedAmendmentMigration).toContain("PROHIBITED_FIELDS");
    expect(governedAmendmentMigration).toContain("INVALID_FIELD_TYPE");
    expect(governedAmendmentMigration).toContain("NO_CHANGES");
  });

  it("validates the final amended RFQ against publication invariants", () => {
    const validationStart = governedAmendmentMigration.indexOf(
      "if char_length(btrim(coalesce(next_rfq.title, ''))) < 3",
    );
    const updateStart = governedAmendmentMigration.indexOf(
      "update public.rfqs",
      validationStart,
    );

    expect(validationStart).toBeGreaterThan(-1);
    expect(updateStart).toBeGreaterThan(validationStart);
    expect(governedAmendmentMigration).toContain(
      "char_length(btrim(coalesce(next_rfq.description, ''))) < 9",
    );
    expect(governedAmendmentMigration).toContain(
      "char_length(btrim(coalesce(next_rfq.category, ''))) < 2",
    );
    expect(governedAmendmentMigration).toContain(
      "char_length(btrim(coalesce(next_rfq.location, ''))) < 2",
    );
    expect(governedAmendmentMigration).toContain(
      "next_rfq.mobilization_date > next_rfq.substantial_completion_date",
    );
    expect(governedAmendmentMigration).toContain(
      "PUBLICATION_INVARIANT_VIOLATION",
    );
  });

  it("removes broad client RFQ updates while retaining audited internal metadata", () => {
    expect(governedAmendmentMigration).toContain(
      "revoke update on table public.rfqs from authenticated;",
    );
    expect(governedAmendmentMigration).toContain(
      "grant update (internal_project_id) on table public.rfqs to authenticated;",
    );
    expect(governedAmendmentMigration).toContain(
      "create trigger audit_rfq_internal_project_id_update_trigger",
    );
    expect(governedAmendmentMigration).toContain(
      "'RFQ_INTERNAL_METADATA_UPDATED'",
    );
    expect(governedAmendmentMigration).not.toContain(
      "grant update on table public.rfqs to authenticated",
    );
    expect(governedAmendmentMigration).not.toContain("set_config(");
    expect(governedAmendmentMigration).not.toContain("current_setting(");
  });

  it("does not widen adjacent acknowledgement, award, or notification authority", () => {
    expect(governedAmendmentMigration).not.toMatch(
      /grant\s+(?:insert|update|delete)[\s\S]*?public\.rfq_addenda[\s\S]*?authenticated/i,
    );
    expect(governedAmendmentMigration).not.toContain(
      "public.rfq_addendum_acknowledgements",
    );
    expect(governedAmendmentMigration).not.toContain(
      "create or replace function public.award_rfq_quote",
    );
    expect(governedAmendmentMigration).not.toContain("public.quotes");
    expect(governedAmendmentMigration).not.toContain("public.notifications");
  });

  it("blocks direct post-publication document and attachment package mutations", () => {
    expect(governedAmendmentMigration).toContain(
      "create or replace function public.enforce_published_rfq_package_mutation()",
    );
    expect(governedAmendmentMigration).toContain("security invoker");
    expect(governedAmendmentMigration).toContain(
      "current_user in ('anon', 'authenticated', 'service_role')",
    );
    expect(governedAmendmentMigration).toContain(
      "target_rfq_status <> 'draft'",
    );
    expect(governedAmendmentMigration).toContain(
      "Published RFQ package changes require a governed Addendum.",
    );
    expect(governedAmendmentMigration).toContain(
      "before insert or delete on public.rfq_document_requirements",
    );
    expect(governedAmendmentMigration).toContain(
      "before insert or delete on public.rfq_attachments",
    );
    expect(governedAmendmentMigration).not.toContain("set_config(");
    expect(governedAmendmentMigration).not.toContain("current_setting(");
  });

  it("allows draft RFQ cascades but prevents authenticated published hard-delete", () => {
    expect(migration).toMatch(
      /create table public\.rfq_addenda \([\s\S]*?rfq_id uuid not null references public\.rfqs \(id\) on delete cascade/,
    );
    expect(migration).toMatch(
      /create table public\.rfq_attachments \([\s\S]*?rfq_id uuid not null references public\.rfqs \(id\) on delete cascade/,
    );
    expect(launchBaseline).toMatch(
      /"rfq_document_requirements_rfq_id_fkey" FOREIGN KEY \("rfq_id"\) REFERENCES "public"\."rfqs"\("id"\) ON DELETE CASCADE/,
    );
    expect(governedAmendmentMigration).toContain(
      'drop policy if exists "Workspace administrators can delete company RFQs"',
    );
    expect(governedAmendmentMigration).toContain(
      'create policy "Workspace administrators can delete company RFQs"',
    );
    expect(governedAmendmentMigration).toMatch(
      /create policy "Workspace administrators can delete company RFQs"[\s\S]*?for delete[\s\S]*?to authenticated[\s\S]*?rfqs\.status = 'draft'/,
    );
    expect(governedAmendmentMigration).toMatch(
      /if not found and tg_op = 'DELETE' then[\s\S]*?return old;/,
    );
    expect(governedAmendmentMigration).toContain(
      "RFQ not found for package mutation.",
    );
  });

  it("routes each material package operation through one atomic Addendum RPC", () => {
    expect(governedAmendmentMigration).toContain(
      "create or replace function public.amend_published_rfq_package(",
    );
    expect(governedAmendmentMigration).toContain("p_rfq_id uuid");
    expect(governedAmendmentMigration).toContain("p_change jsonb");
    expect(governedAmendmentMigration).toContain("p_reason text");
    expect(governedAmendmentMigration).toContain("security definer");
    expect(governedAmendmentMigration).toContain("set search_path = ''");
    expect(governedAmendmentMigration).toContain("'add_document_requirement'");
    expect(governedAmendmentMigration).toContain("'remove_document_requirement'");
    expect(governedAmendmentMigration).toContain("'add_attachment'");
    expect(governedAmendmentMigration).toContain("'remove_attachment'");
    expect(governedAmendmentMigration).toContain("INVALID_PACKAGE_CHANGE");
    expect(governedAmendmentMigration).toContain("PROHIBITED_PACKAGE_FIELDS");
    expect(governedAmendmentMigration).toContain("NO_PACKAGE_CHANGE");
    expect(governedAmendmentMigration).toContain("for update");
    expect(governedAmendmentMigration).toContain("target_rfq.status <> 'open'");
    expect(governedAmendmentMigration).toContain(
      "public.parse_rfq_deadline_timestamptz(target_rfq.deadline)",
    );

    const packageRpcStart = governedAmendmentMigration.indexOf(
      "create or replace function public.amend_published_rfq_package(",
    );
    const packageRpcEnd = governedAmendmentMigration.indexOf(
      "comment on function public.amend_published_rfq_package(",
      packageRpcStart,
    );
    const packageRpc = governedAmendmentMigration.slice(
      packageRpcStart,
      packageRpcEnd,
    );

    expect(packageRpcStart).toBeGreaterThan(-1);
    expect(packageRpcEnd).toBeGreaterThan(packageRpcStart);
    expect(packageRpc).toContain("insert into public.rfq_document_requirements");
    expect(packageRpc).toContain("delete from public.rfq_document_requirements");
    expect(packageRpc).toContain("insert into public.rfq_attachments");
    expect(packageRpc).toContain("delete from public.rfq_attachments");
    expect(packageRpc).toContain("from storage.objects as stored_object");
    expect(packageRpc).toContain(
      "select stored_object.id\n    into locked_storage_object_id",
    );
    expect(packageRpc).toMatch(
      /from storage\.objects as stored_object[\s\S]*?where stored_object\.bucket_id = 'rfq-attachments'[\s\S]*?for update;/,
    );
    expect(packageRpc).toContain("ATTACHMENT_OBJECT_NOT_FOUND");
    expect(packageRpc).toContain("INVALID_ATTACHMENT_PATH");
    expect(packageRpc).toContain(
      "if p_requires_acknowledgement is not true then",
    );
    expect(packageRpc).toContain("ACKNOWLEDGEMENT_REQUIRED");
    expect(packageRpc).toMatch(
      /insert into public\.rfq_addenda[\s\S]*?btrim\(p_title\)[\s\S]*?\n\s*true,/,
    );
    expect(packageRpc).not.toContain(
      "coalesce(p_requires_acknowledgement, true)",
    );
    expect(packageRpc).toContain("insert into public.rfq_addenda");
    expect(packageRpc.lastIndexOf("insert into public.rfq_addenda")).toBeGreaterThan(
      packageRpc.indexOf("insert into public.rfq_document_requirements"),
    );
    expect(packageRpc.lastIndexOf("insert into public.rfq_addenda")).toBeGreaterThan(
      packageRpc.indexOf("delete from public.rfq_attachments"),
    );
  });

  it("keeps draft and legacy package workflows while exposing no bypass grants", () => {
    expect(governedAmendmentMigration).toContain(
      "if target_rfq_status <> 'draft' then",
    );
    expect(governedAmendmentMigration).not.toContain(
      'drop policy if exists "Issuer procurement users can declare document requirements"',
    );
    expect(governedAmendmentMigration).not.toContain(
      'drop policy if exists "Issuer procurement users can remove document requirements"',
    );
    expect(governedAmendmentMigration).not.toContain(
      'drop policy if exists "Issuer procurement users can upload attachments"',
    );
    expect(governedAmendmentMigration).not.toContain(
      'drop policy if exists "Issuer procurement users can delete attachments"',
    );
    expect(governedAmendmentMigration).toContain(
      "insert into public.rfq_addenda",
    );
    expect(governedAmendmentMigration).toContain("affected_documents");
    expect(governedAmendmentMigration).toContain(
      "revoke all\non function public.amend_published_rfq_package(uuid, jsonb, text, text, text, boolean)\nfrom public;",
    );
    expect(governedAmendmentMigration).toContain(
      "revoke all\non function public.amend_published_rfq_package(uuid, jsonb, text, text, text, boolean)\nfrom anon;",
    );
    expect(governedAmendmentMigration).toContain(
      "grant execute\non function public.amend_published_rfq_package(uuid, jsonb, text, text, text, boolean)\nto authenticated;",
    );
  });

  it("makes storage visibility follow governed attachment registration", () => {
    expect(governedAmendmentMigration).toContain(
      'drop policy if exists "RFQ participants can read rfq-attachments objects"',
    );
    expect(governedAmendmentMigration).toContain(
      'create policy "RFQ participants can read rfq-attachments objects"',
    );
    expect(governedAmendmentMigration).toContain(
      "attachment.file_path = storage.objects.name",
    );
    expect(governedAmendmentMigration).toContain(
      'drop policy if exists "Issuer procurement users can delete rfq-attachments objects"',
    );
    expect(governedAmendmentMigration).toContain(
      'create policy "Issuer procurement users can delete rfq-attachments objects"',
    );
    expect(governedAmendmentMigration).toContain("r.status = 'draft'");
    expect(governedAmendmentMigration).toContain(
      "or not exists (\n          select 1\n          from public.rfq_attachments as attachment",
    );
    expect(governedAmendmentMigration).not.toContain(
      'drop policy if exists "Issuer procurement users can upload rfq-attachments objects"',
    );
  });
});

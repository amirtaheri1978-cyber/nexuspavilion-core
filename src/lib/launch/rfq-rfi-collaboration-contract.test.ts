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
  "supabase/migrations/20260834000000_rfi_collaboration_persistence_foundation.sql",
);
const rfqCreate = readSource("src/app/api/rfqs/route.ts");
const addendaApi = readSource("src/app/api/rfq-addenda/route.ts");
const acknowledgementApi = readSource(
  "src/app/api/rfq-addendum-acknowledgements/route.ts",
);
const attachmentsApi = readSource("src/app/api/rfq-attachments/route.ts");
const quotesApi = readSource("src/app/api/quotes/route.ts");
const rfiApi = readSource("src/app/api/rfq-rfis/route.ts");
const upload = readSource("src/components/rfq-document-upload.tsx");
const library = readSource("src/components/rfq-document-library.tsx");
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
    expect(addendaApi).not.toContain("addendumNumber");
    expect(addendaApi).not.toContain("addendum_number:");
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
});

import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  serializeCompanyDocumentsForClient,
  type CompanyDocumentRecord,
} from "@/lib/company/documents";

const BASELINE_V2_PATH =
  "supabase/migrations/20260911000000_launch_candidate_baseline_v2.sql";
const BASELINE_V2_FILENAME = "20260911000000_launch_candidate_baseline_v2.sql";

function normalizeContractSql(source: string) {
  return source
    .replace(/\r\n/g, "\n")
    .replace(/"/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

const baselineSql = readSource(BASELINE_V2_PATH);
const sql = normalizeContractSql(baselineSql);

function sectionBetween(start: string, end: string) {
  const startIndex = sql.indexOf(start.toLowerCase());
  expect(startIndex).toBeGreaterThan(-1);

  const endIndex = sql.indexOf(end.toLowerCase(), startIndex);
  expect(endIndex).toBeGreaterThan(startIndex);

  return sql.slice(startIndex, endIndex);
}

const createTableBlock = sectionBetween(
  "create table if not exists public.company_documents",
  "alter table public.company_documents owner",
);

const createFunctionBody = sectionBetween(
  "create or replace function public.create_company_document(",
  "alter function public.create_company_document(",
);

const updateFunctionBody = sectionBetween(
  "create or replace function public.update_company_document(",
  "alter function public.update_company_document(",
);

const deleteFunctionBody = sectionBetween(
  "create or replace function public.delete_company_document(",
  "alter function public.delete_company_document(",
);

describe("company documents table contract (FINAL ACTIVE: Baseline V2)", () => {
  it("creates a company-owned table with the exact approved column set", () => {
    expect(createTableBlock).toContain("id uuid default gen_random_uuid() not null");
    expect(createTableBlock).toContain("company_id uuid not null");
    expect(sql).toContain(
      "company_documents_company_id_fkey foreign key (company_id) references public.companies(id) on delete cascade",
    );
    expect(createTableBlock).toContain("document_type text not null");
    expect(createTableBlock).toContain("title text not null");
    expect(createTableBlock).toContain("file_name text not null");
    expect(createTableBlock).toContain("file_path text not null");
    expect(createTableBlock).toContain("file_type text not null");
    expect(createTableBlock).toContain("file_size bigint not null");
    expect(createTableBlock).toContain("issued_on date");
    expect(createTableBlock).toContain("expires_on date");
    expect(sql).toContain(
      "company_documents_uploaded_by_fkey foreign key (uploaded_by) references public.profiles(id) on delete set null",
    );
    expect(createTableBlock).toContain("created_at timestamp with time zone");
    expect(createTableBlock).toContain("updated_at timestamp with time zone");
  });

  it("never introduces notes, identifiers, status, public, or FK columns", () => {
    for (const forbidden of [
      "notes",
      "description",
      "issuer",
      "provider",
      "credential_identifier",
      "policy_identifier",
      "coverage_limit",
      "verification_status",
      "is_public",
      "signed_url",
      "qualification_id",
      "compliance_id",
    ]) {
      expect(
        createTableBlock,
        `table must not declare ${forbidden}`,
      ).not.toContain(forbidden);
    }

    expect(createTableBlock).not.toMatch(/\bstatus\b/);
  });

  it("restricts document_type to the five approved values", () => {
    expect(createTableBlock).toContain("'insurance'");
    expect(createTableBlock).toContain("'workers_compensation'");
    expect(createTableBlock).toContain("'safety'");
    expect(createTableBlock).toContain("'qualification'");
    expect(createTableBlock).toContain("'other'");
    expect(createTableBlock).not.toContain("'tax_document'");
    expect(createTableBlock).not.toContain("'license_document'");
  });

  it("enforces title, file, MIME, size, and date constraints", () => {
    expect(createTableBlock).toContain("check ((char_length(btrim(title)) > 0))");
    expect(createTableBlock).toContain("check ((char_length(title) <= 160))");
    expect(createTableBlock).toContain(
      "check ((char_length(btrim(file_name)) > 0))",
    );
    expect(createTableBlock).toContain(
      "check ((char_length(file_name) <= 255))",
    );
    expect(sql).toContain("company_documents_file_path_unique unique (file_path)");
    expect(createTableBlock).toContain(
      "check (((file_size > 0) and (file_size <= 10485760)))",
    );
    expect(createTableBlock).toContain("'application/pdf'");
    expect(createTableBlock).toContain("'image/jpeg'");
    expect(createTableBlock).toContain("'image/png'");
    expect(createTableBlock).toContain("'image/webp'");
    expect(createTableBlock).toContain(
      "check (((expires_on is null) or (issued_on is null) or (expires_on >= issued_on)))",
    );
  });
});

describe("company documents security contract (FINAL ACTIVE: Baseline V2)", () => {
  it("enables RLS and limits internal select to active/archived same-company members", () => {
    expect(sql).toContain(
      "alter table public.company_documents enable row level security",
    );
    expect(sql).toContain(
      "create policy company_documents_select_active_member",
    );
    expect(sql).toContain("om.company_id = company_documents.company_id");
    expect(sql).toContain(
      "om.membership_status = any (array['active'::text, 'archived'::text])",
    );
  });

  it("grants select only to authenticated and never grants anon table access", () => {
    expect(sql).toContain(
      "grant select on table public.company_documents to authenticated",
    );
    expect(sql).not.toContain(
      "grant select on table public.company_documents to anon",
    );
    expect(sql).not.toContain(
      "grant insert on table public.company_documents to authenticated",
    );
    expect(sql).not.toContain(
      "grant update on table public.company_documents to authenticated",
    );
    expect(sql).not.toContain(
      "grant delete on table public.company_documents to authenticated",
    );
    expect(sql).not.toContain(
      "grant all on table public.company_documents to authenticated",
    );
    expect(sql).not.toContain("company_documents_public");
  });

  it("declares owned SECURITY DEFINER write primitives with a safe search_path", () => {
    for (const fn of [
      "create_company_document",
      "update_company_document",
      "delete_company_document",
    ]) {
      expect(sql).toContain(`create or replace function public.${fn}(`);
    }

    expect(createFunctionBody).toContain("security definer");
    expect(createFunctionBody).toContain(
      "set search_path to 'public', 'pg_temp'",
    );
    expect(sql).toContain(
      "alter function public.create_company_document(p_company_id uuid, p_document_id uuid, p_document_type text, p_title text, p_file_name text, p_file_path text, p_file_type text, p_file_size bigint, p_issued_on date, p_expires_on date) owner to postgres",
    );
  });

  it("grants execute to authenticated only", () => {
    expect(sql).toContain(
      "revoke all on function public.create_company_document(p_company_id uuid, p_document_id uuid, p_document_type text, p_title text, p_file_name text, p_file_path text, p_file_type text, p_file_size bigint, p_issued_on date, p_expires_on date) from public",
    );
    expect(sql).toContain(
      "grant all on function public.create_company_document(p_company_id uuid, p_document_id uuid, p_document_type text, p_title text, p_file_name text, p_file_path text, p_file_type text, p_file_size bigint, p_issued_on date, p_expires_on date) to authenticated",
    );
    expect(sql).toContain(
      "grant all on function public.delete_company_document(p_company_id uuid, p_document_id uuid) to authenticated",
    );
  });
});

describe("company documents private bucket and storage policies", () => {
  it("creates a private 10 MiB company-documents bucket with the exact MIME allowlist", () => {
    expect(sql).toContain("'company-documents'");
    expect(sql).toContain("public = false");
    expect(sql).toContain("file_size_limit = 10485760");
    expect(sql).toContain("'application/pdf'::text");
    expect(sql).toContain("'image/jpeg'::text");
    expect(sql).toContain("'image/png'::text");
    expect(sql).toContain("'image/webp'::text");
  });

  it("binds storage SELECT to active/archived membership and matching metadata", () => {
    const selectPolicy = sectionBetween(
      "create policy company members can read company-documents objects",
      "create policy company owners and admins can read company-documents cleanup objects",
    );

    expect(selectPolicy).toContain("for select");
    expect(selectPolicy).toContain("to authenticated");
    expect(selectPolicy).toContain("bucket_id = 'company-documents'");
    expect(selectPolicy).toContain(
      "om.membership_status = any (array['active'::text, 'archived'::text])",
    );
    expect(selectPolicy).toContain("cd.file_path = name");
    expect(selectPolicy).toContain(
      "om.company_id::text = (storage.foldername(name))[1]",
    );
    expect(selectPolicy).not.toContain("anon");
  });

  it("adds owner/admin same-company SELECT so cleanup can see orphan objects", () => {
    const cleanupPolicy = sectionBetween(
      "create policy company owners and admins can read company-documents cleanup objects",
      "create policy company owners and admins can upload company-documents objects",
    );

    expect(cleanupPolicy).toContain("for select");
    expect(cleanupPolicy).toContain("to authenticated");
    expect(cleanupPolicy).toContain("bucket_id = 'company-documents'");
    expect(cleanupPolicy).toContain(
      "om.company_id::text = (storage.foldername(name))[1]",
    );
    expect(cleanupPolicy).toContain("om.membership_status = 'active'");
    expect(cleanupPolicy).toContain(
      "om.workspace_role in ('owner', 'admin')",
    );
    expect(cleanupPolicy).not.toContain("cd.file_path");
    expect(cleanupPolicy).not.toContain("company_documents");
    expect(cleanupPolicy).not.toContain("anon");
  });

  it("limits storage INSERT and DELETE to owner/admin and does not create UPDATE", () => {
    const insertPolicy = sectionBetween(
      "create policy company owners and admins can upload company-documents objects",
      "create policy company owners and admins can delete company-documents objects",
    );
    const deletePolicy = sectionBetween(
      "create policy company owners and admins can delete company-documents objects",
      "-- company-logos",
    );

    expect(insertPolicy).toContain("for insert");
    expect(insertPolicy).toContain(
      "om.workspace_role in ('owner', 'admin')",
    );
    expect(insertPolicy).toContain("om.membership_status = 'active'");
    expect(insertPolicy).toContain(
      "om.company_id::text = (storage.foldername(name))[1]",
    );
    expect(insertPolicy).not.toContain("procurement_function");
    expect(insertPolicy).not.toContain("'buyer'");
    expect(deletePolicy).toContain("for delete");
    expect(deletePolicy).toContain("to authenticated");
    expect(deletePolicy).toContain("bucket_id = 'company-documents'");
    expect(deletePolicy).toContain(
      "om.workspace_role in ('owner', 'admin')",
    );
    expect(deletePolicy).toContain(
      "om.company_id::text = (storage.foldername(name))[1]",
    );
    expect(deletePolicy).toContain("om.membership_status = 'active'");
    expect(sql).not.toMatch(
      /create policy[^;]+on storage\.objects\s+for update/,
    );
    expect(sql).toContain("public = false");
  });
});

describe("company documents RPC authorization and object verification", () => {
  it("resolves authentication, company, membership, and role before payload validation", () => {
    const unauthenticated = createFunctionBody.indexOf("'unauthenticated'");
    const invalidCompany = createFunctionBody.indexOf("'invalid_company'");
    const membershipLookup = createFunctionBody.indexOf(
      "from public.organization_memberships as om",
    );
    const ownerAdminGuard = createFunctionBody.indexOf(
      "if actor_workspace_role not in ('owner', 'admin') then",
    );
    const invalidPayload = createFunctionBody.indexOf("'invalid_payload'");

    expect(unauthenticated).toBeGreaterThan(-1);
    expect(unauthenticated).toBeLessThan(invalidCompany);
    expect(invalidCompany).toBeLessThan(membershipLookup);
    expect(membershipLookup).toBeLessThan(ownerAdminGuard);
    expect(ownerAdminGuard).toBeLessThan(invalidPayload);
  });

  it("verifies the private storage object exists before inserting metadata", () => {
    const objectCheck = createFunctionBody.indexOf("from storage.objects as so");
    const insertRows = createFunctionBody.indexOf(
      "insert into public.company_documents (",
    );

    expect(objectCheck).toBeGreaterThan(-1);
    expect(objectCheck).toBeLessThan(insertRows);
    expect(createFunctionBody).toContain("so.bucket_id = 'company-documents'");
    expect(createFunctionBody).toContain("so.name = p_file_path");
    expect(createFunctionBody).toContain("'object_not_found'");
  });

  it("verifies storage object MIME and size metadata before write and audit", () => {
    const createNotFound = createFunctionBody.indexOf("'object_not_found'");
    const createMetadataCheck = createFunctionBody.indexOf(
      "so.metadata->>'mimetype' = p_file_type",
    );
    const createSizePattern = createFunctionBody.indexOf(
      "so.metadata->>'size' ~ '^[0-9]+$'",
    );
    const createSizeCast = createFunctionBody.indexOf(
      "(so.metadata->>'size')::bigint = p_file_size",
    );
    const createInsert = createFunctionBody.indexOf(
      "insert into public.company_documents (",
    );
    const createAudit = createFunctionBody.indexOf(
      "insert into public.audit_logs",
    );
    const updateNotFound = updateFunctionBody.indexOf("'object_not_found'");
    const updateMetadataCheck = updateFunctionBody.indexOf(
      "so.metadata->>'mimetype' = p_file_type",
    );
    const updateSizePattern = updateFunctionBody.indexOf(
      "so.metadata->>'size' ~ '^[0-9]+$'",
    );
    const updateSizeCast = updateFunctionBody.indexOf(
      "(so.metadata->>'size')::bigint = p_file_size",
    );
    const updateWrite = updateFunctionBody.indexOf(
      "update public.company_documents",
    );
    const updateAudit = updateFunctionBody.indexOf(
      "insert into public.audit_logs",
    );
    const updateReplacementElse = updateFunctionBody.indexOf(
      "next_file_name := current_document.file_name;",
    );

    expect(createFunctionBody).toContain("so.metadata->>'mimetype'");
    expect(createFunctionBody).toContain("so.metadata->>'size'");
    expect(createFunctionBody).toContain("'invalid_storage_object'");
    expect(createFunctionBody).toContain("'object_not_found'");

    expect(updateFunctionBody).toContain("so.metadata->>'mimetype'");
    expect(updateFunctionBody).toContain("so.metadata->>'size'");
    expect(updateFunctionBody).toContain("'invalid_storage_object'");
    expect(updateFunctionBody).toContain("'object_not_found'");

    expect(createNotFound).toBeGreaterThan(-1);
    expect(createNotFound).toBeLessThan(createMetadataCheck);
    expect(createSizePattern).toBeGreaterThan(createMetadataCheck);
    expect(createSizePattern).toBeLessThan(createSizeCast);
    expect(createSizeCast).toBeLessThan(createInsert);
    expect(createInsert).toBeLessThan(createAudit);

    expect(updateNotFound).toBeGreaterThan(-1);
    expect(updateNotFound).toBeLessThan(updateMetadataCheck);
    expect(updateSizePattern).toBeGreaterThan(updateMetadataCheck);
    expect(updateSizePattern).toBeLessThan(updateSizeCast);
    expect(updateSizeCast).toBeLessThan(updateReplacementElse);
    expect(updateReplacementElse).toBeLessThan(updateWrite);
    expect(updateWrite).toBeLessThan(updateAudit);

    expect(createFunctionBody).toContain(
      "storage object metadata does not match the document.",
    );
    expect(updateFunctionBody).toContain(
      "storage object metadata does not match the document.",
    );
    expect(createFunctionBody).toContain(
      "nullif(btrim(so.metadata->>'mimetype'), '') is not null",
    );
    expect(createFunctionBody).toContain(
      "nullif(btrim(so.metadata->>'size'), '') is not null",
    );
    expect(updateFunctionBody).toContain(
      "nullif(btrim(so.metadata->>'size'), '') is not null",
    );
  });

  it("requires generated company/document/object paths and keeps structural traversal guards", () => {
    expect(createFunctionBody).toContain(
      "/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(pdf|jpg|jpeg|png|webp)$'",
    );
    expect(createFunctionBody).toContain("position('..' in p_file_path) > 0");
    expect(createFunctionBody).not.toContain(
      "position(lower(normalized_file_name) in lower(p_file_path)) > 0",
    );
    expect(updateFunctionBody).not.toContain(
      "position(lower(normalized_file_name) in lower(p_file_path)) > 0",
    );
  });

  it("validates original file-name extensions against MIME in create and replacement", () => {
    expect(createFunctionBody).toContain(
      "lower(normalized_file_name) !~ '\\.pdf$'",
    );
    expect(createFunctionBody).toContain(
      "lower(normalized_file_name) !~ '\\.(jpg|jpeg)$'",
    );
    expect(createFunctionBody).toContain(
      "lower(normalized_file_name) !~ '\\.png$'",
    );
    expect(createFunctionBody).toContain(
      "lower(normalized_file_name) !~ '\\.webp$'",
    );
    expect(updateFunctionBody).toContain(
      "lower(normalized_file_name) !~ '\\.pdf$'",
    );
    expect(updateFunctionBody).toContain(
      "lower(normalized_file_name) !~ '\\.(jpg|jpeg)$'",
    );
    expect(updateFunctionBody).toContain(
      "lower(normalized_file_name) !~ '\\.png$'",
    );
    expect(updateFunctionBody).toContain(
      "lower(normalized_file_name) !~ '\\.webp$'",
    );
    expect(createFunctionBody).toContain("'invalid_file_type'");
    expect(updateFunctionBody).toContain("'invalid_file_type'");
  });
});

describe("company documents RPC audit contract", () => {
  it("emits uploaded, updated, and deleted events inside the write transaction", () => {
    expect(createFunctionBody).toContain("'company_document_uploaded'");
    expect(updateFunctionBody).toContain("'company_document_updated'");
    expect(deleteFunctionBody).toContain("'company_document_deleted'");

    expect(
      createFunctionBody.indexOf("insert into public.company_documents"),
    ).toBeLessThan(createFunctionBody.indexOf("insert into public.audit_logs"));
    expect(
      updateFunctionBody.indexOf("update public.company_documents"),
    ).toBeLessThan(updateFunctionBody.indexOf("insert into public.audit_logs"));
    expect(
      deleteFunctionBody.indexOf("delete from public.company_documents"),
    ).toBeLessThan(deleteFunctionBody.indexOf("insert into public.audit_logs"));
  });

  it("restricts audit metadata to safe aggregate context", () => {
    for (const body of [
      createFunctionBody,
      updateFunctionBody,
      deleteFunctionBody,
    ]) {
      const auditMetadata = body.slice(
        body.indexOf("insert into public.audit_logs"),
      );

      expect(auditMetadata).toContain("'document_id'");
      expect(auditMetadata).toContain("'document_type'");
      expect(auditMetadata).toContain("'file_type'");
      expect(auditMetadata).toContain("'file_size'");
      expect(auditMetadata).toContain("'document_count'");
      expect(auditMetadata).toContain("'workspace_role'");
      expect(auditMetadata).not.toContain("normalized_title");
      expect(auditMetadata).not.toContain("normalized_file_name");
      expect(auditMetadata).not.toContain("p_file_path");
      expect(auditMetadata).not.toContain("p_title");
      expect(auditMetadata).not.toContain("signed_url");
      expect(auditMetadata).not.toContain("p_issued_on");
    }
  });
});

describe("company documents domain boundaries", () => {
  it("keeps RFQ attachment and branding concerns out of document write RPCs", () => {
    for (const body of [
      createFunctionBody,
      updateFunctionBody,
      deleteFunctionBody,
    ]) {
      for (const outOfDomain of [
        "rfq_attachments",
        "rfq-attachments",
        "rfq_addenda",
        "company-logos",
        "supplier_compliance",
        "approved_vendors",
        "invitations",
        "replace_company_qualifications",
        "replace_company_compliance",
      ]) {
        expect(body).not.toContain(outOfDomain);
      }
    }
  });

  it("satisfies the existing supplier-domain closeout guard against active migrations", () => {
    const migrationFiles = readdirSync(
      resolve(process.cwd(), "supabase/migrations"),
    ).filter((file) => file.endsWith(".sql"));

    expect(migrationFiles).toEqual([BASELINE_V2_FILENAME]);

    const migrationSql = normalizeContractSql(
      readSource(`supabase/migrations/${BASELINE_V2_FILENAME}`),
    );

    expect(migrationSql).not.toMatch(
      /create\s+table(?:\s+if\s+not\s+exists)?\s+(?:public\.)?approved_vendors\b/,
    );
    expect(migrationSql).not.toMatch(
      /create\s+table(?:\s+if\s+not\s+exists)?\s+(?:public\.)?supplier_compliance\b/,
    );
  });
});

describe("company documents surface boundaries", () => {
  it("leaves the public company profile free of documents data", () => {
    const publicProfile = readSource("src/app/company/[slug]/page.tsx");

    expect(publicProfile).not.toContain("CompanyDocumentsDisplay");
    expect(publicProfile).not.toContain("CompanyDocumentsEditor");
    expect(publicProfile).not.toContain("loadCompanyDocuments");
    expect(publicProfile).not.toContain("company_documents");
  });

  it("integrates documents only into the internal workspace surfaces", () => {
    const internalCompany = readSource("src/app/company/page.tsx");
    const settings = readSource("src/app/company/settings/page.tsx");

    expect(internalCompany).toContain("CompanyDocumentsDisplay");
    expect(internalCompany).toContain("loadCompanyDocuments");
    expect(settings).toContain("CompanyDocumentsEditor");
    expect(settings).toContain("loadCompanyDocuments");
    expect(settings.indexOf("Company Compliance")).toBeLessThan(
      settings.indexOf("Company Documents"),
    );
  });

  it("keeps RFQ, branding, and invitation files untouched", () => {
    for (const relativePath of [
      "src/app/api/rfq-attachments/route.ts",
      "src/components/rfq-document-upload.tsx",
      "src/components/company-logo-upload.tsx",
      "src/app/company/[slug]/page.tsx",
    ]) {
      const before = readSource(relativePath);

      expect(before).not.toContain("company_documents");
      expect(before).not.toContain("create_company_document");
    }
  });
});

function readDocumentsLookupBlock(relativePath: string) {
  const source = readSource(relativePath);
  const lookupIndex = source.indexOf(
    "companyDocuments = await loadCompanyDocuments",
  );
  expect(lookupIndex).toBeGreaterThan(-1);

  const logIndex = source.indexOf(
    'console.error("Company documents lookup failed."',
    lookupIndex,
  );
  expect(logIndex).toBeGreaterThan(lookupIndex);

  const logEnd = source.indexOf("});", logIndex);
  return source.slice(lookupIndex, logEnd + 3);
}

describe("company documents page load logging is privacy safe", () => {
  const surfaces = [
    "src/app/company/settings/page.tsx",
    "src/app/company/page.tsx",
  ];

  it.each(surfaces)("logs a fixed safe error token in %s", (relativePath) => {
    const block = readDocumentsLookupBlock(relativePath);

    expect(block).toContain('errorCode: "COMPANY_DOCUMENTS_LOOKUP_FAILED"');
    expect(block).toContain("companyId,");
    expect(block).toMatch(/userId: [A-Za-z.]+,/);
    expect(block).toContain("} catch {");
    expect(block).not.toMatch(/catch\s*\(/);
  });
});

describe("company document RSC serialization contract", () => {
  it("projects only client-required company document fields across RSC boundaries", () => {
    const source: CompanyDocumentRecord = {
      id: "11111111-1111-4111-8111-111111111111",
      company_id: "22222222-2222-4222-8222-222222222222",
      document_type: "insurance",
      title: "Insurance Certificate",
      file_name: "insurance.pdf",
      file_path:
        "22222222-2222-4222-8222-222222222222/11111111-1111-4111-8111-111111111111/33333333-3333-4333-8333-333333333333.pdf",
      file_type: "application/pdf",
      file_size: 12345,
      issued_on: "2026-01-01",
      expires_on: "2027-01-01",
      uploaded_by: "44444444-4444-4444-8444-444444444444",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-02T00:00:00.000Z",
    };

    expect(serializeCompanyDocumentsForClient([source])).toEqual([
      {
        id: source.id,
        document_type: "insurance",
        title: "Insurance Certificate",
        file_name: "insurance.pdf",
        file_size: 12345,
        issued_on: "2026-01-01",
        expires_on: "2027-01-01",
      },
    ]);
  });

  it("uses the projected DTO on both company server-to-client boundaries", () => {
    const companyPage = readSource("src/app/company/page.tsx");
    const settingsPage = readSource("src/app/company/settings/page.tsx");
    const display = readSource(
      "src/components/company-documents-display.tsx",
    );
    const editor = readSource(
      "src/components/company-documents-editor.tsx",
    );

    expect(companyPage).toContain(
      "serializeCompanyDocumentsForClient(companyDocuments)",
    );
    expect(companyPage).toContain(
      "documents={companyDocumentsForClient}",
    );
    expect(companyPage).not.toContain(
      "documents={companyDocuments}",
    );

    expect(settingsPage).toContain(
      "serializeCompanyDocumentsForClient(companyDocuments)",
    );
    expect(settingsPage).toContain(
      "initialDocuments={companyDocumentsForClient}",
    );
    expect(settingsPage).not.toContain(
      "initialDocuments={companyDocuments}",
    );

    expect(display).toContain("CompanyDocumentClientRecord");
    expect(editor).toContain("CompanyDocumentClientRecord");
  });
});

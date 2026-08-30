import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION_PATH =
  "supabase/migrations/20260841000000_company_compliance_contract.sql";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

const sql = readSource(MIGRATION_PATH);

function sectionBetween(start: string, end: string) {
  const startIndex = sql.indexOf(start);
  expect(startIndex).toBeGreaterThan(-1);

  const endIndex = sql.indexOf(end, startIndex);
  expect(endIndex).toBeGreaterThan(startIndex);

  return sql.slice(startIndex, endIndex);
}

function indexOfRequired(snippet: string) {
  const index = sql.indexOf(snippet);
  expect(index, `expected migration to contain: ${snippet}`).toBeGreaterThan(-1);
  return index;
}

const createTableBlock = sectionBetween(
  "create table if not exists public.company_compliance",
  "create unique index",
);

const replaceFunctionBody = sectionBetween(
  "create or replace function public.replace_company_compliance",
  "comment on table public.company_compliance",
);

describe("company compliance migration table contract", () => {
  it("creates a company-owned table with the exact approved column set", () => {
    expect(createTableBlock).toContain("id uuid primary key");
    expect(createTableBlock).toContain(
      "company_id uuid not null references public.companies(id) on delete cascade",
    );
    expect(createTableBlock).toContain("compliance_type text not null");
    expect(createTableBlock).toContain("name text not null");
    expect(createTableBlock).toContain("provider text");
    expect(createTableBlock).toContain("effective_on date");
    expect(createTableBlock).toContain("expires_on date");
    expect(createTableBlock).toContain("sort_order integer not null default 0");
    expect(createTableBlock).toContain("created_at timestamptz not null");
    expect(createTableBlock).toContain("updated_at timestamptz not null");
  });

  it("never introduces identifier, coverage, status, or document columns", () => {
    for (const forbidden of [
      "policy_identifier",
      "reference_identifier",
      "credential_identifier",
      "coverage_limit",
      "coverage_amount",
      "currency",
      "notes",
      "score",
      "verification_status",
      "document_id",
      "file_path",
      "attachment",
      "is_public",
    ]) {
      expect(
        createTableBlock,
        `table must not declare ${forbidden}`,
      ).not.toContain(forbidden);
    }

    expect(createTableBlock).not.toMatch(/\bstatus\b/);
  });

  it("restricts compliance_type to the three approved values", () => {
    expect(createTableBlock).toContain(
      "check (compliance_type in ('insurance', 'workers_compensation', 'safety'))",
    );
    expect(createTableBlock).not.toContain("'license'");
    expect(createTableBlock).not.toContain("'certification'");
    expect(createTableBlock).not.toContain("'accreditation'");
    expect(createTableBlock).not.toContain("'registration'");
  });

  it("enforces enterprise-grade value constraints", () => {
    expect(createTableBlock).toContain("check (char_length(btrim(name)) > 0)");
    expect(createTableBlock).toContain("check (char_length(name) <= 160)");
    expect(createTableBlock).toContain(
      "check (provider is null or char_length(provider) <= 160)",
    );
    expect(createTableBlock).toContain("check (sort_order >= 0)");
    expect(createTableBlock).toContain(
      "check (expires_on is null or effective_on is null or expires_on >= effective_on)",
    );
  });

  it("uses a unique index matching the collision-safe semantic identity", () => {
    const uniqueIndex = sectionBetween(
      "create unique index if not exists company_compliance_company_type_dedupe_idx",
      "create index if not exists",
    );

    expect(uniqueIndex).toContain("company_id");
    expect(uniqueIndex).toContain("compliance_type");
    expect(uniqueIndex).toContain("lower(btrim(name))");
    expect(uniqueIndex).toContain("coalesce(lower(btrim(provider)), '')");
  });
});

describe("company compliance migration security contract", () => {
  it("enables RLS and limits internal select to active same-company members", () => {
    expect(sql).toContain(
      "alter table public.company_compliance enable row level security",
    );
    expect(sql).toContain("create policy company_compliance_select_active_member");
    expect(sql).toContain("for select");
    expect(sql).toContain("to authenticated");
    expect(sql).toContain("from public.organization_memberships as om");
    expect(sql).toContain("om.user_id = auth.uid()");
    expect(sql).toContain("om.company_id = company_compliance.company_id");
    expect(sql).toContain("om.membership_status = 'active'");
  });

  it("revokes direct DML and grants select only to authenticated", () => {
    expect(sql).toContain(
      "revoke all on table public.company_compliance from public;",
    );
    expect(sql).toContain(
      "revoke all on table public.company_compliance from anon;",
    );
    expect(sql).toContain(
      "revoke insert, update, delete on table public.company_compliance from authenticated;",
    );
    expect(sql).toContain(
      "grant select on table public.company_compliance to authenticated;",
    );
  });

  it("never grants anon access and never creates a public projection", () => {
    expect(sql).not.toContain("company_compliance_public");
    expect(sql).not.toMatch(/create\s+(or\s+replace\s+)?view/i);
    expect(sql).not.toMatch(/grant[^;]*\bto\b[^;]*\banon\b/i);
    expect(sql).not.toContain("security_invoker");
  });

  it("declares the write primitive as an owned SECURITY DEFINER function", () => {
    expect(sql).toContain(
      "create or replace function public.replace_company_compliance(",
    );
    expect(sql).toContain("p_company_id uuid");
    expect(sql).toContain("p_compliance jsonb");
    expect(sql).toContain("security definer");
    expect(sql).toContain("set search_path = public, pg_temp");
    expect(sql).toContain(
      "alter function public.replace_company_compliance(uuid, jsonb)\n  owner to postgres;",
    );
  });

  it("grants execute to authenticated only", () => {
    expect(sql).toContain(
      "revoke all on function public.replace_company_compliance(uuid, jsonb)\nfrom public;",
    );
    expect(sql).toContain(
      "revoke all on function public.replace_company_compliance(uuid, jsonb)\nfrom anon;",
    );
    expect(sql).toContain(
      "grant execute on function public.replace_company_compliance(uuid, jsonb)\nto authenticated;",
    );
  });

  it("wraps the whole contract in a single transaction", () => {
    expect(sql.trimStart().startsWith("begin;")).toBe(true);
    expect(sql.trimEnd().endsWith("commit;")).toBe(true);
  });
});

describe("company compliance RPC authorization ordering", () => {
  it("resolves authentication, tenancy, membership, and role before payload validation", () => {
    const unauthenticated = indexOfRequired("'UNAUTHENTICATED'");
    const invalidCompany = indexOfRequired("'INVALID_COMPANY'");
    const membershipLookup = indexOfRequired(
      "from public.organization_memberships as om\n  where om.user_id = actor_user_id",
    );
    const ownerAdminGuard = indexOfRequired(
      "if actor_workspace_role not in ('owner', 'admin') then",
    );
    const invalidPayload = indexOfRequired("'INVALID_PAYLOAD'");

    expect(unauthenticated).toBeLessThan(invalidCompany);
    expect(invalidCompany).toBeLessThan(membershipLookup);
    expect(membershipLookup).toBeLessThan(ownerAdminGuard);
    expect(ownerAdminGuard).toBeLessThan(invalidPayload);
  });

  it("keeps every domain validation code after the last FORBIDDEN branch", () => {
    const lastForbidden = sql.lastIndexOf("'FORBIDDEN'");

    expect(lastForbidden).toBeGreaterThan(-1);

    for (const domainCode of [
      "'INVALID_PAYLOAD'",
      "'INVALID_COMPLIANCE_TYPE'",
      "'INVALID_COMPLIANCE_GROUP'",
      "'COMPLIANCE_LIMIT_EXCEEDED'",
      "'INVALID_COMPLIANCE_ITEM'",
      "'INVALID_COMPLIANCE_FIELD'",
      "'INVALID_COMPLIANCE_NAME'",
      "'INVALID_COMPLIANCE_PROVIDER'",
      "'INVALID_COMPLIANCE_DATE'",
      "'DUPLICATE_COMPLIANCE'",
    ]) {
      expect(
        indexOfRequired(domainCode),
        `${domainCode} must be reachable only after authorization`,
      ).toBeGreaterThan(lastForbidden);
    }
  });

  it("deletes existing rows only after the payload has fully validated", () => {
    const duplicateGuard = indexOfRequired("'DUPLICATE_COMPLIANCE'");
    const deleteStatement = indexOfRequired(
      "delete from public.company_compliance",
    );

    expect(duplicateGuard).toBeLessThan(deleteStatement);
  });
});

describe("company compliance RPC payload contract", () => {
  it("accepts only the three approved group keys", () => {
    expect(replaceFunctionBody).toContain(
      "if compliance_key not in ('insurance', 'workers_compensation', 'safety') then",
    );
  });

  it("accepts only the four approved item fields", () => {
    expect(replaceFunctionBody).toContain("if compliance_field not in (\n          'name',\n          'provider',\n          'effective_on',\n          'expires_on'\n        ) then");
  });

  it("requires name to be present and a JSON string", () => {
    expect(replaceFunctionBody).toContain("if not (compliance_item ? 'name')");
    expect(replaceFunctionBody).toContain(
      "jsonb_typeof(compliance_item -> 'name') is distinct from 'string'",
    );
  });

  it("collapses whitespace before trimming so SQL matches TypeScript normalization", () => {
    expect(replaceFunctionBody).toContain(
      "btrim(\n        regexp_replace(compliance_item ->> 'name', '\\s+', ' ', 'g')\n      )",
    );
    expect(replaceFunctionBody).not.toContain(
      "regexp_replace(btrim(compliance_item ->> 'name')",
    );
  });

  it("treats a blank provider as NULL", () => {
    expect(replaceFunctionBody).toContain(
      "if normalized_provider = '' then\n            normalized_provider := null;",
    );
    expect(replaceFunctionBody).toContain(
      "normalized_provider := nullif(\n          btrim(regexp_replace(compliance_item ->> 'provider', '\\s+', ' ', 'g')),\n          ''\n        );",
    );
  });

  it("enforces strict ISO dates and rejects invalid calendar dates", () => {
    const isoChecks = replaceFunctionBody.match(
      /!~ '\^\[0-9\]\{4\}-\[0-9\]\{2\}-\[0-9\]\{2\}\$'/g,
    );

    expect(isoChecks).toHaveLength(2);
    expect(replaceFunctionBody).toContain(
      "'Effective date must be a valid calendar date.'",
    );
    expect(replaceFunctionBody).toContain(
      "'Expiry date must be a valid calendar date.'",
    );
  });

  it("requires expiry to be on or after the effective date", () => {
    expect(replaceFunctionBody).toContain(
      "and normalized_expires_on < normalized_effective_on then",
    );
    expect(replaceFunctionBody).toContain(
      "'Expiry date must be on or after the effective date.'",
    );
  });

  it("caps each group at 40 records", () => {
    expect(replaceFunctionBody).toContain(
      "if jsonb_array_length(compliance_items) > 40 then",
    );
  });

  it("uses a collision-safe structural dedupe key aligned with the unique index", () => {
    expect(replaceFunctionBody).toContain(
      "dedupe_key := jsonb_build_array(\n        compliance_key,\n        lower(normalized_name),\n        lower(coalesce(normalized_provider, ''))\n      )::text;",
    );
    expect(replaceFunctionBody).not.toMatch(/dedupe_key\s*:=\s*[^;]*\|\|/);
  });
});

describe("company compliance RPC audit contract", () => {
  it("emits the audit event inside the same transaction as the write", () => {
    const insertRows = indexOfRequired(
      "insert into public.company_compliance (",
    );
    const auditInsert = indexOfRequired("insert into public.audit_logs (");
    const functionEnd = indexOfRequired("$$;");

    expect(insertRows).toBeLessThan(auditInsert);
    expect(auditInsert).toBeLessThan(functionEnd);
    expect(replaceFunctionBody).toContain("'COMPANY_COMPLIANCE_UPDATED'");
  });

  it("restricts audit metadata to aggregate and actor context only", () => {
    const auditMetadata = sectionBetween(
      "insert into public.audit_logs (",
      "return jsonb_build_object(",
    );

    expect(auditMetadata).toContain("'compliance_count', inserted_count");
    expect(auditMetadata).toContain("'counts_by_type', counts_by_type");
    expect(auditMetadata).toContain("'id', actor_user_id");
    expect(auditMetadata).toContain("'workspace_role', actor_workspace_role");
    expect(auditMetadata).toContain("'updated_at'");

    for (const leak of [
      "normalized_name",
      "normalized_provider",
      "normalized_effective_on",
      "normalized_expires_on",
      "p_compliance",
      "compliance_item",
    ]) {
      expect(
        auditMetadata,
        `audit metadata must not carry ${leak}`,
      ).not.toContain(leak);
    }
  });
});

describe("company compliance domain boundaries", () => {
  it("never creates or references the out-of-domain supplier procurement tables", () => {
    expect(sql).not.toContain("supplier_compliance");
    expect(sql).not.toContain("approved_vendors");
    expect(sql).not.toContain("buyer_company_id");
    expect(sql).not.toContain("vendor_company_id");
  });

  it("satisfies the existing supplier-domain closeout guard", () => {
    const migrationFiles = readdirSync(
      resolve(process.cwd(), "supabase/migrations"),
    ).filter((file) => file.endsWith(".sql"));

    expect(migrationFiles).toContain(
      "20260841000000_company_compliance_contract.sql",
    );

    for (const file of migrationFiles) {
      const migrationSql = readSource(
        `supabase/migrations/${file}`,
      ).toLowerCase();

      expect(migrationSql).not.toMatch(
        /create\s+table(?:\s+if\s+not\s+exists)?\s+(?:public\.)?approved_vendors\b/,
      );
      expect(migrationSql).not.toMatch(
        /create\s+table(?:\s+if\s+not\s+exists)?\s+(?:public\.)?supplier_compliance\b/,
      );
    }
  });

  it("keeps RFQ and qualifications structures out of the compliance migration", () => {
    for (const outOfDomain of [
      "insurance_required",
      "insurance_notes",
      "safety_requirements",
      "performance_bond_required",
      "bid_bond_required",
      "prequalification_notes",
      "company_qualifications",
      "replace_company_qualifications",
      "company_capabilities",
    ]) {
      expect(sql, `migration must not reference ${outOfDomain}`).not.toContain(
        outOfDomain,
      );
    }
  });

  it("creates no document, storage, or attachment primitives", () => {
    for (const documentConcern of [
      "storage.",
      "signed_url",
      "bucket",
      "file_path",
      "document_id",
      "attachment",
    ]) {
      expect(sql).not.toContain(documentConcern);
    }
  });
});

describe("company compliance surface boundaries", () => {
  it("leaves the public company profile free of compliance data", () => {
    const publicProfile = readSource("src/app/company/[slug]/page.tsx");

    expect(publicProfile).not.toContain("CompanyComplianceDisplay");
    expect(publicProfile).not.toContain("company/compliance");
    expect(publicProfile).not.toContain("loadCompanyCompliance");
    expect(publicProfile).not.toContain("company_compliance");
  });

  it("integrates compliance only into the internal workspace surfaces", () => {
    const internalCompany = readSource("src/app/company/page.tsx");
    const settings = readSource("src/app/company/settings/page.tsx");

    expect(internalCompany).toContain("CompanyComplianceDisplay");
    expect(internalCompany).toContain("loadCompanyCompliance");
    expect(settings).toContain("CompanyComplianceEditor");
    expect(settings).toContain("loadCompanyCompliance");
  });

  it("keeps the self-declared trust statement on the internal surfaces", () => {
    const display = readSource("src/components/company-compliance-display.tsx");
    const editor = readSource("src/components/company-compliance-editor.tsx");

    expect(display).toContain("COMPANY_COMPLIANCE_SELF_DECLARED_NOTICE");
    expect(editor).toContain("COMPANY_COMPLIANCE_SELF_DECLARED_NOTICE");
  });
});

// These pages carry unrelated pre-existing logging, so every assertion is
// scoped to the compliance lookup block alone.
function readComplianceLookupBlock(relativePath: string) {
  const source = readSource(relativePath);

  const lookupIndex = source.indexOf(
    "companyCompliance = await loadCompanyCompliance",
  );
  expect(
    lookupIndex,
    `${relativePath} must load company compliance`,
  ).toBeGreaterThan(-1);

  const logIndex = source.indexOf(
    'console.error("Company compliance lookup failed."',
    lookupIndex,
  );
  expect(
    logIndex,
    `${relativePath} must log a compliance lookup failure`,
  ).toBeGreaterThan(lookupIndex);

  const logEnd = source.indexOf("});", logIndex);
  expect(logEnd).toBeGreaterThan(logIndex);

  return source.slice(lookupIndex, logEnd + 3);
}

describe("company compliance page load logging is privacy safe", () => {
  const surfaces = [
    "src/app/company/settings/page.tsx",
    "src/app/company/page.tsx",
  ];

  it.each(surfaces)("logs a fixed safe error token in %s", (relativePath) => {
    const block = readComplianceLookupBlock(relativePath);

    expect(block).toContain('errorCode: "COMPANY_COMPLIANCE_LOOKUP_FAILED"');
    expect(block).toContain("companyId,");
    expect(block).toMatch(/userId: [A-Za-z.]+,/);
  });

  it.each(surfaces)(
    "never binds or logs the caught raw error in %s",
    (relativePath) => {
      const block = readComplianceLookupBlock(relativePath);

      // The logger name itself contains "error", so it is excluded before
      // asserting that no raw error identifier survives in the block.
      const withoutLoggerName = block.replace(/console\.error/g, "log");

      expect(block).toContain("} catch {");
      expect(block).not.toMatch(/catch\s*\(/);
      expect(withoutLoggerName).not.toMatch(/\berror\b/);
    },
  );

  it.each(surfaces)(
    "never logs raw error surfaces in %s",
    (relativePath) => {
      const block = readComplianceLookupBlock(relativePath);

      for (const leak of [
        "message",
        "details",
        "hint",
        "stack",
        "payload",
      ]) {
        expect(
          block,
          `compliance lookup logging must not carry ${leak}`,
        ).not.toContain(leak);
      }
    },
  );
});

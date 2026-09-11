import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

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

function indexOfRequired(snippet: string, haystack = sql) {
  const index = haystack.indexOf(snippet.toLowerCase());
  expect(index, `expected contract to contain: ${snippet}`).toBeGreaterThan(-1);
  return index;
}

const createTableBlock = sectionBetween(
  "create table if not exists public.company_compliance",
  "alter table public.company_compliance owner",
);

const replaceFunctionBody = sectionBetween(
  "create or replace function public.replace_company_compliance",
  "alter function public.replace_company_compliance",
);

describe("company compliance table contract (FINAL ACTIVE: Baseline V2)", () => {
  it("creates a company-owned table with the exact approved column set", () => {
    expect(createTableBlock).toContain("id uuid default gen_random_uuid() not null");
    expect(createTableBlock).toContain("company_id uuid not null");
    expect(sql).toContain(
      "company_compliance_company_id_fkey foreign key (company_id) references public.companies(id) on delete cascade",
    );
    expect(createTableBlock).toContain("compliance_type text not null");
    expect(createTableBlock).toContain("name text not null");
    expect(createTableBlock).toContain("provider text");
    expect(createTableBlock).toContain("effective_on date");
    expect(createTableBlock).toContain("expires_on date");
    expect(createTableBlock).toContain("sort_order integer default 0 not null");
    expect(createTableBlock).toContain("created_at timestamp with time zone");
    expect(createTableBlock).toContain("updated_at timestamp with time zone");
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
      "compliance_type = any (array['insurance'::text, 'workers_compensation'::text, 'safety'::text])",
    );
    expect(createTableBlock).not.toContain("'license'");
    expect(createTableBlock).not.toContain("'certification'");
    expect(createTableBlock).not.toContain("'accreditation'");
    expect(createTableBlock).not.toContain("'registration'");
  });

  it("enforces enterprise-grade value constraints", () => {
    expect(createTableBlock).toContain("check ((char_length(btrim(name)) > 0))");
    expect(createTableBlock).toContain("check ((char_length(name) <= 160))");
    expect(createTableBlock).toContain(
      "check (((provider is null) or (char_length(provider) <= 160)))",
    );
    expect(createTableBlock).toContain("check ((sort_order >= 0))");
    expect(createTableBlock).toContain(
      "check (((expires_on is null) or (effective_on is null) or (expires_on >= effective_on)))",
    );
  });

  it("uses a unique index matching the collision-safe semantic identity", () => {
    expect(sql).toContain(
      "create unique index company_compliance_company_type_dedupe_idx",
    );
    expect(sql).toContain("lower(btrim(name))");
    expect(sql).toContain("coalesce(lower(btrim(provider)), ''::text)");
  });
});

describe("company compliance security contract (FINAL ACTIVE: Baseline V2)", () => {
  it("enables RLS and limits internal select to active/archived same-company members", () => {
    expect(sql).toContain(
      "alter table public.company_compliance enable row level security",
    );
    expect(sql).toContain(
      "create policy company_compliance_select_active_member",
    );
    expect(sql).toContain("for select");
    expect(sql).toContain("to authenticated");
    expect(sql).toContain("from public.organization_memberships om");
    expect(sql).toContain("om.user_id = auth.uid()");
    expect(sql).toContain("om.company_id = company_compliance.company_id");
    expect(sql).toContain(
      "om.membership_status = any (array['active'::text, 'archived'::text])",
    );
  });

  it("grants select only to authenticated and does not grant write privileges", () => {
    expect(sql).toContain(
      "grant select on table public.company_compliance to authenticated",
    );
    expect(sql).not.toContain(
      "grant select on table public.company_compliance to anon",
    );
    expect(sql).not.toContain(
      "grant insert on table public.company_compliance to authenticated",
    );
    expect(sql).not.toContain(
      "grant update on table public.company_compliance to authenticated",
    );
    expect(sql).not.toContain(
      "grant delete on table public.company_compliance to authenticated",
    );
    expect(sql).not.toContain(
      "grant all on table public.company_compliance to authenticated",
    );
  });

  it("never grants anon access and never creates a public projection", () => {
    expect(sql).not.toContain("company_compliance_public");
    expect(sql).not.toMatch(
      /grant\s+(select|all)\s+on\s+table\s+public\.company_compliance\s+to\s+anon/,
    );
  });

  it("declares the write primitive as an owned SECURITY DEFINER function", () => {
    expect(sql).toContain(
      "create or replace function public.replace_company_compliance(",
    );
    expect(replaceFunctionBody).toContain("p_company_id uuid");
    expect(replaceFunctionBody).toContain("p_compliance jsonb");
    expect(replaceFunctionBody).toContain("security definer");
    expect(replaceFunctionBody).toContain(
      "set search_path to 'public', 'pg_temp'",
    );
    expect(sql).toContain(
      "alter function public.replace_company_compliance(p_company_id uuid, p_compliance jsonb) owner to postgres",
    );
  });

  it("grants execute to authenticated only", () => {
    expect(sql).toContain(
      "revoke all on function public.replace_company_compliance(p_company_id uuid, p_compliance jsonb) from public",
    );
    expect(sql).toContain(
      "grant all on function public.replace_company_compliance(p_company_id uuid, p_compliance jsonb) to authenticated",
    );
    expect(sql).not.toContain(
      "grant all on function public.replace_company_compliance(p_company_id uuid, p_compliance jsonb) to anon",
    );
  });
});

describe("company compliance RPC authorization ordering", () => {
  it("resolves authentication, tenancy, membership, and role before payload validation", () => {
    const unauthenticated = indexOfRequired(
      "'unauthenticated'",
      replaceFunctionBody,
    );
    const invalidCompany = indexOfRequired(
      "'invalid_company'",
      replaceFunctionBody,
    );
    const membershipLookup = indexOfRequired(
      "from public.organization_memberships as om where om.user_id = actor_user_id",
      replaceFunctionBody,
    );
    const ownerAdminGuard = indexOfRequired(
      "if actor_workspace_role not in ('owner', 'admin') then",
      replaceFunctionBody,
    );
    const invalidPayload = indexOfRequired(
      "'invalid_payload'",
      replaceFunctionBody,
    );

    expect(unauthenticated).toBeLessThan(invalidCompany);
    expect(invalidCompany).toBeLessThan(membershipLookup);
    expect(membershipLookup).toBeLessThan(ownerAdminGuard);
    expect(ownerAdminGuard).toBeLessThan(invalidPayload);
  });

  it("keeps every domain validation code after the last FORBIDDEN branch", () => {
    const lastForbidden = replaceFunctionBody.lastIndexOf("'forbidden'");

    expect(lastForbidden).toBeGreaterThan(-1);

    for (const domainCode of [
      "'invalid_payload'",
      "'invalid_compliance_type'",
      "'invalid_compliance_group'",
      "'compliance_limit_exceeded'",
      "'invalid_compliance_item'",
      "'invalid_compliance_field'",
      "'invalid_compliance_name'",
      "'invalid_compliance_provider'",
      "'invalid_compliance_date'",
      "'duplicate_compliance'",
    ]) {
      expect(
        indexOfRequired(domainCode, replaceFunctionBody),
        `${domainCode} must be reachable only after authorization`,
      ).toBeGreaterThan(lastForbidden);
    }
  });

  it("deletes existing rows only after the payload has fully validated", () => {
    const duplicateGuard = indexOfRequired(
      "'duplicate_compliance'",
      replaceFunctionBody,
    );
    const deleteStatement = indexOfRequired(
      "delete from public.company_compliance",
      replaceFunctionBody,
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
    expect(replaceFunctionBody).toContain(
      "if compliance_field not in ('name','provider','effective_on','expires_on') then",
    );
  });

  it("requires name to be present and a JSON string", () => {
    expect(replaceFunctionBody).toContain("if not (compliance_item ? 'name')");
    expect(replaceFunctionBody).toContain(
      "jsonb_typeof(compliance_item -> 'name') is distinct from 'string'",
    );
  });

  it("collapses whitespace before trimming so SQL matches TypeScript normalization", () => {
    expect(replaceFunctionBody).toContain(
      "btrim(regexp_replace(compliance_item ->> 'name', '\\s+', ' ', 'g'))",
    );
    expect(replaceFunctionBody).not.toContain(
      "regexp_replace(btrim(compliance_item ->> 'name')",
    );
  });

  it("treats a blank provider as NULL", () => {
    expect(replaceFunctionBody).toContain(
      "if normalized_provider = '' then normalized_provider := null;",
    );
    expect(replaceFunctionBody).toContain(
      "normalized_provider := nullif( btrim(regexp_replace(compliance_item ->> 'provider', '\\s+', ' ', 'g')), '' )",
    );
  });

  it("enforces strict ISO dates and rejects invalid calendar dates", () => {
    const isoChecks = replaceFunctionBody.match(
      /!~ '\^\[0-9\]\{4\}-\[0-9\]\{2\}-\[0-9\]\{2\}\$'/g,
    );

    expect(isoChecks).toHaveLength(2);
    expect(replaceFunctionBody).toContain(
      "'effective date must be a valid calendar date.'",
    );
    expect(replaceFunctionBody).toContain(
      "'expiry date must be a valid calendar date.'",
    );
  });

  it("requires expiry to be on or after the effective date", () => {
    expect(replaceFunctionBody).toContain(
      "and normalized_expires_on < normalized_effective_on then",
    );
    expect(replaceFunctionBody).toContain(
      "'expiry date must be on or after the effective date.'",
    );
  });

  it("caps each group at 40 records", () => {
    expect(replaceFunctionBody).toContain(
      "if jsonb_array_length(compliance_items) > 40 then",
    );
  });

  it("uses a collision-safe structural dedupe key aligned with the unique index", () => {
    expect(replaceFunctionBody).toContain(
      "dedupe_key := jsonb_build_array( compliance_key, lower(normalized_name), lower(coalesce(normalized_provider, '')) )::text;",
    );
    expect(replaceFunctionBody).not.toMatch(/dedupe_key\s*:=\s*[^;]*\|\|/);
  });
});

describe("company compliance RPC audit contract", () => {
  it("emits the audit event inside the same transaction as the write", () => {
    const insertRows = indexOfRequired(
      "insert into public.company_compliance (",
      replaceFunctionBody,
    );
    const auditInsert = indexOfRequired(
      "insert into public.audit_logs (",
      replaceFunctionBody,
    );

    expect(insertRows).toBeLessThan(auditInsert);
    expect(replaceFunctionBody).toContain("'company_compliance_updated'");
  });

  it("restricts audit metadata to aggregate and actor context only", () => {
    const auditStart = replaceFunctionBody.indexOf(
      "insert into public.audit_logs (",
    );
    const auditMetadata = replaceFunctionBody.slice(
      auditStart,
      replaceFunctionBody.indexOf("return jsonb_build_object(", auditStart),
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
  it("never creates supplier procurement tables in the active Baseline V2 migration", () => {
    expect(sql).not.toMatch(
      /create\s+table(?:\s+if\s+not\s+exists)?\s+(?:public\.)?supplier_compliance\b/,
    );
    expect(sql).not.toMatch(
      /create\s+table(?:\s+if\s+not\s+exists)?\s+(?:public\.)?approved_vendors\b/,
    );
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

  it("keeps RFQ requirement fields out of the compliance table and replace RPC", () => {
    for (const outOfDomain of [
      "insurance_required",
      "insurance_notes",
      "safety_requirements",
      "performance_bond_required",
      "bid_bond_required",
      "prequalification_notes",
    ]) {
      expect(createTableBlock).not.toContain(outOfDomain);
      expect(replaceFunctionBody).not.toContain(outOfDomain);
    }
  });

  it("creates no document, storage, or attachment primitives in compliance RPC/table", () => {
    for (const documentConcern of [
      "storage.",
      "signed_url",
      "bucket",
      "file_path",
      "document_id",
      "attachment",
    ]) {
      expect(createTableBlock).not.toContain(documentConcern);
      expect(replaceFunctionBody).not.toContain(documentConcern);
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

      for (const leak of ["message", "details", "hint", "stack", "payload"]) {
        expect(
          block,
          `compliance lookup logging must not carry ${leak}`,
        ).not.toContain(leak);
      }
    },
  );
});

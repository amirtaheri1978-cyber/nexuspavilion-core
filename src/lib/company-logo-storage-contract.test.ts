import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const BASE_MIGRATION_PATH =
  "supabase/migrations/20260843000000_company_logo_storage_contract.sql";
const REMEDIATION_MIGRATION_PATH =
  "supabase/migrations/20260845000000_fix_company_logo_bound_delete_policy.sql";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

function stripLineComments(source: string) {
  return source
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n")
    .trim();
}

function compactWhitespace(source: string) {
  return source.replace(/\s+/g, " ").trim();
}

const baseSql = readSource(BASE_MIGRATION_PATH);
const remediationSql = readSource(REMEDIATION_MIGRATION_PATH);

const executableBaseSql = stripLineComments(baseSql);
const executableRemediationSql = stripLineComments(remediationSql);
const compactBaseSql = compactWhitespace(baseSql);
const compactRemediationSql = compactWhitespace(remediationSql);

function sectionBetween(source: string, start: string, end: string) {
  const normalizedStart = compactWhitespace(start);
  const normalizedEnd = compactWhitespace(end);
  const startIndex = source.indexOf(normalizedStart);

  expect(startIndex).toBeGreaterThan(-1);

  const endIndex = source.indexOf(normalizedEnd, startIndex);

  expect(endIndex).toBeGreaterThan(startIndex);

  return source.slice(startIndex, endIndex);
}

describe("company logo Storage migration contract", () => {
  it("preserves the original Storage contract as immutable migration history", () => {
    expect(executableBaseSql.startsWith("begin;")).toBe(true);
    expect(executableBaseSql.endsWith("commit;")).toBe(true);
    expect(compactBaseSql).toContain("where id = 'Company-logos'");
    expect(compactBaseSql).toContain(
      "Company-logos bucket is required before installing the logo storage contract.",
    );
    expect(compactBaseSql).not.toContain("insert into storage.buckets");
  });

  it("keeps public logo delivery while restricting managed uploads by MIME and size", () => {
    expect(compactBaseSql).toContain("update storage.buckets");
    expect(compactBaseSql).toContain("public = true");
    expect(compactBaseSql).toContain("file_size_limit = 5242880");
    expect(compactBaseSql).toContain("'image/jpeg'");
    expect(compactBaseSql).toContain("'image/png'");
    expect(compactBaseSql).toContain("'image/webp'");
    expect(compactBaseSql).not.toContain("'image/svg+xml'");
    expect(compactBaseSql).not.toContain("'image/gif'");
  });

  it("keeps authenticated managed-path access scoped to active owner/admin membership", () => {
    expect(compactBaseSql).toContain("(storage.foldername(name))[2] = 'branding'");
    expect(compactBaseSql).toContain("om.user_id = auth.uid()");
    expect(compactBaseSql).toContain("om.membership_status = 'active'");
    expect(compactBaseSql).toContain("om.workspace_role in ('owner', 'admin')");
    expect(compactBaseSql).not.toContain("'buyer'");
    expect(compactBaseSql).toContain("/branding/");
    expect(compactBaseSql).toContain("\\.(jpg|jpeg|png|webp)$");
  });

  it("keeps the base SELECT, INSERT, and DELETE policies narrow and creates no UPDATE policy", () => {
    const selectPolicy = sectionBetween(
      compactBaseSql,
      'create policy "Company owners and admins can read Company-logos objects"',
      'create policy "Company owners and admins can upload Company-logos objects"',
    );
    const insertPolicy = sectionBetween(
      compactBaseSql,
      'create policy "Company owners and admins can upload Company-logos objects"',
      'create policy "Company owners and admins can delete unbound Company-logos objects"',
    );
    const deletePolicy = sectionBetween(
      compactBaseSql,
      'create policy "Company owners and admins can delete unbound Company-logos objects"',
      "commit;",
    );

    expect(selectPolicy).toContain("for select");
    expect(selectPolicy).toContain("to authenticated");
    expect(insertPolicy).toContain("for insert");
    expect(insertPolicy).toContain("to authenticated");
    expect(deletePolicy).toContain("for delete");
    expect(deletePolicy).toContain("to authenticated");

    expect(compactBaseSql).not.toMatch(
      /create policy[\s\S]*?on storage\.objects\s+for update/i,
    );
    expect(compactBaseSql).not.toMatch(
      /create policy[\s\S]*?on storage\.objects[\s\S]*?to (?:anon|public)\b/i,
    );
  });

  it("fixes the verified bound-logo correlation defect through a separate forward migration", () => {
    expect(executableRemediationSql.startsWith("begin;")).toBe(true);
    expect(executableRemediationSql.endsWith("commit;")).toBe(true);

    expect(compactRemediationSql).toContain(
      "policyname = 'Company owners and admins can delete unbound Company-logos obje'",
    );
    expect(compactRemediationSql).toContain("installed_cmd <> 'DELETE'");
    expect(compactRemediationSql).toContain(
      "installed_roles <> array['authenticated'::name]",
    );
    expect(compactRemediationSql).toContain("legacy_shape :=");
    expect(compactRemediationSql).toContain("remediated_shape :=");
  });

  it("binds company membership and current-logo protection to the outer Storage object explicitly", () => {
    const deletePolicy = sectionBetween(
      compactRemediationSql,
      'create policy "Company owners and admins can delete unbound Company-logos obje"',
      "commit;",
    );

    expect(deletePolicy).toContain(
      "om.company_id::text = (storage.foldername(storage.objects.name))[1]",
    );
    expect(deletePolicy).toContain(
      "c.id::text = (storage.foldername(storage.objects.name))[1]",
    );
    expect(deletePolicy).toContain(
      "'%/storage/v1/object/public/Company-logos/' || storage.objects.name",
    );
    expect(deletePolicy).not.toContain("storage.foldername(c.name)");
    expect(deletePolicy).not.toContain("|| c.name");
  });

  it("keeps the forward remediation delete-only and does not broaden Storage or governance authority", () => {
    expect(compactRemediationSql).toContain("for delete");
    expect(compactRemediationSql).toContain("to authenticated");
    expect(compactRemediationSql).not.toMatch(
      /create policy[\s\S]*?on storage\.objects\s+for update/i,
    );
    expect(compactRemediationSql).not.toMatch(
      /create policy[\s\S]*?on storage\.objects[\s\S]*?to (?:anon|public)\b/i,
    );
    expect(compactRemediationSql).not.toMatch(
      /grant\s+(?:all|insert|update|delete)\s+on\s+(?:table\s+)?storage\.objects/i,
    );
    expect(compactRemediationSql).not.toMatch(
      /grant\s+(?:all|insert|update|delete)\s+on\s+(?:table\s+)?public\.(?:audit_logs|notifications)/i,
    );
  });
});

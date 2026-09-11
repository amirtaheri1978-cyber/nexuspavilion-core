import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const BASELINE_V2_PATH =
  "supabase/migrations/20260911000000_launch_candidate_baseline_v2.sql";
const ARCHIVED_REMEDIATION_PATH =
  "supabase/legacy-migrations/pre-baseline-v2/20260845000000_fix_company_logo_bound_delete_policy.sql";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

function compactWhitespace(source: string) {
  return source.replace(/\s+/g, " ").trim();
}

const baselineSql = readSource(BASELINE_V2_PATH);
const compactBaselineSql = compactWhitespace(baselineSql);
const archivedRemediationSql = readSource(ARCHIVED_REMEDIATION_PATH);
const compactRemediationSql = compactWhitespace(archivedRemediationSql);

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
  it("canonical Baseline V2 self-provisions Company-logos bucket", () => {
    expect(compactBaselineSql.toLowerCase()).toContain(
      "insert into storage.buckets",
    );
    expect(compactBaselineSql).toContain("'Company-logos'");
    expect(compactBaselineSql.toLowerCase()).toContain(
      "on conflict (id) do update",
    );
    expect(compactBaselineSql).toContain("public = true");
    expect(compactBaselineSql).toContain("5242880");
    expect(compactBaselineSql).toContain("'image/jpeg'");
    expect(compactBaselineSql).toContain("'image/png'");
    expect(compactBaselineSql).toContain("'image/webp'");
    expect(compactBaselineSql).not.toContain(
      "Company-logos bucket is required before installing the logo storage contract.",
    );
  });

  it("keeps public logo delivery while restricting managed uploads by MIME and size", () => {
    expect(compactBaselineSql).toContain("public = true");
    expect(compactBaselineSql).toContain("file_size_limit = 5242880");
    expect(compactBaselineSql).toContain("'image/jpeg'");
    expect(compactBaselineSql).toContain("'image/png'");
    expect(compactBaselineSql).toContain("'image/webp'");
    expect(compactBaselineSql).not.toContain("'image/svg+xml'");
    expect(compactBaselineSql).not.toContain("'image/gif'");
  });

  it("keeps authenticated managed-path access scoped to active owner/admin membership", () => {
    expect(compactBaselineSql).toContain(
      "(storage.foldername(name))[2] = 'branding'",
    );
    expect(compactBaselineSql).toContain("om.user_id = auth.uid()");
    expect(compactBaselineSql).toContain("om.membership_status = 'active'");
    expect(compactBaselineSql).toContain(
      "om.workspace_role in ('owner', 'admin')",
    );
    expect(compactBaselineSql).toContain("/branding/");
    expect(compactBaselineSql).toContain("\\.(jpg|jpeg|png|webp)$");
  });

  it("keeps Baseline V2 SELECT, INSERT, and DELETE policies narrow with no UPDATE policy", () => {
    const selectPolicy = sectionBetween(
      compactBaselineSql,
      'create policy "Company owners and admins can read Company-logos objects"',
      'create policy "Company owners and admins can upload Company-logos objects"',
    );
    const insertPolicy = sectionBetween(
      compactBaselineSql,
      'create policy "Company owners and admins can upload Company-logos objects"',
      'create policy "Company owners and admins can delete unbound Company-logos obje"',
    );
    const deletePolicy = sectionBetween(
      compactBaselineSql,
      'create policy "Company owners and admins can delete unbound Company-logos obje"',
      "Re-baseline hardening:",
    );

    expect(selectPolicy).toContain("for select");
    expect(selectPolicy).toContain("to authenticated");
    expect(insertPolicy).toContain("for insert");
    expect(insertPolicy).toContain("to authenticated");
    expect(deletePolicy).toContain("for delete");
    expect(deletePolicy).toContain("to authenticated");

    expect(compactBaselineSql).not.toMatch(
      /create policy[\s\S]*?on storage\.objects\s+for update/i,
    );
    expect(compactBaselineSql).not.toMatch(
      /create policy[\s\S]*?on storage\.objects[\s\S]*?to (?:anon|public)\b/i,
    );
  });

  it("binds company membership and current-logo protection to the outer Storage object explicitly", () => {
    const deletePolicy = sectionBetween(
      compactBaselineSql,
      'create policy "Company owners and admins can delete unbound Company-logos obje"',
      "Re-baseline hardening:",
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

  it("preserves historical remediation migration 45 as archived evidence only", () => {
    expect(compactRemediationSql).toContain(
      "policyname = 'Company owners and admins can delete unbound Company-logos obje'",
    );
    expect(compactRemediationSql).toContain("legacy_shape :=");
    expect(compactRemediationSql).toContain("remediated_shape :=");
    expect(compactRemediationSql).toContain("for delete");
    expect(compactRemediationSql).toContain("to authenticated");
    expect(compactRemediationSql).not.toMatch(
      /create policy[\s\S]*?on storage\.objects\s+for update/i,
    );
  });
});

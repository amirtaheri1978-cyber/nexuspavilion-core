import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const route = readFileSync(
  resolve(
    process.cwd(),
    "src/app/api/representative-verification/[caseId]/approve/route.ts",
  ),
  "utf8",
);

describe("representative verification approval route", () => {
  it("uses the authenticated server client for the authoritative reviewer RPC", () => {
    expect(route).toContain(
      'import { createClient } from "@/lib/supabase/server"',
    );

    expect(route).toContain("await supabase.auth.getUser()");
    expect(route).toContain("export async function POST");

    expect(route).not.toMatch(
      /service_role|createclient\s*\([^)]*service/i,
    );
  });

  it("authenticates before validating the dynamic case identifier", () => {
    const authenticationIndex = route.indexOf(
      "await supabase.auth.getUser()",
    );

    const caseIdValidationIndex = route.indexOf(
      "UUID_PATTERN.test(caseId)",
    );

    expect(authenticationIndex).toBeGreaterThan(-1);
    expect(caseIdValidationIndex).toBeGreaterThan(-1);

    expect(authenticationIndex).toBeLessThan(caseIdValidationIndex);
  });

  it("uses only the dynamic UUID case ID for the exact approval RPC", () => {
    expect(route).toContain("params: Promise");
    expect(route).toContain("const { caseId } = await params");
    expect(route).toContain("UUID_PATTERN.test(caseId)");
    expect(route).toContain('failure("INVALID_CASE_ID", 422)');

    expect(route).toContain(
      '"approve_representative_verification"',
    );

    expect(route).toContain(
      "p_case_id: caseId",
    );

    expect(route).not.toMatch(
      /request\.json|reviewerUserId|companyId|representativeUserId|reviewedByUserId|decidedAt/i,
    );
  });

  it("normalizes controlled outcomes without raw database disclosure", () => {
    for (const text of [
      "AUTHENTICATION_REQUIRED: 401",
      "REVIEWER_NOT_AUTHORIZED: 403",
      "CASE_NOT_FOUND: 404",
      "CASE_NOT_PENDING: 409",
      "CASE_INVALIDATED: 409",
      "caseId: result.case_id",
      "result.idempotent === true",
      "INTERNAL_SERVER_ERROR",
    ]) {
      expect(route).toContain(text);
    }

    expect(route).toContain(
      'console.error("Representative verification approval RPC failed.");',
    );

    expect(route).not.toMatch(
      /error\.message|error\.details|error\.hint|console\.error\([^)]*,\s*error/i,
    );
  });

  it("does not prefetch cases or duplicate lifecycle authority", () => {
    expect(route).not.toMatch(
      /\.from\(\s*["'](representative_verification_cases|internal_reviewer_assignments|audit_logs|companies|organization_memberships)["']\s*\)/i,
    );

    expect(route).not.toMatch(
      /reject_representative_verification/i,
    );
  });
});
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const route = readFileSync(
  resolve(
    process.cwd(),
    "src/app/api/representative-verification/[caseId]/reject/route.ts",
  ),
  "utf8",
);

describe("representative verification rejection route", () => {
  it("uses the authenticated server client without service-role authority", () => {
    expect(route).toContain(
      'import { createClient } from "@/lib/supabase/server"',
    );

    expect(route).toContain("await supabase.auth.getUser()");
    expect(route).toContain("export async function POST");

    expect(route).not.toMatch(
      /service_role|createclient\s*\([^)]*service/i,
    );
  });

  it("authenticates before validating the case and rejection input", () => {
    const authenticationIndex = route.indexOf(
      "await supabase.auth.getUser()",
    );

    const caseIdValidationIndex = route.indexOf(
      "UUID_PATTERN.test(caseId)",
    );

    const bodyParsingIndex = route.indexOf(
      "body = await request.json()",
    );

    const rpcIndex = route.indexOf(
      '"reject_representative_verification"',
    );

    expect(authenticationIndex).toBeGreaterThan(-1);
    expect(caseIdValidationIndex).toBeGreaterThan(-1);
    expect(bodyParsingIndex).toBeGreaterThan(-1);
    expect(rpcIndex).toBeGreaterThan(-1);

    expect(authenticationIndex).toBeLessThan(caseIdValidationIndex);
    expect(caseIdValidationIndex).toBeLessThan(bodyParsingIndex);
    expect(bodyParsingIndex).toBeLessThan(rpcIndex);
  });

  it("accepts only the dynamic UUID and governed rejection reason", () => {
    for (const text of [
      "params: Promise",
      "const { caseId } = await params",
      "UUID_PATTERN.test(caseId)",
      'failure("INVALID_CASE_ID", 422)',
      "body = await request.json()",
      "rejectionReasonCode?: unknown",
      "Object.keys(body).length !== 1",
      'const REJECTION_REASON = "REPRESENTATIVE_AUTHORITY_NOT_CONFIRMED"',
      'failure("INVALID_REJECTION_REASON", 422)',
    ]) {
      expect(route).toContain(text);
    }

    expect(route).not.toMatch(
      /caseId\?: unknown|companyId|reviewerUserId|representativeUserId|reviewedByUserId|decidedAt|invalidationReasonCode/i,
    );
  });

  it("calls only the authoritative rejection RPC and normalizes its outcomes", () => {
    for (const text of [
      '"reject_representative_verification"',
      "p_case_id: caseId",
      "p_rejection_reason_code: rejectionReasonCode",
      "caseId: result.case_id",
      "result.idempotent === true",
      "REVIEWER_NOT_AUTHORIZED: 403",
      "CASE_NOT_FOUND: 404",
      "CASE_NOT_PENDING: 409",
      "CASE_INVALIDATED: 409",
      "CASE_REJECTION_CONFLICT: 409",
      "INVALID_REJECTION_REASON: 422",
      "INTERNAL_SERVER_ERROR",
    ]) {
      expect(route).toContain(text);
    }
  });

  it("does not prefetch cases, duplicate authority, or expose raw RPC errors", () => {
    expect(route).toContain(
      'console.error("Representative verification rejection RPC failed.");',
    );

    expect(route).not.toMatch(
      /error\.message|error\.details|error\.hint|console\.error\([^)]*,\s*error/i,
    );

    expect(route).not.toMatch(
      /\.from\(\s*["'](representative_verification_cases|internal_reviewer_assignments|audit_logs|companies|organization_memberships)["']\s*\)/i,
    );

    expect(route).not.toMatch(
      /submit_representative_verification|approve_representative_verification/i,
    );
  });
});
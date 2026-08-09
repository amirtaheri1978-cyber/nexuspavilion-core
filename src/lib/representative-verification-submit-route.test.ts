import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const route = readFileSync(
  resolve(
    process.cwd(),
    "src/app/api/representative-verification/submit/route.ts",
  ),
  "utf8",
);

describe("representative verification submission route", () => {
  it("uses the authenticated server client and exposes only POST", () => {
    expect(route).toContain(
      'import { createClient } from "@/lib/supabase/server"',
    );

    expect(route).toContain("await supabase.auth.getUser()");
    expect(route).toContain("export async function POST");

    expect(route).not.toMatch(
      /service_role|createclient\s*\([^)]*service/i,
    );
  });

  it("validates only a JSON company UUID before invoking the RPC", () => {
    expect(route).toContain("body = await request.json()");
    expect(route).toContain("companyId?: unknown");
    expect(route).toContain("UUID_PATTERN.test(companyId)");
    expect(route).toContain('failure("INVALID_COMPANY_ID", 422)');

    expect(route).toContain(
      '"submit_representative_verification"',
    );

    expect(route).toContain(
      "p_company_id: companyId",
    );

    expect(route).not.toMatch(
      /representativeUserId|submittedByUserId|submitted_owner_membership_id|audit_metadata/i,
    );
  });

  it("normalizes controlled outcomes without exposing raw database errors", () => {
    for (const text of [
      "AUTHENTICATION_REQUIRED: 401",
      "SUBMISSION_NOT_AUTHORIZED: 403",
      "DUPLICATE_PENDING_CASE: 409",
      "ALREADY_VERIFIED: 409",
      "OWNERSHIP_STATE_INCONSISTENT: 422",
      "INTERNAL_SERVER_ERROR",
      "caseId: result.case_id",
      "errorCode",
    ]) {
      expect(route).toContain(text);
    }

    expect(route).not.toMatch(
      /error\.message|error\.details|error\.hint/i,
    );
  });

  it("does not log raw Supabase RPC error objects", () => {
    expect(route).toContain(
      'console.error("Representative verification submission RPC failed.");',
    );

    expect(route).not.toMatch(
      /console\.error\([^)]*,\s*error\s*\)/i,
    );
  });

  it("does not bypass lifecycle authority with direct table mutations or other commands", () => {
    expect(route).not.toMatch(
      /\.from\(\s*["'](representative_verification_cases|audit_logs|internal_reviewer_assignments|companies|organization_memberships)["']\s*\)/i,
    );

    expect(route).not.toMatch(
      /approve_representative_verification|reject_representative_verification/i,
    );
  });
});
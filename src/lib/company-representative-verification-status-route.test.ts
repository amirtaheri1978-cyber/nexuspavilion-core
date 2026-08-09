import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const route = readFileSync(
  resolve(
    process.cwd(),
    "src/app/api/representative-verification/status/route.ts",
  ),
  "utf8",
)
  .replace(/\s+/g, " ")
  .trim();

describe("company representative verification status route", () => {
  it("uses a session-backed GET route with authentication before input validation", () => {
    expect(route).toContain(
      'import { createClient } from "@/lib/supabase/server"',
    );

    expect(route).toContain("export async function GET");
    expect(route).toContain("await supabase.auth.getUser()");
    expect(route).toContain("UUID_PATTERN.test(companyId)");

    const authenticationIndex = route.indexOf(
      "await supabase.auth.getUser()",
    );

    const validationIndex = route.indexOf(
      "UUID_PATTERN.test(companyId)",
    );

    expect(authenticationIndex).toBeGreaterThan(-1);
    expect(validationIndex).toBeGreaterThan(-1);
    expect(authenticationIndex).toBeLessThan(validationIndex);

    expect(route).toContain(
      'failure("AUTHENTICATION_REQUIRED", 401)',
    );

    expect(route).toContain(
      'failure("INVALID_COMPANY_ID", 422)',
    );

    expect(route).not.toMatch(
      /service_role|createclient\s*\([^)]*service/i,
    );
  });

  it("accepts exactly one companyId query parameter", () => {
    expect(route).toContain(
      'const companyId = searchParams.get("companyId")',
    );

    expect(route).toContain(
      "searchParams.size !== 1",
    );

    expect(route).toContain(
      "UUID_PATTERN.test(companyId)",
    );

    expect(route).not.toMatch(
      /representativeId|caseId|reviewerId|membershipId|ownerId|reasonCode|history/i,
    );
  });

  it("calls only the protected status RPC with the company input", () => {
    expect(route).toContain(
      '"get_company_representative_verification_status"',
    );

    expect(route).toContain(
      "{ p_company_id: companyId }",
    );

    expect(route).not.toMatch(
      /\.from\(\s*["'](representative_verification_cases|organization_memberships|internal_reviewer_assignments|audit_logs|companies)["']\s*\)/i,
    );

    expect(route).not.toMatch(
      /approve_representative_verification|reject_representative_verification|submit_representative_verification/i,
    );
  });

  it("normalizes only governed status values and controlled failures", () => {
    for (const status of [
      "unverified",
      "pending_review",
      "verified",
      "rejected",
      "invalidated",
    ]) {
      expect(route).toContain(`"${status}"`);
    }

    expect(route).toContain(
      "ALLOWED_STATUSES.has(result.status)",
    );

    expect(route).toContain(
      "NextResponse.json({ success: true, status: result.status })",
    );

    expect(route).toContain(
      'failure("STATUS_NOT_AUTHORIZED", 403)',
    );

    expect(route).toContain(
      'failure("INTERNAL_SERVER_ERROR", 500)',
    );

    expect(route).not.toContain("error_message");
  });

  it("preserves nondisclosure and avoids raw database error leakage", () => {
    expect(route).toContain(
      'console.error("Representative verification status RPC failed.");',
    );

    expect(route).not.toMatch(
      /error\.message|error\.details|error\.hint|console\.error\([^)]*,\s*error/i,
    );

    expect(route).not.toContain(
      'failure("COMPANY_NOT_FOUND"',
    );

    expect(route).not.toContain(
      'failure("CASE_NOT_FOUND"',
    );

    expect(route).toContain(
      'failure("STATUS_NOT_AUTHORIZED", 403)',
    );
  });

  it("keeps the adapter read-only and outside reviewer or procurement authority", () => {
    expect(route).not.toMatch(
      /\b(POST|PUT|PATCH|DELETE)\b/,
    );

    expect(route).not.toMatch(
      /\.from\(\s*["'](representative_verification_cases|organization_memberships|internal_reviewer_assignments|audit_logs|companies)["']\s*\)/i,
    );

    expect(route).not.toMatch(
      /procurement_function|workspace_role|internal_reviewer_assignments/i,
    );
  });
});
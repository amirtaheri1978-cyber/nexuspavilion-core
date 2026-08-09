import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const correction = read(
  "supabase/migrations/20260815_reconcile_verification_ownership_lock_order.sql",
);
const approval = read(
  "supabase/migrations/20260813_create_approve_representative_verification_rpc.sql",
);
const rejection = read(
  "supabase/migrations/20260814_create_reject_representative_verification_rpc.sql",
);
const acceptance = read(
  "supabase/migrations/20260808_add_ownership_transfer_accepted_audit.sql",
);

const functionBody = (sql: string, name: string) => {
  const start = sql.indexOf(`function public.${name}`);
  const end = sql.indexOf("$$;", start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return sql.slice(start, end);
};

const submission = functionBody(correction, "submit_representative_verification");
const requestTransfer = functionBody(
  correction,
  "request_company_ownership_transfer",
);

describe("representative verification cross-command lock order", () => {
  it("limits the corrective migration to the two inverse-edge functions", () => {
    expect(correction).toContain("function public.submit_representative_verification");
    expect(correction).toContain("function public.request_company_ownership_transfer");
    expect(correction).not.toMatch(
      /function public\.(approve_representative_verification|reject_representative_verification|accept_company_ownership_transfer)/,
    );
  });

  it("uses non-locking submission preflight before company-first revalidation", () => {
    const preflight = submission.indexOf(
      "-- non-locking preflight prevents unauthorized callers from locking a company.",
    );
    const companyLock = submission.indexOf(
      "from public.companies where id = p_company_id for update",
    );
    const authoritativeMembership = submission.indexOf(
      "workspace_role='owner' for update",
    );
    const projection = submission.indexOf(
      "v_company.user_id is distinct from v_user_id",
    );

    expect(preflight).toBeGreaterThan(-1);
    expect(companyLock).toBeGreaterThan(preflight);
    expect(submission.slice(preflight, companyLock)).not.toContain("for update");
    expect(authoritativeMembership).toBeGreaterThan(companyLock);
    expect(projection).toBeGreaterThan(authoritativeMembership);
    expect(submission.slice(preflight, companyLock)).toContain(
      "'error_code','submission_not_authorized'",
    );
  });

  it("uses non-locking transfer preflight before company-first ordered membership locks", () => {
    const preflight = requestTransfer.indexOf(
      "-- non-locking preflight prevents unauthorized callers from locking a company.",
    );
    const companyLock = requestTransfer.indexOf(
      "where id = actor_profile.company_id for update",
    );
    const membershipLocks = requestTransfer.indexOf(
      "order by user_id, id for update",
    );
    const revalidatedOwner = requestTransfer.indexOf(
      "workspace_role = 'owner'; if not found then",
      membershipLocks + 1,
    );
    const projection = requestTransfer.indexOf(
      "company_record.user_id is distinct from actor_user_id",
    );

    expect(preflight).toBeGreaterThan(-1);
    expect(companyLock).toBeGreaterThan(preflight);
    expect(requestTransfer.slice(preflight, companyLock)).not.toContain("for update");
    expect(membershipLocks).toBeGreaterThan(companyLock);
    expect(revalidatedOwner).toBeGreaterThan(membershipLocks);
    expect(projection).toBeGreaterThan(revalidatedOwner);
  });

  it("has no effective membership-to-company lock edge", () => {
    const commands = [
      ["submission", submission, "from public.companies where id = p_company_id for update", "workspace_role='owner' for update"],
      ["approval", approval, "from public.companies where id=v_case.company_id for update", "from public.organization_memberships"],
      ["rejection", rejection, "from public.companies where id = v_case.company_id for update", "from public.organization_memberships"],
      ["request transfer", requestTransfer, "where id = actor_profile.company_id for update", "from public.organization_memberships"],
      ["accept transfer", acceptance, "from public.companies where id = transfer_request.company_id for update", "from public.organization_memberships"],
    ] as const;

    for (const [name, sql, companyLock, membershipLock] of commands) {
      const companyIndex = sql.indexOf(companyLock);
      const membershipIndex = sql.indexOf(membershipLock, companyIndex);
      expect(companyIndex, name).toBeGreaterThan(-1);
      expect(membershipIndex, name).toBeGreaterThan(companyIndex);
    }
  });

  it("preserves reviewer and workflow-record serialization", () => {
    for (const sql of [approval, rejection]) {
      const reviewer = sql.indexOf("from public.internal_reviewer_assignments");
      const caseLock = sql.indexOf("from public.representative_verification_cases");
      const company = sql.indexOf("from public.companies");
      const membership = sql.indexOf("from public.organization_memberships", company);

      expect(reviewer).toBeGreaterThan(-1);
      expect(caseLock).toBeGreaterThan(reviewer);
      expect(company).toBeGreaterThan(caseLock);
      expect(membership).toBeGreaterThan(company);
    }

    const request = acceptance.indexOf("from public.ownership_transfer_requests");
    const company = acceptance.indexOf("from public.companies");
    const memberships = acceptance.indexOf("from public.organization_memberships", company);
    expect(request).toBeGreaterThan(-1);
    expect(company).toBeGreaterThan(request);
    expect(memberships).toBeGreaterThan(company);
  });

  it("keeps deterministic membership and security boundaries", () => {
    expect(requestTransfer).toContain("order by user_id, id for update");
    expect(approval).toContain("order by user_id, id for update");
    expect(rejection).toContain("order by user_id, id for update");
    // Accept transfer orders by user_id; one membership per user/company makes it deterministic.
    expect(acceptance).toContain("order by user_id for update");

    for (const sql of [submission, requestTransfer]) {
      expect(sql).toContain("security definer");
      expect(sql).toContain("set search_path = public");
    }
    expect(submission).toContain("membership_status='active' and workspace_role='owner'");
    expect(correction).not.toMatch(
      /reverify|revoke_representative_verification|invalidate_representative_verification|\/api\/|src\/app/,
    );
  });
});

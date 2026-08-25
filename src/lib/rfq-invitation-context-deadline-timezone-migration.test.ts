import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath =
  "supabase/migrations/20260831000000_add_rfq_invitation_deadline_timezone.sql";
const baselinePath =
  "supabase/migrations/20260822000000_dev_public_baseline.sql";
const parserMigrationPath =
  "supabase/migrations/20260829000000_restrict_issuer_quote_select_until_commercial_unlock.sql";
const invitePagePath = "src/app/rfq/invite/[token]/page.tsx";
const inviteWorkspacePath =
  "src/components/rfq-workspace/rfq-invite-quote-submission.tsx";
const comparePath = "src/app/rfq/[slug]/compare/page.tsx";
const visualQaPath = "src/app/dev/rfq-visual-qa/page.tsx";
const formatterPath = "src/lib/datetime/format-rfq-deadline-display.ts";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n"
  );
}

const sql = readSource(migrationPath);
const normalized = sql.replace(/\s+/g, " ").trim().toLowerCase();
const baseline = readSource(baselinePath);
const parserMigration = readSource(parserMigrationPath);
const invitePage = readSource(invitePagePath);
const inviteWorkspace = readSource(inviteWorkspacePath);
const compare = readSource(comparePath);
const visualQa = readSource(visualQaPath);
const formatter = readSource(formatterPath);

describe("RFQ invitation deadline timezone forward migration", () => {
  it("drops and recreates get_rfq_invitation_context with timezone", () => {
    expect(normalized).toContain(
      "drop function if exists public.get_rfq_invitation_context(text)"
    );
    expect(normalized).toContain(
      "create function public.get_rfq_invitation_context(p_token text)"
    );
    expect(normalized).toContain("rfq_deadline text");
    expect(normalized).toContain("rfq_deadline_timezone text");
    expect(normalized).toContain("r.deadline_timezone");
    expect(normalized).toContain("security definer");
    expect(normalized).toContain("set search_path = ''");
    expect(normalized).toContain("and i.token = p_token");
    expect(normalized).toContain("and i.status in ('sent', 'invited')");
    expect(normalized).toContain("and r.status = 'open'");
  });

  it("preserves bounded grants after recreate", () => {
    expect(normalized).toContain(
      "revoke all on function public.get_rfq_invitation_context(text) from public"
    );
    expect(normalized).toContain(
      "grant all on function public.get_rfq_invitation_context(text) to anon"
    );
    expect(normalized).toContain(
      "grant all on function public.get_rfq_invitation_context(text) to authenticated"
    );
    expect(normalized).toContain(
      "grant all on function public.get_rfq_invitation_context(text) to service_role"
    );
  });

  it("does not rewrite the historical baseline or deadline parser", () => {
    expect(migrationPath).not.toBe(baselinePath);
    expect(sql).not.toContain("parse_rfq_deadline_timestamptz");
    expect(sql.toLowerCase()).not.toContain("alter table public.rfqs");
    expect(sql.toLowerCase()).not.toContain("alter column deadline");
    expect(baseline).toContain(
      'RETURNS TABLE("invite_id" "uuid", "invite_email" "text", "invite_status" "text", "rfq_id" "uuid", "rfq_title" "text", "rfq_slug" "text", "rfq_description" "text", "rfq_category" "text", "rfq_location" "text", "rfq_budget" "text", "rfq_deadline" "text")'
    );
    expect(parserMigration).toContain(
      "create or replace function public.parse_rfq_deadline_timestamptz(p_deadline text)"
    );
  });
});

describe("RFQ deadline timezone display wiring", () => {
  it("compare uses stored timezone for display and keeps instant enforcement", () => {
    expect(compare).toContain("deadline_timezone?: string | null");
    expect(compare).toContain(
      "value={formatDateTime(rfq.deadline, rfq.deadline_timezone)}"
    );
    expect(compare).toContain(
      "function hasDeadlinePassed(deadline: string | null | undefined)"
    );
    expect(compare).toContain(
      "return new Date().getTime() > deadlineDate.getTime();"
    );
    expect(compare).toContain(
      "const deadlinePassed = hasDeadlinePassed(rfq.deadline);"
    );
    expect(compare).not.toContain("hasDeadlinePassed(rfq.deadline,");
  });

  it("invitation context and UI carry deadline_timezone", () => {
    expect(invitePage).toContain("rfq_deadline_timezone: string | null");
    expect(invitePage).toContain('rpc("get_rfq_invitation_context"');
    expect(inviteWorkspace).toContain(
      "rfq_deadline_timezone: string | null"
    );
    expect(inviteWorkspace).toContain("formatRfqDeadlineForDisplay");
    expect(inviteWorkspace).toContain("invitation.rfq_deadline_timezone");
  });

  it("visual QA invite fixture uses canonical UTC storage plus IANA timezone", () => {
    expect(visualQa).toContain('rfq_deadline: "2026-08-21T22:00:00.000Z"');
    expect(visualQa).toContain('rfq_deadline_timezone: "America/Toronto"');
  });

  it("formatter always passes an explicit IANA timeZone to toLocaleString", () => {
    expect(formatter).toContain("timeZone,");
    expect(formatter).not.toMatch(
      /toLocaleString\(\s*"en-US"\s*,\s*\{\s*year:/
    );
  });
});

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function readSource(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8").replace(/\r\n/g, "\n");
}

const migration = readSource(
  "supabase/migrations/20260915044700_govern_rfq_deadline_cancellation_reissue.sql",
);
const quoteRlsMigration = readSource(
  "supabase/migrations/20260913072244_enforce_deadline_locked_quote_rls.sql",
);
const revalidationMigration = readSource(
  "supabase/migrations/20260914085631_govern_material_amendment_quote_revalidation.sql",
);

function policyBlock(source: string, policyName: string) {
  const marker = `create policy "${policyName}"`;
  const start = source.indexOf(marker);
  expect(start, `missing policy ${policyName}`).toBeGreaterThan(-1);

  const rest = source.slice(start);
  const candidates = [
    rest.indexOf("\ndrop policy", marker.length),
    rest.indexOf("\ncreate policy", marker.length),
    rest.indexOf("\ncreate or replace function", marker.length),
    rest.indexOf("\ncommit;", marker.length),
    rest.length,
  ].filter((value) => value > 0);

  return rest.slice(0, Math.min(...candidates));
}

describe("18-27 deadline, cancellation, and reissue governance contract", () => {
  it("adds terminal cancellation provenance and one-successor reissue lineage", () => {
    expect(migration).toContain("add column if not exists cancelled_at timestamptz");
    expect(migration).toContain("add column if not exists cancelled_by_user_id uuid");
    expect(migration).toContain("add column if not exists cancellation_reason text");
    expect(migration).toContain("add column if not exists reissued_from_rfq_id uuid");
    expect(migration).toContain("constraint rfqs_cancellation_state_check");
    expect(migration).toContain("status = 'cancelled'");
    expect(migration).toContain("awarded_quote_id is null");
    expect(migration).toContain("awarded_at is null");
    expect(migration).toContain("constraint rfqs_reissue_not_self_check");
    expect(migration).toContain("create unique index rfqs_one_reissue_per_source_idx");
    expect(migration).toContain("where reissued_from_rfq_id is not null");
  });

  it("extends the existing governed Addendum command instead of creating a second amendment architecture", () => {
    expect(migration).toContain(
      "create or replace function public.amend_published_rfq(",
    );
    expect(
      migration.match(
        /create or replace function public\.amend_published_rfq\(/g,
      ),
    ).toHaveLength(1);
    expect(migration).toContain("'deadline'");
    expect(migration).toContain("'deadline_timezone'");
    expect(migration).toContain(
      "if (p_changes ? 'deadline') <> (p_changes ? 'deadline_timezone') then",
    );
    expect(migration).toContain("pg_catalog.pg_timezone_names");
    expect(migration).toContain(
      "requested_deadline := public.parse_rfq_deadline_timestamptz(",
    );
    expect(migration).toContain("requested_deadline <= parsed_deadline");
    expect(migration).toContain(
      "clock_timestamp() >= parsed_deadline - interval '5 minutes'",
    );
    expect(migration).toContain("'error_code', 'CANCEL_REISSUE_REQUIRED'");
    expect(migration).toContain("deadline = next_rfq.deadline");
    expect(migration).toContain("deadline_timezone = next_rfq.deadline_timezone");
    expect(migration).toContain("when 'deadline' then to_jsonb(target_rfq.deadline)");
    expect(migration).toContain(
      "when 'deadline_timezone' then to_jsonb(target_rfq.deadline_timezone)",
    );
    expect(migration).toContain("insert into public.rfq_addenda (");
    expect(migration).not.toContain("publish_rfq_addendum");
    expect(migration).not.toContain("create table public.rfq_amendments");
  });

  it("classifies prohibited procurement-basis changes as cancel/reissue", () => {
    for (const field of [
      "company_id",
      "procurement_scope",
      "sourcing_method",
      "contract_framework",
      "bid_model",
      "nda_required",
    ]) {
      expect(migration).toContain(`'${field}'`);
    }

    expect(migration).toContain("requested_cancel_reissue_fields");
    expect(migration).toContain(
      "'error_message', 'The requested published procurement-basis change requires cancellation and reissue.'",
    );
  });

  it("blocks silent direct edits after publication while preserving audited internal metadata and vetted Award transitions", () => {
    expect(migration).toContain(
      "create or replace function public.enforce_published_rfq_governance()",
    );
    const publishedGovernanceFunction = migration.slice(
      migration.indexOf(
        "create or replace function public.enforce_published_rfq_governance()",
      ),
      migration.indexOf(
        "drop trigger if exists enforce_published_rfq_governance_trigger",
      ),
    );
    expect(publishedGovernanceFunction).toContain("security invoker");
    expect(publishedGovernanceFunction).not.toContain("security definer");
    expect(publishedGovernanceFunction).toContain(
      "current_user in ('anon', 'authenticated', 'service_role')",
    );
    expect(publishedGovernanceFunction).toContain("old.status <> 'draft'");
    expect(publishedGovernanceFunction).toContain(
      "to_jsonb(new) - 'internal_project_id'",
    );
    expect(publishedGovernanceFunction).toContain(
      "to_jsonb(old) - 'internal_project_id'",
    );
    expect(publishedGovernanceFunction).toContain(
      "old.status = 'open'\n       and new.status = 'awarded'",
    );
    for (const awardField of [
      "status",
      "awarded_quote_id",
      "awarded_at",
    ]) {
      expect(publishedGovernanceFunction).toContain(`- '${awardField}'`);
    }
    const wholeRowExcludedKeys = [
      ...publishedGovernanceFunction.matchAll(/-\s*'([^']+)'/g),
    ].map((match) => match[1]);
    expect(new Set(wholeRowExcludedKeys)).toEqual(
      new Set([
        "internal_project_id",
        "status",
        "awarded_quote_id",
        "awarded_at",
      ]),
    );
    for (const failClosedField of [
      "slug",
      "created_at",
      "deadline",
      "sourcing_method",
      "contract_framework",
      "bid_model",
      "nda_required",
      "company_id",
      "user_id",
      "reissued_from_rfq_id",
    ]) {
      expect(publishedGovernanceFunction).not.toContain(
        `new.${failClosedField} is distinct from old.${failClosedField}`,
      );
    }
    expect(publishedGovernanceFunction).not.toMatch(
      /new\.(?:title|description|category|location|budget|deadline|slug|created_at|sourcing_method|contract_framework|bid_model|nda_required|company_id|user_id)\s+is\s+distinct\s+from\s+old\./,
    );
    expect(publishedGovernanceFunction).toContain(
      "GOVERNED_RFQ_COMMAND_REQUIRED: Published RFQ lifecycle transitions require an authoritative command.",
    );
    expect(publishedGovernanceFunction).toContain(
      "CANCEL_REISSUE_REQUIRED: Published RFQ respondent-facing changes require a governed amendment or cancel/reissue.",
    );
    expect(migration).toContain(
      "Cancelled RFQs are terminal and cannot change procurement or lifecycle state.",
    );
  });

  it("provides an authenticated issuer-authorized cancellation command with preserved evidence", () => {
    expect(migration).toContain("create or replace function public.cancel_rfq(");
    expect(migration).toContain("security definer");
    expect(migration).toContain("actor_user_id uuid := auth.uid()");
    expect(migration).toContain("from public.rfqs as r");
    expect(migration).toContain("for update");
    expect(migration).toContain("om.user_id = actor_user_id");
    expect(migration).toContain("om.company_id = target_rfq.company_id");
    expect(migration).toContain("om.membership_status = 'active'");
    expect(migration).toContain("om.workspace_role in ('owner', 'admin')");
    expect(migration).toContain("om.procurement_function = 'buyer'");
    expect(migration).toContain("target_rfq.status <> 'open'");
    expect(migration).toContain("order by q.id");
    expect(migration).toContain("status = 'cancelled'");
    expect(migration).toContain("cancelled_at = cancelled_at_value");
    expect(migration).toContain("cancelled_by_user_id = actor_user_id");
    expect(migration).toContain("cancellation_reason = btrim(p_reason)");
    expect(migration).toContain("'RFQ_CANCELLED'");
    expect(migration).not.toContain("delete from public.quotes");
    expect(migration).not.toContain("delete from public.rfq_invites");
    expect(migration).not.toContain("delete from public.rfq_addenda");
    expect(migration).not.toContain("delete from public.rfq_quote_revalidations");
  });

  it("makes reissue a new RFQ identity with cancelled-source lineage only", () => {
    expect(migration).toContain(
      "create or replace function public.enforce_rfq_reissue_lineage()",
    );
    expect(migration).toContain("source_rfq.status <> 'cancelled'");
    expect(migration).toContain(
      "source_rfq.company_id is distinct from new.company_id",
    );
    expect(migration).toContain("new.status <> 'open'");
    expect(migration).toContain(
      "RFQ reissue lineage is immutable after creation.",
    );
    expect(migration).toContain("'RFQ_REISSUED'");
    expect(migration).not.toContain("insert into public.quotes");
    expect(migration).not.toContain("insert into public.rfq_invites");
    expect(migration).not.toContain(
      "insert into public.rfq_addendum_acknowledgements",
    );
    expect(migration).not.toContain(
      "insert into public.rfq_quote_revalidations",
    );
  });

  it("keeps Addenda unavailable once the RFQ is no longer open and unawarded", () => {
    expect(migration).toContain(
      "create or replace function public.enforce_rfq_addendum_insert_integrity()",
    );
    expect(migration).toContain("v_status <> 'open'");
    expect(migration).toContain("v_awarded_quote_id is not null");
    expect(migration).toContain("v_awarded_at is not null");
    expect(migration).toContain(
      "RFQ Addenda can be created only for open, unawarded RFQs.",
    );
  });

  it("freezes direct quote-decision updates once the RFQ is cancelled or otherwise non-open", () => {
    const policyStart = migration.indexOf(
      'drop policy if exists "Workspace administrators can update RFQ quote decisions"',
    );
    const policyEnd = migration.indexOf(
      "create or replace function public.enforce_rfq_reissue_lineage()",
    );
    const quoteDecisionPolicy = migration.slice(policyStart, policyEnd);

    expect(policyStart).toBeGreaterThan(-1);
    expect(policyEnd).toBeGreaterThan(policyStart);
    expect(quoteDecisionPolicy).toContain(
      'create policy "Workspace administrators can update RFQ quote decisions"',
    );
    expect(quoteDecisionPolicy).not.toContain("r.status = 'open'");
    expect(quoteDecisionPolicy).not.toContain("for share");
    expect(quoteDecisionPolicy).toContain("for update");
    expect(quoteDecisionPolicy).toContain("to authenticated");
    expect(
      quoteDecisionPolicy.match(
        /public\.acquire_issuer_rfq_lifecycle_fence\([\s\S]*?quotes\.rfq_id,[\s\S]*?true,[\s\S]*?true[\s\S]*?\)/g,
      ) ?? [],
    ).toHaveLength(2);
  });

  it("serializes lifecycle-critical child writes against parent cancellation", () => {
    const quoteInsert = policyBlock(
      migration,
      "Supplier members can submit company quotes",
    );
    const rfiInsert = policyBlock(
      migration,
      "Respondent companies can submit RFQ RFIs",
    );
    const rfiUpdate = policyBlock(
      migration,
      "Issuer procurement users can answer open RFQ RFIs",
    );
    const acknowledgementInsert = policyBlock(
      migration,
      "Respondent companies can acknowledge required addenda",
    );
    const invitationInsert = policyBlock(
      migration,
      "Buyer members can create company RFQ invitations",
    );

    for (const policy of [
      quoteInsert,
      rfiInsert,
      acknowledgementInsert,
    ]) {
      expect(policy).toContain("r.status = 'open'");
      expect(policy).toContain("r.awarded_quote_id is null");
      expect(policy).toContain("r.awarded_at is null");
    }

    expect(quoteInsert).not.toContain("for share");
    expect(quoteInsert).toContain("om.company_id = quotes.company_id");
    expect(quoteInsert).toContain(
      "public.current_user_has_supplier_rfq_access(quotes.rfq_id)",
    );
    expect(quoteInsert).toContain(
      "now() <= public.parse_rfq_deadline_timestamptz(r.deadline)",
    );
    expect(quoteInsert).toContain("a.requires_acknowledgement = true");

    expect(rfiInsert).not.toContain("for share");
    expect(rfiInsert).toContain(
      "om.company_id = rfq_rfis.respondent_company_id",
    );
    expect(rfiInsert).toContain(
      "public.current_user_has_supplier_rfq_access(r.id)",
    );
    expect(rfiInsert).toContain("coalesce(");
    expect(rfiInsert).toContain("r.rfi_deadline");
    expect(rfiInsert).toContain("btrim(question) <> ''");

    expect(rfiUpdate).not.toContain("for share");
    expect(rfiUpdate).toContain("status = 'open'");
    expect(rfiUpdate).toContain("status = 'answered'");
    expect(rfiUpdate).toContain("responded_by = auth.uid()");
    expect(
      rfiUpdate.match(
        /public\.acquire_issuer_rfq_lifecycle_fence\([\s\S]*?rfq_rfis\.rfq_id,[\s\S]*?false,[\s\S]*?false[\s\S]*?\)/g,
      ) ?? [],
    ).toHaveLength(2);

    expect(acknowledgementInsert).not.toContain("for share");
    expect(acknowledgementInsert).toContain(
      "om.company_id = rfq_addendum_acknowledgements.company_id",
    );
    expect(acknowledgementInsert).toContain(
      "now() <= public.parse_rfq_deadline_timestamptz(r.deadline)",
    );
    expect(acknowledgementInsert).toContain(
      "a.requires_acknowledgement = true",
    );

    expect(migration).toContain(
      "create or replace function public.enforce_quote_award_integrity()",
    );
    expect(migration).toContain(
      "create or replace function public.enforce_rfq_rfi_insert_integrity()",
    );
    expect(migration).toContain(
      "create or replace function public.enforce_rfq_addendum_acknowledgement_integrity()",
    );

    const quoteFenceStart = migration.indexOf(
      "create or replace function public.enforce_quote_award_integrity()",
    );
    const quoteFenceEnd = migration.indexOf(
      "create or replace function public.enforce_rfq_rfi_insert_integrity()",
      quoteFenceStart,
    );
    const quoteFence = migration.slice(quoteFenceStart, quoteFenceEnd);

    const rfiFenceStart = quoteFenceEnd;
    const rfiFenceEnd = migration.indexOf(
      "create or replace function public.enforce_rfq_addendum_acknowledgement_integrity()",
      rfiFenceStart,
    );
    const rfiFence = migration.slice(rfiFenceStart, rfiFenceEnd);

    const acknowledgementFenceStart = rfiFenceEnd;
    const acknowledgementFenceEnd = migration.indexOf(
      "create or replace function public.amend_published_rfq(",
      acknowledgementFenceStart,
    );
    const acknowledgementFence = migration.slice(
      acknowledgementFenceStart,
      acknowledgementFenceEnd,
    );

    for (const fence of [quoteFence, rfiFence, acknowledgementFence]) {
      expect(fence).toContain("security definer");
      expect(fence).toContain("for share");
      expect(fence).toContain("r.status = 'open'");
      expect(fence).toContain("r.awarded_quote_id is null");
      expect(fence).toContain("r.awarded_at is null");
      expect(fence).toContain("om.membership_status = 'active'");
      expect(fence).toContain(
        "public.current_user_has_supplier_rfq_access(r.id)",
      );
    }

    expect(quoteFence).toContain("auth.uid() is null");
    expect(quoteFence).toContain("r.company_id <> new.company_id");
    expect(rfiFence).toContain("r.company_id <> new.respondent_company_id");
    expect(acknowledgementFence).toContain(
      "a.requires_acknowledgement = true",
    );
    expect(acknowledgementFence).toContain(
      "r.company_id <> new.company_id",
    );

    expect(migration).toContain(
      "Respondent-side INSERT policies cannot safely acquire parent row locks directly",
    );

    const executableMigration = migration.replace(/--.*$/gm, "");

    expect(executableMigration).not.toMatch(/\bfor key share\b/i);

    expect(invitationInsert).not.toContain("for share");
    expect(invitationInsert).toMatch(
      /public\.acquire_issuer_rfq_lifecycle_fence\([\s\S]*?rfq_invites\.rfq_id,[\s\S]*?false,[\s\S]*?false[\s\S]*?\)/,
    );

    expect(migration).toContain(
      "create or replace function public.acquire_issuer_rfq_lifecycle_fence(",
    );

    const issuerFenceStart = migration.indexOf(
      "create or replace function public.acquire_issuer_rfq_lifecycle_fence(",
    );
    const issuerFenceEnd = migration.indexOf(
      'drop policy if exists "Workspace administrators can update RFQ quote decisions"',
      issuerFenceStart,
    );
    const issuerFence = migration.slice(issuerFenceStart, issuerFenceEnd);

    const quoteDecisionPolicyStart = migration.indexOf(
      'drop policy if exists "Workspace administrators can update RFQ quote decisions"',
    );

    expect(issuerFenceStart).toBeGreaterThan(-1);
    expect(issuerFenceEnd).toBeGreaterThan(issuerFenceStart);
    expect(quoteDecisionPolicyStart).toBeGreaterThan(issuerFenceStart);
    expect(issuerFence).toContain("security definer");
    expect(issuerFence).toContain("for share");
    expect(issuerFence).toContain("r.status = 'open'");
    expect(issuerFence).toContain("r.awarded_quote_id is null");
    expect(issuerFence).toContain("r.awarded_at is null");
    expect(issuerFence).toContain("om.membership_status = 'active'");
    expect(issuerFence).toContain("om.workspace_role in ('owner', 'admin')");
    expect(issuerFence).toContain("om.procurement_function = 'buyer'");
    expect(issuerFence).toContain("p_owner_admin_only is true");
    expect(issuerFence).toContain("p_require_commercial_open is not true");
    expect(issuerFence).toContain(
      "public.parse_rfq_deadline_timestamptz(r.deadline) < now()",
    );
    expect(issuerFence).toContain("to authenticated");
    expect(migration).not.toContain(
      "grant update on public.rfqs to authenticated",
    );

    expect(migration).not.toContain(
      "create trigger enforce_terminal_quote_lifecycle_fence_trigger",
    );
  });

  it("blocks Award from cancelled or otherwise non-open RFQs at both authoritative layers", () => {
    expect(migration).toContain(
      "create or replace function public.enforce_rfq_award_authorization()",
    );
    expect(migration).toContain("if old.status <> 'open' then");
    expect(migration).toContain(
      "create or replace function public.award_rfq_quote(p_quote_id uuid)",
    );
    expect(migration).toContain("and r.status = 'open'");
    expect(migration).toContain("if rfq_row.status <> 'open'");
    expect(migration).toContain("and status = 'open'");
    expect(migration).toContain(
      "public.rfq_quote_requires_material_revalidation(selected_quote.id)",
    );
    expect(migration).toContain("exception\n  when unique_violation then");
    expect(migration).toContain("'error_code', 'RFQ_ALREADY_AWARDED'");
    expect(migration).toContain(
      "'error_message', 'This RFQ has already been awarded.'",
    );
  });

  it("preserves the canonical deadline as the single commercial-opening authority", () => {
    expect(quoteRlsMigration).toContain(
      "public.parse_rfq_deadline_timestamptz(r.deadline) < now()",
    );
    expect(revalidationMigration).toContain(
      "public.parse_rfq_deadline_timestamptz(r.deadline) < now()",
    );
    expect(migration).not.toMatch(
      /add column if not exists (?:commercial_opening|opening|unlocked)_/i,
    );
    expect(migration).not.toContain("rfq_commercial_opening_state");
    expect(migration).toContain("deadline = next_rfq.deadline");
  });

  it("keeps command privileges least-privileged", () => {
    expect(migration).toContain(
      "revoke all\non function public.cancel_rfq(uuid, text)\nfrom public, anon;",
    );
    expect(migration).toContain(
      "grant execute\non function public.cancel_rfq(uuid, text)\nto authenticated;",
    );
    expect(migration).not.toMatch(
      /grant execute[\s\S]{0,100}cancel_rfq\(uuid, text\)[\s\S]{0,50}to (?:public|anon)/i,
    );
  });
});

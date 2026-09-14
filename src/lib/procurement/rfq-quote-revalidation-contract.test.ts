import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function readSource(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8").replace(/\r\n/g, "\n");
}

const migration = readSource(
  "supabase/migrations/20260914085631_govern_material_amendment_quote_revalidation.sql",
);
const amendmentMigration = readSource(
  "supabase/migrations/20260913151319_govern_published_rfq_amendments.sql",
);
const awardMigration = readSource(
  "supabase/migrations/20260913082925_enforce_deadline_locked_rfq_award.sql",
);
const quoteRoute = readSource("src/app/api/quotes/route.ts");

describe("18-26A material-amendment Quote revalidation contract", () => {
  it("adds append-only evidence tied to canonical Quote identities", () => {
    expect(migration).toContain("create table public.rfq_quote_revalidations (");
    expect(migration).toContain("id uuid primary key default gen_random_uuid()");
    expect(migration).toContain("quote_id uuid not null");
    expect(migration).toContain("rfq_id uuid not null");
    expect(migration).toContain("company_id uuid not null");
    expect(migration).toContain("addendum_id uuid not null");
    expect(migration).toContain("acted_by uuid not null");
    expect(migration).toContain("action text not null");
    expect(migration).toContain("commercial_before jsonb not null");
    expect(migration).toContain("commercial_after jsonb not null");
    expect(migration).toContain("action in ('reconfirmed', 'resubmitted')");
    expect(migration).toContain("foreign key (quote_id, rfq_id, company_id)");
    expect(migration).toContain("references public.quotes (id, rfq_id, company_id)");
    expect(migration).toContain("foreign key (addendum_id, rfq_id)");
    expect(migration).toContain("references public.rfq_addenda (id, rfq_id)");
    expect(migration).toContain("unique (quote_id, addendum_id)");
    expect(migration).toContain("before update or delete");
    expect(migration).not.toMatch(/alter table public\.quotes\s+add column.*(?:stale|requires_review)/is);
    expect(migration).not.toContain("create table public.quotes");
  });

  it("derives stale state from the latest governed material Addendum and Quote basis evidence", () => {
    expect(migration).toContain("create or replace function public.rfq_quote_requires_material_revalidation(");
    expect(migration).toContain("a.affected_fields is not null");
    expect(migration).toContain("cardinality(a.affected_fields) > 0");
    expect(migration).toContain("jsonb_typeof(a.amendment_before) = 'object'");
    expect(migration).toContain("jsonb_typeof(a.amendment_after) = 'object'");
    expect(migration).toContain("nullif(btrim(a.amendment_reason), '') is not null");
    expect(migration).toContain("order by a.created_at desc, a.addendum_number desc, a.id desc");
    expect(migration).toContain("revalidation.addendum_id = a.id");
    expect(migration).toContain("acknowledgement.addendum_id = a.id");
    expect(migration).toContain("acknowledgement.company_id = q.company_id");
    expect(migration).toContain("acknowledgement.acknowledged_at <= q.created_at");
    expect(migration).not.toContain("a.created_at > q.created_at");
    expect(migration).not.toContain(
      "latest_material_addendum.created_at <= target_quote.created_at",
    );
    expect(amendmentMigration).toContain("affected_fields text[]");
    expect(amendmentMigration).toContain("amendment_before jsonb");
    expect(amendmentMigration).toContain("amendment_after jsonb");
    expect(amendmentMigration).toContain("amendment_reason text");
  });

  it("keeps only pre-Quote acknowledgement or immutable revalidation as current-basis proof", () => {
    const helperStart = migration.indexOf(
      "create or replace function public.rfq_quote_requires_material_revalidation(",
    );
    const helperEnd = migration.indexOf("comment on function", helperStart);
    const helper = migration.slice(helperStart, helperEnd);
    const commandStart = migration.indexOf(
      "create or replace function public.revalidate_rfq_quote(",
    );
    const commandEnd = migration.indexOf("comment on function", commandStart);
    const command = migration.slice(commandStart, commandEnd);

    for (const source of [helper, command]) {
      expect(source).toContain("revalidation.addendum_id =");
      expect(source).toContain("acknowledgement.addendum_id =");
      expect(source).toContain("acknowledgement.company_id =");
      expect(source).toMatch(/acknowledgement\.acknowledged_at\s*<=\s*(?:q|target_quote)\.created_at/);
    }

    // A post-Quote acknowledgement cannot implicitly reconfirm the Quote.
    expect(helper).not.toMatch(/acknowledged_at\s*(?:>=|>)\s*q\.created_at/);
    // An immutable revalidation against the latest material Addendum makes it current.
    expect(helper).toContain("revalidation.addendum_id = a.id");
    // Selecting only the latest material Addendum makes a later one stale again.
    expect(helper).toContain("order by a.created_at desc, a.addendum_number desc, a.id desc");
    expect(helper).toContain("limit 1");
    // Informational legacy Addenda do not enter the material basis.
    expect(helper).toContain("cardinality(a.affected_fields) > 0");
    expect(helper).toContain("jsonb_typeof(a.amendment_before) = 'object'");
    expect(helper).toContain("jsonb_typeof(a.amendment_after) = 'object'");
  });

  it("implements an authenticated respondent-authorized command", () => {
    expect(migration).toContain("create or replace function public.revalidate_rfq_quote(");
    expect(migration).toContain("security definer");
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain("actor_user_id uuid := (select auth.uid())");
    expect(migration).toContain("om.user_id = actor_user_id");
    expect(migration).toContain("om.company_id = target_quote.company_id");
    expect(migration).toContain("om.membership_status = 'active'");
    expect(migration).toContain("target_quote.company_id = target_rfq.company_id");
    expect(migration).toContain("target_quote.status <> 'submitted'");
    expect(migration).toContain("target_quote.decision <> 'pending'");
    expect(migration).toContain("target_rfq.sourcing_method = 'open'");
    expect(migration).toContain("public.current_user_has_supplier_rfq_access(target_rfq.id)");
    expect(migration).toContain("target_rfq.status <> 'open'");
    expect(migration).toContain("target_rfq.awarded_quote_id is not null");
    expect(migration).toContain("target_rfq.awarded_at is not null");
    expect(migration).toContain("public.parse_rfq_deadline_timestamptz(target_rfq.deadline) is null");
    expect(migration).toContain("now() > public.parse_rfq_deadline_timestamptz(target_rfq.deadline)");
    expect(migration).toContain("order by q.id");
    expect(migration).not.toContain("p_company_id");
    expect(migration).not.toContain("p_user_id");
    expect(migration).not.toContain("p_rfq_id");
    expect(migration).not.toContain("p_addendum_id");
  });

  it("requires acknowledgement independently from material revalidation", () => {
    expect(migration).toContain("required_addendum.requires_acknowledgement = true");
    expect(migration).toContain("acknowledgement.addendum_id = required_addendum.id");
    expect(migration).toContain("acknowledgement.company_id = target_quote.company_id");
    expect(migration).toContain("ADDENDUM_ACKNOWLEDGEMENT_REQUIRED");
    expect(migration).toContain("REVALIDATION_NOT_REQUIRED");
    expect(awardMigration).toContain("a.requires_acknowledgement = true");
  });

  it("reconfirms unchanged terms and atomically resubmits canonical terms", () => {
    expect(migration).toContain("if action_name = 'reconfirmed' then");
    expect(migration).toContain("after_evidence := before_evidence");
    expect(migration).toContain("RECONFIRMATION_TERMS_NOT_ALLOWED");
    expect(migration).toContain("update public.quotes");
    expect(migration).toContain("set amount = p_amount");
    expect(migration).toContain("timeline = btrim(p_timeline)");
    expect(migration).toContain("message = btrim(p_message)");
    expect(migration).toContain("validity_days = p_validity_days");
    expect(migration).toContain("score = revised_score");
    expect(migration).toContain("p_validity_days is null");
    expect(migration).toContain("p_validity_days not in (30, 60, 90, 120)");
    expect(migration).toContain("p_amount::text in ('NaN', 'Infinity', '-Infinity')");
    expect(migration).toContain("p_amount <= 0");
    expect(migration).toContain("revised_score := least(70 + round(timeline_score * 0.3), 100)");
    expect(quoteRoute).toContain("return Math.min(priceScore + Math.round(timelineScore * 0.3), 100)");
    expect(migration).toContain("insert into public.rfq_quote_revalidations (");
    expect(migration).not.toContain("delete from public.quotes");
    expect(migration).not.toContain("insert into public.quotes");
  });

  it("keeps commercial evidence confidential and commands least-privileged", () => {
    expect(migration).toContain('create policy "Respondents can read own Quote revalidation evidence"');
    expect(migration).toContain("om.company_id = rfq_quote_revalidations.company_id");
    expect(migration).toContain('create policy "Issuers can read Quote revalidation evidence after opening"');
    expect(migration).toContain("public.parse_rfq_deadline_timestamptz(r.deadline) is not null");
    expect(migration).toContain("public.parse_rfq_deadline_timestamptz(r.deadline) < now()");
    expect(migration).toContain("om.membership_status in ('active', 'archived')");
    expect(migration).toContain("om.workspace_role in ('owner', 'admin')");
    expect(migration).toContain("om.procurement_function = 'buyer'");
    expect(migration).toContain("revoke all on table public.rfq_quote_revalidations\nfrom public, anon, authenticated");
    expect(migration).toContain("grant select on table public.rfq_quote_revalidations\nto authenticated");
    expect(migration).not.toMatch(/grant (?:insert|update|delete|all).*rfq_quote_revalidations.*authenticated/i);
    expect(migration).toContain("from public, anon;\n\ngrant execute");
    expect(migration).not.toMatch(/grant execute[\s\S]{0,160}revalidate_rfq_quote[\s\S]{0,80}to (?:public|anon)/i);
  });

  it("blocks stale awards at the trigger and bounded Award RPC", () => {
    expect(migration).toContain("create or replace function public.enforce_rfq_award_authorization()");
    expect(migration).toContain("public.rfq_quote_requires_material_revalidation(new.awarded_quote_id)");
    expect(migration).not.toContain("award_rfq_quote_pre_18_26a");
    expect(migration).not.toContain("rename to");
    expect(migration).not.toContain("sqlerrm");
    expect(migration).toContain("create or replace function public.award_rfq_quote(p_quote_id uuid)");
    expect(
      migration.match(/create or replace function public\.award_rfq_quote\(p_quote_id uuid\)/g),
    ).toHaveLength(1);

    const awardStart = migration.indexOf(
      "create or replace function public.award_rfq_quote(p_quote_id uuid)",
    );
    const awardEnd = migration.indexOf("comment on function", awardStart);
    const award = migration.slice(awardStart, awardEnd);
    const candidateGuard = award.indexOf(
      "not public.rfq_quote_requires_material_revalidation(q.id)",
    );
    const candidateFailure = award.indexOf("if candidate_rfq_id is null");
    const lockedQuote = award.indexOf("into selected_quote");
    const postLockGuard = award.indexOf(
      "public.rfq_quote_requires_material_revalidation(selected_quote.id)",
    );
    const awardMutation = award.indexOf("update public.rfqs");

    expect(candidateGuard).toBeGreaterThan(-1);
    expect(candidateGuard).toBeLessThan(candidateFailure);
    expect(postLockGuard).toBeGreaterThan(lockedQuote);
    expect(postLockGuard).toBeLessThan(awardMutation);
    expect(award.match(/'error_code', 'AWARD_NOT_PERMITTED'/g)?.length).toBeGreaterThanOrEqual(2);
    expect(award).toContain("actor_user_id uuid := auth.uid()");
    expect(award).toContain("om.workspace_role in ('owner', 'admin')");
    expect(award).toContain("company_status is distinct from 'verified'");
    expect(award).toContain("public.parse_rfq_deadline_timestamptz(r.deadline) < now()");
    expect(award).toContain("q.company_id is distinct from r.company_id");
    expect(award).toContain("q.decision is distinct from 'rejected'");
    expect(award).toContain("for update");
    expect(award).toContain("order by q.id");
    expect(award).toContain("set decision = 'rejected'");
    expect(award).toContain("decision = 'awarded'");
    expect(award).toContain("public.record_rfq_award_workspace_activity(");
    expect(migration).toContain("to authenticated, service_role");
    expect(awardMigration).toContain("parsed_deadline < now()");
    expect(awardMigration).toContain("q.decision is distinct from 'rejected'");
    expect(awardMigration).toContain("q.company_id is distinct from r.company_id");
  });
});

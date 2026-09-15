import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

const lifecycle = readSource(
  "src/components/rfq-workspace/rfq-lifecycle-governance.tsx",
);
const detail = readSource("src/app/rfq/[slug]/page.tsx");
const newRfq = readSource("src/app/rfq/new/page.tsx");
const documents = readSource(
  "src/components/rfq-workspace/rfq-document-workspace.tsx",
);
const rfi = readSource(
  "src/components/rfq-workspace/rfq-rfi-workspace.tsx",
);
const metadata = readSource("src/lib/procurement/rfq-metadata.ts");

describe("18-27B lifecycle governance UI contract", () => {
  it("presents cancellation as a canonical terminal status", () => {
    expect(metadata).toContain('if (status === "cancelled") return "Cancelled"');
    expect(detail).toContain('rfqStatus === "cancelled"');
    expect(detail).toContain('rfqStatus === "cancelled"');
    expect(detail).toContain('? "risk"');
  });

  it("mounts the focused lifecycle region for issuer users only", () => {
    expect(detail).toContain("{isOwner ? (");
    expect(detail).toContain("<RFQLifecycleGovernance");
    expect(lifecycle).toContain('data-rfq-lifecycle-governance="true"');
    expect(detail).toContain('.eq("reissued_from_rfq_id", rfq.id)');
    expect(detail).toContain('.select("id, slug, title, status")');
    expect(detail).toContain("canCreateCompanyRfq(");
    expect(detail).toContain("canManage={canManageLifecycle}");
    expect(detail).toContain(
      "canManageIssuerActions={canManageLifecycle}",
    );
  });

  it("routes deadline extensions through the governed Addendum API", () => {
    expect(lifecycle).toContain("<DeadlineField");
    expect(lifecycle).toContain('fetch("/api/rfq-addenda"');
    expect(lifecycle).toContain('title: "Submission Deadline Extension"');
    expect(lifecycle).toContain("deadline: nextDeadline");
    expect(lifecycle).toContain("deadline_timezone: nextDeadlineTimezone");
    expect(lifecycle).toContain("requiresAcknowledgement: true");
    expect(lifecycle).not.toContain('.from("rfqs").update');
  });

  it("requires deliberate cancellation through the existing RFQ API", () => {
    expect(lifecycle).toContain('fetch("/api/rfqs"');
    expect(lifecycle).toContain('action: "cancel"');
    expect(lifecycle).toContain("cancellationReasonDraft.trim()");
    expect(lifecycle).toContain("cancellationConfirmed");
    expect(lifecycle).toContain('type="checkbox"');
  });

  it("removes mutation controls from cancelled, awarded, and commercial-open branches", () => {
    expect(lifecycle).toContain("{isCancelled ? (");
    expect(lifecycle).toContain(") : isAwarded ?");
    expect(lifecycle).toContain("commercialEvaluationUnlocked ?");
    expect(lifecycle).toContain("Create Replacement");
    expect(lifecycle).toContain("Open Replacement RFQ");

    const cancelledBranch = lifecycle.slice(
      lifecycle.indexOf("{isCancelled ? ("),
      lifecycle.indexOf(") : isAwarded ?"),
    );
    expect(cancelledBranch).not.toContain("Issue Deadline Extension");
    expect(cancelledBranch).not.toContain("Cancel RFQ");
    expect(lifecycle).toContain("isOpen && canManage");
    expect(lifecycle).toContain("commercialEvaluationUnlocked ?");
  });

  it("fails closed when replacement status cannot be determined", () => {
    expect(detail).toContain(
      "const replacementLookupUnavailable = Boolean(replacementResult.error)",
    );
    expect(detail).toContain(
      "replacementLookupUnavailable={replacementLookupUnavailable}",
    );
    expect(lifecycle).toContain("Replacement status unavailable");
    expect(lifecycle).toContain("replacementLookupUnavailable ?");
    expect(lifecycle).toContain("replacementRfq ?");
    expect(lifecycle).toContain("canManage ? <Link");
    expect(lifecycle).toContain("Open Replacement RFQ");
  });

  it("surfaces safe governance codes without internal error data", () => {
    expect(lifecycle).toContain("const [errorCode, setErrorCode]");
    expect(lifecycle).toContain('typeof result.error_code === "string"');
    expect(lifecycle).toContain("Governance code: {errorCode}");
    expect(lifecycle).not.toContain("result.details");
    expect(lifecycle).not.toContain("result.hint");
  });

  it("carries only lineage into a fresh replacement wizard", () => {
    expect(newRfq).toContain('searchParams.get("reissueFrom")');
    expect(newRfq).toContain("Replacement Procurement");
    expect(newRfq).toContain("This wizard creates a new RFQ identity.");
    expect(newRfq).toContain("reissued_from_rfq_id: reissueFrom");
    expect(newRfq).not.toContain("sourceRfq.");
    expect(newRfq).not.toContain("sourceQuotes");
    expect(newRfq).not.toContain("sourceInvitations");
  });

  it("fences package, Addendum, acknowledgement, and RFI actions by lifecycle status", () => {
    expect(documents).toContain(
      'isOwner && canManageIssuerActions && lifecycleStatus === "open"',
    );
    expect(documents).toContain(
      'lifecycleStatus === "open" && (!isOwner || canManageIssuerActions)',
    );
    expect(documents).toContain("canManageIssuerActions = false");
    expect(documents).toContain("canManage={canManagePackage}");
    expect(documents).toContain("{isOwner ? (");
    expect(documents).toContain("<RFQAddendaManager");
    expect(documents).toContain("<RFQAddendumAcknowledgementCenter");
    expect(documents).toContain("canParticipate={canUseActiveRfiControls}");
    expect(detail).toContain("canAcknowledge={isOpen}");
    expect(rfi).toContain("!canParticipate");
    expect(rfi).toContain("isOwner && canParticipate");
  });

  it("leaves R-50 commercial loading and static governance notices in place", () => {
    expect(detail).toContain(
      "const loadIssuerQuoteRows = isOwner && commercialEvaluationUnlocked",
    );
    expect(detail).toContain('supabase.rpc("count_rfq_quote_submissions"');
    expect(detail).toContain("buildCommercialIntelligence({");
    expect(detail).toContain("<RFQBlindBiddingNotice");
    expect(detail).toContain("<RFQGovernanceNotice");
  });
});

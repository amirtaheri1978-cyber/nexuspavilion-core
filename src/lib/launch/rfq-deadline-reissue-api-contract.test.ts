import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function readSource(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8").replace(/\r\n/g, "\n");
}

const addendaRoute = readSource("src/app/api/rfq-addenda/route.ts");
const rfqsRoute = readSource("src/app/api/rfqs/route.ts");

describe("18-27A deadline, cancellation, and reissue API contract", () => {
  it("normalizes paired deadline amendment values before the existing governed RPC", () => {
    const resolver = addendaRoute.indexOf("resolveRfqDeadlineForStorage({");
    const rpc = addendaRoute.indexOf('"amend_published_rfq"');

    expect(addendaRoute).toContain(
      'import { resolveRfqDeadlineForStorage } from "@/lib/datetime/local-date-time-to-utc"',
    );
    expect(addendaRoute).toContain('"deadline_timezone"');
    expect(addendaRoute).toContain("hasDeadline !== hasDeadlineTimezone");
    expect(addendaRoute).toContain('error_code: "INVALID_DEADLINE"');
    expect(resolver).toBeGreaterThan(-1);
    expect(rpc).toBeGreaterThan(resolver);
    expect(addendaRoute).toContain(
      "governedChanges.deadline = resolvedDeadline.deadline",
    );
    expect(addendaRoute).toContain(
      "governedChanges.deadline_timezone = resolvedDeadline.deadline_timezone",
    );
    expect(addendaRoute).toContain("p_changes: governedChanges");
  });

  it("preserves governed amendment error codes and conflict semantics", () => {
    expect(addendaRoute).toContain("error_code: result.error_code");
    expect(addendaRoute).toContain('errorCode === "UNAUTHENTICATED"');
    expect(addendaRoute).toContain('errorCode === "FORBIDDEN"');
    expect(addendaRoute).toContain('errorCode === "RFQ_NOT_FOUND"');
    expect(addendaRoute).toContain('errorCode?.startsWith("INVALID_")');
    expect(addendaRoute).toContain('errorCode === "CANCEL_REISSUE_REQUIRED"');
    expect(addendaRoute).toContain('errorCode === "RFQ_NOT_AMENDABLE"');
    expect(addendaRoute).toContain(
      'errorCode === "COMMERCIAL_OPENING_UNLOCKED"',
    );
    expect(addendaRoute).toContain('errorCode === "NO_CHANGES"');
    expect(addendaRoute).toContain("return 409");
    expect(addendaRoute).toContain("result.error_message");
    expect(addendaRoute).not.toContain("rpcError?.message ||");
  });

  it("keeps Addendum publication, activity, acknowledgement, and delivery behavior", () => {
    expect(addendaRoute).toContain("p_requires_acknowledgement: true");
    expect(addendaRoute).toContain('"addendum_published"');
    expect(addendaRoute).toContain("recordTrustedProcurementActivity(");
    expect(addendaRoute).toContain("deliverAddendumNotificationEmails({");
    expect(addendaRoute).toContain("ADDENDUM_EMAIL_SAFE_RETRY_WINDOW_MS");
    expect(addendaRoute).toContain("buildAddendumEmailIdempotencyKey(");
  });

  it("implements cancellation as a validated cancel_rfq command only", () => {
    const patchStart = rfqsRoute.indexOf("export async function PATCH");
    const postStart = rfqsRoute.indexOf("export async function POST");
    const patch = rfqsRoute.slice(patchStart, postStart);

    expect(patchStart).toBeGreaterThan(-1);
    expect(patch).toContain('action !== "cancel"');
    expect(patch).toContain("const reason = normalizeText(body.reason)");
    expect(patch).toContain("if (!reason)");
    expect(patch).toContain('error_code: "INVALID_CANCELLATION_REASON"');
    expect(patch).toContain('supabase.rpc("cancel_rfq"');
    expect(patch).toContain("p_rfq_id: rfqId");
    expect(patch).toContain("p_reason: reason");
    expect(patch).not.toContain('.from("rfqs")');
    expect(patch).not.toContain(".update(");
  });

  it("rejects non-object and unknown-field cancellation bodies", () => {
    const patchStart = rfqsRoute.indexOf("export async function PATCH");
    const postStart = rfqsRoute.indexOf("export async function POST");
    const patch = rfqsRoute.slice(patchStart, postStart);

    expect(patch).toContain("parsedBody = await request.json()");
    expect(patch).toContain("if (!isPlainJsonObject(parsedBody))");
    expect(rfqsRoute).toContain('value !== null && typeof value === "object"');
    expect(rfqsRoute).toContain("!Array.isArray(value)");
    expect(patch).toContain(
      'const allowedKeys = new Set(["action", "rfqId", "reason"])',
    );
    expect(patch).toContain(
      "Object.keys(parsedBody).some((key) => !allowedKeys.has(key))",
    );
    expect(patch.match(/error_code: "INVALID_REQUEST"/g)).toHaveLength(4);
  });

  it("maps cancellation governance without exposing unexpected database errors", () => {
    expect(rfqsRoute).toContain("error_code: result.error_code");
    expect(rfqsRoute).toContain('errorCode === "UNAUTHENTICATED"');
    expect(rfqsRoute).toContain('errorCode === "FORBIDDEN"');
    expect(rfqsRoute).toContain('errorCode === "RFQ_NOT_FOUND"');
    expect(rfqsRoute).toContain('errorCode?.startsWith("INVALID_")');
    expect(rfqsRoute).toContain("rfqId: result.rfq_id");
    expect(rfqsRoute).toContain("cancelledAt: result.cancelled_at ?? null");
    expect(rfqsRoute).toContain('{ success: false, error: "Failed to cancel RFQ." }');
  });

  it("publishes a new RFQ with only normalized reissue lineage", () => {
    expect(rfqsRoute).toContain(
      "const reissuedFromRfqId = normalizeText(body.reissued_from_rfq_id) || null",
    );
    expect(rfqsRoute).toContain("reissued_from_rfq_id: reissuedFromRfqId");
    expect(rfqsRoute).toContain('.from("rfqs")');
    expect(rfqsRoute).toContain(".insert({");
    expect(rfqsRoute).toContain('status: "open"');
    expect(rfqsRoute).not.toMatch(/from\(["'](?:quotes|rfq_invites|rfq_addenda|rfq_addendum_acknowledgements|rfq_quote_revalidations)["']\)/);
    expect(rfqsRoute).not.toContain("awarded_quote_id:");
    expect(rfqsRoute).not.toContain("awarded_at:");
  });

  it("classifies only verified lineage failures as safe conflicts", () => {
    expect(rfqsRoute).toContain("isRfqReissueLineageConflict(error)");
    expect(rfqsRoute).toContain('code === "23503"');
    expect(rfqsRoute).toContain('code === "23514"');
    expect(rfqsRoute).toContain('code === "42501"');
    expect(rfqsRoute).toContain('code === "23505"');
    expect(rfqsRoute).toContain("Reissue source RFQ was not found.");
    expect(rfqsRoute).toContain("An RFQ cannot be reissued from itself.");
    expect(rfqsRoute).toContain(
      "A reissued RFQ must reference a cancelled, unawarded predecessor.",
    );
    expect(rfqsRoute).toContain(
      "A reissued RFQ must begin as a new open, unawarded procurement.",
    );
    expect(rfqsRoute).toContain(
      "RFQ reissue lineage cannot cross issuing companies.",
    );
    expect(rfqsRoute).toContain("rfqs_reissued_from_rfq_id_fkey");
    expect(rfqsRoute).toContain("rfqs_reissue_not_self_check");
    expect(rfqsRoute).toContain("rfqs_one_reissue_per_source_idx");
    expect(rfqsRoute).toContain(
      "This RFQ cannot be published as a replacement for the selected source RFQ.",
    );
    expect(rfqsRoute).toContain("{ status: 409 }");
  });

  it("keeps unexpected lineage insert failures on the sanitized critical 500 path", () => {
    const insertFailureStart = rfqsRoute.indexOf("if (error || !rfq)");
    const activityStart = rfqsRoute.indexOf(
      "await recordTrustedProcurementActivity(",
      insertFailureStart,
    );
    const insertFailure = rfqsRoute.slice(insertFailureStart, activityStart);
    const expectedConflict = insertFailure.indexOf(
      "isRfqReissueLineageConflict(error)",
    );
    const criticalReport = insertFailure.indexOf("reportCriticalApiFailure({");

    expect(expectedConflict).toBeGreaterThan(-1);
    expect(criticalReport).toBeGreaterThan(expectedConflict);
    expect(insertFailure).toContain('failureStage: "rfq_insert"');
    expect(insertFailure).toContain('{ error: "Failed to create RFQ." }');
    expect(insertFailure).not.toContain("error?.message");
  });

  it("preserves publication side effects", () => {
    expect(rfqsRoute).toContain('"rfq_created"');
    expect(rfqsRoute).toContain("recordTrustedProcurementActivity(");
    expect(rfqsRoute).toContain("await sendEmail({");
    expect(rfqsRoute).toContain("resolveRfqDeadlineForStorage({");
    expect(rfqsRoute).toContain("evaluateRfqRequirements({");
  });

  it("does not add commercial visibility, award, or rolling-evaluation behavior", () => {
    const changedSurface = `${addendaRoute}\n${rfqsRoute}`;

    expect(changedSurface).not.toContain('from("quotes")');
    expect(changedSurface).not.toContain("award_rfq_quote");
    expect(changedSurface).not.toContain("rolling evaluation");
    expect(changedSurface).not.toContain("commercial opening");
  });
});

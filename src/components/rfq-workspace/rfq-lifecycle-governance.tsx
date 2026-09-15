"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import DeadlineField from "@/components/deadline-field";
import { ExecutiveBadge } from "@/components/executive/executive-badge";
import { ExecutivePanel } from "@/components/executive/executive-panel";
import { formatRfqDeadlineForDisplay } from "@/lib/datetime/format-rfq-deadline-display";

type ReplacementRfq = { slug: string; title: string | null; status: string | null };

type Props = {
  rfqId: string;
  canManage: boolean;
  status: string;
  deadline: string | null;
  deadlineTimezone: string | null;
  commercialEvaluationUnlocked: boolean;
  awarded: boolean;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  replacementRfq?: ReplacementRfq | null;
  replacementLookupUnavailable?: boolean;
};

function formatTimestamp(value: string | null | undefined) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function toLocalDateTimeValue(value: string | null, timeZone: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  try {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timeZone || "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
    const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
  } catch {
    return "";
  }
}

export function RFQLifecycleGovernance({ rfqId, canManage, status, deadline, deadlineTimezone, commercialEvaluationUnlocked, awarded, cancelledAt = null, cancellationReason = null, replacementRfq = null, replacementLookupUnavailable = false }: Props) {
  const router = useRouter();
  const [nextDeadline, setNextDeadline] = useState(() => toLocalDateTimeValue(deadline, deadlineTimezone));
  const [nextDeadlineTimezone, setNextDeadlineTimezone] = useState(deadlineTimezone || "America/Toronto");
  const [extensionReason, setExtensionReason] = useState("");
  const [cancellationReasonDraft, setCancellationReasonDraft] = useState("");
  const [cancellationConfirmed, setCancellationConfirmed] = useState(false);
  const [pendingAction, setPendingAction] = useState<"extend" | "cancel" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const isCancelled = status === "cancelled";
  const isAwarded = awarded || status === "awarded";
  const isOpen = status === "open" && !isAwarded && !isCancelled;

  async function extendDeadline(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pendingAction || !canManage || !isOpen || commercialEvaluationUnlocked) return;
    if (!nextDeadline || !extensionReason.trim()) {
      setError("A revised submission deadline and amendment reason are required.");
      return;
    }
    setPendingAction("extend"); setError(""); setErrorCode(""); setMessage("");
    try {
      const response = await fetch("/api/rfq-addenda", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rfqId, title: "Submission Deadline Extension", amendmentReason: extensionReason.trim(), changes: { deadline: nextDeadline, deadline_timezone: nextDeadlineTimezone }, requiresAcknowledgement: true }) });
      const result = await response.json();
      if (!response.ok) { setError(result.error || "The deadline extension could not be recorded."); setErrorCode(typeof result.error_code === "string" ? result.error_code.trim() : ""); return; }
      setMessage("Deadline extension recorded through a formal Addendum."); setExtensionReason(""); router.refresh();
    } catch { setError("The deadline extension request could not be completed."); }
    finally { setPendingAction(null); }
  }

  async function cancelRfq(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pendingAction || !canManage || !isOpen) return;
    if (!cancellationReasonDraft.trim() || !cancellationConfirmed) { setError("Enter a cancellation reason and confirm the irreversible action."); return; }
    setPendingAction("cancel"); setError(""); setErrorCode(""); setMessage("");
    try {
      const response = await fetch("/api/rfqs", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "cancel", rfqId, reason: cancellationReasonDraft.trim() }) });
      const result = await response.json();
      if (!response.ok) { setError(result.error || "The RFQ could not be cancelled."); setErrorCode(typeof result.error_code === "string" ? result.error_code.trim() : ""); return; }
      setMessage("RFQ cancellation recorded. The procurement is now terminal."); router.refresh();
    } catch { setError("The cancellation request could not be completed."); }
    finally { setPendingAction(null); }
  }

  return (
    <ExecutivePanel className="np-region-major min-w-0 @container" padding="lg" tone={isCancelled ? "risk" : "blue"} aria-labelledby="rfq-lifecycle-governance-heading" data-rfq-lifecycle-governance="true">
      <div className="flex min-w-0 flex-col gap-4 @3xl:flex-row @3xl:items-start @3xl:justify-between">
        <div className="min-w-0"><p className="np-type-eyebrow">Lifecycle governance</p><h2 id="rfq-lifecycle-governance-heading" className="np-type-h2 mt-3 text-pretty">RFQ lifecycle controls</h2><p className="np-type-body mt-3 max-w-4xl text-pretty">Changes to sourcing method, evaluation/opening policy, NDA basis after participation, issuer identity, or fundamental commercial basis are not silent published-RFQ edits. They require cancellation and a newly issued procurement.</p></div>
        <ExecutiveBadge tone={isCancelled ? "risk" : isAwarded ? "awarded" : "live"} size="md">{isCancelled ? "Cancelled" : isAwarded ? "Awarded" : status === "closed" ? "Closed" : "Open"}</ExecutiveBadge>
      </div>
      {message ? <p className="mt-6 rounded-executive border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-200" role="status">{message}</p> : null}
      {error ? <div className="mt-6 rounded-executive border border-red-300/20 bg-red-400/10 px-4 py-3 text-sm font-bold text-red-200" role="alert"><p>{error}</p>{errorCode ? <p className="mt-2 text-xs uppercase tracking-[0.16em]">Governance code: {errorCode}</p> : null}</div> : null}
      {isCancelled ? (
        <div className="mt-7 grid min-w-0 gap-5 @4xl:grid-cols-2">
          <div className="min-w-0 rounded-executive border border-red-300/20 bg-red-400/10 p-5"><p className="np-type-meta text-red-200">Cancellation evidence</p><p className="mt-3 text-sm font-bold text-white">Recorded {formatTimestamp(cancelledAt)}</p><p className="mt-3 whitespace-pre-wrap text-pretty text-sm font-semibold leading-6 text-red-100">{cancellationReason || "Cancellation reason unavailable."}</p><p className="mt-4 text-sm font-semibold leading-6 text-nexus-muted">This RFQ is terminal. Package, Addendum, invitation, acknowledgement, RFI, and quotation actions are no longer active.</p></div>
          <div className="min-w-0 rounded-executive border border-white/10 bg-white/[0.045] p-5"><p className="np-type-meta text-nexus-gold-bright">Replacement procurement</p>{replacementLookupUnavailable ? <><p className="mt-3 text-pretty text-sm font-bold text-white">Replacement status unavailable</p><p className="mt-2 text-sm font-semibold leading-6 text-nexus-muted">Refresh the RFQ workspace and retry before starting a replacement procurement.</p></> : replacementRfq ? <><p className="mt-3 text-pretty text-sm font-bold text-white">{replacementRfq.title || "Replacement RFQ"}</p><p className="mt-2 text-sm font-semibold text-nexus-muted">Status: {replacementRfq.status || "open"}</p><Link href={`/rfq/${replacementRfq.slug}`} className="mt-5 inline-flex min-h-11 items-center rounded-full bg-nexus-gold px-5 py-3 text-sm font-black text-nexus-navy">Open Replacement RFQ</Link></> : <><p className="mt-3 text-pretty text-sm font-semibold leading-6 text-nexus-muted">Create a new, independently reviewed RFQ linked to this cancelled predecessor. No content, invitations, submissions, Addenda, or award state will be cloned.</p>{canManage ? <Link href={`/rfq/new?reissueFrom=${encodeURIComponent(rfqId)}`} className="mt-5 inline-flex min-h-11 items-center rounded-full bg-nexus-gold px-5 py-3 text-sm font-black text-nexus-navy">Create Replacement</Link> : null}</>}</div>
        </div>
      ) : isAwarded ? <p className="mt-7 rounded-executive border border-emerald-300/20 bg-emerald-400/10 p-5 text-pretty text-sm font-semibold leading-6 text-emerald-100">Award is recorded. Lifecycle amendments and cancellation controls are no longer available; the historical procurement record remains readable.</p> : isOpen && canManage ? (
        <div className="mt-7 grid min-w-0 gap-6 @5xl:grid-cols-2">
          <section className="min-w-0 rounded-executive border border-white/10 bg-white/[0.045] p-5" aria-labelledby="deadline-extension-heading"><p className="np-type-meta text-nexus-cyan-bright">Submission deadline</p><h3 id="deadline-extension-heading" className="np-type-h3 mt-2">Extend through Addendum</h3><p className="mt-3 text-sm font-semibold leading-6 text-nexus-muted">Current closing: {formatRfqDeadlineForDisplay(deadline, deadlineTimezone)}</p>{commercialEvaluationUnlocked ? <p className="mt-5 rounded-executive border border-amber-300/20 bg-amber-400/10 p-4 text-sm font-bold text-amber-100">Commercial opening has occurred. The opening boundary is irreversible; deadline changes now require cancellation and reissue governance where appropriate.</p> : <form onSubmit={extendDeadline} className="mt-5 min-w-0"><DeadlineField label="Revised Submission Closing" required dateTimeValue={nextDeadline} timezoneValue={nextDeadlineTimezone} onDateTimeChange={setNextDeadline} onTimezoneChange={setNextDeadlineTimezone} disabled={pendingAction !== null} helperText="Only a later deadline may be issued. Shortening or resetting the closing deadline requires cancellation and reissue." /><label className="mt-4 block text-xs font-black uppercase tracking-[0.18em] text-nexus-muted">Amendment reason *<textarea rows={3} value={extensionReason} onChange={(event) => setExtensionReason(event.target.value)} disabled={pendingAction !== null} className="mt-2 min-w-0 w-full resize-none rounded-executive border border-white/10 bg-black/25 px-4 py-4 text-sm font-bold normal-case tracking-normal text-white outline-none" /></label><button type="submit" disabled={pendingAction !== null} className="mt-4 inline-flex min-h-11 items-center rounded-full bg-nexus-gold px-5 py-3 text-sm font-black text-nexus-navy disabled:opacity-50">{pendingAction === "extend" ? "Recording..." : "Issue Deadline Extension"}</button></form>}</section>
          <section className="min-w-0 rounded-executive border border-red-300/20 bg-red-400/[0.06] p-5" aria-labelledby="rfq-cancellation-heading"><p className="np-type-meta text-red-200">Terminal action</p><h3 id="rfq-cancellation-heading" className="np-type-h3 mt-2">Cancel RFQ</h3><p className="mt-3 text-sm font-semibold leading-6 text-nexus-muted">Cancellation is terminal. Submitted evidence is preserved, and cancellation does not create a replacement automatically.</p><form onSubmit={cancelRfq} className="mt-5 min-w-0"><label className="block text-xs font-black uppercase tracking-[0.18em] text-nexus-muted">Cancellation reason *<textarea rows={4} value={cancellationReasonDraft} onChange={(event) => setCancellationReasonDraft(event.target.value)} disabled={pendingAction !== null} className="mt-2 min-w-0 w-full resize-none rounded-executive border border-white/10 bg-black/25 px-4 py-4 text-sm font-bold normal-case tracking-normal text-white outline-none" /></label><label className="mt-4 flex min-w-0 items-start gap-3 text-sm font-semibold leading-6 text-red-100"><input type="checkbox" checked={cancellationConfirmed} onChange={(event) => setCancellationConfirmed(event.target.checked)} disabled={pendingAction !== null} className="mt-1 h-4 w-4 shrink-0" />I understand cancellation is irreversible and all active procurement controls will close.</label><button type="submit" disabled={pendingAction !== null} className="mt-4 inline-flex min-h-11 items-center rounded-full border border-red-300/30 bg-red-500/15 px-5 py-3 text-sm font-black text-red-100 disabled:opacity-50">{pendingAction === "cancel" ? "Cancelling..." : "Cancel RFQ"}</button></form></section>
        </div>
      ) : <p className="mt-7 rounded-executive border border-white/10 bg-white/[0.045] p-5 text-pretty text-sm font-semibold leading-6 text-nexus-muted">{isOpen ? "Lifecycle status is available for review. Your current issuer membership does not authorize lifecycle mutations." : "This RFQ is closed. Lifecycle amendment and cancellation controls are unavailable; historical evidence remains readable."}</p>}
    </ExecutivePanel>
  );
}

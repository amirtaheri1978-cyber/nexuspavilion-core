
import {
  renderTransactionalEmail,
  transactionalEmailInfoBlock,
  transactionalEmailNotice,
} from "@/lib/email/templates/transactional-email-shell";

type RfqAddendumEmailInput = {
  rfqTitle: string;
  addendumNumber: number | string;
  addendumTitle: string;
  requiresAcknowledgement: boolean;
  workspaceUrl: string;
};

/**
 * RFQ Addendum publication notification.
 * Intentionally omits description and affected document fields.
 * The RFQ workspace remains authoritative for Addendum content.
 */
export function buildRfqAddendumEmail({
  rfqTitle,
  addendumNumber,
  addendumTitle,
  requiresAcknowledgement,
  workspaceUrl,
}: RfqAddendumEmailInput) {
  const rfq = String(rfqTitle || "").trim() || "Procurement RFQ";
  const addendum = String(addendumTitle || "").trim() || "Addendum";
  const number = String(addendumNumber ?? "").trim() || "—";
  const classification = requiresAcknowledgement
    ? "Acknowledgement Required"
    : "Informational";
  const actionText = requiresAcknowledgement
    ? "Acknowledgement is required before quotation submission or revalidation."
    : "No acknowledgement is required for this Addendum.";
  const subject = requiresAcknowledgement
    ? `Action Required — RFQ Addendum #${number} — ${rfq}`
    : `RFQ Addendum #${number} — ${rfq}`;

  const text = `RFQ Addendum

${requiresAcknowledgement
  ? "An Addendum has been issued and requires your acknowledgement."
  : "A new Addendum has been issued for this RFQ."}

RFQ: ${rfq}
Addendum #${number}: ${addendum}
Classification: ${classification}

${actionText}

Review the Addendum in the RFQ workspace:
${workspaceUrl}

Intelligent Procurement
A Nexus Pavilion Inc. product`;

  const contentHtml = [
    transactionalEmailInfoBlock("RFQ", rfq),
    transactionalEmailInfoBlock("Addendum", `#${number} — ${addendum}`),
    transactionalEmailInfoBlock("Classification", classification),
  ].join("");

  const noticeHtml = transactionalEmailNotice(
    requiresAcknowledgement ? "Action Required" : "Review",
    actionText,
  );

  const html = renderTransactionalEmail({
    preheader: requiresAcknowledgement
      ? "Review and acknowledge the Addendum before continuing your quotation."
      : "A new Addendum is available for review.",
    eyebrow: "RFQ Addendum",
    headline: requiresAcknowledgement
      ? "An Addendum has been issued and requires your acknowledgement."
      : "A new Addendum has been issued for this RFQ.",
    intro: `The issuing procurement team has published Addendum #${number}: ${addendum}. Review the issued information in the RFQ workspace.`,
    contentHtml,
    noticeHtml,
    cta: {
      label: requiresAcknowledgement
        ? "Review & Acknowledge Addendum"
        : "Review Addendum",
      url: workspaceUrl,
    },
  });

  return { subject, html, text };
}

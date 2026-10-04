
import {
  renderTransactionalEmail,
  transactionalEmailInfoBlock,
  transactionalEmailNotice,
} from "@/lib/email/templates/transactional-email-shell";

type RfiResponseEmailInput = {
  rfqTitle: string;
  workspaceUrl: string;
};

/**
 * Private RFI response notification.
 * Intentionally accepts only RFQ title + workspace URL.
 * Do not extend this API to accept question or response_text bodies.
 */
export function buildRfiResponseEmail({
  rfqTitle,
  workspaceUrl,
}: RfiResponseEmailInput) {
  const title = String(rfqTitle || "").trim() || "Procurement RFQ";
  const subject = `Private RFI Response — ${title}`;

  const text = `Private RFI

A response has been posted to your Private RFI.

RFQ: ${title}

The issuing procurement team has responded to your inquiry. Review the response in the RFQ workspace:
${workspaceUrl}

Confidentiality:
Private RFI correspondence remains visible only to your organization and the issuing procurement team. The inquiry and response are not included in this email.

Intelligent Procurement
A Nexus Pavilion Inc. product`;

  const contentHtml = transactionalEmailInfoBlock("RFQ", title);
  const noticeHtml = transactionalEmailNotice(
    "Confidentiality",
    "Private RFI correspondence remains visible only to your organization and the issuing procurement team. The inquiry and response are not included in this email.",
  );

  const html = renderTransactionalEmail({
    preheader: "A response is available in the RFQ workspace.",
    eyebrow: "Private RFI",
    headline: "A response has been posted to your Private RFI.",
    intro:
      "The issuing procurement team has responded to your inquiry. Review the response in the RFQ workspace.",
    contentHtml,
    noticeHtml,
    cta: { label: "Review RFI Response", url: workspaceUrl },
  });

  return { subject, html, text };
}

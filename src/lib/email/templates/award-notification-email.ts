
import {
  renderTransactionalEmail,
  transactionalEmailInfoBlock,
  transactionalEmailNotice,
} from "@/lib/email/templates/transactional-email-shell";

type AwardNotificationEmailProps = {
  rfqTitle: string;
  amount: string;
  awardUrl: string;
};

function value(input: string | null | undefined, fallback: string) {
  return String(input || "").trim() || fallback;
}

const LEGAL_BOUNDARY =
  "This record reflects the procurement award decision. It does not itself constitute an executed legal contract, Purchase Order, Notice to Proceed, or authorization to commence work.";

export function awardNotificationEmail({
  rfqTitle,
  amount,
  awardUrl,
}: AwardNotificationEmailProps) {
  const title = value(rfqTitle, "Procurement Opportunity");
  const amountValue = value(amount, "Not specified");

  const contentHtml = [
    transactionalEmailInfoBlock("RFQ", title),
    transactionalEmailInfoBlock("Awarded Amount", amountValue),
    transactionalEmailInfoBlock("Status", "Awarded"),
  ].join("");

  return renderTransactionalEmail({
    preheader: "The procurement award decision has been recorded.",
    eyebrow: "Contract Award",
    headline: "The Contract Award has been recorded.",
    intro:
      "The selected quotation has been recorded as the Contract Award for this RFQ in Intelligent Procurement.",
    contentHtml,
    noticeHtml: transactionalEmailNotice("Procurement Record", LEGAL_BOUNDARY),
    cta: { label: "Review Award Record", url: awardUrl },
  });
}

type SupplierAwardNotificationEmailProps = {
  rfqTitle: string;
  amount: string;
  awardUrl: string;
};

export function supplierAwardNotificationEmail({
  rfqTitle,
  amount,
  awardUrl,
}: SupplierAwardNotificationEmailProps) {
  const title = value(rfqTitle, "Procurement Opportunity");
  const amountValue = value(amount, "Not specified");
  const subject = `Contract Award — ${title}`;

  const text = `Contract Award

Your quotation has been selected for Contract Award.

RFQ: ${title}
Awarded Amount: ${amountValue}
Status: Awarded

The issuing procurement team has recorded your quotation as the selected award for this RFQ.

Review Award:
${awardUrl}

Legal boundary:
${LEGAL_BOUNDARY}

Confidentiality:
Your commercial submission remains confidential to your organization and the issuing procurement team.

Intelligent Procurement
A Nexus Pavilion Inc. product`;

  const contentHtml = [
    transactionalEmailInfoBlock("RFQ", title),
    transactionalEmailInfoBlock("Awarded Amount", amountValue),
    transactionalEmailInfoBlock("Status", "Awarded"),
  ].join("");

  const noticeHtml = [
    transactionalEmailNotice("Procurement Record", LEGAL_BOUNDARY),
    transactionalEmailNotice(
      "Confidentiality",
      "Your commercial submission remains confidential to your organization and the issuing procurement team.",
    ),
  ].join("");

  const html = renderTransactionalEmail({
    preheader: "Your quotation has been selected for Contract Award.",
    eyebrow: "Contract Award",
    headline: "Your quotation has been selected for Contract Award.",
    intro:
      "The issuing procurement team has recorded your quotation as the selected award for this RFQ.",
    contentHtml,
    noticeHtml,
    cta: { label: "Review Award", url: awardUrl },
  });

  return { subject, html, text };
}

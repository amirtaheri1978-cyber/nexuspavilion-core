
import {
  renderTransactionalEmail,
  transactionalEmailInfoBlock,
  transactionalEmailNotice,
} from "@/lib/email/templates/transactional-email-shell";

type QuoteSubmittedEmailProps = {
  rfqTitle: string;
  amount: string;
  timeline: string;
  validityDays: string;
  quoteUrl: string;
};

export function quoteSubmittedEmail({
  rfqTitle,
  amount,
  timeline,
  validityDays,
  quoteUrl,
}: QuoteSubmittedEmailProps) {
  const title = String(rfqTitle || "").trim() || "RFQ";
  const amountValue = String(amount || "").trim() || "Not specified";
  const timelineValue = String(timeline || "").trim() || "Not specified";
  const validityValue = String(validityDays || "").trim() || "Not specified";

  const contentHtml = [
    transactionalEmailInfoBlock("RFQ", title),
    transactionalEmailInfoBlock("Submitted Amount", amountValue),
    transactionalEmailInfoBlock("Delivery Timeline", timelineValue),
    transactionalEmailInfoBlock("Quotation Validity", validityValue),
  ].join("");

  const noticeHtml = [
    transactionalEmailNotice(
      "Confidentiality",
      "Your pricing, commercial notes, validity period and supporting submission information remain confidential and are not visible to competing respondents.",
    ),
    transactionalEmailNotice(
      "Procurement Status",
      "Submission does not constitute acceptance, recommendation, or Contract Award.",
    ),
  ].join("");

  return renderTransactionalEmail({
    preheader: "Your quotation has been recorded in the RFQ workspace.",
    eyebrow: "Quotation Submitted",
    headline: "Your quotation has been recorded.",
    intro:
      "Your quotation has been submitted and recorded in the RFQ procurement record.",
    contentHtml,
    noticeHtml,
    cta: { label: "Review Submission", url: quoteUrl },
  });
}

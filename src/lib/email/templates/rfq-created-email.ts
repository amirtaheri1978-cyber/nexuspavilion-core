
import {
  renderTransactionalEmail,
  transactionalEmailInfoBlock,
  transactionalEmailNotice,
} from "@/lib/email/templates/transactional-email-shell";

type RfqCreatedEmailProps = {
  rfqTitle: string;
  category: string;
  budget: string;
  rfqUrl: string;
  procurementScope?: string;
  sourcingMethod?: string;
  contractFramework?: string;
};

function value(input: string | null | undefined, fallback: string) {
  return String(input || "").trim() || fallback;
}

export function rfqCreatedEmail({
  rfqTitle,
  category,
  budget,
  rfqUrl,
  procurementScope,
  sourcingMethod,
  contractFramework,
}: RfqCreatedEmailProps) {
  const title = value(rfqTitle, "New RFQ");
  const contentHtml = [
    transactionalEmailInfoBlock("RFQ", title),
    transactionalEmailInfoBlock("Category", value(category, "Procurement")),
    transactionalEmailInfoBlock("Procurement Scope", value(procurementScope, "Not specified")),
    transactionalEmailInfoBlock("Sourcing Method", value(sourcingMethod, "Not specified")),
    transactionalEmailInfoBlock("Contract Framework", value(contractFramework, "Not specified")),
    transactionalEmailInfoBlock("Budget", value(budget, "Not specified")),
  ].join("");

  const noticeHtml = transactionalEmailNotice(
    "Recommended Next Step",
    "Review the RFQ package, dates and procurement settings before inviting respondents or progressing the sourcing process.",
  );

  return renderTransactionalEmail({
    preheader: "Your RFQ is available for review in Intelligent Procurement.",
    eyebrow: "RFQ Created",
    headline: "Your RFQ has been created.",
    intro:
      "The RFQ is now available in Intelligent Procurement for review and subsequent sourcing activity according to its configured procurement settings.",
    contentHtml,
    noticeHtml,
    cta: { label: "Open RFQ Workspace", url: rfqUrl },
  });
}


import {
  renderTransactionalEmail,
  transactionalEmailInfoBlock,
  transactionalEmailNotice,
} from "@/lib/email/templates/transactional-email-shell";

type SourcingMethod = "open" | "invited" | "sealed_bid";

type RfqInvitationEmailInput = {
  rfqTitle: string;
  category: string;
  budget: string;
  deadline: string;
  procurementScope: string;
  sourcingMethod: string;
  contractFramework: string;
  sourcingMethodKey?: string | null;
  inviteUrl: string;
};

function normalizeSourcingMethod(value: string | null | undefined): SourcingMethod | null {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "open") return "open";
  if (normalized === "sealed_bid") return "sealed_bid";
  if (normalized === "invited") return "invited";
  return null;
}

function getSourcingDescription(
  sourcingMethodKey: string | null | undefined,
  sourcingMethodLabel: string,
) {
  const sourcingMethod =
    normalizeSourcingMethod(sourcingMethodKey) ||
    normalizeSourcingMethod(sourcingMethodLabel);

  if (sourcingMethod === "open") {
    return "This RFQ may be available to qualified respondents under the issuing organization’s open sourcing rules.";
  }

  if (sourcingMethod === "sealed_bid") {
    return "This RFQ uses a sealed-bid workflow. Commercial responses remain confidential and are reviewed according to the submission deadline and evaluation process.";
  }

  return "This RFQ is being issued to selected respondents through controlled invitation access.";
}

export function buildRfqInvitationEmail({
  rfqTitle,
  category,
  budget,
  deadline,
  procurementScope,
  sourcingMethod,
  contractFramework,
  sourcingMethodKey,
  inviteUrl,
}: RfqInvitationEmailInput) {
  const title = String(rfqTitle || "").trim() || "Procurement RFQ";
  const categoryValue = String(category || "").trim() || "Procurement";
  const budgetValue = String(budget || "").trim() || "Not specified";
  const deadlineValue = String(deadline || "").trim() || "Not specified";
  const scopeValue = String(procurementScope || "").trim() || "Not specified";
  const sourcingValue = String(sourcingMethod || "").trim() || "Not specified";
  const frameworkValue = String(contractFramework || "").trim() || "Not specified";
  const subject = `RFQ Invitation — ${title}`;

  const text = `RFQ Invitation

You’ve been invited to review and respond to this RFQ.

RFQ: ${title}
Category: ${categoryValue}
Procurement Scope: ${scopeValue}
Sourcing Method: ${sourcingValue}
Contract Framework: ${frameworkValue}
Budget: ${budgetValue}
Submission Deadline: ${deadlineValue}

The issuing organization has invited you to review the RFQ requirements and, if you choose to participate, submit a quotation through Intelligent Procurement.

Review RFQ:
${inviteUrl}

Confidentiality:
Your quotation and commercial response are confidential and are not visible to competing respondents.

Participation in this RFQ does not create an award, contractual commitment, or obligation by the issuing organization.

Intelligent Procurement
A Nexus Pavilion Inc. product`;

  const contentHtml = [
    transactionalEmailInfoBlock("RFQ", title),
    transactionalEmailInfoBlock("Category", categoryValue),
    transactionalEmailInfoBlock("Procurement Scope", scopeValue),
    transactionalEmailInfoBlock("Sourcing Method", sourcingValue),
    transactionalEmailInfoBlock("Contract Framework", frameworkValue),
    transactionalEmailInfoBlock("Budget", budgetValue),
    transactionalEmailInfoBlock("Submission Deadline", deadlineValue),
  ].join("");

  const noticeHtml = [
    transactionalEmailNotice("Sourcing & Access", getSourcingDescription(sourcingMethodKey, sourcingValue)),
    transactionalEmailNotice(
      "Confidentiality",
      "Your quotation and commercial response are confidential and are not visible to competing respondents.",
    ),
    transactionalEmailNotice(
      "Participation",
      "Participation in this RFQ does not create an award, contractual commitment, or obligation by the issuing organization.",
    ),
  ].join("");

  const html = renderTransactionalEmail({
    preheader: "Review the RFQ requirements, deadline and response details.",
    eyebrow: "RFQ Invitation",
    headline: "You’ve been invited to review and respond to this RFQ.",
    intro:
      "The issuing organization has invited you to review the RFQ requirements and, if you choose to participate, submit a quotation through Intelligent Procurement.",
    contentHtml,
    noticeHtml,
    cta: { label: "Review RFQ", url: inviteUrl },
  });

  return { subject, html, text };
}

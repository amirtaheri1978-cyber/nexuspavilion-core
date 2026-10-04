
import {
  renderTransactionalEmail,
  transactionalEmailInfoBlock,
  transactionalEmailNotice,
} from "@/lib/email/templates/transactional-email-shell";

export function companyWelcomeEmail({
  companyName,
  workspaceUrl,
}: {
  companyName: string;
  workspaceUrl: string;
}) {
  const displayCompany = String(companyName || "").trim() || "Company Workspace";

  const contentHtml = [
    transactionalEmailInfoBlock("Company Workspace", displayCompany),
    transactionalEmailInfoBlock("Workspace Status", "Ready"),
  ].join("");

  const noticeHtml = transactionalEmailNotice(
    "Recommended Next Step",
    "Review your company profile and workspace access before beginning procurement activity.",
  );

  return renderTransactionalEmail({
    preheader: "Your Company Workspace is available in Intelligent Procurement.",
    eyebrow: "Company Workspace",
    headline: `${displayCompany} is ready.`,
    intro:
      "Your Company Workspace has been established in Intelligent Procurement and is ready for authorized team access and procurement activity.",
    contentHtml,
    noticeHtml,
    cta: { label: "Open Company Workspace", url: workspaceUrl },
    footerNote: `This message was sent because a Company Workspace was created for ${displayCompany}.`,
  });
}

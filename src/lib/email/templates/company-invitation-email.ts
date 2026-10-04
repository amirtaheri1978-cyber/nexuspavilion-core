
import {
  renderTransactionalEmail,
  transactionalEmailInfoBlock,
  transactionalEmailNotice,
} from "@/lib/email/templates/transactional-email-shell";

type CompanyInvitationEmailInput = {
  companyName: string;
  invitedEmail: string;
  invitedRole: string;
  inviteUrl: string;
};

function formatRole(role: string) {
  const value = String(role || "").trim().toLowerCase();
  if (value === "viewer") return "Read Only";
  if (value === "member") return "Standard";
  if (value === "admin") return "Administrator";
  if (value === "buyer") return "Standard";
  if (value === "vendor") return "Standard";
  return "Access Level Pending";
}

export function buildCompanyInvitationEmail({
  companyName,
  invitedEmail,
  invitedRole,
  inviteUrl,
}: CompanyInvitationEmailInput) {
  const displayCompany = String(companyName || "").trim() || "Company Workspace";
  const roleLabel = formatRole(invitedRole);
  const subject = `Workspace Invitation — ${displayCompany}`;

  const text = `Company Workspace Invitation

You’ve been invited to join ${displayCompany}.

You have been invited to access ${displayCompany}’s workspace in Intelligent Procurement.

Workspace: ${displayCompany}
Access Level: ${roleLabel}
Invited Email: ${invitedEmail}

Your assigned Access Level governs Company Workspace access. RFQ participation and procurement permissions are managed separately.

Accept Workspace Invitation:
${inviteUrl}

If you were not expecting this invitation, no action is required.

Intelligent Procurement
A Nexus Pavilion Inc. product`;

  const contentHtml = [
    transactionalEmailInfoBlock("Workspace", displayCompany),
    transactionalEmailInfoBlock("Access Level", roleLabel),
    transactionalEmailInfoBlock("Invited Email", invitedEmail),
  ].join("");

  const noticeHtml = transactionalEmailNotice(
    "Access Boundary",
    "Your assigned Access Level governs Company Workspace access. RFQ participation and procurement permissions are managed separately.",
  );

  const html = renderTransactionalEmail({
    preheader: `You’ve been invited to access ${displayCompany} in Intelligent Procurement.`,
    eyebrow: "Company Workspace Invitation",
    headline: `You’ve been invited to join ${displayCompany}.`,
    intro: `You have been invited to access ${displayCompany}’s workspace in Intelligent Procurement.`,
    contentHtml,
    noticeHtml,
    cta: { label: "Accept Workspace Invitation", url: inviteUrl },
    footerNote: "If you were not expecting this invitation, no action is required.",
  });

  return { subject, html, text };
}

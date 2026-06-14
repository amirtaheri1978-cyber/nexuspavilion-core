type CompanyInvitationEmailInput = {
companyName: string;
invitedEmail: string;
invitedRole: string;
inviteUrl: string;
};

function formatRole(role: string) {
if (role === "admin") return "Admin";
if (role === "buyer") return "Buyer";
return "Vendor";
}

function escapeHtml(value: string) {
return String(value || "")
.replaceAll("&", "&amp;")
.replaceAll("<", "&lt;")
.replaceAll(">", "&gt;")
.replaceAll('"', "&quot;")
.replaceAll("'", "&#039;");
}

export function buildCompanyInvitationEmail({
companyName,
invitedEmail,
invitedRole,
inviteUrl,
}: CompanyInvitationEmailInput) {
const safeCompanyName = escapeHtml(companyName || "A company");
const safeInvitedEmail = escapeHtml(invitedEmail);
const roleLabel = formatRole(invitedRole);
const safeRoleLabel = escapeHtml(roleLabel);
const safeInviteUrl = escapeHtml(inviteUrl);

const subject = `${companyName} invited you to Nexus Pavilion`;

const text = `
You have been invited to join ${companyName} on Nexus Pavilion.

Workspace: ${companyName}
Role: ${roleLabel}
Email: ${invitedEmail}

Nexus Pavilion is a secure construction procurement workspace for RFQs, supplier coordination, quote activity, governance controls, and company-level collaboration.

Accept your invitation:
${inviteUrl}
`;

const html = `
<div style="margin:0;background:#f6f6f3;padding:32px;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:680px;margin:0 auto;overflow:hidden;border-radius:28px;border:1px solid #e5e7eb;background:#ffffff;">
<div style="background:#020617;padding:34px 32px;color:#ffffff;">
<p style="margin:0;font-size:11px;font-weight:900;letter-spacing:0.28em;color:#fb923c;text-transform:uppercase;">
Nexus Pavilion · Secure Workspace Invitation
</p>

<h1 style="margin:14px 0 0;font-size:34px;line-height:1.1;font-weight:900;color:#ffffff;">
You have been invited to join ${safeCompanyName}
</h1>

<p style="margin:16px 0 0;max-width:560px;font-size:15px;line-height:1.75;color:#cbd5e1;">
You have been invited to join a secure construction procurement workspace on Nexus Pavilion for RFQs, supplier coordination, quote workflows, and company collaboration.
</p>
</div>

<div style="padding:32px;">
<div style="border-radius:22px;border:1px solid #e2e8f0;background:#f8fafc;padding:24px;">
<p style="margin:0;font-size:11px;font-weight:900;letter-spacing:0.22em;color:#f97316;text-transform:uppercase;">
Invitation Details
</p>

${emailInfoBlock("Workspace", safeCompanyName)}
${emailInfoBlock("Invited Email", safeInvitedEmail)}
${emailInfoBlock("Workspace Role", safeRoleLabel)}
</div>

<div style="margin-top:24px;border-radius:22px;background:#fff7ed;padding:22px;border:1px solid #fed7aa;">
<p style="margin:0;font-size:12px;font-weight:900;letter-spacing:0.22em;color:#ea580c;text-transform:uppercase;">
Procurement Governance
</p>

<ul style="margin:14px 0 0;padding-left:20px;color:#7c2d12;font-size:14px;line-height:1.8;font-weight:700;">
<li>Workspace access is controlled by company role and permissions.</li>
<li>RFQ activity, supplier coordination, and quote workflows are tracked inside the platform.</li>
<li>Commercial submissions are handled through secure procurement workflows.</li>
<li>Buyer and supplier visibility is governed by each RFQ’s sourcing method and access rules.</li>
</ul>
</div>

<a
href="${safeInviteUrl}"
style="display:inline-block;margin-top:28px;background:#020617;color:#ffffff;text-decoration:none;padding:15px 24px;border-radius:999px;font-size:14px;font-weight:900;"
>
Accept Workspace Invitation
</a>

<p style="margin-top:24px;font-size:13px;line-height:1.6;color:#64748b;">
If the button does not work, copy and paste this link into your browser:
</p>

<p style="word-break:break-all;font-size:13px;color:#334155;">
${safeInviteUrl}
</p>

<p style="margin:28px 0 0;font-size:12px;line-height:1.7;color:#94a3b8;">
This message was sent by Nexus Pavilion procurement automation. Access to this workspace may include RFQs, company profile management, supplier activity, quote workflows, and procurement intelligence depending on your assigned role.
</p>
</div>
</div>
</div>
`;

return {
subject,
html,
text,
};
}

function emailInfoBlock(label: string, value: string) {
return `
<div style="margin-top:14px;border-radius:16px;background:#ffffff;padding:16px;border:1px solid #e5e7eb;">
<p style="margin:0;font-size:11px;font-weight:900;letter-spacing:0.18em;color:#94a3b8;text-transform:uppercase;">
${label}
</p>
<p style="margin:6px 0 0;font-size:16px;font-weight:900;color:#020617;">
${value}
</p>
</div>
`;
}
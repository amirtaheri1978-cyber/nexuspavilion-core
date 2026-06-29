type CompanyInvitationEmailInput = {
companyName: string;
invitedEmail: string;
invitedRole: string;
inviteUrl: string;
};

function formatRole(role: string) {
if (role === "admin") return "Admin";
if (role === "buyer") return "Buyer";
if (role === "vendor") return "Vendor";

return "Workspace Member";
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

Nexus Pavilion is a secure enterprise procurement intelligence workspace for RFQs, supplier coordination, quote workflows, governance controls, and company-level collaboration.

Accept your invitation:
${inviteUrl}

If you were not expecting this invitation, you can safely ignore this email.
`;

const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Workspace Invitation</title>
</head>

<body style="margin:0;padding:0;background:#061426;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:34px 16px;background:#061426;">
<tr>
<td align="center">
<table width="720" cellpadding="0" cellspacing="0" border="0" style="max-width:720px;width:100%;background:#07111F;border-radius:30px;overflow:hidden;border:1px solid #1f3347;box-shadow:0 28px 90px rgba(0,0,0,0.38);">

<tr>
<td style="padding:42px 44px 34px;background:#07111F;border-bottom:1px solid #1f3347;">
<div style="display:inline-block;background:#020617;border:1px solid #1f3347;border-radius:20px;padding:16px 20px;">
<p style="margin:0;color:#ffffff;font-size:22px;font-weight:900;letter-spacing:-0.02em;">
Nexus Pavilion
</p>
<p style="margin:6px 0 0;color:#C8A646;font-size:10px;font-weight:900;letter-spacing:3px;text-transform:uppercase;">
Enterprise Procurement Intelligence
</p>
</div>

<p style="margin:34px 0 0;color:#C8A646;font-size:12px;font-weight:900;letter-spacing:5px;text-transform:uppercase;">
Secure Workspace Invitation
</p>

<h1 style="margin:18px 0 0;color:#ffffff;font-size:44px;line-height:1.05;font-weight:900;letter-spacing:-1.4px;">
You have been invited to join ${safeCompanyName}.
</h1>

<p style="margin:22px 0 0;color:#cbd5e1;font-size:17px;line-height:1.8;font-weight:600;">
You have been invited to join a protected Nexus Pavilion procurement workspace for RFQs, supplier coordination, quote workflows, and company collaboration.
</p>
</td>
</tr>

<tr>
<td style="padding:36px 44px 0;background:#07111F;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #24364a;border-radius:24px;background:#0b1b2c;">
<tr>
<td style="padding:28px;">
<p style="margin:0;color:#94a3b8;font-size:12px;font-weight:900;letter-spacing:4px;text-transform:uppercase;">
Invitation Details
</p>

${emailInfoBlock("Workspace", safeCompanyName)}
${emailInfoBlock("Invited Email", safeInvitedEmail)}
${emailInfoBlock("Workspace Role", safeRoleLabel)}
</td>
</tr>
</table>
</td>
</tr>

<tr>
<td style="padding:30px 44px 0;background:#07111F;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0b1b2c;border:1px solid #24364a;border-radius:24px;">
<tr>
<td style="padding:26px;">
<p style="margin:0;color:#C8A646;font-size:12px;font-weight:900;letter-spacing:3px;text-transform:uppercase;">
Procurement Governance
</p>

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px;">
${governanceRow("Workspace access is controlled by company role and permissions.")}
${governanceRow("RFQ activity, supplier coordination, and quote workflows are tracked inside Nexus Pavilion.")}
${governanceRow("Commercial submissions are handled through secure procurement workflows.")}
${governanceRow("Buyer and supplier visibility is governed by sourcing method and access rules.")}
</table>
</td>
</tr>
</table>
</td>
</tr>

<tr>
<td style="padding:34px 44px 0;background:#07111F;">
<a
href="${safeInviteUrl}"
style="display:inline-block;background:#C8A646;color:#061426;text-decoration:none;padding:17px 30px;border-radius:16px;font-weight:900;font-size:15px;letter-spacing:1px;text-transform:uppercase;"
>
Accept Invitation
</a>

<a
href="${safeInviteUrl}"
style="display:inline-block;margin-left:10px;background:#0b1b2c;color:#ffffff;text-decoration:none;padding:17px 30px;border-radius:16px;font-weight:900;font-size:15px;border:1px solid #24364a;"
>
Open Secure Link
</a>
</td>
</tr>

<tr>
<td style="padding:28px 44px 0;background:#07111F;">
<p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.7;font-weight:600;">
If the button does not work, copy and paste this secure invitation link into your browser:
</p>

<p style="margin:12px 0 0;word-break:break-all;color:#cbd5e1;font-size:13px;line-height:1.7;">
${safeInviteUrl}
</p>
</td>
</tr>

<tr>
<td style="padding:34px 44px 42px;background:#07111F;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#061426;border:1px solid #24364a;border-radius:22px;">
<tr>
<td style="padding:24px;">
<p style="margin:0;color:#C8A646;font-size:12px;font-weight:900;letter-spacing:3px;text-transform:uppercase;">
Security Notice
</p>

<p style="margin:14px 0 0;color:#cbd5e1;font-size:14px;line-height:1.8;font-weight:600;">
This invitation may provide access to RFQs, company profile management, supplier activity, quote workflows, and procurement intelligence depending on your assigned role. If you were not expecting this invitation, you can safely ignore this email.
</p>
</td>
</tr>
</table>

<p style="margin:30px 0 0;color:#64748b;font-size:13px;line-height:1.8;font-weight:600;">
Nexus Pavilion Procurement Intelligence Platform<br />
Supplier Intelligence • RFQ Management • Award Analytics • Executive Reporting
</p>
</td>
</tr>

</table>
</td>
</tr>
</table>
</body>
</html>
`;

return {
subject,
html,
text,
};
}

function emailInfoBlock(label: string, value: string) {
return `
<div style="margin-top:16px;border-radius:18px;background:#061426;padding:18px;border:1px solid #24364a;">
<p style="margin:0;font-size:11px;font-weight:900;letter-spacing:0.18em;color:#94a3b8;text-transform:uppercase;">
${label}
</p>
<p style="margin:8px 0 0;font-size:17px;font-weight:900;color:#ffffff;">
${value}
</p>
</div>
`;
}

function governanceRow(label: string) {
return `
<tr>
<td style="padding:10px 0;color:#e5e7eb;font-size:14px;line-height:1.7;font-weight:700;">
<span style="color:#C8A646;font-weight:900;">✓</span>
&nbsp;${escapeHtml(label)}
</td>
</tr>
`;
}
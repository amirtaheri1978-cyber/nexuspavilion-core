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
return value
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
const safeCompanyName = escapeHtml(companyName);
const safeInvitedEmail = escapeHtml(invitedEmail);
const roleLabel = formatRole(invitedRole);
const safeRoleLabel = escapeHtml(roleLabel);
const safeInviteUrl = escapeHtml(inviteUrl);

const subject = `${companyName} invited you to Nexus Pavilion`;

const text = `
You have been invited to join ${companyName} on Nexus Pavilion.

Role: ${roleLabel}
Email: ${invitedEmail}

Accept your invitation:
${inviteUrl}
`;

const html = `
<div style="font-family: Arial, sans-serif; background:#f6f6f3; padding:32px;">
<div style="max-width:640px; margin:0 auto; background:#ffffff; border-radius:28px; padding:32px;">
<p style="font-size:12px; letter-spacing:4px; color:#f97316; font-weight:800; text-transform:uppercase;">
Nexus Pavilion
</p>

<h1 style="font-size:32px; line-height:1.1; color:#020617; margin:16px 0;">
You have been invited to join ${safeCompanyName}
</h1>

<p style="font-size:15px; line-height:1.7; color:#475569;">
You have been invited to join a secure construction procurement workspace on Nexus Pavilion.
</p>

<div style="background:#f8fafc; border-radius:20px; padding:20px; margin:24px 0;">
<p style="margin:0 0 8px; color:#64748b; font-size:13px; font-weight:700;">
Invited email
</p>

<p style="margin:0 0 16px; color:#020617; font-size:16px; font-weight:800;">
${safeInvitedEmail}
</p>

<p style="margin:0 0 8px; color:#64748b; font-size:13px; font-weight:700;">
Role
</p>

<p style="margin:0; color:#020617; font-size:16px; font-weight:800;">
${safeRoleLabel}
</p>
</div>

<a
href="${safeInviteUrl}"
style="display:inline-block; background:#020617; color:#ffffff; text-decoration:none; padding:14px 22px; border-radius:999px; font-size:14px; font-weight:800;"
>
Accept Invitation
</a>

<p style="margin-top:24px; font-size:13px; line-height:1.6; color:#64748b;">
If the button does not work, copy and paste this link into your browser:
</p>

<p style="word-break:break-all; font-size:13px; color:#334155;">
${safeInviteUrl}
</p>
</div>
</div>
`;

return {
subject,
html,
text,
};
}
function escapeHtml(value: string) {
return String(value)
.replace(/&/g, "&amp;")
.replace(/</g, "&lt;")
.replace(/>/g, "&gt;")
.replace(/"/g, "&quot;")
.replace(/'/g, "&#039;");
}

export function companyWelcomeEmail({
companyName,
workspaceUrl,
}: {
companyName: string;
workspaceUrl: string;
}) {
const safeCompanyName = escapeHtml(companyName);
const safeWorkspaceUrl = escapeHtml(workspaceUrl);

return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Your Nexus Pavilion Workspace Is Live</title>
</head>

<body style="margin:0;padding:0;background:#061426;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:34px 16px;background:#061426;">
<tr>
<td align="center">
<table width="720" cellpadding="0" cellspacing="0" border="0" style="max-width:720px;width:100%;background:#07111F;border-radius:30px;overflow:hidden;border:1px solid #1f3347;box-shadow:0 28px 90px rgba(0,0,0,0.38);">

<tr>
<td style="padding:42px 44px 34px;background:#07111F;border-bottom:1px solid #1f3347;">
<table width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td>
<div style="display:inline-block;background:#020617;border:1px solid #1f3347;border-radius:20px;padding:16px 20px;">
<p style="margin:0;color:#ffffff;font-size:22px;font-weight:900;letter-spacing:-0.02em;">
Nexus Pavilion
</p>
<p style="margin:6px 0 0;color:#C8A646;font-size:10px;font-weight:900;letter-spacing:3px;text-transform:uppercase;">
Enterprise Procurement Intelligence
</p>
</div>
</td>
</tr>
</table>

<p style="margin:34px 0 0;color:#C8A646;font-size:12px;font-weight:900;letter-spacing:5px;text-transform:uppercase;">
Workspace Activated
</p>

<h1 style="margin:18px 0 0;color:#ffffff;font-size:46px;line-height:1.05;font-weight:900;letter-spacing:-1.6px;">
Your procurement workspace is live.
</h1>

<p style="margin:22px 0 0;color:#cbd5e1;font-size:17px;line-height:1.8;font-weight:600;">
Your Nexus Pavilion enterprise workspace is now active and ready for RFQs, supplier collaboration, procurement intelligence, and executive reporting.
</p>
</td>
</tr>

<tr>
<td style="padding:36px 44px 0;background:#07111F;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #24364a;border-radius:24px;background:#0b1b2c;">
<tr>
<td style="padding:28px;">
<p style="margin:0;color:#94a3b8;font-size:12px;font-weight:900;letter-spacing:4px;text-transform:uppercase;">
Company Workspace
</p>

<h2 style="margin:14px 0 0;color:#ffffff;font-size:34px;line-height:1.2;font-weight:900;">
${safeCompanyName}
</h2>

<p style="margin:14px 0 0;color:#cbd5e1;font-size:14px;line-height:1.7;font-weight:700;">
Workspace status: <strong style="color:#86efac;">Active</strong>
</p>
</td>
</tr>
</table>
</td>
</tr>

<tr>
<td style="padding:28px 44px 0;background:#07111F;">
<table width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td width="50%" style="padding:8px;">
<div style="border:1px solid #24364a;border-radius:18px;padding:18px;background:#061426;">
<p style="margin:0;color:#94a3b8;font-size:10px;font-weight:900;letter-spacing:2px;text-transform:uppercase;">RFQ Access</p>
<p style="margin:10px 0 0;color:#ffffff;font-size:20px;font-weight:900;">Ready</p>
</div>
</td>

<td width="50%" style="padding:8px;">
<div style="border:1px solid #24364a;border-radius:18px;padding:18px;background:#061426;">
<p style="margin:0;color:#94a3b8;font-size:10px;font-weight:900;letter-spacing:2px;text-transform:uppercase;">Workspace</p>
<p style="margin:10px 0 0;color:#86efac;font-size:20px;font-weight:900;">Live</p>
</div>
</td>
</tr>

<tr>
<td width="50%" style="padding:8px;">
<div style="border:1px solid #24364a;border-radius:18px;padding:18px;background:#061426;">
<p style="margin:0;color:#94a3b8;font-size:10px;font-weight:900;letter-spacing:2px;text-transform:uppercase;">Supplier Network</p>
<p style="margin:10px 0 0;color:#ffffff;font-size:20px;font-weight:900;">Enabled</p>
</div>
</td>

<td width="50%" style="padding:8px;">
<div style="border:1px solid #24364a;border-radius:18px;padding:18px;background:#061426;">
<p style="margin:0;color:#94a3b8;font-size:10px;font-weight:900;letter-spacing:2px;text-transform:uppercase;">Reporting</p>
<p style="margin:10px 0 0;color:#ffffff;font-size:20px;font-weight:900;">Executive</p>
</div>
</td>
</tr>
</table>
</td>
</tr>

<tr>
<td style="padding:34px 44px 0;background:#07111F;">
<h3 style="margin:0;color:#ffffff;font-size:26px;line-height:1.2;font-weight:900;">
Recommended next actions
</h3>

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;">
<tr>
<td style="padding:13px 0;color:#e5e7eb;font-size:15px;line-height:1.7;font-weight:700;">✓ Complete your company profile</td>
</tr>
<tr>
<td style="padding:13px 0;color:#e5e7eb;font-size:15px;line-height:1.7;font-weight:700;">✓ Invite procurement and leadership team members</td>
</tr>
<tr>
<td style="padding:13px 0;color:#e5e7eb;font-size:15px;line-height:1.7;font-weight:700;">✓ Prepare your first RFQ workflow</td>
</tr>
<tr>
<td style="padding:13px 0;color:#e5e7eb;font-size:15px;line-height:1.7;font-weight:700;">✓ Review supplier intelligence and reporting tools</td>
</tr>
</table>
</td>
</tr>

<tr>
<td style="padding:34px 44px 0;background:#07111F;">
<a href="${safeWorkspaceUrl}" style="display:inline-block;background:#C8A646;color:#061426;text-decoration:none;padding:17px 30px;border-radius:16px;font-weight:900;font-size:15px;letter-spacing:1px;text-transform:uppercase;">
Open Workspace
</a>

<a href="${safeWorkspaceUrl}" style="display:inline-block;margin-left:10px;background:#0b1b2c;color:#ffffff;text-decoration:none;padding:17px 30px;border-radius:16px;font-weight:900;font-size:15px;border:1px solid #24364a;">
Review Dashboard
</a>
</td>
</tr>

<tr>
<td style="padding:34px 44px 0;background:#07111F;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0b1b2c;border:1px solid #24364a;border-radius:24px;">
<tr>
<td style="padding:26px;">
<p style="margin:0;color:#C8A646;font-size:12px;font-weight:900;letter-spacing:3px;text-transform:uppercase;">
Executive Procurement Intelligence
</p>

<p style="margin:14px 0 0;color:#cbd5e1;font-size:15px;line-height:1.8;font-weight:600;">
Nexus Pavilion brings RFQs, supplier workflows, award visibility, procurement analytics, and board-ready reporting into one secure enterprise platform.
</p>
</td>
</tr>
</table>
</td>
</tr>

<tr>
<td style="padding:34px 44px 42px;background:#07111F;">
<p style="margin:0;color:#64748b;font-size:13px;line-height:1.8;font-weight:600;">
Nexus Pavilion Procurement Intelligence Platform<br />
Supplier Intelligence • RFQ Management • Award Analytics • Executive Reporting
</p>

<p style="margin:18px 0 0;color:#475569;font-size:12px;line-height:1.7;">
This message was sent because a Nexus Pavilion company workspace was created for ${safeCompanyName}.
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
}
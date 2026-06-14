export function companyWelcomeEmail({
companyName,
workspaceUrl,
}: {
companyName: string;
workspaceUrl: string;
}) {
return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Your Procurement Workspace Is Live</title>
</head>

<body style="margin:0;padding:0;background:#0b1120;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:32px 16px;background:#0b1120;">
<tr>
<td align="center">
<table width="720" cellpadding="0" cellspacing="0" border="0" style="max-width:720px;width:100%;background:#111827;border-radius:28px;overflow:hidden;border:1px solid #1f2937;">
<tr>
<td style="padding:44px 44px 36px;background:#eef2ff;">
<p style="margin:0;color:#b45309;font-size:12px;font-weight:900;letter-spacing:5px;text-transform:uppercase;">
Nexus Pavilion
</p>

<h1 style="margin:20px 0 0;color:#111827;font-size:48px;line-height:1.05;font-weight:900;">
Your Procurement Workspace Is Live
</h1>

<p style="margin:22px 0 0;color:#4b5563;font-size:18px;line-height:1.8;">
Your enterprise procurement intelligence workspace is active and ready for RFQs, supplier collaboration, analytics, and executive reporting.
</p>
</td>
</tr>

<tr>
<td style="padding:38px 44px 10px;background:#111827;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #293241;border-radius:22px;background:#1f2937;">
<tr>
<td style="padding:26px;">
<p style="margin:0;color:#94a3b8;font-size:12px;font-weight:900;letter-spacing:4px;text-transform:uppercase;">
Company Workspace
</p>

<h2 style="margin:14px 0 0;color:#ffffff;font-size:34px;line-height:1.2;font-weight:900;">
${companyName}
</h2>

<p style="margin:14px 0 0;color:#cbd5e1;font-size:14px;line-height:1.7;">
Workspace status: <strong style="color:#86efac;">Active</strong>
</p>
</td>
</tr>
</table>
</td>
</tr>

<tr>
<td style="padding:26px 44px 0;background:#111827;">
<table width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td width="25%" style="padding:10px;">
<div style="border:1px solid #293241;border-radius:18px;padding:18px;background:#0f172a;">
<p style="margin:0;color:#94a3b8;font-size:10px;font-weight:900;letter-spacing:2px;text-transform:uppercase;">RFQs</p>
<p style="margin:10px 0 0;color:#ffffff;font-size:28px;font-weight:900;">0</p>
</div>
</td>

<td width="25%" style="padding:10px;">
<div style="border:1px solid #293241;border-radius:18px;padding:18px;background:#0f172a;">
<p style="margin:0;color:#94a3b8;font-size:10px;font-weight:900;letter-spacing:2px;text-transform:uppercase;">Team</p>
<p style="margin:10px 0 0;color:#ffffff;font-size:28px;font-weight:900;">1</p>
</div>
</td>

<td width="25%" style="padding:10px;">
<div style="border:1px solid #293241;border-radius:18px;padding:18px;background:#0f172a;">
<p style="margin:0;color:#94a3b8;font-size:10px;font-weight:900;letter-spacing:2px;text-transform:uppercase;">Suppliers</p>
<p style="margin:10px 0 0;color:#ffffff;font-size:28px;font-weight:900;">Ready</p>
</div>
</td>

<td width="25%" style="padding:10px;">
<div style="border:1px solid #293241;border-radius:18px;padding:18px;background:#0f172a;">
<p style="margin:0;color:#94a3b8;font-size:10px;font-weight:900;letter-spacing:2px;text-transform:uppercase;">Status</p>
<p style="margin:10px 0 0;color:#86efac;font-size:28px;font-weight:900;">Live</p>
</div>
</td>
</tr>
</table>
</td>
</tr>

<tr>
<td style="padding:34px 44px 0;background:#111827;">
<h3 style="margin:0;color:#ffffff;font-size:28px;line-height:1.2;font-weight:900;">
Recommended Next Actions
</h3>

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;">
<tr>
<td style="padding:14px 0;color:#e5e7eb;font-size:16px;">✓ Complete company profile</td>
</tr>
<tr>
<td style="padding:14px 0;color:#e5e7eb;font-size:16px;">✓ Invite procurement and leadership team members</td>
</tr>
<tr>
<td style="padding:14px 0;color:#e5e7eb;font-size:16px;">✓ Create your first RFQ</td>
</tr>
<tr>
<td style="padding:14px 0;color:#e5e7eb;font-size:16px;">✓ Review supplier intelligence and reporting tools</td>
</tr>
</table>
</td>
</tr>

<tr>
<td style="padding:34px 44px;background:#111827;">
<a href="${workspaceUrl}" style="display:inline-block;background:#ffffff;color:#111827;text-decoration:none;padding:16px 30px;border-radius:14px;font-weight:900;font-size:16px;">
Open Workspace
</a>

<a href="${workspaceUrl}" style="display:inline-block;margin-left:10px;background:#ea580c;color:#ffffff;text-decoration:none;padding:16px 30px;border-radius:14px;font-weight:900;font-size:16px;">
Start First RFQ
</a>
</td>
</tr>

<tr>
<td style="padding:0 44px 44px;background:#111827;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fff7ed;border:1px solid #fed7aa;border-radius:22px;">
<tr>
<td style="padding:26px;">
<p style="margin:0;color:#9a3412;font-size:12px;font-weight:900;letter-spacing:3px;text-transform:uppercase;">
Executive Procurement Intelligence
</p>

<p style="margin:14px 0 0;color:#7c2d12;font-size:15px;line-height:1.8;">
Nexus Pavilion brings RFQs, supplier workflows, award visibility, procurement analytics, and board-ready reporting into one executive-grade platform.
</p>
</td>
</tr>
</table>

<p style="margin:34px 0 0;color:#64748b;font-size:13px;line-height:1.8;">
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
}
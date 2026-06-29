type AwardNotificationEmailProps = {
rfqTitle: string;
amount: string;
awardUrl: string;
};

function escapeHtml(value: string) {
return String(value || "")
.replaceAll("&", "&amp;")
.replaceAll("<", "&lt;")
.replaceAll(">", "&gt;")
.replaceAll('"', "&quot;")
.replaceAll("'", "&#039;");
}

function safeValue(value: string | null | undefined, fallback: string) {
return String(value || "").trim() || fallback;
}

export function awardNotificationEmail({
rfqTitle,
amount,
awardUrl,
}: AwardNotificationEmailProps) {
const safeTitle = escapeHtml(safeValue(rfqTitle, "Procurement Opportunity"));
const safeAmount = escapeHtml(safeValue(amount, "Not specified"));
const safeUrl = escapeHtml(awardUrl);

return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Contract Award Confirmed</title>
</head>

<body style="margin:0;padding:0;background:#061426;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:34px 16px;background:#061426;">
<tr>
<td align="center">

<table width="720" cellpadding="0" cellspacing="0" border="0"
style="max-width:720px;width:100%;background:#07111F;border-radius:30px;overflow:hidden;border:1px solid #1f3347;box-shadow:0 28px 90px rgba(0,0,0,.38);">

<tr>
<td style="padding:42px 44px 34px;background:#07111F;border-bottom:1px solid #1f3347;">

<div style="display:inline-block;background:#020617;border:1px solid #1f3347;border-radius:20px;padding:16px 20px;">
<p style="margin:0;color:#fff;font-size:22px;font-weight:900;">
Nexus Pavilion
</p>

<p style="margin:6px 0 0;color:#C8A646;font-size:10px;font-weight:900;letter-spacing:3px;text-transform:uppercase;">
Enterprise Procurement Intelligence
</p>
</div>

<p style="margin:34px 0 0;color:#C8A646;font-size:12px;font-weight:900;letter-spacing:5px;text-transform:uppercase;">
Award Decision
</p>

<h1 style="margin:18px 0 0;color:#fff;font-size:44px;font-weight:900;line-height:1.05;">
Contract Award Confirmed
</h1>

<p style="margin:22px 0 0;color:#cbd5e1;font-size:17px;line-height:1.8;font-weight:600;">
A supplier selection decision has been completed and securely recorded inside Nexus Pavilion.
The award is now part of your enterprise procurement record.
</p>

</td>
</tr>

<tr>
<td style="padding:36px 44px 0;background:#07111F;">

<table width="100%" cellpadding="0" cellspacing="0" border="0"
style="border:1px solid #24364a;border-radius:24px;background:#0b1b2c;">

<tr>
<td style="padding:28px;">

<p style="margin:0;color:#94a3b8;font-size:12px;font-weight:900;letter-spacing:4px;text-transform:uppercase;">
Award Summary
</p>

${infoCard("Procurement Opportunity", safeTitle)}

${infoCard("Award Value", safeAmount)}

${infoCard("Status", "Awarded")}

${infoCard("Audit Record", "Recorded Successfully")}

</td>
</tr>

</table>

</td>
</tr>

<tr>
<td style="padding:30px 44px 0;background:#07111F;">

${noticeCard(
"Executive Procurement Intelligence",
"This award contributes to procurement analytics, supplier performance metrics, contract reporting, executive dashboards, and board-level intelligence."
)}

${noticeCard(
"Governance & Compliance",
"Award decisions are permanently recorded within the Nexus Pavilion audit trail and remain available for reporting, governance, and compliance review."
)}

${noticeCard(
"Procurement Record",
"The Buyer reserves the right to amend, cancel, reject, or re-evaluate procurement decisions in accordance with organizational procurement policies and contractual obligations."
)}

</td>
</tr>

<tr>
<td style="padding:34px 44px 0;background:#07111F;">

<a
href="${safeUrl}"
style="display:inline-block;background:#C8A646;color:#061426;text-decoration:none;padding:17px 30px;border-radius:16px;font-weight:900;font-size:15px;letter-spacing:1px;text-transform:uppercase;">
Review Award
</a>

<a
href="${safeUrl}"
style="display:inline-block;margin-left:10px;background:#0b1b2c;color:#fff;text-decoration:none;padding:17px 30px;border-radius:16px;font-weight:900;font-size:15px;border:1px solid #24364a;">
Open Procurement Record
</a>

</td>
</tr>

<tr>
<td style="padding:28px 44px 0;background:#07111F;">

<p style="margin:0;color:#94a3b8;font-size:13px;font-weight:600;">
If the button does not work, copy and paste this secure link into your browser:
</p>

<p style="margin:12px 0 0;color:#cbd5e1;font-size:13px;word-break:break-all;">
${safeUrl}
</p>

</td>
</tr>

<tr>
<td style="padding:34px 44px 42px;background:#07111F;">

<table width="100%" cellpadding="0" cellspacing="0" border="0"
style="background:#061426;border:1px solid #24364a;border-radius:22px;">

<tr>
<td style="padding:24px;">

<p style="margin:0;color:#C8A646;font-size:12px;font-weight:900;letter-spacing:3px;text-transform:uppercase;">
Executive Insight
</p>

<p style="margin:14px 0 0;color:#cbd5e1;font-size:14px;line-height:1.8;font-weight:600;">
Award information is automatically incorporated into supplier performance, procurement analytics, executive reporting, contract visibility, and board-ready intelligence.
</p>

</td>
</tr>

</table>

<p style="margin:30px 0 0;color:#64748b;font-size:13px;line-height:1.8;font-weight:600;">
Nexus Pavilion Procurement Intelligence Platform<br/>
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

function infoCard(label: string, value: string) {
return `
<div style="margin-top:16px;border-radius:18px;background:#061426;padding:18px;border:1px solid #24364a;">
<p style="margin:0;font-size:11px;font-weight:900;letter-spacing:.18em;color:#94a3b8;text-transform:uppercase;">
${escapeHtml(label)}
</p>

<p style="margin:8px 0 0;font-size:17px;font-weight:900;color:#fff;">
${escapeHtml(value)}
</p>
</div>
`;
}

function noticeCard(title: string, body: string) {
return `
<table width="100%" cellpadding="0" cellspacing="0" border="0"
style="margin-bottom:16px;background:#0b1b2c;border:1px solid #24364a;border-radius:22px;">
<tr>
<td style="padding:24px;">

<p style="margin:0;color:#C8A646;font-size:12px;font-weight:900;letter-spacing:3px;text-transform:uppercase;">
${escapeHtml(title)}
</p>

<p style="margin:14px 0 0;color:#cbd5e1;font-size:14px;line-height:1.8;font-weight:600;">
${escapeHtml(body)}
</p>

</td>
</tr>
</table>
`;
}

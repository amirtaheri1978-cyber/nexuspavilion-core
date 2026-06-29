type QuoteSubmittedEmailProps = {
rfqTitle: string;
amount: string;
timeline: string;
validityDays: string;
quoteUrl: string;
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

export function quoteSubmittedEmail({
rfqTitle,
amount,
timeline,
validityDays,
quoteUrl,
}: QuoteSubmittedEmailProps) {
const safeTitle = escapeHtml(safeValue(rfqTitle, "RFQ"));
const safeAmount = escapeHtml(safeValue(amount, "Not specified"));
const safeTimeline = escapeHtml(safeValue(timeline, "Not specified"));
const safeValidityDays = escapeHtml(
safeValue(validityDays, "Not specified")
);
const safeUrl = escapeHtml(quoteUrl);

return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Quote Submitted Successfully</title>
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
Supplier Submission Recorded
</p>

<h1 style="margin:18px 0 0;color:#ffffff;font-size:44px;line-height:1.05;font-weight:900;letter-spacing:-1.4px;">
Quote submitted successfully.
</h1>

<p style="margin:22px 0 0;color:#cbd5e1;font-size:17px;line-height:1.8;font-weight:600;">
Your commercial submission has been securely recorded inside Nexus Pavilion and is now available for buyer-side evaluation.
</p>
</td>
</tr>

<tr>
<td style="padding:36px 44px 0;background:#07111F;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #24364a;border-radius:24px;background:#0b1b2c;">
<tr>
<td style="padding:28px;">
<p style="margin:0;color:#94a3b8;font-size:12px;font-weight:900;letter-spacing:4px;text-transform:uppercase;">
Submission Summary
</p>

${emailInfoBlock("RFQ", safeTitle)}
${emailInfoBlock("Submitted Amount", safeAmount)}
${emailInfoBlock("Delivery Timeline", safeTimeline)}
${emailInfoBlock("Proposal Validity", safeValidityDays)}
</td>
</tr>
</table>
</td>
</tr>

<tr>
<td style="padding:30px 44px 0;background:#07111F;">
${noticeCard(
"Confidential Submission Notice",
"Your pricing, commercial proposal, proposal validity period, and supporting information remain confidential. Competing suppliers cannot access or view your submission."
)}

${noticeCard(
"Evaluation Workflow",
"Your submission has been securely recorded. Buyer-side evaluators may now review commercial and technical responses, and your proposal validity period is included in the procurement record."
)}

${noticeCard(
"Governance & Compliance",
"Late submissions are automatically rejected after the RFQ deadline. Supplier identities and bid information remain protected, and all submission activity is recorded in the audit trail."
)}

${noticeCard(
"Buyer Reservation Rights",
"The buyer reserves the right to accept or reject any or all submissions, request clarifications, negotiate commercial terms, or cancel the RFQ process in accordance with its procurement policies."
)}
</td>
</tr>

<tr>
<td style="padding:34px 44px 0;background:#07111F;">
<a
href="${safeUrl}"
style="display:inline-block;background:#C8A646;color:#061426;text-decoration:none;padding:17px 30px;border-radius:16px;font-weight:900;font-size:15px;letter-spacing:1px;text-transform:uppercase;"
>
View Submission
</a>

<a
href="${safeUrl}"
style="display:inline-block;margin-left:10px;background:#0b1b2c;color:#ffffff;text-decoration:none;padding:17px 30px;border-radius:16px;font-weight:900;font-size:15px;border:1px solid #24364a;"
>
Open RFQ Workspace
</a>
</td>
</tr>

<tr>
<td style="padding:28px 44px 0;background:#07111F;">
<p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.7;font-weight:600;">
If the button does not work, copy and paste this secure submission link into your browser:
</p>

<p style="margin:12px 0 0;word-break:break-all;color:#cbd5e1;font-size:13px;line-height:1.7;">
${safeUrl}
</p>
</td>
</tr>

<tr>
<td style="padding:34px 44px 42px;background:#07111F;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#061426;border:1px solid #24364a;border-radius:22px;">
<tr>
<td style="padding:24px;">
<p style="margin:0;color:#C8A646;font-size:12px;font-weight:900;letter-spacing:3px;text-transform:uppercase;">
Secure Procurement Record
</p>

<p style="margin:14px 0 0;color:#cbd5e1;font-size:14px;line-height:1.8;font-weight:600;">
This quote submission is part of the Nexus Pavilion procurement record and may support quote comparison, audit visibility, supplier evaluation, and award readiness analysis.
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
}

function emailInfoBlock(label: string, value: string) {
return `
<div style="margin-top:16px;border-radius:18px;background:#061426;padding:18px;border:1px solid #24364a;">
<p style="margin:0;font-size:11px;font-weight:900;letter-spacing:0.18em;color:#94a3b8;text-transform:uppercase;">
${escapeHtml(label)}
</p>
<p style="margin:8px 0 0;font-size:17px;font-weight:900;color:#ffffff;">
${value}
</p>
</div>
`;
}

function noticeCard(title: string, description: string) {
return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;background:#0b1b2c;border:1px solid #24364a;border-radius:22px;">
<tr>
<td style="padding:24px;">
<p style="margin:0;color:#C8A646;font-size:12px;font-weight:900;letter-spacing:3px;text-transform:uppercase;">
${escapeHtml(title)}
</p>

<p style="margin:14px 0 0;color:#cbd5e1;font-size:14px;line-height:1.8;font-weight:600;">
${escapeHtml(description)}
</p>
</td>
</tr>
</table>
`;
}

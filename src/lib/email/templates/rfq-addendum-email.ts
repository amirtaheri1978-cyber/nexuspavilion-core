type RfqAddendumEmailInput = {
  rfqTitle: string;
  addendumNumber: number | string;
  addendumTitle: string;
  requiresAcknowledgement: boolean;
  workspaceUrl: string;
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

/**
 * RFQ Addendum publication notification.
 * Intentionally omits description and affected document fields.
 * The RFQ workspace remains authoritative for Addendum content.
 */
export function buildRfqAddendumEmail({
  rfqTitle,
  addendumNumber,
  addendumTitle,
  requiresAcknowledgement,
  workspaceUrl,
}: RfqAddendumEmailInput) {
  const displayRfqTitle = safeValue(rfqTitle, "Procurement RFQ");
  const displayAddendumTitle = safeValue(addendumTitle, "Addendum");
  const displayNumber = String(addendumNumber ?? "").trim() || "—";
  const acknowledgementLabel = requiresAcknowledgement
    ? "Acknowledgement Required"
    : "Informational";
  const acknowledgementDetail = requiresAcknowledgement
    ? "Acknowledgement is required before quote submission for this RFQ."
    : "This Addendum is informational. Review the issued package in the RFQ workspace.";

  const safeRfqTitle = escapeHtml(displayRfqTitle);
  const safeAddendumTitle = escapeHtml(displayAddendumTitle);
  const safeNumber = escapeHtml(displayNumber);
  const safeAcknowledgementLabel = escapeHtml(acknowledgementLabel);
  const safeWorkspaceUrl = escapeHtml(workspaceUrl);

  const subject = `RFQ Addendum #${displayNumber} — ${displayRfqTitle}`;

  const text = `RFQ Addendum

An Addendum has been published for ${displayRfqTitle}.

Addendum #${displayNumber}: ${displayAddendumTitle}
Classification: ${acknowledgementLabel}

${acknowledgementDetail}

Review the Addendum in the secure RFQ workspace:
${workspaceUrl}

Confidentiality notice:
Addendum access is limited to established RFQ respondents. Competing suppliers cannot view your private procurement correspondence.

Nexus Pavilion`;

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>RFQ Addendum</title>
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
RFQ Addendum
</p>

<h1 style="margin:18px 0 0;color:#ffffff;font-size:44px;line-height:1.05;font-weight:900;letter-spacing:-1.4px;">
An Addendum has been published.
</h1>

<p style="margin:22px 0 0;color:#cbd5e1;font-size:17px;line-height:1.8;font-weight:600;">
The issuing procurement team has published an Addendum for this RFQ. Review the issued package securely inside the Nexus Pavilion RFQ workspace.
</p>
</td>
</tr>

<tr>
<td style="padding:36px 44px 0;background:#07111F;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #24364a;border-radius:24px;background:#0b1b2c;">
<tr>
<td style="padding:28px;">
<p style="margin:0;color:#94a3b8;font-size:12px;font-weight:900;letter-spacing:4px;text-transform:uppercase;">
Publication Summary
</p>

<div style="margin-top:16px;border-radius:18px;background:#061426;padding:18px;border:1px solid #24364a;">
<p style="margin:0;font-size:11px;font-weight:900;letter-spacing:0.18em;color:#94a3b8;text-transform:uppercase;">
RFQ
</p>
<p style="margin:8px 0 0;font-size:17px;font-weight:900;color:#ffffff;">
${safeRfqTitle}
</p>
</div>

<div style="margin-top:16px;border-radius:18px;background:#061426;padding:18px;border:1px solid #24364a;">
<p style="margin:0;font-size:11px;font-weight:900;letter-spacing:0.18em;color:#94a3b8;text-transform:uppercase;">
Addendum
</p>
<p style="margin:8px 0 0;font-size:17px;font-weight:900;color:#ffffff;">
#${safeNumber} — ${safeAddendumTitle}
</p>
</div>

<div style="margin-top:16px;border-radius:18px;background:#061426;padding:18px;border:1px solid #24364a;">
<p style="margin:0;font-size:11px;font-weight:900;letter-spacing:0.18em;color:#94a3b8;text-transform:uppercase;">
Classification
</p>
<p style="margin:8px 0 0;font-size:17px;font-weight:900;color:#ffffff;">
${safeAcknowledgementLabel}
</p>
</div>
</td>
</tr>
</table>
</td>
</tr>

<tr>
<td style="padding:30px 44px 0;background:#07111F;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;background:#0b1b2c;border:1px solid #24364a;border-radius:22px;">
<tr>
<td style="padding:24px;">
<p style="margin:0;color:#C8A646;font-size:12px;font-weight:900;letter-spacing:3px;text-transform:uppercase;">
Respondent Guidance
</p>
<p style="margin:14px 0 0;color:#cbd5e1;font-size:14px;line-height:1.8;font-weight:600;">
${escapeHtml(acknowledgementDetail)}
</p>
</td>
</tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;background:#0b1b2c;border:1px solid #24364a;border-radius:22px;">
<tr>
<td style="padding:24px;">
<p style="margin:0;color:#C8A646;font-size:12px;font-weight:900;letter-spacing:3px;text-transform:uppercase;">
Confidentiality Notice
</p>
<p style="margin:14px 0 0;color:#cbd5e1;font-size:14px;line-height:1.8;font-weight:600;">
Addendum access is limited to established RFQ respondents. Competing suppliers cannot view your private procurement correspondence. Addendum description and document details are available only inside the secure RFQ workspace.
</p>
</td>
</tr>
</table>
</td>
</tr>

<tr>
<td style="padding:34px 44px 0;background:#07111F;">
<a
href="${safeWorkspaceUrl}"
style="display:inline-block;background:#C8A646;color:#061426;text-decoration:none;padding:17px 30px;border-radius:16px;font-weight:900;font-size:15px;letter-spacing:1px;text-transform:uppercase;"
>
Review Addendum
</a>
</td>
</tr>

<tr>
<td style="padding:28px 44px 0;background:#07111F;">
<p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.7;font-weight:600;">
If the button does not work, copy and paste this secure workspace link into your browser:
</p>
<p style="margin:12px 0 0;word-break:break-all;color:#cbd5e1;font-size:13px;line-height:1.7;">
${safeWorkspaceUrl}
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
This Addendum notification is part of the Nexus Pavilion procurement record and does not disclose Addendum body content by email.
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

  return { subject, html, text };
}
